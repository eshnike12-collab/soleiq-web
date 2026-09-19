# 3D scan — operations

The 3D scan spans two deployables: `soleiq-web` on Vercel, and the
`soleiq-foot-ai` reconstruction service in a container. The browser uploads a
capture **directly** to the service — the video never passes through Next,
because proxying it would upload it twice — so both sides must be configured
together or the feature fails in ways that look like network errors.

---

## 1. Deploying the scan service

### What must be set before it will serve anything

| Variable | Where | Why |
|---|---|---|
| `SOLEIQ_SUPABASE_URL` | service | JWKS source for verifying patient tokens |
| `SUPABASE_JWT_SECRET` | service | Alternative to the above for HS256 projects |
| `SOLEIQ_DATA_DIR` | service | Scan videos, frames, SQLite. **Must be a mounted volume.** |
| `SOLEIQ_DEBUG_UI` | service | Leave unset. `1` exposes raw patient frames. |
| `NEXT_PUBLIC_FOOT_AI_URL` | Vercel | The service's https origin |

**With neither Supabase variable set, the service refuses every non-loopback
request with 503.** That is deliberate: a container that cannot authenticate
callers must not serve foot photographs. If the service is up and returning
503 to everything, this is why.

`NEXT_PUBLIC_*` is inlined at build time. Setting it in Vercel does nothing to
an existing deployment — **redeploy after changing it.**

### Deploy

```bash
fly launch --no-deploy
fly volumes create foot_ai_data --size 10          # SQLite + scan artifacts
fly secrets set SOLEIQ_SUPABASE_URL=... SUPABASE_JWT_SECRET=...
fly deploy
curl -fsS https://foot-ai.soleiqhealth.com/health   # expect 200
```

Sizing: reconstruction is CPU- and RAM-heavy; COLMAP holds the feature
database and point cloud in memory. Start at 4 vCPU / 8GB. The 512MB free
tiers cannot run this.

`auto_stop_machines` is off in `fly.toml` on purpose: a cold start reloads the
classifier and the depth model, and the patient waiting on a scan pays for it.

### Roll back

```bash
fly releases                      # find the last good version
fly deploy --image <previous>     # or: fly releases rollback
```

The volume is **not** rolled back with the image. That is usually what you
want — patients keep their banked frames across a rollback — but it means a
migration that changed the SQLite schema is not undone. `src/store/db.py`
migrations are additive (`ALTER TABLE ... ADD COLUMN` only), so an older image
tolerates a newer database.

To roll back the web half, redeploy the previous Vercel deployment. If you are
rolling back because the scan is broken, the fastest mitigation is to **unset
`NEXT_PUBLIC_FOOT_AI_URL` and redeploy**: the scan tab then says 3D scanning is
not configured, which is honest, instead of failing mid-capture.

---

## 2. `quality.json` — what each field means

Written per scan by `src/recon/pipeline.py` beside `model.glb`.

| Field | Meaning |
|---|---|
| `frameCount` | Frames actually registered in the reconstruction, not frames uploaded |
| `coveragePct` | Share of the orbit the registered cameras span |
| `meanReprojErrorPx` | Mean reprojection error. Under ~1.2px is a tight solve; over ~2px is loose |
| `scaleMethod` | `aruco_id1` \| `anthropometric` \| `unscaled` |
| `scaleUncertaintyPct` | Real spread for `aruco_id1`; `100.0` when `unscaled` |
| `pipeline` | `colmap_mvs` or `feedforward` |
| `textureKind` | `uv_texture` or `vertex_color` |
| `confidence` | `high` \| `medium` \| `low`, from the rule below |
| `provenance.*` | What was **not** available on the host, and why |

### The rule that gates displaying a measurement

**`scaleMethod` decides whether any millimetre figure may be shown at all.**

- `aruco_id1` — a fiducial of known size was found in at least
  `MIN_DETECTIONS` frames. Measurements may be displayed, qualified by
  `scaleUncertaintyPct`.
- `anthropometric` — scale came from the patient's self-reported shoe size.
  Measurements may be displayed **only** as estimates, with the uncertainty
  stated. Never as a caliper reading.
- `unscaled` — no fiducial, no foot length. **Display no measurements.** The
  model's shape is correct; its size is unknown. This is load-bearing: a wrong
  millimetre reading is worse than no reading, because a clinician can act on
  a wrong number and cannot act on a missing one.

`confidence` (from `_confidence()` in `pipeline.py`) is separate and describes
the *geometry*, not the scale:

```
high    coveragePct >= 75  and reproj <= 1.2px and frames >= 30
medium  coveragePct >= 45  and reproj <= 2.0px and frames >= 20
low     anything else
```

