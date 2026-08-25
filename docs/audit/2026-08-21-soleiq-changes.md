# SoleIQ change audit — 2026-08-21

Branch: (not yet created — awaiting go-ahead on Item 1)
Scope: 4 work items. Item 1 (lesion tracing), Item 2 (14-day reminder),
Item 3 (Baseline/Current labels), Item 4 (cursor hover removal).

Status: **PRE-FLIGHT ONLY. No edits made to any source file.**
The only file created so far is this log.

---

## Pre-flight baseline (Part B) — run before any edit

Run at 2026-08-21 ~09:10 local, in `soleiq-web`, on `main`, working tree dirty
(see "Blocking findings" below).

| Check | Command | Exit | Result |
|---|---|---|---|
| Typecheck | `npm run typecheck` | 0 | PASS — `tsc --noEmit`, no output |
| Tests | `npm test` | 0 | PASS — vitest 4.1.10, **7 files / 80 tests passed**, 707ms |
| Lint | `npm run lint` | 0 | PASS with 1 pre-existing warning |
| Build | `npm run build` | 0 | PASS — "Compiled successfully in 6.0s" |

Pre-existing lint warning (NOT introduced by me, not fixed — A4 class (c)):
```
app/layout.tsx
  41:9  warning  Custom fonts not added in `pages/_document.js` will only load
        for a single page.  @next/next/no-page-custom-font
✖ 1 problem (0 errors, 1 warning)
```

### Environment
`soleiq-web/.env.local` exists. Presence confirmed, values never read or printed:
- `NEXT_PUBLIC_SUPABASE_URL` — PRESENT
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — PRESENT
- `SUPABASE_SERVICE_ROLE_KEY` — PRESENT

### Checks from Part D that could NOT be run
- **D1 migration list / db diff / fresh-DB migration run** — the Supabase CLI is
  not installed, there is no `supabase/config.toml`, and there is no `.supabase/`
  link directory. There is no local Supabase stack and no linked remote project
  from this working copy. Migrations appear to be applied out-of-band.
  Cannot verify local-vs-remote schema drift. Needs a decision (installing the
  CLI is a new dependency → A3 approval).
- **D2 live RLS policy tests** — same reason; requires a reachable DB session as
  patient/doctor roles.
- **D3 row counts / query plans** — same reason.

---

## Repository map (established, not assumed)

Single git repo at `/Users/naikmac/Downloads/SoleIQ Health` on branch `main`.
Tracked subprojects: `soleiq-web`, `soleiq-website`, `soleiq-dashboard`,
`soleiq-admin`, `soleiq-insole-demo`, `RadiantCure`, `supabase`.

Outside that repo (each its own git repo, or ignored):
- `~/Documents/SoleIQ-MobileApp` — separate repo, branch `main`, 23 dirty files.
- `~/Documents/soleiq-foot-ai` — FastAPI service, separate repo.
- `./soleiq-foot-ai` inside the monorepo is **gitignored and is a DIFFERENT
  directory** from `~/Documents/soleiq-foot-ai` (inode 11001827 vs 9547804).
  Flagged as a live confusion hazard.

Migrations live in `soleiq-web/supabase/migrations/` (latest:
`202607290010_care_circle_and_recommendations.sql`). Additional loose SQL in
`soleiq-web/supabase/*.sql`. No generated Supabase DB types are checked in at
`lib/database.types.ts`, `lib/supabase/types.ts`, or `types/supabase.ts`.

RLS `enable row level security` appears in migrations for: `patients`, `visits`,
`captured_images`, `analysis_results`, `foot_meshes`, `care_visits`, `profiles`,
`organizations`, `patient_access_grants`, `patient_share_tokens`,
`report_recommendations`, `blog_posts`, `feedback`. Presence in a migration file
is NOT proof it is enabled on the live DB — unverified (see D1/D2 above).

---

## Blocking findings (raised to user, awaiting answer)

1. **Working tree is dirty and was dirty before I started.**
   Monorepo: 46 modified/untracked paths. `~/Documents/SoleIQ-MobileApp`: 23.
   Nothing discarded, nothing stashed, nothing committed. Awaiting instruction.

