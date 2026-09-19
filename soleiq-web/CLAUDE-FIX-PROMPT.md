# SoleIQ — 3D Scan Repair, MobileNetV2 Migration, and Mobile Audit

**How to use this file:** open `/Users/naikmac/Downloads/SoleIQ Health/soleiq-web`
in VS Code, start Claude Code, and paste everything from `=== BEGIN PROMPT ===`
onward as your first message. Everything before that line is orientation for you,
the human — the agent does not need it.

**Read Appendix A yourself before you start.** Parts of this cannot be finished by
any coding agent: someone has to deploy a Python service, point a DNS record at it,
and set environment variables in Vercel. The agent will write every line of code and
config for that, but it cannot click "Deploy" or own a domain. Appendix A is your
checklist.

---

=== BEGIN PROMPT ===

You are working on SoleIQ, a diabetic-foot screening product. Two repositories on
this machine, both already cloned, both with working local toolchains:

| Repo | Path | What it is |
|---|---|---|
| `soleiq-web` | `/Users/naikmac/Downloads/SoleIQ Health/soleiq-web` | Next.js 15 App Router + Supabase + Tailwind. Deployed to Vercel as `app.soleiqhealth.com` (Vercel project `prj_po0Dv6LbDfYFQINO8Tc4iiJRc2se`, GitHub `eshnike12-collab/soleiq-web`). |
| `soleiq-foot-ai` | `/Users/naikmac/Documents/soleiq-foot-ai` | Python 3.11 FastAPI service. `timm` classifier + FAISS similarity + `pycolmap` SfM 3D reconstruction. Runs only on this Mac today via `make serve`. Venv at `.venv/`. |

**Ignore `/Users/naikmac/Downloads/New folder/soleiq-web`.** It is a stale `.next`
build directory with no source. It is not the project.

You have three jobs, in this order of priority:

1. **Make the 3D scan work at all**, then make it produce a genuinely precise foot.
2. **Move the AI analysis onto MobileNetV2.** This is a hard requirement, not a
   preference.
3. **Full mobile audit and fix.** Patients use this on phones; it is currently
   broken in visible ways on a 375px screen.

Work through them in order. Do not stop after Part 1. Do not summarise a plan and
wait for approval — implement.

---

## Ground rules

- **Verify before you assert.** Every root cause in Part 1 was reproduced against the
  live production site with browser devtools. When you add a fix, prove it with a
  command or a test, and paste the real output. If something fails, say it failed and
  show the output. Never report a step as done because the code "looks right".
- **No placeholder geometry, ever.** `soleiq-foot-ai/src/recon/pipeline.py` and
  `soleiq-web/components/scan3d/Foot3DViewer.tsx` both go out of their way to refuse to
  render a stand-in foot when reconstruction fails, because a fake foot is
  indistinguishable from a real one to the clinician reading it. Preserve that
  property in every change you make. A failed scan must fail loudly.
- **Match the surrounding code.** Both repos have an unusually high comment density
  that explains *why*, often citing the specific bug a line prevents. Write in that
  register. Do not strip existing comments.
- **Keep the safety rails.** `lib/photoScreening.ts` (`enforceScreeningSafety`) and
  `config.yaml`'s `threshold.uncertainty_margin` exist to stop the product from
  emitting confident-looking output it has not earned. Do not weaken either.
- **PHI is real here.** Foot photographs of identified patients are protected health
  information. Any endpoint you expose to the internet must authenticate. Call it out
  loudly if you are ever about to make PHI reachable without auth.
- Run `npm run typecheck && npm run lint && npm test` in `soleiq-web` and
  `make test` in `soleiq-foot-ai` before you declare any part complete.

---

# PART 1 — The 3D scan is broken. Fix it.

## 1.1 What is actually wrong

The reported symptom is "an error every time I take a video/scan". There are **six
independent** causes. Fixing any one of them alone leaves the feature broken. All six
must be fixed. Four are verified against production; two are verified by reading the
code.

### Blocker 1 — the client points at localhost (VERIFIED)

`lib/scan3d/scanClient.ts:27-29`:

```ts
export const FOOT_AI_BASE_URL = (
  process.env.NEXT_PUBLIC_FOOT_AI_URL ?? "http://127.0.0.1:8000"
).replace(/\/+$/, "");
```

`NEXT_PUBLIC_FOOT_AI_URL` is set nowhere. It is absent from `.env.local`, absent from
`.env.local.example`, and absent from the Vercel project. So every patient's browser
POSTs their scan to `http://127.0.0.1:8000` — **their own phone**, where nothing is
listening. Two failures stack: connection refused, and mixed-content (an `https://`
page may not fetch `http://`).

### Blocker 2 — the CSP forbids the request regardless (VERIFIED IN PRODUCTION)

`next.config.js`, the `connect-src` directive:

```
connect-src 'self' https://*.supabase.co wss://*.supabase.co
```

The scan service is not `'self'` and is not `*.supabase.co`. Executed against
`https://app.soleiqhealth.com` in a real browser, both of these were refused before a
packet left the tab:

