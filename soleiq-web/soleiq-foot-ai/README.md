# SoleIQ Foot AI

Computer-vision module for the SoleIQ diabetic-foot-health app. Given a
foot photograph, the system returns:

1. **Ulcer present / absent** (binary classification).
2. **Most similar reference cases** — top-k nearest neighbors from a
   curated reference bank, plus a weighted "most consistent with: …"
   readout.
3. **Grad-CAM heatmap** (optional) showing where the classifier focused.

The SoleIQ React Native app calls this as a **cloud API**
(`POST /predict`). The model itself never ships to the device.

---

## ⚠️ Real-world readiness — read this first

**This module is not a medical device. It is not FDA-cleared, CE-marked,
or clinically validated. It is a screening / decision-support aid only.**
Treat every output as a hint to be confirmed by a qualified clinician.

Before you deploy it to anyone other than yourself for evaluation:

- **Prospective clinical validation is mandatory.** Held-out test metrics
  on the development set do not predict performance on real patients in
  real clinics with real cameras and lighting. Plan a prospective study.
- **Data handling falls under HIPAA / GDPR / local equivalents.** Any
  collection of patient photos — even for evaluation — requires an
  appropriate consent + storage + access pipeline, and almost always
  ethics / IRB review. Do not skip this.
- **Sensitivity (recall) is prioritized over precision.** A missed ulcer
  is the dangerous error in this domain. The threshold defaults to
  `target_recall = 0.90`, accepting more false positives in exchange for
  catching nearly every true ulcer. Read `config.yaml` `threshold.*` and
  the eval report's confusion matrix carefully.