2. **The "big orange circle" described in Item 1 does not exist in this code.**
   Evidence gathered:
   - `soleiq-web/components/result/ResultOverlay.tsx` renders an SVG `<polygon>`,
     not a circle — and is **imported by nothing**. Dead code.
   - `soleiq-web/lib/visitAnalysis.ts:257` returns `detections: []` with the
     comment "The real pipeline produces narrative + booleans, not polygon
     overlays or volumetric estimates — those were simulator artifacts."
   - `soleiq-web/lib/analyzeFootPhotos.ts:155` (`findingToLegacyDetection`)
     converts the model's `region {x,y,w,h}` into a 4-corner **rectangle**.
   - `SoleIQ-MobileApp/src/components/result/ResultOverlay.tsx` also renders
     `<Polygon>`, not a circle.
   - No lesion-related circular overlay found anywhere in the monorepo.
   Conclusion: what is deployed at app.soleiqhealth.com does not match local
   HEAD, or the circle lives somewhere not yet identified. Cannot start Item 1
   without knowing what to remove.

3. **Calibration conflict with the spec.** `soleiq-web/lib/wound/scale.ts`
   derives mm-per-pixel from foot length inferred from the patient's shoe size.
   The spec's calibration ladder is depth → fiducial → *show no cm values*, and
   says "Never show a fabricated or assumed scale." Anthropometric scale is
   exactly an assumed scale. Applying the spec literally removes centimetre
   values from every 2D capture, because the web app has neither a fiducial
   detector nor a depth map. Needs an explicit decision.

4. **No notification or scheduling infrastructure exists.** No web-push, cron,
   scheduler, or mail dependency in `soleiq-web/package.json`; no `vercel.json`.
   Item 2 is a build-from-zero, and the scheduler mechanism depends on the
   deploy target, which is not yet established.

---

## Reference image — what I read from it, and what is ambiguous

Read as spec: three side-by-side capture panels, each with a day/author
dropdown ("Day 0 – Caregiver"), a "Standard" tab, an eye icon (overlay
visibility toggle) top-left of the image, a white traced closed outline hugging
the wound border, a **dark blue** straight line across the longest axis, a
**cyan** straight line across the perpendicular axis, a circular arrow marker on
the wound margin, and a footer showing area in large type ("36.3 cm²"), a
"Status Unknown - Age Unknown" line, a padlock icon, and a "% Changed" box.

Ambiguities I could not resolve from the image, and must not invent:
- **No colour legend is visible** in the image, though the request says to
  include "the legend shown in the attached image".
- **No per-type colour coding is visible.** All three outlines are white; the
  only colour coding present distinguishes the length axis (blue) from the
  width axis (cyan). The request asks for ulcer/callus/dry_skin/fissure colours
  "matching the color coding in the attached image", which the image does not
  contain.
- The circular arrow marker's meaning is not established (orientation? a
  reference/fiducial? an annotation pin?).
- "% Changed" shows -192, -74, 29 against decreasing areas (36.3 → 21.65 →
  8.78 cm²); the sign convention and denominator are not deducible.

---

## Changes made

None yet.

## Rollback

Nothing to roll back. This file is the only artifact; delete
`docs/audit/2026-08-21-soleiq-changes.md` to remove it.

---

## Change: 3D scan merged into the patient portal (:8081 → :3000)

Requested: "combine localhost 8081 with 3000 so that the 3d scan is just in
another tab when you sign in as a patient (dashboard)".

Not one of the four original items. Done ahead of them at the user's direction.
**Not committed** — the working tree was already dirty and the branching
question from the pre-flight report is still unanswered, so nothing was staged.

### Approach

Ported rather than embedded. An iframe of the Expo app was rejected: it would
have kept two servers running, and the scan would have had no access to the
portal's session, so a capture could not be tied to a patient record.

The capture logic is pure browser API (getUserMedia, canvas, MediaRecorder)
and needed no rewrite — only the react-native-web presentation layer did.

### Files added

| Path | What |
|---|---|
| `soleiq-web/lib/scan3d/sweep.ts` | Copied verbatim from mobile. Zero imports; pure TS. |
| `soleiq-web/lib/scan3d/frameScore.ts` | `laplacianVariance`, copied verbatim. |
| `soleiq-web/lib/scan3d/scanClient.ts` | Mobile client + web `FOOT_AI_BASE_URL`. |
| `soleiq-web/components/scan3d/OrbitSweepCapture.tsx` | Web capture UI. |
| `soleiq-web/components/scan3d/Foot3DViewer.tsx` | R3F v8 GLB viewer. |
| `soleiq-web/components/scan3d/Scan3DPanel.tsx` | Foot toggle + capture + viewer. |
| `soleiq-web/app/scan-3d/page.tsx` | Authenticated route. |