```
Connecting to 'http://127.0.0.1:8000/scans' violates the following Content Security
Policy directive: "connect-src 'self' https://*.supabase.co wss://*.supabase.co".
The action has been blocked.

Connecting to 'https://foot-ai.soleiqhealth.com/scans' violates the following Content
Security Policy directive: "connect-src ...". The action has been blocked.
```

**This is the most important finding in this document.** Setting
`NEXT_PUBLIC_FOOT_AI_URL` and deploying the service will *not* fix the scan on its
own. The CSP will still block it, and the failure will look identical. Fix the CSP in
the same change or you will chase this twice.

### Blocker 3 — the service is not deployed anywhere

`soleiq-foot-ai` runs on this Mac and nowhere else. There is no Dockerfile, no
deployment config, no hosted URL. `config.yaml` already lists
`https://app.soleiqhealth.com` under `serve.cors_origins`, so CORS was anticipated —
but there is no server for that origin to reach.

### Blocker 4 — a fresh install of the service will not even import

`src/recon/*.py` and `src/serve/*.py` import `pycolmap`, `open3d`, `trimesh`, and
`transformers`. **None of the four are in `requirements.txt`.** They are present in
the local `.venv` (pycolmap 3.11.1, open3d 0.19.0, trimesh 4.5.3, transformers 4.46.3)
because they were pip-installed by hand at some point and never pinned. `make setup`
on a clean machine — which is exactly what a container build does — produces a venv
that cannot import `src.recon`. Verify for yourself:

```bash
cd /Users/naikmac/Documents/soleiq-foot-ai
grep -cE '^(pycolmap|open3d|trimesh|transformers)' requirements.txt   # prints 0
.venv/bin/pip show pycolmap open3d trimesh transformers | grep -E '^(Name|Version)'
```

### Blocker 5 — the scan API has no authentication

`src/serve/scan_routes.py` says so in its own module docstring: *"Local debugging API
for scans… Local-only by design."* `POST /scans`, `GET /scans/{id}`,
`GET /scans/{id}/frames/{n}/image`, `GET /scans/{id}/artifact/{name}`,
`GET /banks/{id}`, and `DELETE /banks/{id}` are all unauthenticated. Deploying this
file as-is publishes identified patients' foot photographs on an open endpoint where
anyone who can guess or enumerate a scan id can read them. **Do not deploy the service
until 1.2 step E is done.**

### Blocker 6 — recording is broken on iPhone

`components/scan3d/OrbitSweepCapture.tsx`, in `start()`:

```ts
const mime = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"].find(
  (t) => MediaRecorder.isTypeSupported(t)
);
```

Safari on iOS does not support WebM in `MediaRecorder` — it produces MP4/H.264. All
three candidates return `false`, `mime` is `undefined`, and the recorder is
constructed bare. It then records MP4 while `scanClient.uploadScanVideo` hardcodes the
filename:

```ts
body.append("video", args.video, "video.webm");
```

So an MP4 is uploaded as `video.webm`. Worse, if the bare constructor throws on any
device, the `catch` sets `recorderRef.current = null` and `upload()` reports *"This
browser could not record the sweep"* — a plausible source of the user's "error every
time" if they tested on an iPhone. Given the target users are patients checking their
own feet, iPhone is the primary platform and this must be correct.

## 1.2 What to change

Do all of these. Ordered so that each step is verifiable.

**A. `soleiq-web/next.config.js` — make the CSP admit the service, and stop breaking
other things while you are in there.**

Read the scan-service origin from `process.env.NEXT_PUBLIC_FOOT_AI_URL` at config
time and splice it into `connect-src`. Do not hardcode a hostname; a wrong-environment
hardcode is how this class of bug survives a staging deploy. Fall back gracefully when
the variable is unset so local development still works.

While editing the CSP, four other directives need attention:

- `connect-src` — add the scan-service origin (from the env var) and, in development
  only, `http://127.0.0.1:8000 http://localhost:8000`.
- `style-src` — add `https://fonts.googleapis.com`. **This is a live production bug
  today**, unrelated to 3D. `app/layout.tsx` loads Inter Tight from Google Fonts to
  match the marketing site's wordmark, and the CSP blocks it on every page load. The
  production console currently shows: *"Loading the stylesheet
  'https://fonts.googleapis.com/…' violates the following Content Security Policy
  directive: `style-src 'self' 'unsafe-inline'`. The action has been blocked."* The
  brand font has never loaded for a single user.
- `font-src` — add `https://fonts.gstatic.com`, for the same reason.
- `script-src` and `worker-src` — add `'wasm-unsafe-eval'` to `script-src` and a
  `worker-src 'self' blob:` directive. You will need both in Part 2 for
  `onnxruntime-web`; there is no `worker-src` at all right now, so it falls back to
  `default-src 'self'` and blob workers are refused.

Also allow the GLB fetch: `Foot3DViewer` loads `model.glb` cross-origin through
`useGLTF`, so the service origin must be reachable via `connect-src` for that too.

**B. `soleiq-web/.env.local.example` and `.env.local` — document and set the variable.**

Add a commented block explaining what `NEXT_PUBLIC_FOOT_AI_URL` is, why it is
`NEXT_PUBLIC_` (the browser holds the video blob; proxying through a Next route would
upload it twice — `scanClient.ts` already explains this), and what it defaults to. Set
it to `http://127.0.0.1:8000` in `.env.local` so local dev is unchanged.

