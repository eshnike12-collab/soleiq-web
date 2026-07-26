# SoleIQ canonical architecture

## System shape

SoleIQ remains a Next.js and Supabase modular monolith. Browser components own
capture guidance and presentation. Hospital and clinical operations enter
through typed server modules and route handlers. PostgreSQL Row Level Security
independently enforces the same access boundary.

The Supabase service-role credential is limited to infrastructure work:

- uploading and downloading private worker media;
- consuming the analysis outbox;
- atomically persisting a validated worker result.

Ordinary profile, roster, patient, report, and review reads use the authenticated
user client and RLS.

## Entity relationships

```text
auth.users ──1:1── profiles
                    │
                    └── organization_memberships ── organizations ── facilities
                                      │                    │
patients ── organization_patients ────┼────────────────────┘
   │                 │                │
   │                 ├── care_team_assignments ── clinician membership
   │                 ├── screening_sessions
   │                 │      ├── media_assets
   │                 │      ├── analysis_runs
   │                 │      └── reports ── report_reviews
   │                 └── reports
   └── consent_grants ── grantee membership

organizations ── audit_events
organizations ── outbox_events
```

- A profile is a global identity and contains no global role or hospital.
- A membership supplies one role in one hospital. A user may have memberships
  in multiple hospitals.
- A patient UUID is the canonical patient identity. Linking to an auth user is
  optional and never uses email matching.
- An organization-patient UUID is the hospital-specific enrollment and the
  clinical routing identifier.
- Care-team assignments, patient consent, and actual data authorization are
  separate records and checks.
- Every clinical row stores `organization_id`; composite foreign keys reject
  cross-hospital relationships.

## Authorization

Reusable `security definer` functions have fixed search paths and perform
narrow lookups that do not depend on recursive RLS policy evaluation.

Patient access requires all of:

- the patient record is linked to the authenticated profile;
- the patient membership and hospital enrollment are active;
- a patient-facing report has status `released`.

Doctor clinical access requires all of:

- an active doctor membership at the report hospital;
- an active patient enrollment at the same hospital;
- either a current care-team assignment or a non-revoked, non-expired consent
  grant whose scope covers the requested report.

Hospital administration and clinical access are independent. Operational
administration requires `hospital_admin`; clinical access additionally requires
`phi_access`. Platform administration never implies PHI access.

Suspending a membership, ending an assignment, passing `ends_at`, or revoking a
consent grant changes authorization immediately because policies evaluate
current rows and `now()` on every request.

## Doctor–patient mapping

Hospital administrators create a `care_team_assignment` between one
`organization_patient` and one doctor membership in the same organization. The
relationship and validity interval are explicit. Patients cannot create or
modify this clinical relationship.

Patient-directed sharing uses a separate `consent_grant`. A patient creates a
short-lived, single-use token/QR for one hospital enrollment. Only a signed-in,
active doctor at that hospital can accept it. This replaces the global doctor
directory and avoids exposing doctor names or emails across hospitals.

## Screening and report lifecycle

```text
draft → uploading → analyzing → preliminary
                              → failed
preliminary → clinician_reviewed → released
                             ↘ escalated review event
```

Cancellation and failure are explicit session states. A patient save:

1. resolves one active hospital enrollment;
2. creates or resumes an idempotent screening session;
3. uploads four photos to a private organization/enrollment/session path;
4. registers media rows with checksums;
5. atomically enqueues `analysis_requested`.

The worker downloads private assets, invokes an `AnalysisProvider`, validates
the versioned structured result, applies deterministic safety rules, and calls
one worker-only transaction. That transaction creates the analysis run,
preliminary immutable report, urgent outbox event when needed, and advances the
session.

Report content is immutable. A review adds a `report_review`; lifecycle fields
advance without rewriting the clinical or patient summaries. Release is an
audited transaction and is the only state visible to the patient.

## Media

Canonical images live in the private `clinical-media` bucket. No public or
long-lived URL is stored. The media API first reads the canonical media row
through RLS, records an audit event, and returns a ten-minute signed URL.
Storage RLS uses the same canonical media authorization function for direct
authenticated reads.

## Migration decisions

The canonical migrations are independently ordered and safe to apply to a
fresh project. On an existing installation they:

1. add canonical entities;
2. backfill memberships from legacy profile roles;
3. link legacy patients and create hospital enrollments;
4. convert visits, captured images, and analysis results;
5. retain separate legacy scans as traceable sessions where possible;
6. remove global profile role/organization columns;
7. leave legacy tables with no browser policies for rollback verification.

Legacy signed URLs are not copied. Legacy completed reports are released during
backfill to preserve patient history. Deployment should validate counts and
checksums before scheduling later removal under the retention policy.