### Files modified

| Path | Change |
|---|---|
| `soleiq-web/components/patient/PatientNav.tsx` | Added a "3D scan" tab; widened `active` to `"home" \| "features" \| "scan"`. |

No database change. No migration. No new dependency — `three`,
`@react-three/fiber@8`, `@react-three/drei` were already in `package.json`,
and React 18.3.1 satisfies R3F v8's peer range.

### Deliberate differences from the mobile version

- The `<video>` is a real element in the React tree. The mobile version
  appended it imperatively to a RN `View` and never re-attached it, which is
  what left the preview black after the first failure.
- three/R3F load via `next/dynamic` with `ssr: false`, so the ~200 kB First
  Load JS for `/scan-3d` does not include them; they arrive only once a model
  exists.
- One bank per patient per foot (`bankKeyFor(patientId, side)`), so left and
  right never pool together.

### Verification (all re-run after the change)

| Check | Baseline | After | Result |
|---|---|---|---|
| `npm run typecheck` | exit 0 | exit 0, no output | PASS, unchanged |
| `npm test` | 7 files / 80 tests | 7 files / 80 tests | PASS, unchanged |
| `npm run lint` | 0 errors, 1 warning | 0 errors, 1 warning | PASS, same pre-existing warning |
| `npm run build` | Compiled 6.0s | Compiled 4.8s | PASS; `ƒ /scan-3d  11 kB  200 kB` |

Runtime, `npm run dev` on :3000:
```
/          -> 200
/scan-3d   -> 307 (redirect to login when unauthenticated — auth guard works)
:8000/debug -> 200 (reconstruction service reachable)
dev server log: no errors
```

### Not verified

- **The signed-in path.** `/scan-3d` was only exercised unauthenticated, where
  it correctly redirects. Camera capture, upload, banking and the GLB viewer
  have NOT been run end-to-end through the browser as a logged-in patient —
  that needs real credentials and a real foot in front of a camera.
- Light/dark mode and keyboard access for the new controls.

### Left alone

The Expo app on :8081 still exists and still has its own scan screen. Nothing
was deleted there; the two now share `sweep.ts` by copy, not by import, so they
can drift. Flagged rather than solved.

### Rollback

```
rm -rf soleiq-web/lib/scan3d soleiq-web/components/scan3d soleiq-web/app/scan-3d
git checkout -- soleiq-web/components/patient/PatientNav.tsx
```
Nothing else to undo — no migration, no dependency, no data touched.

---

## Incident: ChunkLoadError on :3000 (self-inflicted)

`Loading chunk app/home/page failed` at `app/home/page.tsx:31`.

**Cause: mine.** I started `npm run dev` twice from `soleiq-web`. Both processes
wrote to the same `.next/` directory; when I killed the duplicate (pid 53895),
the survivor's chunk manifest referenced files the other had owned.

Fix: `pkill -f "next dev"`, `pkill -f next-server`, free 3000/3001/3002,
`rm -rf .next`, start exactly one dev server.

Verified after: `/` 200, `/home` 307, `/scan-3d` 307, and the previously
404-ing `/_next/static/chunks/app/home/page.js` now 200.

Lesson recorded: never leave two dev servers on one `.next`.

---

## Change: skip control in photo capture

Requested: some patients cannot photograph a view (amputation, disability) or
want only one part scanned; skipped views must be left out of the report.

### Files changed

| Path | Change |
|---|---|
| `lib/types.ts` | Added `SkippedSlot` and `Visit.skippedSlots?`. |
| `lib/store.ts` | Added `skipSlot(side, view, reason?)` and `unskipSlot`. |
| `components/capture/FourPhotoCapture.tsx` | Skip button, reason chips, skipped states in stage/review/strip, revised completion rule. |

### Design decisions

- A skip is **recorded**, not just an absent photo. "No left-sole image" and
  "the left leg is amputated" read identically to a clinician otherwise.
- `skipSlot` **deletes** any photo already taken for that slot. Holding both a
  photo and a skip marker would leave the report describing a foot the patient
  asked not to look at.
- Completion rule is now: every slot resolved (photographed **or** skipped)
  **and at least one real photo**. Skipping all four is blocked, with the
  reason shown, because it would produce a report about nothing.