**C. `soleiq-foot-ai/requirements.txt` — pin the four missing packages.**

Add them at the versions currently installed in `.venv`, in a new `# --- 3D
reconstruction ---` section with a comment noting that `pycolmap` provides real COLMAP
incremental SfM on CPU and that `open3d` is what `src/recon/surface.py` uses for
Poisson surface reconstruction. Then prove the fix from a clean environment:

```bash
cd /Users/naikmac/Documents/soleiq-foot-ai
python3.11 -m venv /tmp/soleiq-clean && /tmp/soleiq-clean/bin/pip install -q -r requirements.txt
/tmp/soleiq-clean/bin/python -c "import src.recon.pipeline, src.serve.app; print('imports OK')"
```

Paste the real output. If a wheel does not build for the target platform, say so and
report which one — do not quietly drop it from the file.

**D. `soleiq-foot-ai` — containerise it.**

Write a `Dockerfile` that actually works:

- Base on `python:3.11-slim`. `pycolmap`, `open3d`, and `opencv-python-headless` need
  system libraries — at minimum `libgl1`, `libglib2.0-0`, `libgomp1`. Add what the
  build tells you is missing; do not guess and move on.
- **Bake the depth model into the image.** `src/recon/depth.py` pulls
  `depth-anything/Depth-Anything-V2-Small-hf` from Hugging Face on first use through
  `@lru_cache`. A cold container downloading ~100MB mid-request will time out the
  patient's scan. Pre-download it at build time into `HF_HOME` and set
  `HF_HUB_OFFLINE=1` at runtime.
- Set `OMP_NUM_THREADS=1`, `MKL_NUM_THREADS=1`, `KMP_DUPLICATE_LIB_OK=TRUE`. The
  `Makefile` already does this and explains why: PyTorch + FAISS + libomp each spawning
  a thread pool can crash at model load.
- Do not bake `.env` or any API key into the image.
- Add a `/health` endpoint if one does not exist, and a `HEALTHCHECK`.
- Add a `docker-compose.yml` for local testing, and a `fly.toml` **or**
  `render.yaml` (pick one, justify it in a comment — the deciding factors are
  persistent-disk support for `local-data/soleiq.db` and the scan artifacts, and
  whether a GPU tier is available for Part 1.3).
- **Persistence matters.** `src/store/db.py` writes SQLite to `local-data/soleiq.db`
  and scan artifacts to disk. An ephemeral filesystem loses every frame bank between
  deploys, which silently defeats the entire bank-pooling design. Mount a volume and
  make the path configurable via env.

**E. `soleiq-foot-ai/src/serve/scan_routes.py` — authenticate before deploying.**

Add a FastAPI dependency that validates the caller's Supabase JWT. The web app already
has a Supabase session; `soleiq-web/server/auth.ts` shows how the token is obtained.
Verify the JWT signature against the Supabase JWKS (do not merely decode it), and:

- Derive `bank_id` **from the verified token's subject**, not from the client-supplied
  form field. Right now `bankKeyFor(patientId, side)` is computed in the browser
  (`Scan3DPanel.tsx:27`) and sent as a form field, so any authenticated user can name
  any other patient's bank and read their frames. Keep the `_SAFE_ID` regex check, but
  the identity must come from the token.
- Scope every `GET`/`DELETE` on `/scans/{id}`, `/banks/{id}`, and the artifact and
  frame-image routes to the owning subject. Return 404, not 403, for another patient's
  scan — a 403 confirms the id exists.
- Leave `/debug` disabled entirely unless an explicit `SOLEIQ_DEBUG_UI=1` env var is
  set, and never in the deployed config. It renders raw patient frames.
- Update `soleiq-web/lib/scan3d/scanClient.ts` to attach the bearer token on all six
  calls, and add `Authorization` to the service's CORS `allow_headers`.

**F. `soleiq-web/components/scan3d/OrbitSweepCapture.tsx` — fix recording, and stop
hiding the real error.**

- Build the MIME candidate list to include MP4 ahead of the WebM options on platforms
  that support it: try `video/mp4;codecs=avc1`, `video/mp4`, then the three WebM
  variants. Keep the `isTypeSupported` guard.
- Thread the negotiated MIME type through to `uploadScanVideo` and derive the filename
  and extension from it instead of hardcoding `"video.webm"`. Update the
  `uploadScanVideo` signature and the server's `save_video` to trust the declared
  content type rather than the extension.
- Replace the catch-all `"Could not build the 3D model. Please try again."` with
  messages that distinguish the failure classes, because they need different actions
  from the patient: network unreachable / CORS or CSP refusal / 401 or 403 / server
  5xx / reconstruction refused with a reason. `ScanClientError` already carries the
  server's own reason — surface it. A `TypeError: Failed to fetch` specifically means
  the request never left the browser; say "could not reach the scan service" for that,
  not "please try again", which invites a patient to repeat a 25-second capture that
  cannot possibly succeed.