- **The model can cheat on backgrounds.** Pretrained CNNs are notoriously
  good at picking up dataset artifacts (the linoleum floor in your
  training photos, a particular camera's color cast, a glove in frame).
  The Grad-CAM grid in the eval report is there *specifically* to let you
  catch this. Look at the failures.
- **A photo can't see what's underneath the skin.** Photo-based analysis
  cannot replace neuropathy testing, vascular workup (ABI / pulses), or
  thermal imaging. Frame this module as one input alongside SoleIQ's
  questionnaire and thermal/3D pipelines, never as a standalone risk
  score. The disclaimer string returned by the API is mandatory.

**Nothing in this repo, the API responses, the eval reports, or the
SoleIQ app should ever imply this module is FDA-cleared or clinically
validated until that is genuinely true.**

---

## What's in the box right now (v0.1.0)

This is the **step-1 scaffold**. Everything below runs today:

- `make sample-data` — generates synthetic foot images so the pipeline
  is exercisable without any real data.
- Layout, config, dependencies, and the dual-CSV data format are fixed.

Not yet implemented (build plan continues after you confirm your real
data layout — see "Next" below):

- Data loader, patient-disjoint splitter, augmentation transforms.
- Model (EfficientNet-B0 backbone, classification head + embedding head).
- Training loop with 5-fold cross-validation and class-weighted loss.
- Eval module + HTML report with ROC / PR / calibration / Grad-CAM grid.
- FAISS similarity index over `data/reference_bank/`.
- FastAPI service with `POST /predict`, `GET /health`, `GET /version`.
- ONNX export + parity test.
- pytest suite covering all of the above.

---

## Configuration (locked-in answers)

| Setting | Value | Source |
|---|---|---|
| App platform | React Native (Expo) | user |
| Labeled image count | < 100 | user |
| Label types | Ulcer / no-ulcer (binary) | user |
| Capabilities enabled | classification, similarity | user |
| Deployment | Cloud API (FastAPI) | user |
| Backbone | `efficientnet_b0` (timm, ImageNet pretrained) | `config.yaml` |
| Training | 5-fold CV (forced because n < 300) | `config.yaml` |
| Loss | Cross-entropy + supervised-contrastive on the embedding head | `config.yaml` |
| Decision threshold | tuned to `recall ≥ 0.90` on validation | `config.yaml` |

Change anything by editing `config.yaml` — nothing is hardcoded in
`src/`.

---

## Setup

Requires **Python 3.11** (the pinned wheels in `requirements.txt` target
3.11 — newer versions may work but are unverified).

```bash
make setup            # creates .venv and installs pinned deps
make sample-data      # writes ~80 synthetic images to data/sample/
```

`make setup` is the slow step (~5 min on a cold cache). Once it's done,
every other target is fast.

### macOS note

If `python3.11` isn't on your `$PATH`, install it via
[python.org](https://www.python.org/downloads/macos/) or
`brew install python@3.11`, then run `make setup PY=python3.11`.

---

## Dataset in use (DFUNet patches, Goyal et al. 2018)

This deployment currently trains on the **public DFUNet patch dataset**
(Goyal, Reeves, et al., "DFUNet: Convolutional Neural Networks for
Diabetic Foot Ulcer Classification," 2018), supplied at
`~/Downloads/dfu/Patches/`:

| Source folder | Count | Used for |
|---|---|---|
| `Patches/Normal(Healthy skin)/` | 543 | 513 training, 30 reference bank |
| `Patches/Abnormal(Ulcer)/` | 512 | 482 training, 30 reference bank |
| `Original Images/` | 493 | unused (source images Patches were cropped from) |
| `TestSet/` | 167 | unused (no published labels in this dump) |
| `Transfer-Learning images/` | 959 | unused (unsupervised pretraining only, not wired in) |

The reference-bank images are physically separate (`data/reference_bank/`)
and **not** seen during training, so the similarity engine can't be
gamed by matching against an image the model already saw.

### Known caveats with this dataset

- **No patient IDs in filenames.** Filenames are just `1.jpg` … `543.jpg`,
  so the patient-disjoint splitter falls back to image-level grouping.
  Patches cropped from the same source image may end up in train and val.
  This **slightly inflates** apparent metrics — same caveat the original
  DFUNet paper carries. The eval report's confusion matrix and Grad-CAM
  grid are still useful, but treat headline numbers as "what to beat,"
  not "true clinical performance."
- **License.** The Goyal et al. DFUNet patches are released for
  **research and academic use**, with citation required. Using them to
  train a model that ships in a **commercial product** requires
  clarified licensing from the authors. SoleIQ's evaluation/screening
  use here is research-grade until that conversation happens.
- **Generalization is not guaranteed.** The DFUNet images are drawn
  from a specific clinical setting. Real-world patient photos from
  different lighting, cameras, skin tones, and capture angles are
  likely to behave differently — a model that scores 95% on this set
  may score much lower in deployment. Prospective validation
  recommended before any clinical use.

If you want to switch back to the synthetic sample data (for fast
iteration), edit `config.yaml`: `data.source: sample`.

---

## Adding more / different data (when you have it)

The dataset layer **auto-detects** two layouts. Drop your data into
`data/raw/` in one of these shapes:

### Layout A — one folder per class (simplest)

```
data/raw/
  no_ulcer/
    1234.jpg
    5678.jpg
    ...
  ulcer/
    abcd.jpg
    ...
```

The patient-disjoint splitter will fall back to filename-based grouping
in this layout — every distinct prefix before the first `_` is treated
as a patient. If you have one image per patient, set
`data.patient_id_column: null` in `config.yaml` and we'll split at the
image level.

### Layout B — flat folder + labels CSV (recommended if you have patient IDs)

```
data/raw/
  images/
    1234.jpg
    ...
  labels.csv          # required columns: image_id, label
                      # optional: patient_id, capture_view, capture_side
```

The patient-disjoint splitter uses `patient_id` to guarantee no patient
appears in two splits. **State this loudly: leaked patient IDs across
train and test is the #1 way to fake good medical-imaging metrics, and
it's a real risk with small DFU datasets where one patient may have
multiple photos of the same wound on different days.**

### Reference bank for similarity search

The similarity engine indexes a separate **curated** set of labeled
images:

```
data/reference_bank/
  images/
    ref_001.jpg
    ...
  reference_labels.csv      # image_id, label, plus optional metadata
                            # (clinical_notes, capture_date, …)
```

Rebuild the index after adding images:

```bash
make build-similarity-index
```

The reference bank is **not** training data — it powers the "most
similar past cases" panel surfaced in the app.

---

## API contract (consumed by the SoleIQ React Native app)

`POST /predict`  (multipart/form-data, field `image`)

```json
{
  "quality_ok": true,
  "prediction": { "label": "ulcer", "probability": 0.87, "uncertain": false },
  "similar_cases": [
    { "id": "ref_017", "label": "ulcer", "distance": 0.12 },
    { "id": "ref_204", "label": "ulcer", "distance": 0.18 }
  ],
  "heatmap_url": "/heatmaps/req_abc123.png",
  "model_version": "v0.1.0",
  "reference_bank_version": "rb_v0.1",
  "disclaimer": "Screening aid only — not a diagnosis. Seek clinician evaluation; urgently if signs of infection or an open/black wound are present."
}
```

`GET /health` → `{ "ok": true }`
`GET /version` → `{ "model_version": "...", "reference_bank_version": "..." }`

### Example client call from React Native (Expo)

Drop this into `SoleIQ-MobileApp/src/lib/footAI.ts`. The Expo
`expo-camera` capture pipeline already gives you a JPEG `uri`.

```ts
const API_BASE = process.env.EXPO_PUBLIC_FOOT_AI_URL!; // e.g. https://api.soleiqhealth.com

export async function predictFromUri(uri: string) {
  const form = new FormData();
  form.append("image", {
    uri,
    name: "foot.jpg",
    type: "image/jpeg",
  } as any);

  const res = await fetch(`${API_BASE}/predict`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) throw new Error(`predict failed: ${res.status}`);
  return (await res.json()) as PredictResponse;
}
```

`PredictResponse` matches the JSON above. The `disclaimer` field is
returned on every call and **must** be surfaced in the UI alongside the
result — don't strip it.

---

## Day-2 workflow once your real images land

1. Drop class-folder images into `data/raw/no_ulcer/` and `data/raw/ulcer/`,
   following the **`<patient_id>_<rest>.<ext>`** filename convention so the
   patient-disjoint splitter can group images by patient.
2. Curate a smaller, clean reference set under `data/reference_bank/`
   (same layout). Quality > quantity here — 50 well-labeled, well-lit
   images are worth more than 500 noisy ones for the similarity engine.
3. Flip `config.yaml`:

   ```yaml
   data:
     source: raw          # was: sample
   ```

4. Run the full pipeline:

   ```bash
   make train                      # 5-fold CV; writes artifacts/best.ckpt
   make eval                       # writes artifacts/eval_report.html
   make build-similarity-index     # writes artifacts/similarity/index.faiss
   make serve                      # uvicorn on :8000
   ```

5. Inspect `artifacts/eval_report.html` carefully. The Grad-CAM grid is
   the single most important section — if attention is on the floor,
   the towel, or a glove, the model is cheating and the headline metric
   is meaningless. Add more diverse photos and retrain.

## Deploy the API

For a v1 cloud deployment that pairs with `app.soleiqhealth.com`:

- **Server choice** — anywhere that runs Python with CPU + 2 GB RAM
  works for inference. Render / Fly.io / Railway are the simplest hosts.
  For a more production-y setup, a small Cloud Run / Fargate task with
  scale-to-zero keeps costs near zero outside clinic hours.
- **Image** — use the official `python:3.11-slim` Docker base, copy
  `requirements.txt + src/ + scripts/ + config.yaml + artifacts/`, run
  `uvicorn src.serve.app:app --host 0.0.0.0 --port 8000`.
- **CORS** — the FastAPI app pre-allows `https://app.soleiqhealth.com`
  and the Expo dev host; edit `config.yaml` `serve.cors_origins` for
  other targets.
- **Secrets / PHI** — set `serve.log_phi: false` (the default). The
  audit log captures request IDs + decision summary, never pixel data.

## Regulatory / safety appendix

- **Not a medical device.** Until a clearance path is in place, every
  user-facing surface (the SoleIQ app, the eval report, exported PDFs)
  must say "screening aid, not a diagnosis," and the API enforces this
  with the `disclaimer` field on every response.
- **HIPAA / GDPR / IRB.** Any data collection involving real patients
  requires the appropriate ethics review, consent flow, and
  HIPAA-compliant storage. The repo's `.gitignore` blocks
  `data/raw/` and `data/reference_bank/` from version control so
  patient images aren't committed accidentally — that's a safety floor,
  not a substitute for a real data-handling policy.
- **Threshold trade-off.** `target_recall = 0.90` means the model will
  refer borderline-normal feet to a clinician roughly as often as it
  refers borderline-ulcers. That's the right asymmetry for a screening
  tool. The eval report's PR curve and confusion matrix show the exact
  trade-off on your held-out test set; adjust in `config.yaml` only if
  you understand the downstream specificity hit.
- **Performance numbers are computed on the held-out test set only.**
  Nothing in this repo, the API responses, or the eval reports
  hardcodes a metric. Don't hardcode any either.
