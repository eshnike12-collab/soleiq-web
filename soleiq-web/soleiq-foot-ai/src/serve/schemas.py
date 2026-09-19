"""Pydantic schemas for the FastAPI service.

The SoleIQ React Native client depends on these — keep them backward
compatible across model versions. Any breaking change goes through a
new `/v2/predict` endpoint, never an in-place rename.
"""

from __future__ import annotations

from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


DISCLAIMER = (
    "Screening aid only — not a diagnosis. Seek clinician evaluation; "
    "urgently if signs of infection (spreading redness, warmth, pus, "
    "foul odor), an open or black wound, or systemic illness are present."
)


class Prediction(BaseModel):
    label: str = Field(..., description="Predicted class name")
    probability: float = Field(..., ge=0.0, le=1.0)
    uncertain: bool = Field(
        ...,
        description=(
            "True when probability is in a band the model isn't well "
            "calibrated for. The clinician should treat the result as a "
            "soft prompt to examine, not a confident readout."
        ),
    )


class SimilarCase(BaseModel):
    id: str
    label: str
    distance: float


class SimilarityReadout(BaseModel):
    most_consistent_with: Optional[str] = None
    mean_distance: Optional[float] = None
    support: dict[str, int] = Field(default_factory=dict)


class QualityReport(BaseModel):
    ok: bool
    blur_var: float
    luma_mean: float
    skin_fraction: float
    reasons: List[str] = Field(default_factory=list)


class SecondOpinion(BaseModel):
    """Structured reading from a foundation-model vision call (Claude
    Opus by default). Always present in the response; `available=False`
    when the LLM is disabled, unconfigured, or errored."""

    model_config = ConfigDict(protected_namespaces=())

    available: bool = False
    error: Optional[str] = None
    model: Optional[str] = None
    # Claude's own structured verdict — drives the headline badge so the UI
    # never silently defers to the classifier when Claude disagrees.
    # One of: ulcer_likely / ulcer_possible / no_ulcer / uncertain / non_diagnostic
    assessment: Optional[str] = None
    summary: Optional[str] = None
    visible_findings: List[str] = Field(default_factory=list)
    suspected_differential: List[str] = Field(default_factory=list)
    recommended_workup: List[str] = Field(default_factory=list)
    urgent_flags: List[str] = Field(default_factory=list)
    confidence: Optional[str] = None
    agrees_with_classifier: Optional[bool] = None
    latency_ms: Optional[int] = None
    input_tokens: Optional[int] = None
    output_tokens: Optional[int] = None
    cache_read_input_tokens: Optional[int] = None
    cache_creation_input_tokens: Optional[int] = None


class PatientReading(BaseModel):
    """Plain-language block rendered to the patient in the app."""

    headline: str
    likely_finding: str
    severity: str = "none"  # none | mild | moderate | severe
    confidence: str = "low"  # low | medium | high
    care_guidance: List[str] = Field(default_factory=list)
    see_a_clinician_if: List[str] = Field(default_factory=list)
    urgent: bool = False


class ClinicianReading(BaseModel):
    """Structured snapshot for the podiatrist / wound-care clinician."""

    morphology: str
    differential: List[str] = Field(default_factory=list)
    estimated_wagner_grade: str = "n/a"  # "0"–"5" or "n/a" — visual estimate only
    erythema: bool = False
    exudate: bool = False
    necrosis: bool = False
    infection_signs: bool = False
    suggested_followup: str = "Routine podiatry review."


class ReadingFlags(BaseModel):
    image_quality_ok: bool = True
    is_foot: bool = True
    needs_urgent_care: bool = False


class PredictResponse(BaseModel):
    # `model_version` would otherwise collide with Pydantic's protected
    # `model_*` namespace and emit a warning on every server start.
    model_config = ConfigDict(protected_namespaces=())

    quality_ok: bool
    quality: QualityReport
    prediction: Optional[Prediction]
    similar_cases: List[SimilarCase] = Field(default_factory=list)
    similarity: SimilarityReadout
    heatmap_url: Optional[str] = None
    second_opinion: SecondOpinion = Field(default_factory=SecondOpinion)
    # Dual-view reading (additive — v1 clients ignore these). Always
    # populated: from Claude when available, else deterministically.
    patient: Optional[PatientReading] = None
    clinician: Optional[ClinicianReading] = None
    flags: Optional[ReadingFlags] = None
    model_version: str
    reference_bank_version: str
    disclaimer: str = DISCLAIMER


class HealthResponse(BaseModel):
    ok: bool = True


class VersionResponse(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    model_version: str
    reference_bank_version: str
