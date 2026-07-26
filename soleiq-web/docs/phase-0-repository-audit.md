# Phase 0 repository audit

Date: 2026-07-26

## Current application

The active product is the Next.js 14 application in `soleiq-web/`. The sibling
Vite projects are legacy marketing, dashboard, admin, and hardware demos and
are outside this migration.

The patient flow is a Zustand-driven questionnaire and four-photo capture
experience. It performs local quality checks, calls `/api/foot-analysis` for a
four-image Anthropic analysis, shows the patient result in memory, and saves a
completed visit only when the patient chooses to add it to their timeline.
That working capture path must remain available while persistence moves behind
the canonical screening service.

## Effective legacy schema and order

The README currently asks operators to apply:

1. `supabase/schema.sql`
2. `supabase/2026-05-roles-and-orgs.sql`
3. `supabase/2026-05-blog-posts.sql`
4. `supabase/2026-05-product-updates.sql`
5. `supabase/2026-07-photo-screening.sql`

Three additional files in `supabase/migrations/` are required by current
application code but are not included in that documented order:

1. `2026-07-auth-rbac.sql`
2. `2026-07-patient-share.sql`
3. `2026-07-scans.sql`

Those filenames are not Supabase timestamp migration names, so a normal fresh
`supabase db reset` is not a reliable representation of the documented setup.
The new canonical migrations use ordered timestamp filenames, create their own
prerequisites, and can run against either the legacy schema or a fresh project.

## Legacy entities and flows

- `profiles` combines global identity, one global role, and one organization.
- `organizations` contains only a slug and name.
- `patients.auth_uid` is treated as the patient business identity.
- `visits`, `captured_images`, and `analysis_results` are the saved four-photo
  timeline.
- `scans` is a second append-only, per-image AI persistence path written by the
  service-role-backed `/api/analyze` route.
- `doctor_patient_assignments` links auth/profile IDs, has no organization,
  status, validity period, relationship, or assignment history.
- `captured_images` uses the private `foot-photos` bucket and one-hour signed
  URLs minted in the browser.
- `scans` uses the private `foot-scans` bucket but stores a seven-day signed URL
  in the database and response.

## Authorization findings

- A fixed email is promoted to administrator in a database trigger.
- Browser signup metadata can create a doctor profile.
- Every new user is assigned to the `soleiq` organization.
- Any signed-in user can read a global doctor directory.
- A patient can create a doctor assignment directly.
- Administrators can change global profile roles from browser code.
- Administrators receive unrestricted clinical access.
- Doctor access is based on auth UID rather than hospital enrollment.
- Several client helpers translate an authorization failure into an empty list.
- Most clinical reads and writes run directly from browser code.
- Storage authorization is based on an auth UID path segment rather than a
  hospital enrollment and screening session.
- Report views, exports, assignment changes, and image views are not audited.

## Migration strategy

1. Add canonical identities, hospital memberships, facilities, invitations,
   enrollments, care assignments, consent, screening sessions, media,
   versioned analysis, reports, reviews, audit, and outbox tables.
2. Backfill memberships from legacy profile roles without continuing to use
   profile role or organization fields for authorization.
3. Backfill organization-patient enrollments from legacy patients.
4. Backfill visits, captured images, and analysis results into canonical
   screening sessions, media assets, analysis runs, and released reports.
5. Backfill `scans` independently and retain legacy tables as read-only
   compatibility data until deployment verification and retention review.
6. Replace recursive table-policy lookups with narrow `security definer`
   authorization functions with fixed search paths.
7. Deny ordinary browser writes to canonical media and analysis tables; use
   authenticated server application services and narrow database functions.
8. Move clinical UI reads to hospital-aware server routes. Keep the old routes
   as redirects or compatibility surfaces during rollout.
9. Stop all new writes to `visits`, `analysis_results`, and `scans` after the
   canonical save endpoint is active.

## Affected surfaces

- `supabase/migrations/`: canonical schema, backfill, authorization, storage.
- `supabase/tests/`: authorization and storage matrix.
- `server/`: authentication, tenancy, memberships, patients, care team,
  consent, screenings, reports, audit, structured errors, and rate limiting.
- `app/api/`: hospital-scoped management and clinical handlers.
- `app/h/[hospitalSlug]/`: hospital admin and doctor experiences.
- `app/home`, patient access/history routes, and login/onboarding.
- `lib/auth.ts`, `lib/db.ts`, and save orchestration.
- `next.config.js`, environment documentation, architecture and operations docs.

## Phase verification

Each phase must keep `npm run typecheck`, unit tests, and `npm run build`
passing. Database verification consists of fresh migration application plus the
SQL authorization matrix in a local Supabase environment when Docker/Supabase
CLI is available.
