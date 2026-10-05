# SoleIQ — what only you can do

Ordered by what unblocks the most. Stage A is the only thing standing between
the current build and a working 3D scan; everything else is longer-horizon.

Last updated after the v2 engineering brief.

---

## Stage A — make the 3D scan work (1.5–2 hours, do this first)

Nothing in Part 1 of the previous brief matters until this is done. Full
detail with commands and checks is in `3d-scan-operations.md` §5.

| # | Task | Check that it worked |
|---|---|---|
| A1 | `brew install --cask docker` + launch it; `brew install flyctl` | `docker ps` returns an empty table, not an error |
| A2 | `docker build -t soleiq-foot-ai .` in `soleiq-foot-ai` | Builds. **Expect to add missing `apt` libs** — the list is reasoned, never built |
| A3 | `flyctl launch --no-deploy`, `flyctl volumes create foot_ai_data --size 10`, `flyctl deploy` | `/health` returns 200 |
| A4 | `flyctl secrets set SOLEIQ_SUPABASE_URL=... ANTHROPIC_API_KEY=...` | `curl /scans` returns **401**, not 503 |
| A5 | `flyctl certs add foot-ai.soleiqhealth.com` + A/AAAA records | `flyctl certs show` says Ready; https `/health` = 200 |
| A6 | Vercel: `NEXT_PUBLIC_FOOT_AI_URL`, all 3 envs, **then redeploy** | No CSP error in console when fetching the service |
| A7 | Run a scan with a credit card in frame | `quality.json` shows `scaleMethod: "aruco_id1"` |

**A6 is the one people get wrong.** `NEXT_PUBLIC_*` is inlined at build time
*and* the CSP `connect-src` is derived from it at build time. Setting the
variable without redeploying changes nothing.

**Order matters between A5 and A6.** The certificate must be Ready before the
Vercel redeploy, or you bake a CSP pointing at a host that cannot serve HTTPS.

---

## Stage B — data collection (start now, runs for weeks)

This is the long pole. Everything in the v2 brief's Tickets 1, 2 and 5 is
gated on data that does not exist yet, and no amount of engineering
substitutes for it.

| # | Task | Why it blocks |
|---|---|---|
| B1 | **Collect dirty-but-healthy feet**, with consent, across the full Monk Skin Tone scale. Dirt, lint, freckles, tattoos, nail polish, calluses, scars, sock marks, bruising, lotion sheen | Public wound datasets are ulcer-positive *by construction*. Nobody has published a corpus of dirty healthy feet — which is exactly why the model has never seen one and fires on a speck of dirt. Ticket 2 cannot start without this |
| B2 | Register for **DFUC 2022** at dfuc2022.grand-challenge.org and accept the data agreement | Cannot be auto-downloaded. Ticket 1 training data |
| B3 | Download **FUSeg** and **Medetec**; check licence terms for commercial use | Medetec is your only clean cross-dataset test set |
| B4 | Audit for image-level overlap between sources before combining | Several public wound datasets are repackaged versions of one another. Combining them naively leaks test data into training and your metrics become fiction |
| B5 | Ensure `labels.csv` carries **patient IDs** | Without them the splitter falls back to image-level stratification, the same foot lands in train and test, and every metric is optimistic |
| B6 | Arrange **GPU compute** for segmentation training | A laptop will fine-tune a small head; it will not train Ticket 1's model |
| B7 | Print the **fiducial marker** and verify its printed size with a ruler | Printer scaling silently ruins the calibration. This is the difference between millimetres that mean something and millimetres that do not |
| B8 | 3D-print or print **measurement phantoms**, 5–80 mm, and photograph each ≥20× at varied distance/angle/lighting | Ticket 5's validation harness. Without it the measurement engine is a number generator |

---

## Stage C — decisions only you can make

| # | Decision | Why it cannot be defaulted |
|---|---|---|
| C1 | **The specificity/sensitivity operating point** (Ticket 2) | I can produce the precision/recall curve. Choosing where to sit on it is a clinical judgement. Bring your advisors the curve, not a number already picked |
| C2 | **GPU tier for dense MVS?** | Largest remaining precision gain, real cost increase. Until you answer, the code path stays dormant |
| C3 | **Ship MobileNetV2 as a live second opinion?** | It is trained on synthetic images and has never seen a real ulcer. I would keep it behind a flag until B1–B5 land |
| C4 | **Measurement convention: greatest-dimension vs body-axis** | Pick one and never change it. Changing it later invalidates every prior measurement in the database |

