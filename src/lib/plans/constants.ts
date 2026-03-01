// Plans System — Mobile Constants
// Mirrors tile params from web: jobsite-kiosk-3/src/lib/plans/constants.ts

// ── Supabase ──────────────────────────────────────────────

/** Supabase project URL (same as in supabase.ts) */
export const SUPABASE_URL = "https://uuyewnoocyixkrcnmigz.supabase.co";

/** Supabase anon key (same as in supabase.ts) */
export const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV1eWV3bm9vY3lpeGtyY25taWd6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczNjgwMTEsImV4cCI6MjA4Mjk0NDAxMX0.y_1se_N0kKmueWx8aNAtcsHb2xOwq6nwaCAQaTs3SwU";

/** Supabase Storage bucket for all plan artifacts */
export const PLANS_BUCKET = "plans";

// ── Thumbnail ─────────────────────────────────────────────

/** Signed URL expiry for thumbnails (seconds) */
export const THUMB_EXPIRY_SECONDS = 3600;

/** Max thumbnails per createSignedUrls batch (Supabase request-size limit) */
export const THUMB_SIGN_BATCH_SIZE = 100;

// ── Tile parameters (must match pipeline output) ──────────

export const TILE_SIZE = 512;
export const TILE_OVERLAP = 1;
export const TILE_FORMAT = "jpeg" as const;

// ── Tile loading ──────────────────────────────────────────

/** Max concurrent in-flight tile fetch requests */
export const MAX_CONCURRENT_TILE_FETCHES = 6;

/** LRU cache capacity (number of decoded tile images) */
export const TILE_CACHE_SIZE = 60;

/** Tile fetch retry config */
export const TILE_RETRY_COUNT = 3;
export const TILE_RETRY_BASE_MS = 500; // exponential: 500, 1000, 2000

/** Throttle interval for syncing viewport → tile fetches (ms) */
export const VIEWPORT_SYNC_INTERVAL_MS = 100;
