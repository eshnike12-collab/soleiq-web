-- 202607260008_feedback.sql
-- Feedback from patients and doctors to the platform care team.
--
-- Any authenticated user may file feedback about themselves; only the
-- platform operator (is_platform_admin) may read it. Email delivery is
-- handled by the API route; this table is the durable record so feedback
-- is never lost when email isn't configured.
--
-- Idempotent: safe to re-run. Run in the Supabase SQL editor.

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'patient',
  category text not null check (category in ('bug', 'question', 'suggestion')),
  message text not null check (char_length(message) between 1 and 4000),
  contact_email text,
  created_at timestamptz not null default now()
);

create index if not exists feedback_created_idx on public.feedback (created_at desc);

alter table public.feedback enable row level security;

drop policy if exists feedback_insert_own on public.feedback;
create policy feedback_insert_own on public.feedback
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists feedback_platform_read on public.feedback;
create policy feedback_platform_read on public.feedback
  for select to authenticated
  using (public.is_platform_admin());