---

## Stage D — physical device testing

No emulator covers any of this.

- **D1** iPhone + Android, full scan on cellular and wifi: does `MediaRecorder`
  produce MP4? Does the screen stay awake for 25s? Does backgrounding abort
  cleanly? Is a one-handed lap around your own foot actually comfortable?
- **D2** Full-screen portrait camera (Ticket 4) on iOS Safari, Android Chrome,
  and an installed PWA
- **D3** The language hang (Ticket 8) — **reproduce on a physical phone first**.
  If it only appears in the installed PWA it is service-worker caching, and a
  desktop browser will never show it
- **D4** Animation smoothness (Ticket 9) profiled on a **low-end** Android.
  Desktop hardware makes janky animation look fine
- **D5** LiDAR / ARCore depth paths, if you pursue them

---

## Stage E — legal and regulatory, before launch

- **E1** BAA with Anthropic before real patient photos reach `api.anthropic.com`
- **E2** Confirm your Supabase plan covers a BAA for photos at rest
- **E3** IRB / ethics approval for any clinical validation
- **E4** **FDA SaMD classification.** A tool that measures wounds and produces
  findings may be a regulated device. Where the line sits depends on the
  claims your result screens make — so the wording of the UI is part of the
  classification. Get a real answer before launch, not after
- **E5** App Store / Play Store medical app review requirements

---

## What is already built and waiting on you

| Built | Waiting on |
|---|---|
| Container, fly.toml, compose, volume config | A1–A3 |
| JWT auth, per-patient scoping, `/debug` disabled | A4 |
| CSP, env plumbing, unreachable-vs-retry messaging | A6 |
| ArUco fiducial detection + tests | B7 (a printed marker) |
| MobileNetV2 migration, ONNX parity, provenance stamp | B1–B5 (real data) |
| Locale load deadline + fallback (Ticket 8 fix) | D3 (confirm on device) |
| Mobile defects 1–4, 6 | — verified at 320/375/414px |

---

## Stage R — weekly re-scan reminders + BASELINE/LATEST badges

Added 2026-09-19. Independent of Stage A: none of this needs Docker, Fly, or
the 3D scan service. The badges work the moment the code deploys; the
reminders need R1.

| # | Task | Check that it worked |
|---|---|---|
| R1 | Run `supabase/migrations/202609190011_rescan_reminders.sql` in the Supabase SQL editor | `select * from public.rescan_schedules;` returns an empty table, not an error |
| R2 | Vercel → Settings → Environment Variables → add `CRON_SECRET` (any long random string) for Production | `curl https://app.soleiqhealth.com/api/cron/rescan-reminders` returns **401** |
| R3 | Redeploy (Vercel reads `vercel.json` crons at deploy time) | Vercel → Settings → Cron Jobs lists `/api/cron/rescan-reminders` daily at 15:00 UTC |

### What works without any of the above

The **in-app reminder card** is the channel that actually guarantees delivery,
and it needs only R1. It appears on `/home` when a check is due, whatever
happens to email, cron, or push. If you do nothing else, do R1.

### If you skip R1

Nothing breaks. `/api/rescan` detects the missing table and answers
`available: false`, the card renders nothing, and the rest of the home screen
is unaffected. You just get no reminders.

### Generating a CRON_SECRET

```bash
openssl rand -hex 32
```

Paste the output into Vercel. Do not commit it. Without it the cron endpoint
refuses **every** request including Vercel's own — deliberately, because an
open endpoint there would mass-mail every patient to anyone who found the URL.

### What the reminder email contains

Nothing clinical. No findings, no risk level, no photographs, no history — a
reminder lands in an inbox the recipient has not authenticated to, and may sit
unlocked on a shared phone. It says a check is due and links to the app. This
is pinned by `tests/rescan-reminder-email.test.ts` so it cannot regress.

### Reminder cadence

- Due every **7 days** from the last completed check (per-patient
  `interval_days`, so a care team can tighten it for someone high-risk).
