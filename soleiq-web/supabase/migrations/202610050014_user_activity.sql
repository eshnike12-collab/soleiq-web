-- 202610050014_user_activity.sql
-- Daily record of who actually used the app.
--
-- WHY THIS TABLE HAS TO EXIST
--
-- Nothing recorded usage before it. `auth.users.last_sign_in_at` holds only
-- the MOST RECENT sign-in and is overwritten each time, so it can answer "who
-- has been here lately" but can never answer "how many people used it on the
-- 3rd" — the history was never kept. A usage graph drawn without this table
-- would be a graph of sign-ups relabelled, which is a different number wearing
-- the wrong name.
--
-- So: one row per user per UTC day, written when an authenticated user opens
-- the app. Counts only.
--
-- WHAT IT DELIBERATELY DOES NOT STORE
--
-- No page, no route, no IP, no user agent, no referrer, and nothing clinical.
-- The question it answers is "did this account use the product today, and how
-- many times" — anything finer would be behavioural tracking of patients
-- inside a medical record system, which is not a trade this product should
-- make for a dashboard line.
--
-- Retroactive data does not exist and cannot be reconstructed. The series
-- starts the day this ships.
--
-- Idempotent: safe to re-run. Run in the Supabase SQL editor.

create table if not exists public.user_activity_daily (
  user_id uuid not null references auth.users(id) on delete cascade,
  -- UTC day. The dashboard and the report both bucket in UTC, so a row and a
  -- chart column always mean the same 24 hours.
  day date not null,
  -- How many times the app was opened that day. Bounded by the ping's own
  -- throttle, so this is "sessions-ish", not a precise event count.
  events integer not null default 1 check (events >= 0),
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  primary key (user_id, day)
);

-- The dashboard's only query shape: a date range, counted.
create index if not exists user_activity_daily_day_idx
  on public.user_activity_daily (day);

alter table public.user_activity_daily enable row level security;

-- A user may record their own activity and read their own rows. Nothing here
-- lets one account see another's: the platform dashboard reads aggregates
-- through the service role, after its own platform-admin check.
drop policy if exists user_activity_insert_own on public.user_activity_daily;
create policy user_activity_insert_own on public.user_activity_daily
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists user_activity_update_own on public.user_activity_daily;
create policy user_activity_update_own on public.user_activity_daily
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists user_activity_select_own on public.user_activity_daily;
create policy user_activity_select_own on public.user_activity_daily
  for select to authenticated
  using (user_id = auth.uid());

-- Record a visit for the calling user, today.
--
-- SECURITY DEFINER with a pinned search_path, and it derives the row from
-- auth.uid() rather than taking a user id — there is no parameter a caller
-- could point at somebody else's activity.
create or replace function public.record_user_activity()
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  caller uuid := auth.uid();
begin
  if caller is null then
    raise exception 'not authenticated';
  end if;

  insert into public.user_activity_daily (user_id, day, events)
  values (caller, (now() at time zone 'utc')::date, 1)
  on conflict (user_id, day) do update
    set events = public.user_activity_daily.events + 1,
        last_seen_at = now();
end;
$$;

-- Supabase's default privileges grant EXECUTE on new public functions to anon,
-- authenticated and service_role by name, so `revoke ... from public` leaves
-- those in place. Each role is revoked explicitly; only signed-in users may
-- record their own visit.
revoke all on function public.record_user_activity() from public;
revoke all on function public.record_user_activity() from anon;
grant execute on function public.record_user_activity() to authenticated;