- Add a **preflight check before the countdown starts.** Ping the service (a cheap
  `GET /health`) and refuse to begin if it is unreachable. Making someone hold a phone
  around their foot for 25 seconds and *then* telling them the server is down is the
  single worst part of the current experience.
- Hold a `navigator.wakeLock` for the duration of the capture and release it in the
  cleanup path. A 25-second scan on a phone with a 15-second screen timeout dies
  halfway through.
- Handle `visibilitychange`: if the tab is backgrounded mid-capture, abort cleanly with
  an explanatory message rather than leaving the state machine stuck in `capturing`
  with a dead stream.
- Stop the `MediaRecorder` in the unmount cleanup. `useEffect(() => () => stopStream())`
  stops the tracks but leaves the recorder running, which keeps the camera indicator lit.

## 1.3 Now make it precise

Once a scan completes end to end, the model still is not good enough to measure a foot
from. `src/recon/pipeline.py` writes its own honest verdict into `quality.json`:

```json
"denseMvsAvailable": false,
"denseMvsReason": "COLMAP patch_match_stereo requires CUDA; none on this host",
"uvTexturingAvailable": false,
"uvTexturingReason": "xatlas wheel would not build on this host"
```

Both limits are host limitations, not design decisions. Address them, in this order of
impact:

**1. Capture full-resolution stills, not just compressed video frames.** This is the
largest single precision win available and it is entirely client-side. Today the
server re-extracts 40 frames from a VP8/VP9 or H.264 stream — lossy, motion-compensated,
and typically 1280×960. Meanwhile `OrbitSweepCapture.sample()` already runs a quality
gate every 700ms and knows exactly which moments are sharp, well-exposed, and show a
new viewpoint. At each accepted moment, also grab a **full-sensor still** — via
`ImageCapture.takePhoto()` where supported, falling back to drawing the video to a
canvas at `videoWidth × videoHeight` and encoding JPEG at quality 0.95. Upload the
stills alongside the video as a multi-file form field. Feature matching on sharp
originals rather than inter-frame-predicted video frames materially improves both the
number of registered cameras and the reprojection error. Keep uploading the video too —
`scanClient.ts` explains why in its header comment (a failed scan can be replayed
against different thresholds), and that reasoning still holds.

Request a higher capture resolution while you are there: `getUserMedia` currently asks
for `width: { ideal: 1280 }, height: { ideal: 960 }`. Ask for `1920×1440` ideal, and
add `advanced: [{ focusMode: "continuous" }]`. Server-side, prefer the stills over
extracted video frames when both are present, and record which source was used in
`quality.json`.

**2. Add a fiducial marker for true metric scale.** Scale today comes from
`from_foot_length(extent, foot_length_mm)` — the patient's self-reported shoe size
mapped to a foot length. That is an anthropometric guess, and `quality.json` already
concedes it by reporting `scaleUncertaintyPct: 100.0` when it is absent. A
credit-card-sized ArUco marker (ISO/IEC 7810 ID-1: 85.60mm × 53.98mm — everyone owns a
card, no printer needed) placed in frame beside the foot gives sub-millimetre metric
scale from a known planar target. Implement `src/recon/fiducial.py` using
`cv2.aruco`, detect it across the registered frames, solve scale from the consensus,
and set `scaleMethod: "aruco_id1"` with a real, measured `scaleUncertaintyPct`. Add
marker placement to the on-screen capture guidance. **Preserve the existing contract:
when no fiducial is found and no foot length was supplied, `scaleMethod` stays
`"unscaled"` and the client must display no measurements.** That rule is load-bearing.

**3. Enable dense MVS on a GPU host.** If the deployment target from step D has a GPU
tier, turn on COLMAP `patch_match_stereo` + `stereo_fusion` in `src/recon/fuse.py`,
gated on CUDA availability, with the current Depth-Anything path as the CPU fallback.
Report which path ran in `quality.json` `provenance.denseSource`. Real multi-view
stereo is a large accuracy improvement over monocular depth aligned to sparse points.
If the target has no GPU, write the code path behind the capability check anyway, leave
it dormant, and say plainly in your summary that dense MVS is unavailable on the chosen
host and what it would cost to change that.

**4. Retry `xatlas` for UV texturing** in the Docker image, where the build environment
is under your control rather than macOS's. If it builds, wire up proper UV-mapped
texture instead of vertex colours and update `textureKind`. If it still will not build,
record the real reason in `provenance.uvTexturingReason` — do not leave a stale message
about a host that is no longer the host.

**5. Tighten the acceptance gates now that input quality is higher.**
`lib/scan3d/sweep.ts` is explicit that its thresholds are *"first estimates from one
real capture, not calibrated constants"*, and points at `local-data/soleiq.db` as the
evidence store. After the above lands, re-derive `sharpnessFloor`, `minShift`,
`maxShift`, `noveltyMin`, and `viewpointRadius` from the banked scans in that database.
Show the distributions you derived them from. Do not move a threshold without evidence
— the file documents at length how a previous single-similarity-threshold change culled
26% of a good capture and dropped SfM registration from 39/39 frames to 2/29.

