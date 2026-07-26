-- Reports must reference their screening session directly. Without this
-- relationship PostgREST cannot embed screening_sessions from reports, and
-- the schema allowed a report whose session id had no matching session.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'reports_screening_session_id_organization_id_fkey'
  ) then
    alter table public.reports
      add constraint reports_screening_session_id_organization_id_fkey
      foreign key (screening_session_id, organization_id)
      references public.screening_sessions(id, organization_id)
      on delete restrict;
  end if;
end;
$$;