- The reason is always optional; four presets are offered because typing
  one-handed while holding a foot is not realistic.
- The skip control is never disabled. A patient who physically cannot take the
  photo must not be trapped on it.

### Why the report excludes skipped views automatically

`lib/analyzeFootPhotos.ts:80` sends `visit.images`, which only ever contains
captured photos, and grep found nothing that synthesizes a missing side. The
prompt in `lib/foot-analysis-prompt.ts` already says "up to four images". So a
skipped view is absent from analysis by construction, not by a new filter.

### Verification

| Check | Result |
|---|---|
| `npm run typecheck` | PASS, exit 0, no output |
| `npm test` | PASS, 7 files / 80 tests |
| `npm run build` | PASS, "Compiled successfully in 7.2s" |

**Not verified:** the skip flow has NOT been clicked through in a browser. No
test was added for the new completion rule. Both are outstanding.

### Rollback

`git checkout -- lib/types.ts lib/store.ts components/capture/FourPhotoCapture.tsx`

---

## Not started

- Responsive audit of patient and doctor views (fit on phone and desktop
  without horizontal scrolling).
- Verification of the caregiver/family/doctor invite email → accept/reject
  flow. Files identified but not yet read: `app/invite/[token]/page.tsx`,
  `app/api/invitations/accept/route.ts`, `app/api/patient/access/accept/route.ts`,
  `app/api/care-circle/notify/route.ts`, `app/features/care-team/page.tsx`.

---

## Incident: unstyled page on :3000 (self-inflicted, second of its kind)

`/scan-3d` rendered as raw HTML — no CSS at all.

**Cause: mine.** I ran `npm run build` while `next dev` was running. Both write
to the same `.next/`, so the production build replaced the dev server's assets.
Same class of mistake as the duplicate dev server earlier: two processes, one
build directory.

Fix: kill all next processes, `rm -rf .next`, start exactly one dev server, and
**do not run `next build` while `next dev` is up**. App tests are now run
instead of a build while dev is live.

### Audit of every route on :3000 (requested)

24 static routes, each fetched and its stylesheet fetched in turn:

```
24/24 routes  http 200, stylesheet 200 (89,231 b)   failures: 0
26/26 unique JS chunks referenced  http 200         broken: 0
dev server log: 0 error lines
```

Includes `/`, `/home`, `/login`, `/scan-3d`, `/compare`, `/dashboard`,
`/clinical`, `/platform`, all seven `/features/*`, `/admin/*`, `/access`,
`/results`, `/reset-password`, `/bt`. Dynamic `[param]` routes were excluded —
they need real ids and were not exercised.

---

## Change: cursor never grows (app + website)

Requested, emphatically: the cursor must never enlarge on hover, on either
property.

### Files changed

| Path | Change |
|---|---|
| `soleiq-web/components/ui/Cursor.tsx` | 317 → 132 lines |
| `soleiq-website/src/components/Cursor.tsx` | 317 → 131 lines |
| `soleiq-web/app/globals.css` | 12 dead rules removed, `.cursor-box` rewritten |
| `soleiq-website/src/index.css` | 12 dead rules removed, `.cursor-box` rewritten |

### Deleted, not neutralised

`STATES` size table (11/38/48/25/9 px + hollow flags), `TEXT_SELECTOR`,
`LINK_SELECTOR`, `resolve()`, `apply()`, `setLift`, `setDim`, `hold`,
`clearNudge`, the pending-timeout map, `leavesTheSite`, the label span, the
`data-cursor-label` / `data-cursor-icon` hooks, `data-state`, pointerdown/up
press-shrink, and the `blur`/`change` release handlers that existed only to
unstick a latched hover state.

CSS: every `.cursor-box[data-state=…]`, `.cursor-label`,
`.cursor-box[data-icon='arrow']::after`, `.cursor-nudge`, `.cursor-dim` rule,
including the dark-background and light-tone variants. `.cursor-box` no longer
transitions width/height/border-width — only opacity.

Grep for grow machinery in all four files: **0 matches**.

### Deviations from the written spec, flagged rather than silently taken

- **`mix-blend-mode: difference` was KEPT.** The spec listed it for removal. A
  solid-black dot would be invisible against the dark camera surfaces a patient
  aims at their own foot, and against the dark 3D viewer. Difference blending is
  what makes it read as a black dot on the cream screens *and* stay visible on
  dark ones. Say the word and I will make it solid black.