- Email only once due, at most one per **3 days**, at most **3 per cycle**,
  then silence until the next check. Paused and snoozed patients never get one.
- Streak continues if a check lands within the week **plus a week's grace**;
  later than that it restarts at 1. The best streak is kept either way.

All of these live in `lib/rescan.ts` and are unit-tested in
`tests/rescan.test.ts`.

### BASELINE / LATEST

Derived, never stored — see the header comment in `lib/photoTimeline.ts` for
why. Nothing to migrate and nothing to backfill: the badges are correct for
photos taken long before this shipped. Tracked per foot **and** view, so
skipping a view one week does not move that view's LATEST badge.

---

## Stage T — correct photo times (and the portrait camera)

Added 2026-09-20. The camera fix needs nothing from you — it ships with the
code. The timestamp fix works immediately too; the migration only makes it
better.

| # | Task | Check that it worked |
|---|---|---|
| T1 | Run `supabase/migrations/202609200012_capture_time_zone.sql` in the Supabase SQL editor | `select captured_time_zone from public.media_assets limit 1;` runs without error |

### The bug that was fixed

A photo taken at 6pm displayed as 10pm. **The stored data was always correct** —
`captured_at` held the right instant the whole time. What was wrong was the
rendering: nine pages formatted dates with `toLocaleString()` inside a *server*
component, and that uses the server's timezone. Vercel runs UTC. For a patient
in New York that is a four-hour error, and in the evening it also showed the
wrong *day*.

Every one of those now renders through `<LocalTime>`, which formats in the
reader's own timezone. **No data needed repairing.**

### What the migration adds

`captured_time_zone` records *where* each photo was taken, so the time can be
shown on the clock the patient was actually looking at. Without it, times fall
back to the reader's current device — right for a patient at home, wrong in two
cases:

- a patient who travels sees their own history shift
- a clinician abroad sees every patient's photos stamped in the clinician's
  working hours

It also adds `profiles.time_zone`, used where there is no browser to ask —
email, chiefly, where a date formatted in UTC can name the wrong day for an
evening check.

### If you skip T1

Nothing breaks. The queries ask for the new column and retry without it on
error, so an un-migrated database keeps working and times fall back to the
reader's device. You simply do not get the travel/clinician correctness.

### Camera orientation

On a phone or tablet the camera is now **always portrait and full-screen**, and
the Phone/Laptop toggle is hidden there entirely.

That toggle was the bug. It sat at the top centre of the viewfinder — exactly
where a thumb rests while lining up a shot — and tapping "Laptop" wrote
`landscape` to `localStorage` **permanently**. Every check after that showed a
16:9 letterboxed strip through the middle of an upright phone, and the rotation
handler deliberately declined to correct it because an explicit choice was
meant to win.

Anyone currently stuck that way is fixed by opening the app: the stored value
is now ignored on handhelds rather than needing to be cleared. Desktops keep
the toggle, where choosing landscape is reasonable.

**The viewfinder is also full-screen on a phone now.** It used to render into
a `min-h-[200px] flex-1` card sitting below the header, the four-slot picker
and two buttons — so on a phone the stage itself was a short landscape strip,
and no amount of fixing the preview's aspect ratio inside it could help. The
camera now takes the whole viewport on a handheld, the way a camera app does,
with the controls inside the safe areas. Desktops keep the inline card.

Measured in-browser: 393x852 preview on a 393x852 viewport — 100% coverage,
0.46 aspect. One caveat: headless Chrome reports every `env(safe-area-inset-*)`
as 0, so the notch and home-indicator offsets are correct by construction but
were not exercised on real hardware. Worth one look on your iPhone.

---

## Stage P — monthly platform report

Added 2026-10-04. Emails the platform operator an operations summary on the
1st of each month, and shows the same figures on the admin dashboard.

| # | Task | Check that it worked |
|---|---|---|
| P1 | `CRON_SECRET` must already be set from Stage R | `curl https://app.soleiqhealth.com/api/cron/monthly-report` returns **401** |
| P2 | Redeploy so Vercel picks up the new cron in `vercel.json` | Vercel → Settings → Cron Jobs lists `/api/cron/monthly-report` monthly |
| P3 | *(optional)* Set `PLATFORM_REPORT_TO` if the recipient should change | Defaults to `eshnike12@gmail.com` without it |

