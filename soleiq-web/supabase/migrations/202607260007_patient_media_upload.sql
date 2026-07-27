-- 202607260007_patient_media_upload.sql
-- Patient screening-photo uploads under the caller's own session.
--
-- Migration 0003 dropped every legacy storage INSERT policy and created only
-- a READ policy for clinical-media, and the app relied on the service-role
-- key for uploads. This adds the missing INSERT policy so /api/screenings
-- can upload with the authenticated user's client: an upload is allowed only
-- into a screening session the caller initiated, for a patient identity they
-- own, while that session is still accepting media.
--
-- Object path convention (server/screenings.ts):
--   {organization_id}/{organization_patient_id}/{screening_session_id}/{file}
--
-- Idempotent: safe to re-run. Run in the Supabase SQL editor.

create or replace function public.can_upload_screening_media(
  object_bucket text,
  object_name text
)
returns boolean
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  path_session_id uuid;
begin
  if object_bucket <> 'clinical-media' then
    return false;
  end if;
  if auth.uid() is null then
    return false;
  end if;
  begin
    path_session_id := nullif(split_part(object_name, '/', 3), '')::uuid;
  exception when others then
    return false;
  end;
  if path_session_id is null then
    return false;
  end if;
  return exists (
    select 1
    from public.screening_sessions s
    where s.id = path_session_id
      and s.initiated_by = auth.uid()
      and s.status in ('draft', 'uploading')
      and public.owns_organization_patient(s.organization_patient_id)
  );
end;
$$;

revoke all on function public.can_upload_screening_media(text, text) from public;
grant execute on function public.can_upload_screening_media(text, text) to authenticated;

drop policy if exists clinical_media_patient_insert on storage.objects;
create policy clinical_media_patient_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'clinical-media'
    and public.can_upload_screening_media(bucket_id, name)
  );

-- Rollback cleanup: the same owner may delete objects from their own
-- still-open session (used when a failed save removes partial uploads).
drop policy if exists clinical_media_patient_delete on storage.objects;
create policy clinical_media_patient_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'clinical-media'
    and public.can_upload_screening_media(bucket_id, name)
  );