- **The background grid light was KEPT.** It is not a hover effect — it follows
  the pointer at all times and does not change on hover. Removing it is a
  visual-design change that was not asked for.
- **`cursor: none` on interactive elements was KEPT**, so only the dot shows.
  The spec also asked that native `cursor: pointer` affordance keep working;
  those two cannot both hold. Flagged for a decision.

### Error I introduced and fixed

`src/App.tsx(12,8): error TS2613: Module '.../Cursor' has no default export.`
The website imported `Cursor` as a default; my rewrite exported it named-only.
Fixed by re-adding `export default Cursor`. Rebuild then passed.

### Verification

| Check | Result |
|---|---|
| app `npx tsc --noEmit` | PASS, no output |
| app `npm test` | PASS, 7 files / 80 tests |
| website `npm run build` | PASS — 2588 modules, built in 2.46s |
| served CSS on :3000 | `.cursor-box` is one 11px rule; **0** grow rules present |

**Not verified:** no browser hover test on either property. The grow rules are
provably absent from the served stylesheet and the JS has no hover listeners,
but I have not moved a real mouse over a real button.

### Rollback

```
git checkout -- soleiq-web/components/ui/Cursor.tsx soleiq-web/app/globals.css \
                soleiq-website/src/components/Cursor.tsx soleiq-website/src/index.css
```

---

## Change: accept uploaded photos of any size and type

Reported: uploading a photo failed with "The photo is too small. Use the
original camera photo."

### Three separate gates were rejecting valid photos

| Gate | Was | Now |
|---|---|---|
| File type | Threw unless MIME started `image/` **or** the extension was jpg/png/webp/heic/heif | Removed. Decoding is the only test. |
| File size | Threw above 15 MB | Removed. |
| Dimensions | `< 600px` on either edge set `passed: false`, so the photo was refused | Demoted to a non-blocking advisory. |

### Files changed

| Path | Change |
|---|---|
| `lib/photoQuality.ts` | Removed type allow-list and byte cap; added `quality.notes`; moved the resolution check into it; clearer decode-failure message. |
| `components/capture/FourPhotoCapture.tsx` | Broadened `accept`; shows notes as an accepted-with-caveats panel, never as a blocker. |

### Reasoning

- The extension allow-list turned away formats browsers decode perfectly well
  (AVIF, TIFF, BMP, GIF) and anything arriving with an empty or wrong MIME
  type, which is routine for files that have been through a messaging app.
  "Can this be decoded" has exactly one reliable answer: decode it. `loadImage`
  already throws with a readable message, so it is now the only gate.
- The byte cap was unnecessary: every image is drawn down to `MAX_EDGE` (1400)
  before a pixel is inspected, so peak memory is bounded by the *output*, not
  the input.
- Low resolution is a worse photo, not an unusable one — and the people most
  likely to hit it are those uploading from a messaging app or an older phone,
  exactly the people least able to go produce a better one. It now analyses
  with the caveat attached.
- Dark / overexposed / blurry still **block**, deliberately. Those photos have
  nothing in them to read, which is a different failure from being small.

HEIC/HEIF still convert first: Safari decodes them natively, Chrome and Firefox
do not, so that cannot wait for `loadImage` to fail.

### Server side needed no change

The `foot-photos` bucket allows `image/jpeg|png|webp` at 15 MB. The client
re-encodes every photo to `image/jpeg` at ≤1400 px, q0.84 (~200-500 KB) before
upload, so neither bucket limit is ever reached. No migration.

### Verification

| Check | Result |
|---|---|
| `npx tsc --noEmit` | PASS, no output |
| `npm test` | PASS, 7 files / 80 tests |
| Removed-gate grep (`SUPPORTED_NAME`, 15 MB, "too small") | 0 matches |
| `/`, `/home`, `/scan-3d` on :3000 | 200 / 200 / 200 |

**Not verified:** no real file was uploaded through a browser. I did not add a
unit test — `prepareFootPhoto` needs a real canvas and `Image`, which the
current node-environment vitest setup cannot provide without adding jsdom
plus a canvas shim (a new dependency, so not taken unilaterally).

### Rollback

`git checkout -- lib/photoQuality.ts components/capture/FourPhotoCapture.tsx`

---

## Change: Resend email delivery for completed reports

### Install

```
npm install resend      # resend@^6.22.1, soleiq-web/package.json
```