**6. There are no tests for any of this.** `lib/scan3d/sweep.ts` claims *"the test
suite import these directly"* — `soleiq-web/tests/` contains no such file. Add
`tests/sweep.test.ts` covering `decideFrame`, `viewpointSpread`, `validateScan`,
`trackingAfter`, and the `SEARCH` vs `MAX_SHIFT` relationship the module's own comment
identifies as a past live bug (`SEARCH` must exceed `maxShift * DELTA_W`, or the
too-fast threshold is unreachable). Add a Python test that runs `reconstruct()` over a
committed fixture image set and asserts the `quality.json` schema and the
`ReconstructionError` paths.

---

# PART 2 — MobileNetV2. Non-negotiable.

## 2.1 Where the AI actually lives right now

Two separate systems, and it matters which one the user means:

- **The deployed app's "AI analysis"** is `POST /api/foot-analysis` → Claude vision
  (`claude-sonnet-4-6`), validated against `PHOTO_SCREENING_JSON_SCHEMA` and then
  through `enforceScreeningSafety`. **There is no local model in the web app at all.**
  No `onnxruntime-web`, no `@tensorflow/tfjs` — check `package.json`.
- **The Python service** has the only trained model: `src/models/model.py` builds a
  `timm` backbone with a 2-way classification head and a 256-d embedding head.
  `config.yaml` sets `model.backbone: efficientnet_b0`.

So "switch to MobileNetV2" has two halves. Do both.

## 2.2 Python side — swap the backbone

The good news: this is nearly drop-in. Verified on the installed `timm` 1.0.11:

| Backbone | `num_features` | Params |
|---|---|---|
| `efficientnet_b0` | 1280 | 4.01M |
| `mobilenetv2_100` | 1280 | 2.22M |

Both expose 1280 pooled features, so `classifier_head` and `embedding_head` in
`src/models/model.py` need **no** change, and `embedding_dim: 256` is unaffected.
`build_model()` already reads the name from config, so the swap is one line.

Steps:

1. `config.yaml`: `model.backbone: efficientnet_b0` → `mobilenetv2_100`. Add a comment
   recording the change, the params/feature-dim comparison above, and the reason
   (on-device inference in the browser).
2. Bump `project.model_version` — it is stamped on every API response and a silent
   backbone change under an unchanged version number makes past predictions
   unattributable.
3. `make train`. Expect it to be quick; `train.strategy: kfold` with
   `kfold_n_splits: 5` and `epochs: 30`.
4. Re-tune the decision threshold. `threshold.target_recall: 0.90` is a *target*, and
   the operating point is recomputed per model — `artifacts/tuned_threshold.txt` from
   the EfficientNet run is invalid for MobileNetV2 and must be regenerated.
5. `make eval` and compare `artifacts/eval_metrics.json` against the EfficientNet
   baseline. **Report both, honestly.** MobileNetV2 is a smaller model; if recall drops,
   say by how much. Do not bury a regression.
6. `make build-similarity-index`. **This is mandatory and easy to forget.** The FAISS
   index in `artifacts/similarity/index.faiss` holds embeddings from the *old*
   backbone. Cosine similarity between an EfficientNet embedding and a MobileNetV2
   embedding is meaningless — the retrieval results would be noise presented as
   evidence. Also bump `project.reference_bank_version`.
7. `make export` — ONNX at `export.onnx_opset: 17`, with the existing parity check at
   `parity_atol: 1.0e-4`. It exits non-zero on parity failure; do not paper over that.

**Read this before you run step 3.** `config.yaml` has `data.source: sample`, and
`paths.sample` is synthetic data from `scripts/generate_sample_data.py`. A model
trained on synthetic foot images has **no clinical validity whatsoever**, whatever the
metrics say. Do the migration in full as specified — that is the instruction — but make
the model's provenance impossible to miss: have the training run stamp
`trained_on: "synthetic_sample"` into `artifacts/train_summary.json` and into the
model-version string, and have `/predict` refuse to return a confident band when the
loaded checkpoint carries that stamp. Then state the position plainly in your final
summary. Getting real labelled data is a step only the human can take; it is item 6 in
Appendix A.

## 2.3 Browser side — MobileNetV2 running on the patient's phone

This is the half that changes what users experience, and it is the reason MobileNetV2
is the right architecture to insist on: it is small enough to run in a phone browser,
which EfficientNet-B0 is marginal for.

1. `npm i onnxruntime-web` in `soleiq-web`. Choose ONNX Runtime Web over TensorFlow.js:
   the Python side already exports ONNX with a verified parity check, so there is one
   set of weights and one numerical contract rather than a second conversion step that
   can silently diverge.
2. Copy the exported model to `soleiq-web/public/models/foot-mobilenetv2.onnx`. Quantise
   it to int8 first and report both file sizes and the accuracy delta. Ship the
   quantised model only if the delta is small; say what you measured either way.
3. Run inference in a **Web Worker**, never on the main thread — a synchronous
   inference on the UI thread janks the live camera preview, which is the one thing
   that must stay smooth during capture.
4. Preprocess **exactly** as `src/data/transforms.py:build_eval_transform` does:
   `data.image_size: 224`, `augmentation.eval.center_crop: true`, and the identical
   normalisation constants. A mismatch here produces confident nonsense rather than an
   error, which is the worst possible failure mode. Write a test that runs one fixed
   image through both the Python path and the browser path and asserts the logits agree
   to `1e-3`.
