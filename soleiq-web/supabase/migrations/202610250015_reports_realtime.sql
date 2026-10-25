-- 202610250015_reports_realtime.sql
-- Publish `reports` so a released result reaches an open dashboard.
--
-- WHY THIS IS REQUIRED, NOT OPTIONAL
--
-- A client can subscribe to postgres_changes on any table and the channel
-- will report SUBSCRIBED whether or not the table is published. It simply
-- never delivers an event. Without this migration the whole Realtime path is
-- a silent no-op and only the polling fallback ever fires — which looks like
-- working software with a mysterious few-seconds lag.
--
-- REPLICA IDENTITY FULL is set deliberately. Realtime applies the subscriber's
-- RLS to each change, and for an UPDATE it needs the OLD row to do that. With
-- the default (primary key only) the old row is just an id, the policy cannot
-- be evaluated against it, and updates are dropped rather than delivered.
-- The release of a report IS an update, so without this the one event that
-- matters most never arrives.
--
-- The cost is write amplification: the WAL carries the whole previous row on
-- every update. `reports` is written once per check and updated once on
-- release, so that is a few rows a day per patient — not a hot table.
--
-- NO POLICY IS WIDENED HERE. Realtime enforces exactly the SELECT policies
-- that already exist; publishing a table grants nobody anything they could
-- not already read.
--
-- Idempotent: safe to re-run. Run in the Supabase SQL editor.

alter table public.reports replica identity full;

do $$
begin
  -- `alter publication ... add table` errors if the table is already a member,
  -- so membership is checked first to keep this re-runnable.
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'reports'
  ) then
    alter publication supabase_realtime add table public.reports;
  end if;
end
$$;

comment on table public.reports is
  'Published to supabase_realtime so a released result reaches open dashboards without a refresh. Realtime applies the existing RLS SELECT policies unchanged.';
