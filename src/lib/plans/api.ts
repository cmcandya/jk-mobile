// Plans System — Data Layer
// Queries v_current_sheets view and signs thumbnail URLs

import { supabase } from "../supabase";
import {
  PLANS_BUCKET,
  THUMB_EXPIRY_SECONDS,
  THUMB_SIGN_BATCH_SIZE,
} from "./constants";
import type {
  CurrentSheetRow,
  PlanSheetForList,
  PlanFolder,
  RenderMeta,
} from "./types";

// ── Helpers ───────────────────────────────────────────────

/** Natural alphanumeric sort for sheet numbers (A1 < A1.1 < A2 < A10 < BAS1) */
function naturalCompare(a: string | null, b: string | null): number {
  if (a === b) return 0;
  if (a === null) return 1;
  if (b === null) return -1;

  const re = /(\d+|\D+)/g;
  const aParts = a.match(re) || [];
  const bParts = b.match(re) || [];

  for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
    const ap = aParts[i] ?? "";
    const bp = bParts[i] ?? "";

    const aNum = Number(ap);
    const bNum = Number(bp);

    if (!isNaN(aNum) && !isNaN(bNum)) {
      if (aNum !== bNum) return aNum - bNum;
    } else {
      const cmp = ap.localeCompare(bp);
      if (cmp !== 0) return cmp;
    }
  }
  return 0;
}

/** Sign thumbnail URLs in batches of THUMB_SIGN_BATCH_SIZE */
async function signThumbnailUrls(
  paths: (string | null)[]
): Promise<Map<string, string>> {
  const urlMap = new Map<string, string>();

  // Collect non-null paths with their original indices
  const validPaths = paths.filter((p): p is string => p !== null);
  if (validPaths.length === 0) return urlMap;

  // Deduplicate
  const uniquePaths = [...new Set(validPaths)];

  // Sign in batches
  for (let i = 0; i < uniquePaths.length; i += THUMB_SIGN_BATCH_SIZE) {
    const batch = uniquePaths.slice(i, i + THUMB_SIGN_BATCH_SIZE);
    const { data, error } = await supabase.storage
      .from(PLANS_BUCKET)
      .createSignedUrls(batch, THUMB_EXPIRY_SECONDS);

    if (error) {
      console.warn("Failed to sign thumbnail batch:", error.message);
      continue;
    }

    for (const item of data || []) {
      if (item.signedUrl && item.path) {
        urlMap.set(item.path, item.signedUrl);
      }
    }
  }

  return urlMap;
}

/** Convert a CurrentSheetRow into a PlanSheetForList */
function rowToSheetForList(
  row: CurrentSheetRow,
  thumbnailUrl: string | null
): PlanSheetForList {
  const hasRender =
    row.width_px !== null &&
    row.height_px !== null &&
    row.level_count !== null;

  return {
    id: row.id,
    sheet_number: row.sheet_number,
    title: row.title,
    discipline: row.discipline,
    revision: row.revision,
    folder_id: row.folder_id,
    folder_name: row.folder_name,
    plan_set_name: row.plan_set_name,
    drawing_date: row.drawing_date,
    received_date: row.received_date,
    created_at: row.created_at,
    thumbnail_url: thumbnailUrl,
    render: hasRender
      ? {
          dzi_path: row.dzi_path,
          tile_format: row.tile_format,
          tile_size: row.tile_size,
          overlap: row.overlap,
          width_px: row.width_px!,
          height_px: row.height_px!,
          level_count: row.level_count!,
        }
      : null,
  };
}

// ── Public API ────────────────────────────────────────────

export interface FetchCurrentSheetsResult {
  sheets: PlanSheetForList[];
  folders: PlanFolder[];
  /** Ordered sheet IDs for prev/next navigation in the viewer */
  sortedIds: string[];
}

/**
 * Fetch all current (viewable) sheets for a job site.
 * Queries the v_current_sheets view, signs thumbnails, fetches folders.
 */
export async function fetchCurrentSheets(
  jobSiteId: string
): Promise<FetchCurrentSheetsResult> {
  // Parallel: sheets + folders
  const [sheetsRes, foldersRes] = await Promise.all([
    supabase
      .from("v_current_sheets")
      .select("*")
      .eq("job_site_id", jobSiteId)
      .order("sheet_number", { ascending: true, nullsFirst: false }),
    supabase
      .from("plan_folders")
      .select("*")
      .eq("job_site_id", jobSiteId)
      .order("sort_order", { ascending: true }),
  ]);

  if (sheetsRes.error) throw sheetsRes.error;
  if (foldersRes.error) throw foldersRes.error;

  const rows = (sheetsRes.data || []) as CurrentSheetRow[];
  const folders = (foldersRes.data || []) as PlanFolder[];

  // Sort sheets by natural alphanumeric order of sheet_number, then created_at
  rows.sort((a, b) => {
    const cmp = naturalCompare(a.sheet_number, b.sheet_number);
    if (cmp !== 0) return cmp;
    return a.created_at.localeCompare(b.created_at);
  });

  // Sign thumbnail URLs
  const thumbnailPaths = rows.map((r) => r.thumbnail_path);
  const signedUrls = await signThumbnailUrls(thumbnailPaths);

  // Build list items
  const sheets = rows.map((row) => {
    const url = row.thumbnail_path
      ? signedUrls.get(row.thumbnail_path) ?? null
      : null;
    return rowToSheetForList(row, url);
  });

  const sortedIds = sheets.map((s) => s.id);

  return { sheets, folders, sortedIds };
}

/**
 * Fetch a single sheet for the viewer with its render metadata.
 * Used when navigating directly to a sheet (e.g., deep link).
 */
export async function fetchSheetForViewer(
  sheetId: string
): Promise<{ sheet: PlanSheetForList; renderMeta: RenderMeta } | null> {
  const { data, error } = await supabase
    .from("v_current_sheets")
    .select("*")
    .eq("id", sheetId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const row = data as CurrentSheetRow;

  // Sign thumbnail
  const signedUrls = await signThumbnailUrls([row.thumbnail_path]);
  const thumbnailUrl = row.thumbnail_path
    ? signedUrls.get(row.thumbnail_path) ?? null
    : null;

  const sheet = rowToSheetForList(row, thumbnailUrl);

  if (!sheet.render) return null; // No render metadata = can't view

  const renderMeta: RenderMeta = {
    dzi_path: sheet.render.dzi_path,
    tile_format: sheet.render.tile_format,
    tile_size: sheet.render.tile_size,
    overlap: sheet.render.overlap,
    width_px: sheet.render.width_px,
    height_px: sheet.render.height_px,
    level_count: sheet.render.level_count,
  };

  return { sheet, renderMeta };
}

/**
 * Get fresh auth headers for tile fetching.
 * Called once per dispatch cycle by TileManager, not per tile.
 */
export async function getAuthHeaders(): Promise<Record<string, string>> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;

  return {
    Authorization: token ? `Bearer ${token}` : "",
    apikey:
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV1eWV3bm9vY3lpeGtyY25taWd6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczNjgwMTEsImV4cCI6MjA4Mjk0NDAxMX0.y_1se_N0kKmueWx8aNAtcsHb2xOwq6nwaCAQaTs3SwU",
  };
}