5. Wire it in at two places, and be careful about *how*:
   - **As a fast local pre-screen in the capture flow.** `lib/footDetection.ts` is
     currently hand-rolled heuristics — Otsu thresholding, aspect-ratio and centeredness
     checks, a Laplacian blur score — with a `DETECTION_THRESHOLD` of 0.55 and a
     `face_detected` failure mode. MobileNetV2 running live gives a far better "is this
     actually a foot, and is this frame usable" signal at ~30ms per frame. Keep the
     existing heuristics as the fallback when the model fails to load; do not delete
     them.
   - **As a second opinion beside Claude in the results path.** Do **not** replace the
     Claude vision analysis with MobileNetV2. The Claude path produces a structured,
     schema-validated, safety-enforced screening with per-finding regions that the
     entire results UI is built on. A 2-way classifier cannot produce that. Show
     MobileNetV2 as an independent signal, and — this is the valuable part — flag
     disagreement between the two for clinician review rather than silently preferring
     either. `config.yaml` already models this idea in the other direction with
     `capabilities.llm_second_opinion`.
6. CSP: `script-src` needs `'wasm-unsafe-eval'` and you need `worker-src 'self' blob:`.
   You added both in Part 1.2 step A. Verify in a real browser that the WASM backend
   initialises in production, not just in `next dev` — the dev CSP is more permissive
   (`next.config.js` branches on `NODE_ENV`), so this class of bug only appears after
   deploy. This is exactly how the Google Fonts breakage survived.
7. Guard the load: on a low-memory device the WASM runtime can fail to initialise. Fall
   back to the heuristic path and the server analysis, and never block a patient from
   completing a check because a local model would not load.

---

# PART 3 — Mobile audit

Patients use this on phones. Below are findings **measured on the live production
site**, not guesses. Fix all of them, then do your own sweep for what this list misses.

## 3.1 Confirmed defects

**1. The top bar overlaps itself at 375px. Every page.** `components/chrome/AppTopBar.tsx:41`
puts the brand lockup, the "Website ↗" button, and an optional page title in one
`flex min-w-0 shrink` cluster, then `LanguageSwitcher` plus actions in a `shrink-0`
cluster. `WebsiteLink` is itself `shrink-0` (`WebsiteLink.tsx:33`) and
`BrandNavLockup size={38}` does not shrink. At 375px there is not enough room, and the
Website button is drawn on top of the wordmark. Measured in the DOM at 375×812:

```
headerOverlaps: [
  "SPAN.inline-flex items-center gap-2  ⨯  A.inline-flex h-10 shrink-0 item",
  "SPAN.font-display font-semibold tra  ⨯  A.inline-flex h-10 shrink-0 item"
]
```

The screenshot shows the wordmark reading "So" with the button covering the rest. Fix
it properly — collapse the lockup to the mark alone below `sm`, or move the Website
link into an overflow menu on small screens. Do not just shrink the font.

**2. `env(safe-area-inset-bottom)` is inert, so the bottom nav sits under the iPhone
home indicator.** `components/patient/PatientNav.tsx:22` uses
`pb-[env(safe-area-inset-bottom)]` — correct instinct, but that function returns `0`
unless the viewport meta includes `viewport-fit=cover`. The live page serves
`width=device-width, initial-scale=1` (Next's default; `app/layout.tsx` exports no
`viewport` object at all). Add one:

```ts
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#1f4e79",
};
```

Then re-check every `env(safe-area-inset-*)` in the codebase, because they all start
working at once and some may now over-pad.

**3. Tap targets below the 44×44px minimum.** Measured at 375px:

| Element | Size |
|---|---|
| Brand link (`AppTopBar`) | 53 × 40 |
| "Website ↗" (`WebsiteLink`) | 105 × 40 |
| Language `<select>` (`.lang-select`) | 123 × 31 |

`PatientNav` gets this right with `min-h-[44px]`; apply the same discipline here.

**4. iOS zooms the page when the language select is focused.** `.lang-select` in
`app/globals.css:264` is `font-size: 0.9375rem` (15px). Safari force-zooms any form
control under 16px. The `.lang-row .lang-select` variant at line 296 correctly uses
`1rem`; the base rule does not. Raise it to `1rem` and confirm the top bar still fits
after the change — it interacts with defect 1, so fix that one first.

**5. Google Fonts blocked by CSP on every page load.** Covered in Part 1.2 step A. It
belongs in this list too, because the visible symptom is a mobile-typography defect:
the brand wordmark falls back to Nunito Sans and does not match soleiqhealth.com, which
is the exact thing `app/layout.tsx`'s comment says the link exists to guarantee.

**6. `100vh` on the cursor grid.** `app/globals.css:141`. On iOS Safari `100vh`
excludes the collapsing URL bar and the element overflows. It is decorative
(`.cursor-grid-lines`, drawn at `z-index: -1`, and `Cursor.tsx` renders nothing on
touch devices) so the impact is small — but use `100dvh` with a `100vh` fallback and
audit for other viewport units while you are there.