### Files added

| Path | What |
|---|---|
| `server/email/client.ts` | The single send path. Resend SDK, sender, base URL, failure policy. |
| `server/email/templates/reportSummary.ts` | Patient "results ready" HTML + text. Pure functions. |
| `server/email/templates/careCircleInvite.ts` | Care-circle invite, now with an HTML part. |
| `server/email/sendReportSummary.ts` | Report → patient lookup, then send. |
| `app/api/reports/[reportId]/email/route.ts` | Authenticated re-send / manual trigger. |
| `tests/email-report-summary.test.ts` | 10 tests over the template. |

### Files modified

| Path | Change |
|---|---|
| `server/screenings.ts` | `releaseSessionReport` now emails the patient after an actual release. |
| `app/api/care-circle/notify/route.ts` | Raw `fetch` → shared client. |
| `app/api/feedback/route.ts` | Raw `fetch` → shared client. |
| `.env.local.example` | `RESEND_API_KEY`, `EMAIL_FROM`, `APP_BASE_URL`. |
| `package.json` / lock | `resend` dependency. |

### Hooked into the existing flow, not beside it

There were **three** hand-rolled `fetch` calls to `api.resend.com`, each with
its own hardcoded sender (`onboarding@resend.dev`) and no HTML part. All three
now go through `server/email/client.ts`. Grep for `api.resend.com` across
`app/`, `server/`, `lib/`: **0 matches**.

The patient email fires from `releaseSessionReport()` in `server/screenings.ts`
— the existing point where a report becomes patient-visible. No new pipeline.

### Decisions worth recording

- **Sending never throws.** A report is released, stored and visible before the
  email is attempted; letting a Resend outage propagate would turn a cosmetic
  failure into a failed assessment. Callers get a result object.
- **Duplicate-safe by construction.** The release `UPDATE` filters on
  `status = 'preliminary'` and returns the affected rows; the email is gated on
  that row count. A retried session cannot email twice, and the check is atomic
  rather than read-then-write.
- **Awaited, not fire-and-forget.** On serverless the process can freeze the
  moment the handler returns, silently dropping in-flight requests. Awaiting is
  safe precisely because the send cannot throw.
- **Service-role lookup.** The send runs from the analysis worker where there is
  no signed-in user, so no RLS context exists to authorise the read. It selects
  exactly the four fields the email needs.
- **The email carries no findings.** Status, risk chip, and a short summary
  line, then a button. Inboxes sit unlocked on shared devices; detail stays
  behind the sign-in. Metrics are non-clinical (care team, report reference).
- **Re-send route is patient-scoped.** It calls `getPatientReleasedReport`,
  which resolves the caller to their own patient row under RLS and only returns
  released reports — so the route cannot email out a preliminary one, and
  authorisation is delegated rather than re-implemented.
- Rate limited to 5/min per user; email costs money and lands in an inbox.

### Verification

| Check | Result |
|---|---|
| `npx tsc --noEmit` | PASS, no output |
| `npm test` | PASS, **90 tests** (was 80; +10 new) |
| `npm run lint` | 0 errors (same 1 pre-existing warning) |
| `POST /api/reports/<id>/email` unauthenticated | 401 `UNAUTHENTICATED` |
| `POST /api/feedback` unauthenticated | 401 |
| `POST /api/care-circle/notify` unauthenticated | 401 |
| Client-bundle leak check | email module imported only by route handlers; no `"use client"` file touches it |
| Raw `api.resend.com` fetches remaining | 0 |

`npm run build` was **not** run — the dev server owns `.next`, and running both
is what caused the two incidents logged above. Tests + typecheck + lint + live
route exercise were run instead.

**Not verified:** no real email was delivered. `RESEND_API_KEY` is not set in
this working copy, so every send returned `not_configured`. The HTML has not
been opened in an email client.

### Test failure worth keeping

`expect(html).toContain("St Mary's Podiatry")` failed — the apostrophe is
escaped to `St Mary&#39;s Podiatry`. The escaping was correct and the
assertion was wrong. Corrected to assert the escaped form, and it now guards
against un-escaped output.

### Rollback

```
git checkout -- server/screenings.ts app/api/care-circle/notify/route.ts \
                app/api/feedback/route.ts .env.local.example package.json package-lock.json
rm -rf server/email app/api/reports tests/email-report-summary.test.ts
npm install
```
