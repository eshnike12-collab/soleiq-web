"""FastAPI app.

Lifecycle:
  * On startup, load the model checkpoint + the FAISS similarity index +
    the Grad-CAM hook. If any of those are missing the service still
    starts but `POST /predict` will return 503 — explicit failure is
    better than serving stale results.
  * `POST /predict` runs the quality gate, classifier, similarity lookup,
    and Grad-CAM, then assembles the response.
  * Heatmap PNGs are written to a per-request file under
    `artifacts/heatmaps/<uuid>.png` and exposed via `/heatmaps/{uuid}`.

PHI: by config (`serve.log_phi: false`) we never log the raw image. The
audit log records request_id, prediction summary, similar-case IDs +
distances, and quality numbers — no pixel data, no file paths derived
from the user-supplied upload.
"""

from __future__ import annotations

import io
import json
import logging
import time
import uuid
from pathlib import Path
from typing import Optional

import numpy as np
import torch
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse
from PIL import Image

from src.config import load_config, project_root
from src.data.quality_gate import evaluate_quality
from src.data.transforms import build_eval_transform, denormalize
from src.explain.gradcam import GradCAM, overlay_heatmap
from src.models.model import build_model
from src.serve.llm_judge import LLMJudge, legacy_assessment, minimal_dual
from src.serve.schemas import (
    DISCLAIMER,
    ClinicianReading,
    HealthResponse,
    PatientReading,
    Prediction,
    PredictResponse,
    QualityReport,
    ReadingFlags,
    SecondOpinion,
    SimilarCase,
    SimilarityReadout,
    VersionResponse,
)
from src.similarity.index import SimilarityIndex


logger = logging.getLogger("soleiq.serve")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")


class State:
    cfg: dict | None = None
    model = None
    device = None
    transform = None
    similarity: Optional[SimilarityIndex] = None
    llm: Optional[LLMJudge] = None
    heatmaps_dir: Optional[Path] = None
    artifacts_dir: Optional[Path] = None
    threshold: float = 0.5
    uncertainty_margin: float = 0.10
    classes: list[str] = []
    #: "synthetic_sample" when the loaded checkpoint was trained on images this
    #: repository generated rather than on photographs of real feet. Read from
    #: artifacts/train_summary.json at startup; see the refusal in _predict.
    trained_on: str = "unknown"
    ready: bool = False
    startup_errors: list[str] = []


state = State()
app = FastAPI(title="SoleIQ foot-AI", version="0.1.0")

# Photogrammetry reconstruction lives in its own router so the /predict
# service above is untouched by it. See src/serve/recon_routes.py.
from src.serve.recon_routes import router as _recon_router  # noqa: E402

app.include_router(_recon_router)

# Local scan persistence + debug UI (SQLite + local disk, no cloud services).
from src.serve.scan_routes import router as _scan_router  # noqa: E402
from src.store.db import init_db as _init_store_db  # noqa: E402

_init_store_db()
app.include_router(_scan_router)


def _install_cors(app: FastAPI, origins: list[str]) -> None:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        # The Expo web app is served from an arbitrary localhost port during
        # development (8081 for `expo start`, whatever `expo export` is served
        # on, 19006 historically). Listing them all in config.yaml is a losing
        # game, so any loopback origin is allowed *in addition to* the
        # configured list. Deployed origins still have to be named explicitly.
        allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
        allow_credentials=False,
        # DELETE is needed by /reconstruct/{job_id}, which the app calls to
        # purge a patient's uploaded frames. Without it the browser blocks the
        # preflight and the frames are silently never deleted.
        allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
        allow_headers=["*"],
    )