Any single bad signal caps the band; they do not average out.

---

## 3. Re-tuning the sweep thresholds

The thresholds in `soleiq-web/lib/scan3d/sweep.ts` are first estimates from a
small number of real captures, and the file says so. The evidence store is
`soleiq-foot-ai/local-data/soleiq.db`.

```sql
-- Distribution of every metric the gates use, per outcome.
SELECT s.status,
       COUNT(*)                          AS frames,
       ROUND(AVG(f.blur_score), 1)       AS blur_avg,
       ROUND(MIN(f.blur_score), 1)       AS blur_min,
       ROUND(AVG(f.brightness_score), 1) AS luma_avg,
       ROUND(AVG(f.novelty_score), 4)    AS novelty_avg
FROM frames f JOIN scans s ON s.scan_id = f.scan_id
GROUP BY s.status;

-- The comparison that matters: what separated scans that reconstructed
-- from scans that did not.
SELECT scan_id, status, failure_stage, accepted_frames, viewpoint_spread
FROM scans ORDER BY created_at DESC;
```

**Do not move a threshold without a distribution to justify it.** The file
documents a previous change that culled 26% of a good capture and dropped SfM
registration from 39/39 frames to 2/29 — a single similarity threshold set in
the middle of the normal distribution. Two rules that came out of that:

- Local overlap and global diversity pull in opposite directions and cannot
  share one threshold. Neighbouring frames must be *similar* (or feature
  matching fails); the set must be *diverse* (or there is no parallax).
- Judge diversity on **every sample**, never on the banked subset. Banking
  selects for novelty, so measuring novelty across banked frames answers a
  question the filter already decided.

`SEARCH` in `sweep.ts` must stay above `maxShift * DELTA_W`, or the too-fast
threshold is unreachable by measurement. `tests/sweep.test.ts` asserts this.

---

## 4. Runbook — a patient reports a failed scan

Ask what the screen said. The messages are deliberately distinct.

| What they saw | Cause | Action |
|---|---|---|
| "3D scanning is not configured" | `NEXT_PUBLIC_FOOT_AI_URL` unset in that deployment | Set it in Vercel, **redeploy** |
| "Could not reach the scan service" | Service down, DNS, CORS, or CSP | `curl https://<service>/health`; then check `connect-src` in `next.config.js` |
| Scan never started, "nothing was recorded" | Health preflight failed | Same as above. Nothing was lost |
| "Your session expired while scanning" | Supabase token expired mid-capture | Sign in again and rescan |
| "Frames saved — keep going" | Working as designed | Not a failure. Scan again from angles not yet covered |
| "Not enough viewpoint variation" | Camera did not move around the foot | Coach: one slow lap, not a static hold |
| "The scan stopped because the app moved to the background" | Tab backgrounded mid-capture | Keep the screen open for the full lap |

Then inspect the scan itself:

```bash
# Per-frame verdicts, novelty, and which source was used.
sqlite3 local-data/soleiq.db \
  "SELECT frame_index, blur_score, brightness_score, novelty_score,
          accepted, reject_reason, banked, bank_reason
   FROM frames WHERE scan_id='<id>' ORDER BY frame_index;"

sqlite3 local-data/soleiq.db \
  "SELECT status, failure_stage, failure_reason, accepted_frames,
          viewpoint_spread FROM scans WHERE scan_id='<id>';"
```

`SOLEIQ_DEBUG_UI=1` enables a frame gallery at `/debug`, reachable **only from
the machine running the service**. It renders raw patient frames — never
enable it in a deployed config.

### Deleting a patient's scan data

A bank spans several recordings, so deleting one scan is not enough:

```
DELETE /banks/{bank_id}      # removes every scan, video and frame in the bank
```

---

## 5. First-time setup — the human steps, in order

Nothing in this section can be done by the coding agent. Each step ends with a
check; do not move on until the check passes.

Estimated total: 1.5–2 hours, most of it waiting on builds and DNS.

### Step 0 — install the tooling (~10 min)

None of this is currently installed on this machine.

```bash
brew install --cask docker      # then LAUNCH Docker Desktop and wait for it
brew install flyctl
docker --version && flyctl version
```

**Check:** both print a version. Docker Desktop must actually be running —
`docker ps` should return an empty table, not an error.

### Step 1 — build the container locally FIRST (~20 min)

Do this before deploying. The image has never been built, so this is where
missing system libraries will surface, and it is far quicker to find them here
than in a remote build.

```bash
cd soleiq-web/soleiq-foot-ai
docker build -t soleiq-foot-ai .
```

The first build downloads PyTorch and bakes the depth model, so ~10–15 min is
normal. **If it fails on a missing shared library** (`libGL.so.1`,
`libgthread-2.0.so.0`, …), add the package to the `apt-get install` line in
the Dockerfile and rebuild. That is expected, not a defect.

