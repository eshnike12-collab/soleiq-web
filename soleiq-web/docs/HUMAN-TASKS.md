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