**7. No PWA surface.** No `manifest.json`, no `apple-touch-icon`, no `theme-color`.
This is a health app patients are asked to return to repeatedly; "Add to Home Screen"
should produce something that looks intentional. Add a manifest, the icon set, and
`themeColor` via the `viewport` export from defect 2.

**8. The 3D scan flow is not internationalised.** The app ships 20 locales under
`lib/i18n/locales/`, and `app/scan-3d/page.tsx` and
`components/scan3d/OrbitSweepCapture.tsx` are entirely hardcoded English — every
heading, every hint in `HINT_TEXT`, every reject label in `REJECT_LABEL`, every string
in `STAGE_COPY`. A patient who selected Bengali gets an English wall during the one
flow that most needs to be understood in real time while holding a phone around their
foot. Move all of it into the dictionary. Check `dir="rtl"` rendering for `ar` and `ur`
on the capture overlays specifically — the hint chip is absolutely positioned and the
progress bar fills left-to-right.

## 3.2 Then do a real sweep

The list above is what one pass found. Go further:

- Every route at 320px (iPhone SE), 375px, and 414px. `/`, `/login`, `/home`,
  `/features/*`, `/results`, `/scan-3d`, `/records/[id]`, `/dashboard`, and the
  `/h/[hospitalSlug]/*` clinician screens — clinicians use tablets and phones on
  rounds. Check for horizontal overflow, overlap, and clipped text.
- `components/result/*` — `ClinicalReport`, `ScreeningReport`, `ComparisonView`,
  `VolumetricMetrics`, and the `recharts` timeline charts. Dense clinical tables and
  charts are where mobile layouts usually break; they need horizontal scroll containers
  rather than a squeezed page.
- The capture flow end to end (`components/capture/*`, `components/screens/12-*`
  through `19-*`) on a real phone viewport, in landscape as well as portrait.
- Accessibility: contrast on `--c-ink-faint` (`131 123 108`) over the cream
  `--c-surface`, focus order through the multi-screen flow, and whether the
  `FlowController` announces screen changes to a screen reader.
- Performance on a mid-range phone: `three` + `@react-three/fiber` + `@react-three/drei`
  is a large bundle. `Scan3DPanel` already lazy-loads the viewer with `ssr: false` —
  verify the split actually holds in the production build and that the three.js chunk
  is not pulled into the initial load by some other import.
- Reduced motion: `framer-motion` transitions and the capture animations should respect
  `prefers-reduced-motion`.

---

# PART 4 — Definition of done

Do not report completion until every line here is true and you have pasted the output
that proves it.

**3D scan**
- [ ] `npm run typecheck && npm run lint && npm test` clean in `soleiq-web`.
- [ ] `make test` clean in `soleiq-foot-ai`.
- [ ] A clean venv built only from `requirements.txt` imports `src.recon.pipeline` and
      `src.serve.app`.
- [ ] `docker build` succeeds and the container answers `/health`.
- [ ] A scan runs end to end against the containerised service and yields a `model.glb`
      that renders in `Foot3DViewer`.
- [ ] `quality.json` reports a real `coveragePct`, `meanReprojErrorPx`, and a
      `confidence` band, with `scaleMethod` correctly reflecting whether a fiducial or a
      foot length was used.
- [ ] Every scan endpoint rejects an unauthenticated request, and rejects an
      authenticated request for another patient's bank.
- [ ] A CSP violation can no longer silently swallow the request: with the service
      stopped, the UI says the service is unreachable, not "please try again".
- [ ] `tests/sweep.test.ts` exists and passes.

**MobileNetV2**
- [ ] `config.yaml` reads `mobilenetv2_100`; `model_version` and
      `reference_bank_version` both bumped.
- [ ] `make train`, `make eval`, `make build-similarity-index`, `make export` all
      succeed, with ONNX parity passing at `1e-4`.
- [ ] Metrics table comparing MobileNetV2 against the EfficientNet-B0 baseline, with any
      regression stated outright.
- [ ] The model runs in a Web Worker in a **production** build with the real CSP.
- [ ] Python and browser preprocessing verified identical on a fixed image to `1e-3`.
- [ ] The synthetic-training provenance stamp is present and the confident-band refusal
      works.

**Mobile**
- [ ] All eight confirmed defects fixed, each verified at 375px.
- [ ] No horizontal scroll on any route at 320px.
- [ ] No sub-44px tap targets on any interactive element.
- [ ] Scan flow fully translated; spot-checked in `ar` (RTL) and `hi`.
- [ ] Google Fonts loads in production with zero CSP violations in the console.

**Finally:** write `docs/3d-scan-operations.md` covering how to deploy and roll back the
scan service, what every `quality.json` field means and which ones gate displaying a
measurement, how to re-tune the sweep thresholds from `local-data/soleiq.db`, and the
runbook for a patient reporting a failed scan.

Then give me a summary that separates what you verified from what you could not, and
list anything still blocked on a human.

=== END PROMPT ===

---

# Appendix A — What only you can do

The agent will write all the code and config for these. It cannot perform them.

