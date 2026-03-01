// Plans System — TileManager
// Manages tile loading lifecycle: LRU cache, concurrency control, fetch/cancel.
// Skia images are explicitly disposed on eviction to prevent GPU memory leaks.

import { Skia, type SkImage } from "@shopify/react-native-skia";
import {
  MAX_CONCURRENT_TILE_FETCHES,
  TILE_CACHE_SIZE,
  TILE_RETRY_COUNT,
  TILE_RETRY_BASE_MS,
} from "./constants";
import {
  computeZoomLevel,
  getVisibleTileRange,
  buildTileDescriptors,
  tileUrl,
} from "./tile-math";
import type { RenderMeta, Camera, Size, TileDescriptor } from "./types";

// ── LRU Cache ─────────────────────────────────────────────

class LRUCache<V> {
  private map = new Map<string, V>();
  private capacity: number;
  private onEvict?: (key: string, value: V) => void;

  constructor(capacity: number, onEvict?: (key: string, value: V) => void) {
    this.capacity = capacity;
    this.onEvict = onEvict;
  }

  get(key: string): V | undefined {
    const val = this.map.get(key);
    if (val !== undefined) {
      // Move to end (most recently used)
      this.map.delete(key);
      this.map.set(key, val);
    }
    return val;
  }

  set(key: string, value: V): void {
    if (this.map.has(key)) {
      this.map.delete(key);
    } else if (this.map.size >= this.capacity) {
      // Evict oldest (first entry)
      const oldest = this.map.keys().next().value;
      if (oldest !== undefined) {
        const evicted = this.map.get(oldest);
        this.map.delete(oldest);
        if (evicted !== undefined && this.onEvict) {
          this.onEvict(oldest, evicted);
        }
      }
    }
    this.map.set(key, value);
  }

  has(key: string): boolean {
    return this.map.has(key);
  }

  clear(): void {
    if (this.onEvict) {
      for (const [key, value] of this.map) {
        this.onEvict(key, value);
      }
    }
    this.map.clear();
  }

  get size(): number {
    return this.map.size;
  }
}

// ── Tile fetch state ──────────────────────────────────────

type TileState = "queued" | "fetching" | "loaded" | "failed";

interface TileFetchEntry {
  key: string;
  state: TileState;
  abortController?: AbortController;
  retryCount: number;
}

// ── TileManager ───────────────────────────────────────────

export class TileManager {
  private renderMeta: RenderMeta;
  private getAuthHeaders: () => Promise<Record<string, string>>;
  private onTileLoaded: () => void;

  // Cache of decoded Skia images — dispose on eviction
  private cache: LRUCache<SkImage>;

  // Fetch tracking
  private fetchMap = new Map<string, TileFetchEntry>();
  private fetchQueue: string[] = [];
  private inFlightCount = 0;

  // Current auth headers (refreshed per dispatch cycle)
  private currentHeaders: Record<string, string> | null = null;

  // Failed tiles (don't retry until viewport changes)
  private failedTiles = new Set<string>();

  // Whether the manager has been destroyed
  private destroyed = false;

  constructor(
    renderMeta: RenderMeta,
    getAuthHeaders: () => Promise<Record<string, string>>,
    onTileLoaded: () => void
  ) {
    this.renderMeta = renderMeta;
    this.getAuthHeaders = getAuthHeaders;
    this.onTileLoaded = onTileLoaded;

    this.cache = new LRUCache<SkImage>(TILE_CACHE_SIZE, (_key, image) => {
      // Critical: dispose GPU texture memory on eviction
      image.dispose();
    });
  }

  /**
   * Update the viewport — compute needed tiles, start/cancel fetches.
   * Returns the current set of tile descriptors (for rendering).
   */
  updateViewport(camera: Camera, canvasSize: Size): TileDescriptor[] {
    if (this.destroyed) return [];

    const level = computeZoomLevel(camera.scale, this.renderMeta);
    const range = getVisibleTileRange(camera, canvasSize, level, this.renderMeta);
    const tiles = buildTileDescriptors(range, this.renderMeta);

    // Set of tile keys we need now
    const neededKeys = new Set(tiles.map((t) => t.key));

    // Cancel fetches for tiles no longer needed
    for (const [key, entry] of this.fetchMap) {
      if (!neededKeys.has(key)) {
        if (entry.abortController) {
          entry.abortController.abort();
        }
        if (entry.state === "fetching") {
          this.inFlightCount--;
        }
        this.fetchMap.delete(key);
      }
    }

    // Remove from queue tiles no longer needed
    this.fetchQueue = this.fetchQueue.filter((k) => neededKeys.has(k));

    // Clear failed tiles on viewport change to allow retrying
    this.failedTiles.clear();

    // Queue new tiles that aren't cached or already being fetched
    for (const tile of tiles) {
      if (this.cache.has(tile.key)) continue;
      if (this.fetchMap.has(tile.key)) continue;
      if (this.failedTiles.has(tile.key)) continue;

      this.fetchMap.set(tile.key, {
        key: tile.key,
        state: "queued",
        retryCount: 0,
      });
      this.fetchQueue.push(tile.key);
    }

    // Dispatch queued fetches
    this.dispatchFetches();

    return tiles;
  }