def startup(config_path: str | Path = "config.yaml") -> None:
    """Load model + similarity index. Idempotent."""
    cfg = load_config(config_path)
    state.cfg = cfg
    state.classes = list(cfg["data"]["classes"])
    state.threshold = float(cfg["threshold"]["target_recall"])  # tuned threshold loaded below
    state.uncertainty_margin = float(cfg["threshold"]["uncertainty_margin"])

    # Provenance of the loaded weights. A missing summary is treated as
    # unknown, never as real: the safe reading of "I cannot tell what this was
    # trained on" is not "it must be fine".
    try:
        summary_path = Path(cfg["paths"]["artifacts"]) / "train_summary.json"
        if summary_path.exists():
            state.trained_on = str(
                json.loads(summary_path.read_text()).get("trained_on", "unknown")
            )
    except Exception as exc:  # noqa: BLE001
        logger.warning("could not read training provenance: %s", exc)
        state.trained_on = "unknown"
    if state.trained_on != "real":
        logger.warning(
            "model provenance is %r — every prediction will be marked uncertain",
            state.trained_on,
        )
    state.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    state.transform = build_eval_transform(cfg)
    state.artifacts_dir = project_root() / cfg["paths"]["artifacts"]
    state.heatmaps_dir = state.artifacts_dir / "heatmaps"
    state.heatmaps_dir.mkdir(parents=True, exist_ok=True)

    _install_cors(app, list(cfg["serve"]["cors_origins"]))

    ckpt_path = state.artifacts_dir / "best.ckpt"
    if not ckpt_path.exists():
        state.startup_errors.append(f"missing checkpoint at {ckpt_path}; run `make train`")
        return

    model = build_model(cfg).to(state.device)
    ckpt = torch.load(ckpt_path, map_location=state.device, weights_only=False)
    model.load_state_dict(ckpt["state_dict"])
    model.eval()
    state.model = model

    # If eval ran, use the tuned threshold; else fall back to 0.5.
    tuned_path = state.artifacts_dir / "tuned_threshold.txt"
    if tuned_path.exists():
        try:
            state.threshold = float(tuned_path.read_text().strip())
        except ValueError:
            state.threshold = 0.5
    else:
        state.threshold = 0.5

    try:
        state.similarity = SimilarityIndex(cfg)
    except FileNotFoundError as e:
        state.startup_errors.append(str(e))
        state.similarity = None

    # Foundation-model second-opinion judge. Off unless explicitly enabled
    # in config AND ANTHROPIC_API_KEY is set. Either missing → graceful
    # no-op; /predict still serves the calibrated classifier.
    llm_cfg = (cfg.get("capabilities") or {}).get("llm_second_opinion") or {}
    if isinstance(llm_cfg, dict) and llm_cfg.get("enabled"):
        model_name = str(llm_cfg.get("model", "claude-opus-4-8"))
        state.llm = LLMJudge(model=model_name)
        if not state.llm.ready:
            logger.warning(
                "LLM second opinion enabled in config but disabled at runtime: %s",
                state.llm.error,
            )

    state.ready = state.model is not None
    if state.ready:
        logger.info(
            "model ready (version=%s, threshold=%.3f, similarity=%s, llm=%s)",
            cfg["project"]["model_version"], state.threshold,
            "ok" if state.similarity else "missing",
            (
                state.llm.model if (state.llm and state.llm.ready)
                else ("disabled" if state.llm is None else f"error: {state.llm.error}")
            ),
        )
    else:
        logger.warning("server started but model not ready: %s", state.startup_errors)


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(ok=True)


@app.get("/version", response_model=VersionResponse)
def version() -> VersionResponse:
    if not state.cfg:
        startup()
    cfg = state.cfg or {}
    return VersionResponse(
        model_version=str(cfg.get("project", {}).get("model_version", "unknown")),
        reference_bank_version=str(cfg.get("project", {}).get("reference_bank_version", "unknown")),
    )


