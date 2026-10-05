-- 202609200012_capture_time_zone.sql
-- Record WHERE a photo was taken, not just when.
--
-- `captured_at` is a timestamptz and has always stored the correct instant.
-- What was missing is the timezone that instant should be read back in. An
-- instant alone cannot answer "what time did the patient see on their clock
-- when they took this", and that is the only question anybody actually asks
-- of a photo timestamp.
--
-- Without it the reader's own zone is the fallback, which is right for a
-- patient at home and wrong for a patient who travels and for every clinician
-- reviewing from another country.
--
-- IANA names ("America/New_York"), not offsets. An offset loses daylight
-- saving: -05:00 in January and -04:00 in July are the same place, and a
-- stored offset cannot tell you which place it was.
--
-- Nullable on purpose. Rows written before this migration have no zone and
-- must keep rendering — the UI falls back to the reader's device, which is
-- exactly what it did before.
--
-- Idempotent: safe to re-run. Run in the Supabase SQL editor.

alter table public.media_assets
  add column if not exists captured_time_zone text;

comment on column public.media_assets.captured_time_zone is
  'IANA timezone of the device that took the photo, e.g. America/New_York. Null for rows captured before 2026-09-20.';

-- The patient's own timezone, for anything rendered where no browser exists.
-- Email is the case that matters: a reminder or a results notice formatted in
-- UTC can show the wrong DAY for a capture taken late in the evening.
--
-- Refreshed from the device on each completed check rather than asked for in
-- a settings screen, because a timezone nobody maintains is worse than no
-- timezone at all.
alter table public.profiles
  add column if not exists time_zone text;

comment on column public.profiles.time_zone is
  'IANA timezone last seen from this user''s device. Used for server-side rendering with no browser, principally email.';