```bash
docker run --rm -p 8000:8000 -v soleiq-data:/data soleiq-foot-ai
# in another terminal:
curl -fsS http://127.0.0.1:8000/health
```

**Check:** `/health` returns 200. Note that every *other* endpoint will return
503 right now — no auth is configured yet, and refusing is correct.

### Step 2 — deploy to Fly (~20 min)

```bash
cd soleiq-web/soleiq-foot-ai
flyctl auth login
flyctl launch --no-deploy            # accept the existing fly.toml
flyctl volumes create foot_ai_data --size 10 --region iad
flyctl deploy
flyctl status
```

**Check:** `flyctl status` shows one machine running, and
`curl -fsS https://soleiq-foot-ai.fly.dev/health` returns 200.

Sizing note: `fly.toml` asks for `performance-2x` / 4GB. Reconstruction is
CPU- and RAM-heavy; the free tiers cannot run it.

### Step 3 — secrets on the service (~5 min)

The service refuses every remote request until this is done. Reuse the value
already in `soleiq-web/.env.local` as `NEXT_PUBLIC_SUPABASE_URL`.

```bash
flyctl secrets set \
  SOLEIQ_SUPABASE_URL="https://<your-project-ref>.supabase.co" \
  ANTHROPIC_API_KEY="<key>"
```

If your Supabase project still issues HS256 tokens (older projects do), set
`SUPABASE_JWT_SECRET` instead — Supabase Dashboard → Settings → API → JWT
Secret.

**Check:**
```bash
curl -s -o /dev/null -w "%{http_code}\n" https://soleiq-foot-ai.fly.dev/scans
# 401  = configured and demanding a token   ✅
# 503  = secrets not picked up yet          ❌ re-check the names
```

### Step 4 — DNS and TLS (~15 min, plus propagation)

`app.soleiqhealth.com` is HTTPS, and a browser will not let an HTTPS page call
an HTTP endpoint. TLS is not optional here.

```bash
flyctl ips list                                   # note the v4 and v6
flyctl certs add foot-ai.soleiqhealth.com
```

At your registrar, add:

| Type | Name | Value |
|---|---|---|
| A | `foot-ai` | the IPv4 from `flyctl ips list` |
| AAAA | `foot-ai` | the IPv6 |

```bash
flyctl certs show foot-ai.soleiqhealth.com        # wait for "Ready"
curl -fsS https://foot-ai.soleiqhealth.com/health
```

**Check:** the curl returns 200 over **https**.

### Step 5 — Vercel (~10 min)

Project Settings → Environment Variables, for Production, Preview **and**
Development:

```
NEXT_PUBLIC_FOOT_AI_URL = https://foot-ai.soleiqhealth.com
```

Then **redeploy**. `NEXT_PUBLIC_*` values are inlined at build time, so an
existing deployment will not pick this up — and the CSP `connect-src` is
derived from this same variable at build time, so without a redeploy the
browser will still block the upload.

**Check**, in the browser console on `https://app.soleiqhealth.com`:

```js
document.querySelector('meta[name="viewport"]').content
// expect: ...viewport-fit=cover

await fetch('https://foot-ai.soleiqhealth.com/health').then(r => r.status)
// expect: 200, and NO Content Security Policy error in the console
```

If you see a CSP refusal here, the redeploy did not happen or the variable is
not set for that environment.

### Step 6 — end-to-end scan

1. Sign in as a patient on `https://app.soleiqhealth.com`
2. Bottom nav → **3D scan**
3. Place an ID-1 card (any credit/debit card) flat beside the foot, in frame
4. Start the scan; one slow lap, keep the screen on

**Check:** the model renders, and `quality.json` reports
`scaleMethod: "aruco_id1"` with a real `scaleUncertaintyPct`. Without the
card it will read `anthropometric` or `unscaled`, and `unscaled` correctly
shows no measurements at all.

### Step 7 — on a real phone

Emulated viewports cannot test any of this:

- iPhone Safari: does `MediaRecorder` produce MP4? (the fix is in, unverified
  on hardware)
- Does the screen stay awake for the full 25 seconds?
- Does backgrounding the app abort cleanly with an explanation?
- Is a one-handed 25-second lap around your own foot physically comfortable?
- Repeat on Android, and on cellular as well as wifi.

### Rolling back in a hurry

Fastest mitigation if scans start failing in production: unset
`NEXT_PUBLIC_FOOT_AI_URL` in Vercel and redeploy. The scan tab then says 3D
scanning is not configured — honest, and it stops patients wasting captures —
while you fix the service.