@app.get("/model-info", include_in_schema=False)
def model_info() -> dict:
    """Everything a clinician would want to know about the model behind
    the result they're staring at. The UI fetches this once on load and
    surfaces it under the Step 2 "Technical detail" section.

    Sources:
      * config.yaml  — backbone, embedding dim, classes, threshold target,
                       uncertainty margin
      * tuned_threshold.txt — operating point from `make eval`
      * eval_metrics.json   — held-out test-set performance from `make eval`
      * train_summary.json  — fold count, mean recall, patient-leakage flag
    """
    import json as _json

    if state.cfg is None:
        startup()
    cfg = state.cfg or {}

    def _try_load(name: str):
        p = (state.artifacts_dir / name) if state.artifacts_dir else None
        if p and p.exists():
            try:
                return _json.loads(p.read_text())
            except Exception:
                return None
        return None

    eval_metrics = _try_load("eval_metrics.json")
    train_summary = _try_load("train_summary.json")

    sim_info = None
    if state.similarity is not None:
        try:
            sim_info = {
                "n_indexed": int(state.similarity.index.ntotal),
                "embedding_dim": int(state.similarity.index.d),
                "bank_version": str(state.similarity.bank_version),
                "k": int(cfg["similarity"]["k"]),
                "distance_cutoff": float(cfg["similarity"]["distance_cutoff"]),
                "index_type": str(cfg["similarity"]["index_type"]),
            }
        except Exception:
            sim_info = None

    return {
        "model": {
            "backbone": cfg["model"]["backbone"],
            "pretrained": bool(cfg["model"]["pretrained"]),
            "num_classes": int(cfg["model"]["num_classes"]),
            "embedding_dim": int(cfg["model"]["embedding_dim"]),
            "classes": list(cfg["data"]["classes"]),
            "image_size": int(cfg["data"]["image_size"]),
            "loss": cfg["model"]["loss"]["type"],
        },
        "version": {
            "model_version": str(cfg["project"]["model_version"]),
            "reference_bank_version": str(cfg["project"]["reference_bank_version"]),
        },
        "decision_rule": {
            "operating_threshold": float(state.threshold),
            "target_recall": float(cfg["threshold"]["target_recall"]),
            "uncertainty_margin": float(state.uncertainty_margin),
            "positive_class": "ulcer",
            "rationale": (
                "Threshold tuned on validation predictions to hit recall ≥ "
                f"{cfg['threshold']['target_recall']:.2f}. Bias is toward "
                "over-referral — false alarms preferred to missed ulcers."
            ),
        },
        "training": {
            "data_source": cfg["data"]["source"],
            "strategy": cfg["train"]["strategy"],
            "n_folds": int(cfg["train"]["kfold_n_splits"]),
            "epochs": int(cfg["train"]["epochs"]),
            "batch_size": int(cfg["train"]["batch_size"]),
            "warmup_epochs_frozen": int(cfg["train"]["warmup_epochs_frozen"]),
            "summary": train_summary,
        },
        "similarity": sim_info,
        "second_opinion": (
            {
                "available": bool(state.llm and state.llm.ready),
                "model": state.llm.model if (state.llm and state.llm.ready) else None,
                "error": state.llm.error if (state.llm and not state.llm.ready) else None,
            }
            if state.llm is not None
            else {"available": False, "error": "disabled in config"}
        ),
        "test_set_performance": eval_metrics,
        "limitations": [
            "Not FDA-cleared, not CE-marked, not clinically validated.",
            "Trained on the Goyal et al. (2018) DFUNet public patches "
            "dataset; generalization to other clinics, cameras, lighting, "
            "and skin tones is unverified.",
            "Patient-disjoint train/val/test splits could not be enforced "
            "(DFUNet patches carry no patient metadata). Reported metrics "
            "may be optimistic.",
            "Photo-based analysis cannot replace neuropathy testing, ABI "
            "/ vascular workup, or thermal imaging. Use as one input in "
            "the SoleIQ flow, not a standalone screening score.",
            "The 'Grad-CAM' map shows where the model looked. Always "
            "verify hot spots align with clinically meaningful features "
            "(wound / callus / redness) and not with background, "
            "instruments, or skin-tone artifacts.",
        ],
        "interpretation_bands": {
            "blur_var": {
                "sharp_min": 200.0,
                "acceptable_min": 25.0,
                "fail_max": 8.0,
            },
            "luma_mean": {"min_ok": 0.10, "max_ok": 0.95},
            "skin_fraction": {"min_ok": 0.04},
            "similarity_distance": {
                "very_similar_max": 0.30,
                "moderate_max": 0.50,
                "weak_match_max": 0.60,
            },
        },
    }


