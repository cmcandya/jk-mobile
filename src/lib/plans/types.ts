// Plans System — Mobile Types
// Mirrors web: jobsite-kiosk-3/src/lib/plans/types.ts
// Only includes types needed for mobile (viewing, not uploading/reviewing)

// ── Core DB types ──────────────────────────────────────────

export interface PlanFolder {
  id: string;
  job_site_id: string;
  name: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface PlanSheet {
  id: string;
  job_site_id: string;
  plan_set_id: string;
  source_id: string;
  page_index: number;
  sheet_number: string | null;
  title: string | null;
  discipline: string | null;
  revision: string | null;
  status: "pending" | "processing" | "ready" | "failed";
  active_render_id: string | null;
  folder_id: string | null;
  supersedes_id: string | null;
  drawing_date: string | null;
  received_date: string | null;
  is_obsolete: boolean;
  created_at: string;
  updated_at: string;
}

export interface SheetRender {
  id: string;
  dzi_path: string;
  thumbnail_path: string | null;
  /** Signed URL for thumbnail (set at fetch time, not stored in DB) */
  thumbnail_url?: string | null;
  tile_format: string;
  tile_size: number;
  overlap: number;
  dpi: number;
  width_px: number | null;
  height_px: number | null;
  level_count: number | null;
}

// ── View row type (from v_current_sheets) ─────────────────

/** Row from the v_current_sheets database view — flat, not nested */
export interface CurrentSheetRow {
  // plan_sheets columns
  id: string;
  job_site_id: string;
  plan_set_id: string;
  source_id: string;
  page_index: number;
  sheet_number: string | null;
  title: string | null;
  discipline: string | null;
  revision: string | null;
  status: string;
  active_render_id: string | null;
  folder_id: string | null;
  supersedes_id: string | null;
  drawing_date: string | null;
  received_date: string | null;
  is_obsolete: boolean;
  created_at: string;
  updated_at: string;
  // sheet_renders columns (aliased in view)
  render_id: string;
  dzi_path: string;
  thumbnail_path: string | null;
  tile_format: string;
  tile_size: number;
  overlap: number;
  dpi: number;
  width_px: number | null;
  height_px: number | null;
  level_count: number | null;
  // denormalized names
  plan_set_name: string;
  folder_name: string | null;
}

// ── Composed types for UI ─────────────────────────────────

/** Sheet with render metadata attached + signed thumbnail URL */
export interface PlanSheetForList {
  id: string;
  sheet_number: string | null;
  title: string | null;
  discipline: string | null;
  revision: string | null;
  folder_id: string | null;
  folder_name: string | null;
  plan_set_name: string;
  drawing_date: string | null;
  received_date: string | null;
  created_at: string;
  thumbnail_url: string | null;
  render: {
    dzi_path: string;
    tile_format: string;
    tile_size: number;
    overlap: number;
    width_px: number;
    height_px: number;
    level_count: number;
  } | null;
}

// ── Tile viewer types ─────────────────────────────────────

/** Camera state for the plan viewer (from PLANS-SPEC §2.3) */
export interface Camera {
  scale: number;
  tx: number;
  ty: number;
}

/** Describes a single tile to fetch and render */
export interface TileDescriptor {
  key: string; // "{level}/{col}_{row}"
  level: number;
  col: number;
  row: number;
  x: number; // pixel position in image coords at this level
  y: number;
  width: number;
  height: number;
}

/** Render metadata needed by tile math and TileManager */
export interface RenderMeta {
  dzi_path: string;
  tile_format: string;
  tile_size: number;
  overlap: number;
  width_px: number;
  height_px: number;
  level_count: number;
}

/** Canvas dimensions */
export interface Size {
  width: number;
  height: number;
}
