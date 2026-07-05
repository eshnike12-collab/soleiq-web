-- 2026-07-scans.sql
-- Phase 6 — server-side persistence for the AI-analyzed foot scans.
--
-- Runs alongside the existing schema.sql. Idempotent — safe to re-run.
--
-- What this adds:
--   1. A Storage bucket `foot-scans` (public-read while in dev; flip to
--      private for prod and rely on signed URLs).
--   2. Storage RLS policies keyed on the first path segment (auth uid) so
--      one patient can never read another patient's images.
--   3. A `scans` table for row-level scan metadata + full AI result JSON.
--   4. Table RLS so a patient can only read their own scans.
--
-- The Next.js /api/analyze route writes here using the SERVICE ROLE key
-- (server-only). Browsers read via the anon key and are policed by RLS.

-- ---------- Storage bucket -------------------------------------------------

-- PRIVATE bucket: patient photos are PHI. Reads happen via signed URLs
-- minted server-side (service role), or via the owner policy below for
-- an authenticated browser session.

insert into storage.buckets (id, name, public)
values ('foot-scans', 'foot-scans', false)
on conflict (id) do update set public = false;

-- Owner-only access. Path convention:
--   <auth_uid>/<visit_id>/<uuid>.<ext>

drop policy if exists "foot-scans_read_public" on storage.objects;
drop policy if exists "foot-scans_own_read" on storage.objects;
create policy "foot-scans_own_read"
  on storage.objects for select
  using (
    bucket_id = 'foot-scans'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "foot-scans_own_insert" on storage.objects;
create policy "foot-scans_own_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'foot-scans'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "foot-scans_own_update" on storage.objects;
create policy "foot-scans_own_update"
  on storage.objects for update
  using (
    bucket_id = 'foot-scans'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "foot-scans_own_delete" on storage.objects;
create policy "foot-scans_own_delete"
  on storage.objects for delete
  using (
    bucket_id = 'foot-scans'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ---------- scans table ----------------------------------------------------

create table if not exists public.scans (
  id                        uuid        primary key default gen_random_uuid(),

  -- Who this scan belongs to. Written by the server route using the JWT the
  -- browser sent; RLS enforces the isolation on read.
  user_id                   uuid        not null,

  -- Loose FKs. `visit_id` is client-side string (e.g. "visit_1712345678000").
  -- `patient_id` is the patients.id row once syncCompleteVisit has upserted
  -- one; nullable because analysis fires before that upsert.
  visit_id                  text,
  patient_id                uuid        references public.patients(id) on delete set null,

  -- Which foot / which view.
  side                      text        check (side in ('left', 'right')),
  view                      text        check (view in ('top', 'sole', 'heel', 'between_toes')),

  -- Where the image lives.
  storage_bucket            text        not null default 'foot-scans',
  storage_path              text        not null,
  storage_url               text,

  -- How the image was produced.
  capture_source            text        check (capture_source in ('live', 'upload')),

  -- Client-side quality snapshot (the CaptureGuide signals + detector
  -- metrics — sharpness / exposure / alignment / steadiness scores).
  -- Optional. Kept as jsonb so we don't need a migration for every new
  -- signal we start recording.
  capture_quality           jsonb,

  -- The full AI response (calibrated classifier + Claude second opinion +
  -- similar cases + heatmap URL). Kept whole so nothing gets lost even if
  -- the AI schema evolves.
  ai_result                 jsonb,
  ai_model_version          text,
  ai_reference_bank_version text,

  -- Dual-view reading, broken out of ai_result for direct querying:
  -- patient_summary  = plain-language block shown to the patient
  -- clinician_data   = structured snapshot for the clinician
  -- flags            = { image_quality_ok, is_foot, needs_urgent_care }
  patient_summary           jsonb,
  clinician_data            jsonb,
  flags                     jsonb,

  created_at                timestamptz not null default now()
);

-- Idempotent upgrades for databases that created `scans` before the
-- dual-reading columns existed.
alter table public.scans add column if not exists patient_summary jsonb;
alter table public.scans add column if not exists clinician_data  jsonb;
alter table public.scans add column if not exists flags           jsonb;

create index if not exists scans_user_id_idx  on public.scans(user_id);
create index if not exists scans_visit_id_idx on public.scans(visit_id);
create index if not exists scans_created_at_idx on public.scans(created_at desc);

alter table public.scans enable row level security;

-- Patient can only see their own scans (dashboard etc. use the service
-- role which bypasses RLS).

drop policy if exists "scans_select_own" on public.scans;
create policy "scans_select_own"
  on public.scans for select
  using (user_id = auth.uid());

-- Anonymous session (browser anon key) may not insert directly — the
-- server route is the only writer, and it uses the service role which
-- bypasses RLS. Kept for completeness; if you decide to allow direct
-- browser writes later, this policy makes them safe.

drop policy if exists "scans_insert_own" on public.scans;
create policy "scans_insert_own"
  on public.scans for insert
  with check (user_id = auth.uid());

-- No update / delete policies — scans are append-only from the client's
-- perspective. Server role can still do maintenance.