@app.post("/predict", response_model=PredictResponse)
async def predict(image: UploadFile = File(...)) -> PredictResponse:
    if not state.ready or state.model is None:
        raise HTTPException(
            status_code=503,
            detail={
                "error": "model not ready",
                "details": state.startup_errors,
            },
        )
    raw = await image.read()
    try:
        pil = Image.open(io.BytesIO(raw)).convert("RGB")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"could not decode image: {e}")

    quality = evaluate_quality(pil)
    request_id = uuid.uuid4().hex[:12]
    logger.info(
        "predict req=%s quality_ok=%s blur=%.1f luma=%.2f skin=%.2f",
        request_id, quality.ok, quality.blur_var, quality.luma_mean, quality.skin_fraction,
    )
    quality_report = QualityReport(**quality.to_dict())

    if not quality.ok:
        # Refused by the local gate — no classifier, no LLM call. Still emit
        # a full dual reading so the app can route straight to retake. The
        # gate's diagnostic strings are engineer-speak; translate for the
        # patient-facing headline (full detail stays in quality.reasons).
        friendly = {
            "blurry": "it looks blurry",
            "dark": "it's too dark",
            "overexposed": "it's too bright",
            "skin region": "a foot isn't clearly visible",
            "covering the lens": "something may be covering the lens",
        }
        plain = [v for k, v in friendly.items() if any(k in r for r in quality.reasons)]
        reasons = " and ".join(plain[:2]) if plain else "it couldn't be read"
        dual = minimal_dual(
            f"This photo couldn't be used — {reasons}. Please retake it.",
            is_foot=not any("skin region" in r for r in quality.reasons),
        )
        return PredictResponse(
            quality_ok=False,
            quality=quality_report,
            prediction=None,
            similar_cases=[],
            similarity=SimilarityReadout(),
            heatmap_url=None,
            patient=PatientReading(**dual["patient"]),
            clinician=ClinicianReading(**dual["clinician"]),
            flags=ReadingFlags(**dual["flags"]),
            model_version=str(state.cfg["project"]["model_version"]),
            reference_bank_version=str(state.cfg["project"]["reference_bank_version"]),
            disclaimer=DISCLAIMER,
        )

    # Classify
    arr = np.asarray(pil)
    transformed = state.transform(image=arr)
    tensor = transformed["image"].unsqueeze(0).to(state.device)

    with torch.no_grad():
        out = state.model(tensor)
        probs = torch.softmax(out.logits, dim=1)[0].cpu().numpy()
        embedding = out.embeddings[0].cpu().numpy()

    pos_idx = state.classes.index("ulcer") if "ulcer" in state.classes else 1
    p_ulcer = float(probs[pos_idx])
    is_ulcer = p_ulcer >= state.threshold
    label = state.classes[pos_idx] if is_ulcer else state.classes[0]
    # Uncertainty band: prob lies within ±margin of the operating threshold.
    margin = state.uncertainty_margin
    uncertain = abs(p_ulcer - state.threshold) <= margin

    # A model trained on synthetic images cannot be confident about a real
    # foot, however sharp its probability looks. The sample data is separable
    # by construction — the EfficientNet baseline scored AUROC 1.0 on it — so
    # a confident-looking number here would be an artefact of the generator,
    # not evidence about a patient. Forced uncertain rather than blocked, so
    # the pipeline stays exercisable end to end while nothing it says can be
    # mistaken for a finding.
    if state.trained_on != "real":
        uncertain = True

    prediction = Prediction(label=label, probability=p_ulcer, uncertain=uncertain)

    # Similarity lookup
    similar = []
    similarity = SimilarityReadout()
    if state.similarity is not None:
        matches = state.similarity.query(embedding)
        similar = [SimilarCase(**m.to_dict()) for m in matches]
        vote = state.similarity.vote(matches)
        similarity = SimilarityReadout(
            most_consistent_with=vote["label"],
            mean_distance=vote["mean_distance"],
            support=vote["support"],
        )

    # Grad-CAM heatmap
    heatmap_url: Optional[str] = None
    try:
        with GradCAM(state.model) as cam:
            heat = cam.heatmap(tensor[0], class_idx=pos_idx)
        orig = arr if arr.shape[:2] == heat.shape else _resize_to(arr, heat.shape)
        overlay = overlay_heatmap(orig, heat)
        out_path = state.heatmaps_dir / f"{request_id}.png"
        Image.fromarray(overlay).save(out_path, "PNG")
        heatmap_url = f"/heatmaps/{request_id}.png"
    except Exception as e:
        logger.warning("grad-cam failed req=%s: %s", request_id, e)

    # Foundation-model dual reading (Claude vision). Runs in a worker
    # thread so the sync Anthropic SDK doesn't block the event loop, and
    # we can keep the classifier path identical to its tested behaviour.
    # The Claude call now returns the patient/clinician/flags contract;
    # the v1 `second_opinion` block is derived from it for old clients.
    second_opinion = SecondOpinion()
    dual: dict | None = None
    if state.llm is not None and not state.llm.ready:
        # Capability is enabled in config but couldn't start — surface that
        # to the UI so the user sees "ANTHROPIC_API_KEY not set" rather
        # than a silently-hidden second-opinion block.
        second_opinion = SecondOpinion(available=False, error=state.llm.error)
    if state.llm is not None and state.llm.ready:
        try:
            import asyncio
            blob = await asyncio.to_thread(
                state.llm.get_opinion,
                raw,
                image.content_type or "image/jpeg",
                label,
                p_ulcer,
                state.threshold,
                quality.ok,
                similarity.most_consistent_with,
                similarity.support,
            )
            if blob.get("available") and isinstance(blob.get("patient"), dict):
                dual = blob
                assessment = legacy_assessment(blob)
                second_opinion = SecondOpinion(
                    available=True,
                    model=blob.get("model"),
                    assessment=assessment,
                    summary=blob["clinician"].get("morphology"),
                    visible_findings=[],
                    suspected_differential=blob["clinician"].get("differential", []),
                    recommended_workup=[blob["clinician"].get("suggested_followup", "")],
                    urgent_flags=(
                        [blob["patient"].get("headline", "urgent finding")]
                        if blob["flags"].get("needs_urgent_care")
                        else []
                    ),
                    confidence=blob["patient"].get("confidence"),
                    agrees_with_classifier=(
                        (assessment in ("ulcer_likely", "ulcer_possible"))
                        == (label == "ulcer")
                    ),
                    latency_ms=blob.get("latency_ms"),
                    input_tokens=blob.get("input_tokens"),
                    output_tokens=blob.get("output_tokens"),
                    cache_read_input_tokens=blob.get("cache_read_input_tokens"),
                    cache_creation_input_tokens=blob.get("cache_creation_input_tokens"),
                )
            else:
                second_opinion = SecondOpinion(
                    available=False, error=blob.get("error") or "malformed LLM reply"
                )
        except Exception as e:
            logger.warning("dual-reading call failed req=%s: %s", request_id, e)
            second_opinion = SecondOpinion(available=False, error=str(e))

    if dual is None:
        # LLM off or failed — classifier-only deterministic reading so the
        # app always gets the dual contract.
        if label == "ulcer":
            dual = minimal_dual(
                "The screening model flagged a possible area of concern — "
                "please have a clinician take a look.",
                care_guidance=[
                    "Keep the area clean and covered.",
                    "Avoid walking barefoot or putting pressure on the area.",
                    "Arrange a check with your foot-care clinician soon.",
                ],
                image_quality_ok=True,
            )
            dual["patient"]["likely_finding"] = "possible ulcer (screening model)"
            dual["patient"]["severity"] = "moderate"
            dual["clinician"]["morphology"] = (
                f"Classifier-only reading: P(ulcer) = {p_ulcer:.2f}; "
                "no visual narrative available."
            )
            dual["clinician"]["differential"] = ["Diabetic foot ulcer (classifier)"]
            dual["clinician"]["suggested_followup"] = (
                "Podiatry review of the flagged area."
            )
        else:
            dual = minimal_dual(
                "No area of concern was flagged in this photo.",
                care_guidance=[
                    "Keep checking your feet daily.",
                    "Moisturize dry skin, but not between the toes.",
                ],
                image_quality_ok=True,
            )
            dual["patient"]["likely_finding"] = "no visible concern (screening model)"
            dual["clinician"]["morphology"] = (
                f"Classifier-only reading: P(ulcer) = {p_ulcer:.2f}; "
                "no visual narrative available."
            )

    logger.info(
        "predict req=%s label=%s p_ulcer=%.3f uncertain=%s n_similar=%d llm=%s",
        request_id, label, p_ulcer, uncertain, len(similar),
        "ok" if second_opinion.available else (second_opinion.error or "disabled"),
    )

    return PredictResponse(
        quality_ok=True,
        quality=quality_report,
        prediction=prediction,
        similar_cases=similar,
        similarity=similarity,
        heatmap_url=heatmap_url,
        second_opinion=second_opinion,
        patient=PatientReading(**dual["patient"]),
        clinician=ClinicianReading(**dual["clinician"]),
        flags=ReadingFlags(**dual["flags"]),
        model_version=str(state.cfg["project"]["model_version"]),
        reference_bank_version=str(state.cfg["project"]["reference_bank_version"]),
        disclaimer=DISCLAIMER,
    )


