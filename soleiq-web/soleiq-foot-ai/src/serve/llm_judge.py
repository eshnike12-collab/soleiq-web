"""Foundation-model second opinion (Claude vision).

Runs the captured foot image through Claude Opus with a structured
medical-screening prompt and parses the result into a typed dict. The
prompt is explicit that this is screening / decision-support, not a
diagnosis, and that the output must be strictly the JSON schema below
so the UI can render structured fields rather than free-form prose.

Architecture notes
------------------
* The deterministic classifier runs first; its result is included in
  the LLM's user message so the LLM can comment on whether it agrees.
* The system prompt is marked for ephemeral prompt caching — Anthropic
  caches blocks ≥ 1024 tokens, so the speedup kicks in once the
  prompt grows; the cache_control directive is harmless when below
  the threshold and forward-compatible if more clinical instructions
  are added later.
* The judge is OFF by default. It only initialises when
  `capabilities.llm_second_opinion.enabled: true` in config AND
  `ANTHROPIC_API_KEY` is set in the environment. Either being absent
  yields `{"available": False, "error": "..."}` rather than crashing
  the predict endpoint.

PHI / HIPAA
-----------
Image bytes are sent to api.anthropic.com over TLS. For real patient
photos this requires a signed Business Associate Agreement with
Anthropic. We do NOT log raw bytes locally.
"""

from __future__ import annotations

import base64
import json
import logging
import os
import re
import time
from typing import Optional

logger = logging.getLogger("soleiq.llm")

DEFAULT_MODEL = "claude-opus-4-8"
MAX_TOKENS = 1024
TIMEOUT_S = 25.0

SYSTEM_PROMPT = """You are the image-analysis engine inside SoleIQ, a foot-health screening app for people with diabetes. A patient has photographed their foot. Your output drives two views: a plain-language summary the patient reads in the app, and a structured clinical snapshot their podiatrist or wound-care clinician may review. The app is a screening aid, not a diagnostic device, and your output must reflect that.

Assess the photo for blisters, ulcers, and related findings (erythema, maceration, necrosis, callus, signs of infection). If the image is too blurry, too dark, poorly framed, or does not show a foot, say so via the flags rather than guessing.

CONTEXT FROM THE CV PIPELINE
The user message includes the output of a deterministic ulcer classifier and a similar-case retrieval index that ran on this same image. Treat it as one signal among several: it is calibrated for recall (over-referral is preferred to a missed ulcer) and it can be wrong. Your reading of the actual pixels takes precedence when you disagree.

Respond with ONLY a JSON object in exactly this shape, no markdown fences, no other text:

{
  "patient": {
    "headline": "One plain sentence stating what the photo most likely shows.",
    "likely_finding": "e.g. friction blister, early-stage ulcer, no visible concern",
    "severity": "none | mild | moderate | severe",
    "confidence": "low | medium | high",
    "care_guidance": ["2-4 short, plain-language self-care steps appropriate for a person with diabetes"],
    "see_a_clinician_if": ["2-3 specific warning signs that mean they should get professional care"],
    "urgent": false
  },
  "clinician": {
    "morphology": "Concise clinical description of the visible lesion(s): location, approximate size relative to anatomy, borders, base, surrounding skin.",
    "differential": ["Up to 3 possibilities, most likely first"],
    "estimated_wagner_grade": "0-5 or 'n/a' — visual estimate only",
    "erythema": false,
    "exudate": false,
    "necrosis": false,
    "infection_signs": false,
    "suggested_followup": "One sentence, e.g. 'Routine podiatry review' or 'Wound care evaluation within 48 hours'"
  },
  "flags": {
    "image_quality_ok": true,
    "is_foot": true,
    "needs_urgent_care": false
  }
}

Rules:
- Patient language: no jargon, no alarm beyond what findings warrant, never present the result as a diagnosis. Frame as "this looks like" / "this may be".
- Set "urgent" and "needs_urgent_care" to true for findings like deep ulceration, spreading redness, black tissue, or visible pus, and make the headline direct the patient to seek care promptly.
- If image_quality_ok or is_foot is false, keep both patient and clinician fields minimal and set severity to "none" with confidence "low".
- Calibrate confidence honestly. A single photo cannot rule out infection or assess depth; "high" confidence should be rare.
- Recall matters more than precision: if a plausible ulcer or pre-ulcerative lesion is visible, do not report severity "none"."""


