# SoleIQ Web

SoleIQ is a hospital-aware foot-screening platform for patients, doctors, and
hospital administrators. It uses Next.js 15, TypeScript, Tailwind, Supabase
Auth/PostgreSQL/RLS/Storage, Zustand, and server-side AI analysis.

The guided questionnaire, local photo-quality checks, and four-photo capture
flow remain in the patient experience. Canonical hospital persistence,
authorization, analysis, reports, reviews, and access auditing live behind
server application services with PostgreSQL RLS as the final boundary.

## Core routes

| Route | Purpose |
| --- | --- |
| `/` | Guided patient questionnaire and four-photo check |
| `/home` | Patient hospital connections and released report history |
| `/records/[reportId]` | Exact released patient report |
| `/access` | Care-team and consent access management |
| `/h/[hospitalSlug]/doctor` | Authorized clinical worklist |
| `/h/[hospitalSlug]/patients/[organizationPatientId]` | Authorized longitudinal record |
| `/h/[hospitalSlug]/patients/[organizationPatientId]/reports/[reportId]` | Exact clinical report |
| `/h/[hospitalSlug]/admin` | Hospital administration |
| `/h/[hospitalSlug]/admin/staff` | Invitations and doctor verification |
| `/h/[hospitalSlug]/admin/patients` | Hospital enrollment |
| `/h/[hospitalSlug]/admin/assignments` | Care-team relationships |
| `/h/[hospitalSlug]/admin/audit` | Audit viewer |
| `/h/[hospitalSlug]/admin/settings` | Hospital and facilities |
| `/platform` | Platform hospital provisioning |

Opaque UUIDs identify clinical resources. URLs never use auth UIDs, MRNs,
emails, storage paths, or patient names.

## Local setup

Requirements: Node.js 22+, npm 10+, and a Supabase project. From this directory:

```bash
npm install
cp .env.local.example .env.local
npm run dev
```

Environment:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR-PUBLISHABLE-KEY
SUPABASE_SERVICE_ROLE_KEY=SERVER_ONLY
ANTHROPIC_API_KEY=SERVER_ONLY
```

The service role is used only for private media infrastructure and the analysis
worker. Never prefix it with `NEXT_PUBLIC_`.

## Canonical migrations

For a fresh database, apply these timestamp migrations in order:

1. `202607260001_canonical_platform.sql`
2. `202607260002_legacy_backfill.sql`
3. `202607260003_authorization_and_workflows.sql`
4. `202607260004_patient_directed_sharing.sql`
5. `202607260005_blog_compatibility.sql`

The backfill is a no-op on a fresh database.

For an existing SoleIQ database, first confirm the historical files in
`supabase/legacy/` that were used by the prior release have already been
applied, take a backup, then apply the same five canonical migrations. Never
apply files from `supabase/legacy/` to a fresh database or after the canonical
authorization migration.

The legacy tables remain for reconciliation but lose browser policies. Compare
legacy and canonical patient, visit, media, and result counts before scheduling
their removal.

### Login troubleshooting

If every authenticated account appears to land on the patient home, verify the
database before changing redirect logic. The application routes staff from
active `organization_memberships`; it never trusts the role selected on the
login screen. Apply the five canonical migrations above when
`organization_memberships` is missing. Migration `202607260002` converts the
existing `profiles.role` and `profiles.organization_id` values into scoped
memberships before migration `202607260003` removes those legacy columns.

The UI deliberately shows **Platform setup required** when the canonical
tables or columns are absent. It must not silently interpret a database error
as a patient account.

## First platform administrator

There is no email allow-list or self-selected administrator role. Bootstrap the
first platform administrator from a trusted SQL/operator context using an
already-created auth user UUID:

```sql
begin;
insert into public.organizations (
  id, legal_name, display_name, slug, timezone, status
) values (
  gen_random_uuid(), 'SoleIQ Platform', 'SoleIQ Platform',
  'soleiq-platform', 'America/New_York', 'active'
) returning id;

-- Use the returned organization UUID and the immutable auth.users UUID.
insert into public.organization_memberships (
  organization_id, user_id, role, status, permissions, accepted_at
) values (
  'ORGANIZATION_UUID', 'AUTH_USER_UUID', 'admin', 'active',
  '{"platform_admin":true,"hospital_admin":true,"phi_access":false}', now()
);
commit;
```

Do not look up or promote the account by email.

## Tests and validation

```bash
npm run test
npm run typecheck
npm run lint
npm run build
```

With a local Supabase/Docker environment:

```bash
supabase db reset
supabase test db supabase/tests/authorization_matrix.sql
```

The SQL matrix covers patient isolation, assigned/unassigned and
cross-hospital doctors, expired assignments, revoked consent, suspended
memberships, admin PHI permission, platform-admin PHI denial, and private media.

## Analysis worker

Patient save creates an idempotent screening session, private media records, and
an `analysis_requested` outbox event. `server/workers/analysis-worker.ts`
provides the development/managed-queue-compatible consumer contract.
`server/providers/analysis.ts` isolates the model provider. Worker output is
schema validated, safety wrapped, and persisted atomically as a preliminary
versioned report. Failed analysis never becomes a completed report.

## Architecture and operations

- [Repository audit](./docs/phase-0-repository-audit.md)
- [Architecture and authorization](./docs/architecture.md)
- [Operations and compliance expectations](./docs/operations-and-compliance.md)

SoleIQ is screening support, not a diagnosis. The documented controls do not by
themselves establish HIPAA compliance; vendor, contractual, organizational,
clinical-safety, and operational requirements remain.