@app.get("/heatmaps/{name}")
async def heatmap(name: str):
    if state.heatmaps_dir is None:
        raise HTTPException(status_code=503)
    path = state.heatmaps_dir / name
    if not path.exists() or path.suffix.lower() != ".png":
        raise HTTPException(status_code=404)
    return FileResponse(path, media_type="image/png")


# --------------------------------------------------------------------------
# Landing-page UI: upload an image, click Run, see prediction + heatmap +
# similar cases on one screen. Served from the same FastAPI process so no
# CORS dance is needed between the UI and the model.
# --------------------------------------------------------------------------

_STATIC_DIR = Path(__file__).parent / "static"


@app.get("/", response_class=HTMLResponse, include_in_schema=False)
async def root() -> HTMLResponse:
    index = _STATIC_DIR / "index.html"
    if not index.exists():
        raise HTTPException(status_code=500, detail=f"missing UI bundle at {index}")
    return HTMLResponse(content=index.read_text(encoding="utf-8"))


@app.get("/reference/{cls}/{name}", include_in_schema=False)
async def reference_image(cls: str, name: str):
    """Serve a reference-bank image for the similar-cases panel.

    We resolve against `cfg.paths.reference_bank` and refuse anything that
    tries to escape that root with path traversal. The reference bank
    itself is curated and not PHI, so static serving is fine.
    """
    if state.cfg is None:
        raise HTTPException(status_code=503)
    root = (project_root() / state.cfg["paths"]["reference_bank"]).resolve()
    target = (root / cls / name).resolve()
    try:
        target.relative_to(root)
    except ValueError:
        raise HTTPException(status_code=400, detail="invalid reference path")
    if not target.exists() or target.suffix.lower() not in {".jpg", ".jpeg", ".png"}:
        raise HTTPException(status_code=404)
    media = "image/jpeg" if target.suffix.lower() in {".jpg", ".jpeg"} else "image/png"
    return FileResponse(target, media_type=media)


def _resize_to(arr: np.ndarray, shape) -> np.ndarray:
    """Resize an HxWx3 uint8 array to a target shape using PIL — kept here
    so the gradcam fallback doesn't depend on cv2 at runtime."""
    target_h, target_w = shape
    im = Image.fromarray(arr).resize((target_w, target_h), Image.BILINEAR)
    return np.asarray(im)


# Eager-startup for `uvicorn src.serve.app:app` direct invocation.
startup()
