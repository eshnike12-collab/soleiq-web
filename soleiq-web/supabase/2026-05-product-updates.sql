-- Product updates migration — adds columns for fields introduced after the
-- original schema: PAD vascular assessment, and the reconstructed 3D foot
-- heightmap captured from the live camera during the scan.
--
-- Idempotent — safe to re-run.

-- ---------- PAD on patients ------------------------------------------------

alter table public.patients
  add column if not exists pad jsonb;

-- ---------- 3D heightmap on foot_meshes -----------------------------------
-- Stored as jsonb { width, height, heights: number[], silhouettePx }.
-- ~9 KB per mesh; 18 KB per visit (left + right). Acceptable for prototype.
-- For production, migrate to Supabase Storage as a binary float32 blob.

alter table public.foot_meshes
  add column if not exists heightmap jsonb;