### The sender address — read this

**The report cannot be sent *from* `contact.soleiq@gmail.com`.** Resend only
sends from a domain you have proved by DNS, and nobody can prove `gmail.com`.

So the report is sent from `EMAIL_FROM` (the verified `soleiqhealth.com`
sender) and carries **Reply-To: contact.soleiq@gmail.com** — replies land in
that mailbox, which is the part that actually matters. Change it with
`PLATFORM_REPORT_REPLY_TO`.

If you want the From line itself to read `contact.soleiq@…`, that needs a
domain you control — e.g. verifying `soleiq.com` or sending as
`contact@soleiqhealth.com`, which the existing verified domain already allows.

### What the report contains

**Aggregate counts only.** New sign-ups, total accounts, new enrollments, foot
checks started, reports released, reports by screening level, new and total
organizations, and feedback by category.

**It deliberately carries no patient-identifying or clinical information** — no
name, no email, no photograph, no finding, no per-patient row. The report goes
to an ordinary mailbox outside the application, and "41 checks completed"
answers the operational question without putting protected health information
in an inbox. `tests/monthly-report.test.ts` pins that so it cannot regress.

A run that cannot read one of the counts says so, in the email and on the
dashboard, rather than reporting a zero that is really an error.

### On the dashboard

The same figures appear on `/platform` and, for platform operators only, on the
hospital admin overview. The panel shows the month in progress against the
month just closed, so the dashboard and the emailed report can be reconciled.

Both are gated on `is_platform_admin()` **before** any service-role read
happens — an ordinary hospital admin sees no panel at all.

---

## Stage S — skipped views, and wound measurement

Added 2026-10-04.

| # | Task | Check that it worked |
|---|---|---|
| S1 | Run `supabase/migrations/202610040013_skipped_slots.sql` | `select skipped_slots from public.screening_sessions limit 1;` runs |
| S2 | Deploy the foot-AI service (Stage A) and set `NEXT_PUBLIC_FOOT_AI_URL`, then redeploy | `POST /segment` with a bearer token returns a measurement |

### The bug S1 closes — read this one

**Skipping a view broke the save completely.** The capture flow has always let
a patient skip a view (amputation, a dressing, limited reach) and only required
that every slot be *resolved* with at least one real photo. The save path never
learned that: it sent the photos actually taken, while the API required
**exactly four**. Every skipped check failed validation with a 400. The skip
button worked; submitting afterwards did not.

The API now accepts **one to four** photos plus the skipped views and the
reason the patient gave. Both report views render a skipped view as an explicit
crossed-out gap with that reason underneath — because on a clinical record
"not captured" and "nothing seen" must not look the same.

S1 is not required for the fix: the skip write degrades on an un-migrated
database, so saves succeed either way; you just lose the annotations.

### Wound measurement (S2)

`POST /segment` on the foot-AI service runs the trained U-Net + MobileNetV3
segmenter, measures the largest region, and returns the contour for overlay.

Verified locally: checkpoint loads (encoder `timm-mobilenetv3_large_100`, 512px,
best val Dice **0.9010**), measurements come back with area, perimeter and
contour, and a frame with nothing wound-like returns **no region** rather than
inventing one. Auth enforced — 401 without a valid Supabase JWT.

Held-out performance, unchanged from training:
**0.838 Dice in-domain (FUSeg), 0.666 cross-dataset (Medetec).** Plan around
the second number.

**What the model can and cannot do.** It was trained on one class: *wound*. It
has never seen a label for dryness, redness, or callus, and has never been
shown a healthy foot. So:

- It measures wounds. It does not measure dryness, redness or callus — those
  findings stay descriptive, with no number attached.
- No detection is reported as **not measured**, never as "healthy". Absence of
  evidence is not evidence of absence, and the UI says nothing in that case.
- Millimetres appear only when a scale reference is in frame. Otherwise pixels
  and percent-of-frame, which need no calibration.

**Until S2 is done**, `segmentPhoto` returns null, no measurement is shown, and
the check behaves exactly as it did before. It is an enhancement on top of the
screening, never a gate in front of it.
