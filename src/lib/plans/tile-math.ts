// Plans System — Tile Math
// Pure functions for DZI tile calculations. No Skia dependency — unit-testable.
// Based on PLANS-SPEC §2.5 and §6.3

import { SUPABASE_URL, PLANS_BUCKET } from "./constants";
import type { RenderMeta, Camera, Size, TileDescriptor } from "./types";

/**
 * Compute the DZI pyramid level for the current camera scale.
 *
 * At level 0, the image is 1x1 pixel.
 * At maxLevel, the image is at full resolution.
 * We pick the level where the on-screen pixel size roughly matches the tile resolution.
 */
export function computeZoomLevel(
  cameraScale: number,
  renderMeta: RenderMeta
): number {
  const { level_count } = renderMeta;
  const maxLevel = level_count - 1;

  // We want the DZI level where tile resolution >= screen display resolution.
  // At level L, the image is scaled by 2^(L - maxLevel) from full resolution.
  // We need: imageSize(L) >= screenSize, i.e.:
  //   fullSize * 2^(L - maxLevel) >= fullSize * cameraScale
  //   2^(L - maxLevel) >= cameraScale
  //   L >= maxLevel + log2(cameraScale)
  const level = Math.ceil(maxLevel + Math.log2(Math.max(cameraScale, 1e-10)));

  return Math.max(0, Math.min(level, maxLevel));
}

/**
 * Get the dimensions of the image at a given DZI level.
 * At level n, the image is scaled by 2^(n - maxLevel) from full resolution.
 */
export function imageSizeAtLevel(
  level: number,
  renderMeta: RenderMeta
): { width: number; height: number } {
  const maxLevel = renderMeta.level_count - 1;
  const scale = Math.pow(2, level - maxLevel);
  return {
    width: Math.ceil(renderMeta.width_px * scale),
    height: Math.ceil(renderMeta.height_px * scale),
  };
}

/**
 * Get the tile column/row range visible in the current viewport.
 * Returns the range of tiles that need to be loaded, with +1 margin for prefetch.
 */
export function getVisibleTileRange(
  camera: Camera,
  canvasSize: Size,
  level: number,
  renderMeta: RenderMeta
): {
  minCol: number;
  maxCol: number;
  minRow: number;
  maxRow: number;
  level: number;
} {
  const { tile_size, overlap } = renderMeta;
  const imgSize = imageSizeAtLevel(level, renderMeta);

  // The effective tile step (non-overlapping portion)
  const tileStep = tile_size - overlap;

  // Total tiles at this level
  const totalCols = Math.ceil(imgSize.width / tileStep);
  const totalRows = Math.ceil(imgSize.height / tileStep);

  // Convert canvas corners to image coordinates at this level.
  // Camera model: screenX = imageX * camera.scale + camera.tx
  // So: imageX = (screenX - camera.tx) / camera.scale
  //
  // But we need to account for the scale ratio between the "fit" scale and this level.
  const maxLevel = renderMeta.level_count - 1;
  const levelScale = Math.pow(2, level - maxLevel);

  // Image coords at this level for canvas corners
  const imgLeft = (0 - camera.tx) / camera.scale * levelScale;
  const imgTop = (0 - camera.ty) / camera.scale * levelScale;
  const imgRight = (canvasSize.width - camera.tx) / camera.scale * levelScale;
  const imgBottom = (canvasSize.height - camera.ty) / camera.scale * levelScale;

  // Convert to tile indices (with 1-tile margin for smooth scrolling)
  const minCol = Math.max(0, Math.floor(imgLeft / tileStep) - 1);
  const maxCol = Math.min(totalCols - 1, Math.floor(imgRight / tileStep) + 1);
  const minRow = Math.max(0, Math.floor(imgTop / tileStep) - 1);
  const maxRow = Math.min(totalRows - 1, Math.floor(imgBottom / tileStep) + 1);

  return { minCol, maxCol, minRow, maxRow, level };
}

/**
 * Build the list of TileDescriptors for a visible tile range.
 */
export function buildTileDescriptors(
  range: { minCol: number; maxCol: number; minRow: number; maxRow: number; level: number },
  renderMeta: RenderMeta
): TileDescriptor[] {
  const { tile_size, overlap } = renderMeta;
  const tileStep = tile_size - overlap;
  const imgSize = imageSizeAtLevel(range.level, renderMeta);
  const tiles: TileDescriptor[] = [];

  for (let row = range.minRow; row <= range.maxRow; row++) {
    for (let col = range.minCol; col <= range.maxCol; col++) {
      const x = col * tileStep;
      const y = row * tileStep;

      // Edge tiles may be smaller than full tile size
      const width = Math.min(tile_size, imgSize.width - x);
      const height = Math.min(tile_size, imgSize.height - y);

      if (width <= 0 || height <= 0) continue;

      tiles.push({
        key: `${range.level}/${col}_${row}`,
        level: range.level,
        col,
        row,
        x,
        y,
        width,
        height,
      });
    }
  }

  return tiles;
}

/**
 * Construct the URL for a specific tile.
 * Pattern: {SUPABASE_URL}/storage/v1/object/plans/{basePath}/plan_files/{level}/{col}_{row}.{format}
 *
 * basePath is derived from dzi_path: "sites/.../plan.dzi" → "sites/.../plan"
 */
export function tileUrl(
  dziPath: string,
  level: number,
  col: number,
  row: number,
  format: string
): string {
  // dzi_path like "sites/xxx/sheets/yyy/plan.dzi" → "sites/xxx/sheets/yyy/plan"
  const basePath = dziPath.replace(/\.dzi$/, "");
  return `${SUPABASE_URL}/storage/v1/object/${PLANS_BUCKET}/${basePath}_files/${level}/${col}_${row}.${format}`;
}

/**
 * Calculate the initial camera that fits the image to the canvas (fit-to-screen).
 */
export function fitToScreen(
  canvasSize: Size,
  renderMeta: RenderMeta
): Camera {
  const scaleX = canvasSize.width / renderMeta.width_px;
  const scaleY = canvasSize.height / renderMeta.height_px;
  const scale = Math.min(scaleX, scaleY);

  // Center the image
  const tx = (canvasSize.width - renderMeta.width_px * scale) / 2;
  const ty = (canvasSize.height - renderMeta.height_px * scale) / 2;

  return { scale, tx, ty };
}

/**
 * Clamp camera scale between fit-to-screen and 1:1 pixel resolution.
 */
export function clampScale(
  scale: number,
  canvasSize: Size,
  renderMeta: RenderMeta
): number {
  const fitCamera = fitToScreen(canvasSize, renderMeta);
  const minScale = fitCamera.scale;
  // Max scale = 1:1 pixels (each image pixel = 1 screen pixel)
  const maxScale = 1;
  return Math.max(minScale, Math.min(maxScale, scale));
}
