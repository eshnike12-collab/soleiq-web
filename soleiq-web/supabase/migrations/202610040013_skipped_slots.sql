-- 202610040013_skipped_slots.sql
-- Record the views a patient could not photograph, and why.
--
-- THE BUG THIS CLOSES
--
-- The capture flow has always let a patient skip a view — amputation, a
-- dressing, limited reach — and required only that every slot be RESOLVED
-- (photographed or skipped) with at least one real photo. The save path never
-- learned that: it sent only the photos taken, while the API required exactly
-- four. So every skipped check failed validation with a 400 and could not be
-- saved at all. The skip button worked; submitting afterwards did not.
--
-- Storing the skips is what lets the save accept fewer than four photos
-- without losing the fact that a view is MISSING rather than NORMAL — a
-- distinction that matters on a report a clinician reads.
--
-- Shape: [{"side":"left","view":"sole","reason":"Amputation"}, ...]
-- `reason` is the patient's own words and may be absent; it is never required.
--
-- Idempotent: safe to re-run. Run in the Supabase SQL editor.

alter table public.screening_sessions
  add column if not exists skipped_slots jsonb not null default '[]'::jsonb;

comment on column public.screening_sessions.skipped_slots is
  'Views the patient explicitly skipped, with their stated reason. [] when none. A skipped view is MISSING, not normal.';
