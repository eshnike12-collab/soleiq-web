-- Four-photo foot screening: private object storage and structured results.
-- Run after the earlier schema and migration files. Idempotent where possible.

alter table public.captured_images
  alter column data_url drop not null;

alter table public.captured_images
  add column if not exists storage_path text,
  add column if not exists quality jsonb;

alter table public.analysis_results
  add column if not exists screening_level text
    check (screening_level in ('clear', 'watch', 'see_someone_soon', 'urgent')),
  add column if not exists screening_result jsonb;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'foot-photos',
  'foot-photos',
  false,
  15728640,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists foot_photos_insert_own on storage.objects;
create policy foot_photos_insert_own on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'foot-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists foot_photos_select_own on storage.objects;
create policy foot_photos_select_own on storage.objects
  for select to authenticated
  using (
    bucket_id = 'foot-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists foot_photos_delete_own on storage.objects;
create policy foot_photos_delete_own on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'foot-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