**1. Deploy the Python service and give it a hostname.** This is the blocking item;
nothing else in Part 1 matters without it. The agent produces a Dockerfile and a
`fly.toml` or `render.yaml`. You run the deploy and end up with something like
`https://foot-ai.soleiqhealth.com`.
- Fly.io: `fly launch`, then `fly volumes create` for the SQLite database and scan
  artifacts, then `fly deploy`. Reasonable GPU tiers if you later want dense MVS.
- Render: connect the repo, choose Docker, attach a persistent disk.
- Sizing: reconstruction is CPU- and RAM-heavy. Start at 4 vCPU / 8GB. The 512MB
  free tiers will not run this.

**2. Point DNS at it.** An `A`/`AAAA` or `CNAME` for `foot-ai.soleiqhealth.com` at
your registrar, then let the host issue the TLS certificate. It must be HTTPS —
`app.soleiqhealth.com` is HTTPS and a browser will not let it call an HTTP endpoint.

**3. Set environment variables in Vercel.** Project Settings → Environment Variables:
- `NEXT_PUBLIC_FOOT_AI_URL = https://foot-ai.soleiqhealth.com` (Production, Preview,
  Development)
- Redeploy afterwards. `NEXT_PUBLIC_*` variables are inlined at build time, so an
  existing deployment will not pick this up.

**4. Set secrets on the scan service host.** `ANTHROPIC_API_KEY`, the Supabase JWKS
URL or JWT secret for the auth the agent adds in step E, and the artifact storage path.
Never commit these.

**5. Get a Business Associate Agreement with Anthropic** before real patient photos go
through `api.anthropic.com`. `soleiq-foot-ai/config.yaml` already flags this in its own
comment on `capabilities.llm_second_opinion`: *"real patient photos hitting
api.anthropic.com require a Business Associate Agreement with Anthropic."* Same applies
to `soleiq-web`'s `/api/foot-analysis`. Contact Anthropic sales. Also confirm your
Supabase plan covers a BAA for the photos at rest.

**6. Get real labelled foot images.** This is the one that decides whether MobileNetV2
is a product or a demo. `config.yaml` has `data.source: sample` — synthetic images from
`scripts/generate_sample_data.py`. Options:
- Turn on the public datasets already scaffolded in config:
  `data.public_datasets.enabled: true`, `use: ["dfuc2020_classification"]`. Check the
  DFUC licence terms yourself before training on it.
- Partner with a clinic for de-identified images. This needs IRB or ethics approval
  and a data-use agreement.
- Either way you need patient IDs in `labels.csv` so `data.patient_id_column`
  enforces patient-disjoint splits. Without them the splitter falls back to
  image-level stratification and your metrics will be optimistic — the same foot ends
  up in both train and test.

**7. Test on a real iPhone and a real Android.** The agent can emulate a viewport; it
cannot test `MediaRecorder` codec support, camera focus behaviour, wake-lock, or
whether a 25-second one-handed capture around your own foot is physically comfortable.
Walk through a full scan on both, on cellular as well as wifi.

**8. Decide the GPU question.** Dense MVS (Part 1.3 item 3) is the largest remaining
precision gain and needs CUDA. It is a real cost increase. Tell the agent which way you
want it before it reaches that step, or it will implement the dormant code path and
leave it off.

---

# Appendix B — Evidence log

Everything asserted as VERIFIED, and how.

| Finding | Method |
|---|---|
| CSP blocks `connect-src` to any scan-service origin | `fetch()` executed in the live page at `https://app.soleiqhealth.com`; console returned the CSP refusal for both `http://127.0.0.1:8000/scans` and `https://foot-ai.soleiqhealth.com/scans` |
| CSP blocks Google Fonts | Live console error on page load; `document.styleSheets` reports the Google Fonts sheet as `BLOCKED` while the local sheet has 779 rules |
| `NEXT_PUBLIC_FOOT_AI_URL` unset | Absent from `.env.local`, `.env.local.example`, and every file under `app/`, `lib/`, `server/` |
| Header overlap at 375px | DOM rect intersection test at 375×812 on the live site, plus screenshot |
| Sub-44px tap targets | `getBoundingClientRect()` sweep over all interactive elements at 375px |
| Viewport lacks `viewport-fit=cover` | `document.querySelector('meta[name=viewport]').content` → `"width=device-width, initial-scale=1"` |
| `pycolmap`/`open3d`/`trimesh`/`transformers` unpinned | Imported in `src/recon/*.py`; `grep` of `requirements.txt` returns nothing; all four present in `.venv` |
| Scan API unauthenticated | `src/serve/scan_routes.py` — no auth dependency on any route; module docstring says "Local-only by design" |
| Backbone is EfficientNet-B0, not MobileNetV2 | `config.yaml` → `model.backbone: efficientnet_b0` |
| `mobilenetv2_100` available, 1280 features, 2.22M params | `timm.create_model()` executed in the project venv |
| No browser-side ML runtime | `package.json` has no `onnxruntime-web` or `@tensorflow/tfjs` |
| iOS MediaRecorder codec gap | `OrbitSweepCapture.tsx` offers only WebM candidates; iOS Safari `MediaRecorder` supports MP4/H.264 only |
| No sweep tests | `soleiq-web/tests/` contains no scan3d or sweep test file |
