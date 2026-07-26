-- Patient-directed, single-use doctor sharing without a global directory.

create table if not exists public.patient_share_tokens (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  organization_patient_id uuid not null,
  token_hash text not null unique,
  scope text not null
    check (scope in ('latest_report', 'selected_reports', 'longitudinal_record')),
  selected_report_ids uuid[] not null default '{}',
  consent_valid_until timestamptz,
  expires_at timestamptz not null,
  created_by uuid not null references public.profiles(id),
  accepted_at timestamptz,
  accepted_by_membership_id uuid references public.organization_memberships(id),
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (organization_patient_id, organization_id)
    references public.organization_patients(id, organization_id) on delete cascade,
  check (expires_at > created_at),
  check (consent_valid_until is null or consent_valid_until > created_at)
);

alter table public.patient_share_tokens enable row level security;
alter table public.patient_share_tokens force row level security;
drop policy if exists patient_share_tokens_owner_read on public.patient_share_tokens;
create policy patient_share_tokens_owner_read on public.patient_share_tokens
  for select to authenticated
  using (public.owns_organization_patient(organization_patient_id));

create or replace function public.create_patient_share_token(
  target_organization_patient_id uuid,
  share_scope text,
  share_selected_report_ids uuid[] default '{}',
  share_valid_until timestamptz default null,
  share_expires_at timestamptz default now() + interval '15 minutes'
)
returns table(share_token_id uuid, share_token text, expires_at timestamptz)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target public.organization_patients%rowtype;
  raw_token text := encode(gen_random_bytes(32), 'hex');
  new_id uuid;
begin
  select * into target from public.organization_patients
  where id = target_organization_patient_id;
  if target.id is null or not public.owns_organization_patient(target.id) then
    raise exception 'patient enrollment not found' using errcode = '42501';
  end if;
  if share_scope not in ('latest_report', 'selected_reports', 'longitudinal_record') then
    raise exception 'invalid share scope';
  end if;
  if share_scope = 'selected_reports'
    and cardinality(coalesce(share_selected_report_ids, '{}')) = 0
  then
    raise exception 'selected report scope requires reports';
  end if;
  if exists (
    select 1 from unnest(coalesce(share_selected_report_ids, '{}')) report_id
    where not exists (
      select 1 from public.reports r
      where r.id = report_id
        and r.organization_patient_id = target.id
        and r.status = 'released'
    )
  ) then
    raise exception 'one or more selected reports are invalid';
  end if;
  if share_expires_at <= now() or share_expires_at > now() + interval '24 hours' then
    raise exception 'invalid token expiry';
  end if;
  insert into public.patient_share_tokens (
    organization_id, organization_patient_id, token_hash, scope,
    selected_report_ids, consent_valid_until, expires_at, created_by
  ) values (
    target.organization_id, target.id,
    encode(digest(raw_token, 'sha256'), 'hex'), share_scope,
    coalesce(share_selected_report_ids, '{}'), share_valid_until,
    share_expires_at, auth.uid()
  ) returning id into new_id;
  return query select new_id, raw_token, share_expires_at;
end;
$$;
revoke all on function public.create_patient_share_token(
  uuid, text, uuid[], timestamptz, timestamptz
) from public;
grant execute on function public.create_patient_share_token(
  uuid, text, uuid[], timestamptz, timestamptz
) to authenticated;

create or replace function public.accept_patient_share_token(raw_token text)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  token_row public.patient_share_tokens%rowtype;
  doctor_membership uuid;
  patient_uuid uuid;
  consent_id uuid;
begin
  select * into token_row
  from public.patient_share_tokens pst
  where pst.token_hash = encode(digest(raw_token, 'sha256'), 'hex')
  for update;
  if token_row.id is null
    or token_row.accepted_at is not null
    or token_row.revoked_at is not null
    or token_row.expires_at <= now()
  then
    raise exception 'share token is invalid or expired' using errcode = '22023';
  end if;
  doctor_membership := public.active_membership_id(
    token_row.organization_id, array['doctor']
  );
  if doctor_membership is null then
    raise exception 'active doctor membership required' using errcode = '42501';
  end if;
  select op.patient_id into patient_uuid
  from public.organization_patients op
  where op.id = token_row.organization_patient_id;

  insert into public.consent_grants (
    patient_id, organization_id, grantee_membership_id, scope,
    selected_report_ids, valid_from, valid_until, created_by
  ) values (
    patient_uuid, token_row.organization_id, doctor_membership,
    token_row.scope, token_row.selected_report_ids, now(),
    token_row.consent_valid_until, token_row.created_by
  ) returning id into consent_id;

  update public.patient_share_tokens
  set accepted_at = now(), accepted_by_membership_id = doctor_membership
  where id = token_row.id;

  insert into public.outbox_events (
    organization_id, event_type, aggregate_type, aggregate_id,
    idempotency_key, payload
  ) values (
    token_row.organization_id, 'assignment_changed', 'consent_grant',
    consent_id, 'consent-created:' || consent_id::text,
    jsonb_build_object('consent_grant_id', consent_id)
  ) on conflict (idempotency_key) do nothing;
  return consent_id;
end;
$$;
revoke all on function public.accept_patient_share_token(text) from public;
grant execute on function public.accept_patient_share_token(text) to authenticated;

create or replace function public.revoke_consent_grant(
  target_consent_id uuid,
  reason text,
  request_id text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target public.consent_grants%rowtype;
begin
  select * into target from public.consent_grants
  where id = target_consent_id for update;
  if target.id is null or not public.owns_patient(target.patient_id) then
    raise exception 'consent grant not found' using errcode = '42501';
  end if;
  if target.revoked_at is null then
    update public.consent_grants
    set revoked_at = now(), revocation_reason = nullif(trim(reason), '')
    where id = target.id;
    insert into public.outbox_events (
      organization_id, event_type, aggregate_type, aggregate_id,
      idempotency_key, payload
    ) values (
      target.organization_id, 'consent_revoked', 'consent_grant', target.id,
      'consent-revoked:' || target.id::text,
      jsonb_build_object('consent_grant_id', target.id)
    ) on conflict (idempotency_key) do nothing;
    perform public.write_audit_event(
      target.organization_id, 'consent.revoked', 'consent_grant',
      target.id, target.patient_id, 'patient_request', request_id, '{}'::jsonb
    );
  end if;
end;
$$;
revoke all on function public.revoke_consent_grant(uuid, text, text) from public;
grant execute on function public.revoke_consent_grant(uuid, text, text) to authenticated;