USER_TEMPLATE = """Analyze this foot photograph.

CV pipeline findings for this image:
- Classifier label: {label} (P(ulcer) = {p_ulcer:.3f}, operating threshold {threshold:.3f})
- Local quality gate: {quality_ok}
- Similar-case retrieval: most consistent with "{sim_label}" (support: {sim_support})

Return the dual patient/clinician JSON per the system prompt."""


class LLMJudge:
    """Stateful wrapper around the Anthropic client. Constructed once at
    FastAPI startup; thread-safe for the single-process uvicorn setup
    this project uses."""

    def __init__(self, model: str = DEFAULT_MODEL):
        self.model = model
        self.client = None
        self.error: Optional[str] = None
        try:
            import anthropic  # noqa: F401  (deferred import — checked here)
        except ImportError:
            self.error = "anthropic SDK not installed"
            return

        key = (os.environ.get("ANTHROPIC_API_KEY") or "").strip()
        if not key:
            self.error = "ANTHROPIC_API_KEY not set"
            return
        # The Anthropic SDK accepts any string at construction time and only
        # validates on the first request. Reject obvious placeholders here
        # so `ready=True` actually means "ready to make a real call."
        if not key.startswith("sk-ant-") or "replace" in key.lower():
            self.error = (
                "ANTHROPIC_API_KEY looks like a placeholder "
                f"(starts with '{key[:8]}…'). Drop a real key into .env."
            )
            return

        try:
            import anthropic
            self.client = anthropic.Anthropic(timeout=TIMEOUT_S)
        except Exception as e:  # pragma: no cover — defensive
            self.error = f"failed to construct anthropic client: {e}"

    @property
    def ready(self) -> bool:
        return self.client is not None

    def get_opinion(
        self,
        image_bytes: bytes,
        image_mime: str,
        classifier_label: str,
        classifier_p_ulcer: float,
        threshold: float,
        quality_ok: bool,
        similarity_label: Optional[str] = None,
        similarity_support: Optional[dict] = None,
    ) -> dict:
        if not self.ready:
            return {"available": False, "error": self.error}

        t0 = time.time()
        try:
            b64 = base64.standard_b64encode(image_bytes).decode("ascii")
            user_text = USER_TEMPLATE.format(
                label=classifier_label,
                p_ulcer=classifier_p_ulcer,
                threshold=threshold,
                quality_ok="pass" if quality_ok else "fail",
                sim_label=similarity_label or "n/a",
                sim_support=similarity_support or {},
            )
            mime = (image_mime or "image/jpeg").lower()
            if mime not in {"image/jpeg", "image/png", "image/webp", "image/gif"}:
                mime = "image/jpeg"

            resp = self.client.messages.create(
                model=self.model,
                max_tokens=MAX_TOKENS,
                system=[
                    {
                        "type": "text",
                        "text": SYSTEM_PROMPT,
                        "cache_control": {"type": "ephemeral"},
                    }
                ],
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "image",
                                "source": {
                                    "type": "base64",
                                    "media_type": mime,
                                    "data": b64,
                                },
                            },
                            {"type": "text", "text": user_text},
                        ],
                    }
                ],
            )
            text = "".join(
                getattr(b, "text", "") for b in resp.content if getattr(b, "type", None) == "text"
            )
            payload = normalize_dual(_safe_parse_json(text))
            payload["available"] = True
            payload["model"] = self.model
            payload["latency_ms"] = int((time.time() - t0) * 1000)

            # Surface caching info if the SDK provides it — useful for
            # confirming the system prompt is actually being cached.
            usage = getattr(resp, "usage", None)
            if usage:
                payload["input_tokens"] = getattr(usage, "input_tokens", None)
                payload["output_tokens"] = getattr(usage, "output_tokens", None)
                payload["cache_read_input_tokens"] = getattr(
                    usage, "cache_read_input_tokens", 0
                )
                payload["cache_creation_input_tokens"] = getattr(
                    usage, "cache_creation_input_tokens", 0
                )
            return payload

        except Exception as e:
            logger.warning("LLM judge failed: %s", e)
            return {"available": False, "error": str(e)}


# ---------------------------------------------------------------------------
# JSON parsing — be forgiving when the model wraps output in ```json fences
# or includes a sentence of preamble despite instructions.
# ---------------------------------------------------------------------------

def _safe_parse_json(text: str) -> dict:
    text = (text or "").strip()
    # 1) try the whole string
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    # 2) try to peel off ```json fences
    fenced = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
    if fenced:
        try:
            return json.loads(fenced.group(1))
        except json.JSONDecodeError:
            pass
    # 3) find the first balanced JSON object
    m = re.search(r"\{.*\}", text, re.DOTALL)
    if m:
        try:
            return json.loads(m.group(0))
        except json.JSONDecodeError as e:
            return {"summary": text, "_parse_error": str(e)}
    return {"summary": text, "_parse_error": "no JSON object found"}


