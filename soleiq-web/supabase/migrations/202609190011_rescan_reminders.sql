-- 202609190011_rescan_reminders.sql
-- The weekly foot-check reminder cycle, one row per patient account.
--
-- A row is created the first time a patient signs in and is updated every
-- time a check completes. Everything the reminder needs is here, so deciding
-- whether to nudge someone is one indexed read rather than a scan over
-- reports.
--
-- PHI NOTE: this table deliberately holds NO clinical content — no findings,
-- no risk level, no photos. It is a calendar. The reminder email it drives
-- says only that a check is due, because reminder mail lands in inboxes that
-- sit unlocked on shared devices.
--
-- Idempotent: safe to re-run. Run in the Supabase SQL editor.

create table if not exists public.rescan_schedules (
  user_id uuid primary key references auth.users(id) on delete cascade,

  -- Days between checks. Per-patient so a care team can tighten it for
  -- someone high-risk without a code change. Bounded so a bad write cannot
  -- silently switch reminders off (0) or push them past a year.
  interval_days integer not null default 7
    check (interval_days between 1 and 90),

  -- When the next check is due. The one column the reminder job reads.
  due_at timestamptz not null default (now() + interval '7 days'),

  -- Most recent completed check. Null until the patient finishes their first.
  last_scan_at timestamptz,

  -- Patient asked not to be nudged until this moment. Cleared by a check.
  snoozed_until timestamptz,

  -- Reminders turned off entirely. Survives completed checks.
  paused boolean not null default false,

  -- Consecutive on-time checks, and the best run so far. The best run is kept
  -- when the current one breaks, so a missed week costs momentum but never
  -- erases the record of having done it.
  streak_count integer not null default 0 check (streak_count >= 0),
  longest_streak integer not null default 0 check (longest_streak >= 0),

  -- Email pacing. Reset when a check completes, so each cycle gets its own
  -- small allowance of reminders rather than one lifetime budget.
  last_email_at timestamptz,
  emails_this_cycle integer not null default 0 check (emails_this_cycle >= 0),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- The reminder job's only query: rows that are due, not paused, not snoozed.
-- Partial on `paused` because paused rows are dead weight in this index and
-- are never selected by it.
create index if not exists rescan_schedules_due_idx
  on public.rescan_schedules (due_at)
  where paused = false;

drop trigger if exists rescan_schedules_set_updated_at on public.rescan_schedules;
create trigger rescan_schedules_set_updated_at
  before update on public.rescan_schedules
  for each row execute function public.set_updated_at();

alter table public.rescan_schedules enable row level security;

-- A patient owns exactly their own row. There is no cross-patient read here
-- at all: a clinician who needs adherence data should get it from reports,
-- which already carry the authorization model for that.
drop policy if exists rescan_schedules_select_own on public.rescan_schedules;
create policy rescan_schedules_select_own on public.rescan_schedules
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists rescan_schedules_insert_own on public.rescan_schedules;
create policy rescan_schedules_insert_own on public.rescan_schedules
  for insert to authenticated
  with check (user_id = auth.uid());

-- Update is scoped to the same row on both sides. Without the `with check`
-- half, a patient could rewrite their row's user_id and take over someone
-- else's schedule.
drop policy if exists rescan_schedules_update_own on public.rescan_schedules;
create policy rescan_schedules_update_own on public.rescan_schedules
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Create-if-absent, used on sign-in.
--
-- SECURITY DEFINER with a pinned search_path, and it derives the row from
-- auth.uid() rather than taking a user id argument, so there is no parameter
-- a caller could point at somebody else.
create or replace function public.ensure_rescan_schedule()
returns public.rescan_schedules
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  caller uuid := auth.uid();
  row_out public.rescan_schedules;
begin
  if caller is null then
    raise exception 'not authenticated';
  end if;

  insert into public.rescan_schedules (user_id, due_at)
  values (caller, now() + interval '7 days')
  on conflict (user_id) do nothing;

  select * into row_out
  from public.rescan_schedules
  where user_id = caller;

  return row_out;
end;
$$;

-- Supabase ships ALTER DEFAULT PRIVILEGES granting EXECUTE on new functions
-- in `public` to anon, authenticated and service_role. Those are role-specific
-- grants, so `revoke ... from public` does NOT remove them — each role has to
-- be revoked by name. Getting this wrong is silent: the function simply stays
-- callable by everyone.
revoke all on function public.ensure_rescan_schedule() from public;
revoke all on function public.ensure_rescan_schedule() from anon;
grant execute on function public.ensure_rescan_schedule() to authenticated;

-- Roll the cycle forward after a completed check.
--
-- The streak arithmetic lives here as well as in lib/rescan.ts on purpose:
-- checks complete inside the analysis worker on the service-role client,
-- where no patient session exists to run the TypeScript path. Both
-- implementations follow the same two rules — a check inside the cycle plus
-- one grace week continues the run, anything later starts a new one at 1 —
-- and tests/rescan.test.ts pins the TypeScript side.
create or replace function public.record_rescan_completed(
  p_user_id uuid,
  p_scan_at timestamptz default now()
)
returns public.rescan_schedules
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  existing public.rescan_schedules;
  next_streak integer;
  row_out public.rescan_schedules;
begin
  if p_user_id is null then
    raise exception 'user id required';
  end if;

  select * into existing from public.rescan_schedules where user_id = p_user_id;

  if not found then
    insert into public.rescan_schedules (
      user_id, due_at, last_scan_at, streak_count, longest_streak
    )
    values (
      p_user_id,
      p_scan_at + interval '7 days',
      p_scan_at,
      1,
      1
    )
    returning * into row_out;
    return row_out;
  end if;

  if existing.last_scan_at is null then
    next_streak := 1;
  elsif p_scan_at <= existing.due_at + (interval '1 day' * 7) then
    next_streak := greatest(existing.streak_count, 1) + 1;
  else
    next_streak := 1;
  end if;

  update public.rescan_schedules
  set last_scan_at = p_scan_at,
      due_at = p_scan_at + (interval '1 day' * existing.interval_days),
      streak_count = next_streak,
      longest_streak = greatest(existing.longest_streak, next_streak),
      snoozed_until = null,
      last_email_at = null,
      emails_this_cycle = 0
  where user_id = p_user_id
  returning * into row_out;

  return row_out;
end;
$$;

-- Callable ONLY by the service role (the analysis worker).
--
-- A patient must not be able to mark their own check complete: this function
-- takes a user id as a parameter and writes a streak, so an authenticated
-- caller could both inflate their own adherence record and push someone
-- else's next check a week into the future.
--
-- Each role is revoked by name on purpose. Supabase's default privileges
-- grant EXECUTE on new public functions to anon, authenticated and
-- service_role individually, and `revoke ... from public` leaves every one of
-- those role-specific grants in place — so revoking only PUBLIC here would
-- have looked locked down while remaining callable by any signed-in patient.
revoke all on function public.record_rescan_completed(uuid, timestamptz) from public;
revoke all on function public.record_rescan_completed(uuid, timestamptz) from anon;
revoke all on function public.record_rescan_completed(uuid, timestamptz) from authenticated;
grant execute on function public.record_rescan_completed(uuid, timestamptz) to service_role;
