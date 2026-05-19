-- SoleIQ Supabase schema (v1)
-- Run once in the Supabase SQL editor on a fresh project.
--
-- Auth model: anonymous sessions. Each browser session signs in via
-- supabase.auth.signInAnonymously(); auth.uid() is then used to scope rows
-- through Row Level Security so a session can only read/write its own data.

-- ---------- Tables ---------------------------------------------------------

create table if not exists public.patients (
  id uuid primary key default gen_random_uuid(),
  auth_uid uuid not null,
  full_name text,
  city text,
  state text,
  age int,
  sex text,
  ethnicity text,
  conditions text[] default '{}',
  diabetes jsonb,
  prior_events jsonb default '[]'::jsonb,
  recent_surgery jsonb,
  numbness text,
  alcohol boolean,
  smoking boolean,
  shoe_size_us numeric,
  foot_length_mm int,
  pain_present boolean,
  pain_points text[] default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists patients_auth_uid_idx on public.patients(auth_uid);

create table if not exists public.visits (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references public.patients(id) on delete cascade,
  auth_uid uuid not null,
  started_at timestamptz not null,
  completed_at timestamptz,
  scan_path text check (scan_path in ('lidar','tof','photogrammetry')),
  created_at timestamptz not null default now()
);
create index if not exists visits_auth_uid_idx on public.visits(auth_uid);
create index if not exists visits_patient_id_idx on public.visits(patient_id);

create table if not exists public.captured_images (
  id uuid primary key default gen_random_uuid(),
  visit_id uuid not null references public.visits(id) on delete cascade,
  side text not null check (side in ('left','right')),
  view text not null check (view in ('top','sole','heel','between_toes')),
  data_url text not null,
  captured_at timestamptz not null
);
create index if not exists captured_images_visit_id_idx on public.captured_images(visit_id);

create table if not exists public.foot_meshes (
  id uuid primary key default gen_random_uuid(),
  visit_id uuid not null references public.visits(id) on delete cascade,
  side text not null check (side in ('left','right')),
  coverage_pct numeric not null,
  seed_signature text not null,
  captured_at timestamptz not null
);
create index if not exists foot_meshes_visit_id_idx on public.foot_meshes(visit_id);

create table if not exists public.analysis_results (
  id uuid primary key default gen_random_uuid(),
  visit_id uuid not null references public.visits(id) on delete cascade,
  scored_at timestamptz not null,
  risk_level text not null check (risk_level in ('low','medium','high')),
  risk_factors text[] not null,
  detections jsonb not null,
  volumetrics jsonb not null,
  trend text not null
);
create index if not exists analysis_results_visit_id_idx on public.analysis_results(visit_id);

-- updated_at trigger for patients
create or replace function public.set_updated_at() returns trigger
  language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;
drop trigger if exists patients_set_updated_at on public.patients;
create trigger patients_set_updated_at before update on public.patients
  for each row execute function public.set_updated_at();

-- ---------- Row Level Security --------------------------------------------

alter table public.patients          enable row level security;
alter table public.visits            enable row level security;
alter table public.captured_images   enable row level security;
alter table public.foot_meshes       enable row level security;
alter table public.analysis_results  enable row level security;

drop policy if exists patients_own on public.patients;
create policy patients_own on public.patients
  for all to authenticated
  using (auth_uid = auth.uid())
  with check (auth_uid = auth.uid());

drop policy if exists visits_own on public.visits;
create policy visits_own on public.visits
  for all to authenticated
  using (auth_uid = auth.uid())
  with check (auth_uid = auth.uid());

-- Child tables: ownership enforced through the parent visit.
drop policy if exists captured_images_own on public.captured_images;
create policy captured_images_own on public.captured_images
  for all to authenticated
  using (exists (select 1 from public.visits v
                 where v.id = visit_id and v.auth_uid = auth.uid()))
  with check (exists (select 1 from public.visits v
                      where v.id = visit_id and v.auth_uid = auth.uid()));

drop policy if exists foot_meshes_own on public.foot_meshes;
create policy foot_meshes_own on public.foot_meshes
  for all to authenticated
  using (exists (select 1 from public.visits v
                 where v.id = visit_id and v.auth_uid = auth.uid()))
  with check (exists (select 1 from public.visits v
                      where v.id = visit_id and v.auth_uid = auth.uid()));

drop policy if exists analysis_results_own on public.analysis_results;
create policy analysis_results_own on public.analysis_results
  for all to authenticated
  using (exists (select 1 from public.visits v
                 where v.id = visit_id and v.auth_uid = auth.uid()))
  with check (exists (select 1 from public.visits v
                      where v.id = visit_id and v.auth_uid = auth.uid()));