# ---------------------------------------------------------------------------
# Dual patient/clinician payload shaping. The UI treats these three blocks
# as the contract, so every path out of this module (LLM success, LLM
# failure, quality-gate fail) must produce all of them fully populated.
# ---------------------------------------------------------------------------

_SEVERITIES = {"none", "mild", "moderate", "severe"}
_CONFIDENCES = {"low", "medium", "high"}


def normalize_dual(payload: dict) -> dict:
    """Coerce an LLM response into the full patient/clinician/flags shape,
    filling defaults for anything missing or mistyped."""
    p = payload.get("patient") if isinstance(payload.get("patient"), dict) else {}
    c = payload.get("clinician") if isinstance(payload.get("clinician"), dict) else {}
    f = payload.get("flags") if isinstance(payload.get("flags"), dict) else {}

    severity = str(p.get("severity", "none")).lower()
    confidence = str(p.get("confidence", "low")).lower()
    payload["patient"] = {
        "headline": str(p.get("headline") or "The photo could not be fully assessed."),
        "likely_finding": str(p.get("likely_finding") or "unclear"),
        "severity": severity if severity in _SEVERITIES else "none",
        "confidence": confidence if confidence in _CONFIDENCES else "low",
        "care_guidance": [str(x) for x in p.get("care_guidance") or []],
        "see_a_clinician_if": [str(x) for x in p.get("see_a_clinician_if") or []],
        "urgent": bool(p.get("urgent", False)),
    }
    payload["clinician"] = {
        "morphology": str(c.get("morphology") or "No assessable lesion description."),
        "differential": [str(x) for x in c.get("differential") or []],
        "estimated_wagner_grade": str(c.get("estimated_wagner_grade") or "n/a"),
        "erythema": bool(c.get("erythema", False)),
        "exudate": bool(c.get("exudate", False)),
        "necrosis": bool(c.get("necrosis", False)),
        "infection_signs": bool(c.get("infection_signs", False)),
        "suggested_followup": str(
            c.get("suggested_followup") or "Routine podiatry review."
        ),
    }
    payload["flags"] = {
        "image_quality_ok": bool(f.get("image_quality_ok", True)),
        "is_foot": bool(f.get("is_foot", True)),
        "needs_urgent_care": bool(
            f.get("needs_urgent_care", payload["patient"]["urgent"])
        ),
    }
    return payload


def minimal_dual(
    reason: str,
    care_guidance: Optional[list] = None,
    image_quality_ok: bool = False,
    is_foot: bool = True,
) -> dict:
    """Deterministic dual payload for images the pipeline refuses to read
    (local quality-gate fail) or when the LLM is unavailable. No API call."""
    return {
        "patient": {
            "headline": reason,
            "likely_finding": "unclear",
            "severity": "none",
            "confidence": "low",
            "care_guidance": care_guidance
            or [
                "Retake the photo in good lighting with your whole foot in the frame.",
                "Hold the camera steady about arm's length from your foot.",
            ],
            "see_a_clinician_if": [
                "You have an open sore, blister, or wound that is not healing.",
                "You notice spreading redness, warmth, swelling, or drainage.",
                "You have new pain, numbness, or dark-colored skin on your foot.",
            ],
            "urgent": False,
        },
        "clinician": {
            "morphology": "Image not assessable — " + reason,
            "differential": [],
            "estimated_wagner_grade": "n/a",
            "erythema": False,
            "exudate": False,
            "necrosis": False,
            "infection_signs": False,
            "suggested_followup": "Repeat image capture before assessment.",
        },
        "flags": {
            "image_quality_ok": image_quality_ok,
            "is_foot": is_foot,
            "needs_urgent_care": False,
        },
    }


def legacy_assessment(dual: dict) -> str:
    """Map the dual payload onto the v1 SecondOpinion.assessment enum so
    older clients keep getting a meaningful badge."""
    flags = dual.get("flags") or {}
    patient = dual.get("patient") or {}
    if not flags.get("is_foot", True):
        return "non_diagnostic"
    if not flags.get("image_quality_ok", True):
        return "uncertain"
    severity = patient.get("severity", "none")
    finding = str(patient.get("likely_finding", "")).lower()
    if "ulcer" in finding:
        return "ulcer_likely" if severity in ("moderate", "severe") else "ulcer_possible"
    if severity in ("moderate", "severe"):
        return "ulcer_possible"
    return "no_ulcer"