  /**
   * Get a cached Skia image for a tile, or null if not loaded yet.
   */
  getTile(key: string): SkImage | null {
    return this.cache.get(key) ?? null;
  }

  /**
   * Clean up: cancel all fetches, dispose all cached images.
   */
  destroy(): void {
    this.destroyed = true;

    // Cancel all in-flight fetches
    for (const [, entry] of this.fetchMap) {
      if (entry.abortController) {
        entry.abortController.abort();
      }
    }
    this.fetchMap.clear();
    this.fetchQueue = [];
    this.inFlightCount = 0;

    // Dispose all cached Skia images
    this.cache.clear();
  }

  // ── Private ───────────────────────────────────────────

  private async dispatchFetches(): Promise<void> {
    if (this.destroyed) return;

    // Refresh auth headers once per dispatch cycle
    if (this.fetchQueue.length > 0 && this.inFlightCount < MAX_CONCURRENT_TILE_FETCHES) {
      try {
        this.currentHeaders = await this.getAuthHeaders();
      } catch {
        // Auth failed — don't fetch
        return;
      }
    }

    while (
      this.fetchQueue.length > 0 &&
      this.inFlightCount < MAX_CONCURRENT_TILE_FETCHES &&
      !this.destroyed
    ) {
      const key = this.fetchQueue.shift()!;
      const entry = this.fetchMap.get(key);
      if (!entry || entry.state !== "queued") continue;

      entry.state = "fetching";
      entry.abortController = new AbortController();
      this.inFlightCount++;

      this.fetchTile(key, entry);
    }
  }

  private async fetchTile(key: string, entry: TileFetchEntry): Promise<void> {
    const [levelStr, colRow] = key.split("/");
    const [colStr, rowStr] = colRow.split("_");
    const level = parseInt(levelStr, 10);
    const col = parseInt(colStr, 10);
    const row = parseInt(rowStr, 10);

    const url = tileUrl(
      this.renderMeta.dzi_path,
      level,
      col,
      row,
      this.renderMeta.tile_format
    );

    try {
      const response = await fetch(url, {
        headers: this.currentHeaders || {},
        signal: entry.abortController?.signal,
      });

      if (this.destroyed) return;

      if (response.status === 401 || response.status === 403) {
        // Token expired — refresh and retry
        try {
          this.currentHeaders = await this.getAuthHeaders();
        } catch {
          this.markFailed(key, entry);
          return;
        }
        if (entry.retryCount < TILE_RETRY_COUNT) {
          entry.retryCount++;
          entry.state = "queued";
          this.inFlightCount--;
          this.fetchQueue.unshift(key);
          this.dispatchFetches();
          return;
        }
        this.markFailed(key, entry);
        return;
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const buffer = await response.arrayBuffer();
      if (this.destroyed) return;

      // Decode to Skia image
      const data = Skia.Data.fromBytes(new Uint8Array(buffer));
      const image = Skia.Image.MakeImageFromEncoded(data);

      if (!image) {
        throw new Error("Failed to decode tile image");
      }

      // Store in cache (may evict + dispose oldest)
      this.cache.set(key, image);
      entry.state = "loaded";
      this.fetchMap.delete(key);
      this.inFlightCount--;

      // Trigger re-render
      this.onTileLoaded();

      // Continue dispatching
      this.dispatchFetches();
    } catch (err: any) {
      if (this.destroyed) return;
      if (err.name === "AbortError") {
        // Cancelled — already handled
        return;
      }

      // Retry with exponential backoff
      if (entry.retryCount < TILE_RETRY_COUNT) {
        entry.retryCount++;
        const delay = TILE_RETRY_BASE_MS * Math.pow(2, entry.retryCount - 1);
        entry.state = "queued";
        this.inFlightCount--;

        setTimeout(() => {
          if (!this.destroyed && this.fetchMap.has(key)) {
            this.fetchQueue.push(key);
            this.dispatchFetches();
          }
        }, delay);
      } else {
        this.markFailed(key, entry);
      }
    }
  }

  private markFailed(key: string, entry: TileFetchEntry): void {
    entry.state = "failed";
    this.failedTiles.add(key);
    this.fetchMap.delete(key);
    this.inFlightCount--;
    this.dispatchFetches();
  }
}
