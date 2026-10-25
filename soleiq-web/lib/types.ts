import type { FootPerfusionAssessment } from "./perfusion";
import type { UlcerAnalysis } from "./wound";

export type Sex = "male" | "female";
export type DiabetesType = "type_1" | "type_2" | "gestational" | "not_sure";
export type Numbness = "right" | "left" | "both" | "neither";
export type RiskLevel = "low" | "medium" | "high";
export type FootSide = "left" | "right";
export type CaptureView = "top" | "sole" | "heel" | "between_toes";
export type ScanPath = "lidar" | "tof" | "photogrammetry";
export type ScreeningLevel =
  | "clear"
  | "watch"
  | "see_someone_soon"
  | "urgent";

export type GlucoseCategory =
  | "severe_hypo"
  | "hypo"
  | "normal"
  | "impaired_fasting"
  | "diabetes_target"
  | "elevated"
  | "severe_hyper"
  | "crisis";

export type GlucoseSeverity = "emergency" | "warning" | "normal";

export const GLUCOSE_RANGES: {
  value: GlucoseCategory;
  range: string;
  label: string;
  meaning: string;
  severity: GlucoseSeverity;
}[] = [
  {
    value: "severe_hypo",
    range: "<54 mg/dL",
    label: "Severe hypoglycemia",
    meaning:
      "Medical emergency. Risk of seizure, loss of consciousness. Treat immediately with fast-acting carbs or glucagon.",
    severity: "emergency",
  },
  {
    value: "hypo",
    range: "54–69 mg/dL",
    label: "Hypoglycemia (low)",
    meaning:
      "Low blood glucose. Patient should consume 15 g fast-acting carbohydrate and recheck in 15 minutes.",
    severity: "warning",
  },
  {
    value: "normal",
    range: "70–99 mg/dL",
    label: "Normal fasting",
    meaning: "Within healthy fasting range. No immediate action required.",
    severity: "normal",
  },
  {
    value: "impaired_fasting",
    range: "100–125 mg/dL",
    label: "Impaired fasting glucose",
    meaning:
      "Prediabetes range. Reinforce lifestyle modification and follow-up testing.",
    severity: "warning",
  },
  {
    value: "diabetes_target",
    range: "126–180 mg/dL",
    label: "Diabetes target range",
    meaning:
      "Typical postprandial range for patients on therapy. Reassure if patient is meeting their personalized target.",
    severity: "normal",
  },
  {
    value: "elevated",
    range: "181–250 mg/dL",
    label: "Elevated (hyperglycemia)",
    meaning:
      "Poorly controlled. Review medication adherence, recent intake, and consider therapy adjustment.",
    severity: "warning",
  },
  {
    value: "severe_hyper",
    range: "251–400 mg/dL",
    label: "Severe hyperglycemia",
    meaning:
      "Check for ketones if Type 1 or stress illness. Increased risk of dehydration and infection.",
    severity: "warning",
  },
  {
    value: "crisis",
    range: ">400 mg/dL",
    label: "Hyperglycemic crisis (DKA / HHS risk)",
    meaning:
      "Medical emergency. Assess for DKA (Type 1) or HHS (Type 2). Urgent labs, hydration, and escalation.",
    severity: "emergency",
  },
];

export type FootRegion =
  | "great_toe"
  | "lesser_toes"
  | "forefoot_mt"
  | "midfoot"
  | "heel"
  | "whole_foot";

export const FOOT_REGION_LABEL: Record<FootRegion, string> = {
  great_toe: "Great toe",
  lesser_toes: "Lesser toes (2–5)",
  forefoot_mt: "Forefoot / metatarsals",
  midfoot: "Midfoot",
  heel: "Heel",
  whole_foot: "Whole foot",
};

export const FOOT_PROCEDURES: { value: string; label: string }[] = [
  { value: "toe_amputation", label: "Toe amputation" },
  { value: "partial_foot_amputation", label: "Partial foot amputation" },
  { value: "below_knee_amputation", label: "Below-knee amputation" },
  { value: "bunionectomy", label: "Bunionectomy" },
  { value: "hammertoe_correction", label: "Hammertoe correction" },
  { value: "plantar_fascia_release", label: "Plantar fascia release" },
  { value: "achilles_tendon_repair", label: "Achilles tendon repair" },
  { value: "charcot_reconstruction", label: "Charcot reconstruction" },
  { value: "fracture_orif", label: "Foot fracture repair (ORIF)" },
  { value: "wound_debridement", label: "Wound debridement / skin graft" },
  { value: "other", label: "Other foot procedure" },
];

/**
 * Why a medicine matters to a foot photo, rather than what it is.
 *
 * Grouped by the effect on skin, bleeding and healing, because that is what
 * changes how a photograph should be read. "other" is not a failure — a name
 * we do not recognise is still recorded verbatim and still shown to the care
 * team; only the reading hint is missing.
 */
export type MedicationCategory =
  | "anticoagulant"
  | "antiplatelet"
  | "corticosteroid"
  | "immunosuppressant"
  | "chemotherapy"
  | "insulin"
  | "oral_diabetes"
  | "statin"
  | "antihypertensive"
  | "antibiotic"
  | "other";

export interface PatientProfile {
  fullName: string;
  city: string;
  state: string;
  age: number;
  sex: Sex;
  ethnicity: string;
  conditions: string[];
  diabetes?: {
    type: DiabetesType;
    yearDiagnosed: number;
    hba1c?: number;
    glucose10d?: number[];
    /** Most recent glucose-meter reading bucketed into a clinical category. */
    glucoseCategory?: GlucoseCategory;
  };
  /**
   * Peripheral Artery Disease assessment. Distinct from neuropathy and from
   * the generic conditions multi-select so the analysis pipeline can weight
   * vascular risk explicitly. `status` captures the patient's awareness;
   * `claudication`, `restPain`, and `signs` capture clinician-observable
   * indicators; `abi` is the Ankle-Brachial Index if known.
   */
  pad?: {
    status: "diagnosed" | "suspected" | "none" | "unknown";
    claudication: boolean;
    restPain: boolean;
    signs: string[];
    /** Legacy single ABI, kept so older saved answers still load. */
    abi?: number;
    /**
     * Per-side pressures, measured with a cuff and Doppler — never estimated
     * by this app. Peripheral arterial disease is frequently one-sided, so a
     * single figure for "the patient" hides the leg that is in trouble.
     */
    abiLeft?: number;
    abiRight?: number;
    toePressureLeftMmHg?: number;
    toePressureRightMmHg?: number;
  };
  priorEvents: {
    type: "ulcer" | "amputation";
    side: "left" | "right";
    region: FootRegion;
    year: number;
  }[];
  recentSurgery: { flag: boolean; procedures?: string[] };
  /**
   * Major medications the patient reports taking.
   *
   * `undefined` means the question has never been put to them — which is true
   * of everyone whose intake was saved before this question existed, and is
   * what makes the screen mandatory on their next check. It is deliberately
   * distinct from an answered `takesMajorMedication: false` ("asked, says
   * none") and from `null` ("asked, prefers not to say").
   */
  medications?: {
    takesMajorMedication: boolean | null;
    items: { name: string; category?: MedicationCategory }[];
    notes?: string;
  };
  numbness: Numbness;
  alcohol: boolean;
  smoking: boolean;
  shoeSizeUS: number;
  footLengthMm: number;
  painPresent: boolean;
  painPoints: string[];
  /** True once answers from a prior completed assessment are loaded (or one
   *  was completed this session). Drives the "review what changed" screen
   *  for returning patients. */
  hasSavedIntake?: boolean;
}

// Compatibility contract for the separate localhost AI integration retained
// on its feature branch. The four-photo Anthropic flow uses PhotoScreeningResult.
export type ReadingSeverity = "none" | "mild" | "moderate" | "severe";
export type ReadingConfidence = "low" | "medium" | "high";

export interface PatientReading {
  headline: string;
  likely_finding: string;
  severity: ReadingSeverity;
  confidence: ReadingConfidence;
  care_guidance: string[];
  see_a_clinician_if: string[];
  urgent: boolean;
}

export interface ClinicianReading {
  morphology: string;
  differential: string[];
  estimated_wagner_grade: string;
  erythema: boolean;
  exudate: boolean;
  necrosis: boolean;
  infection_signs: boolean;
  suggested_followup: string;
}

export interface ReadingFlags {
  image_quality_ok: boolean;
  is_foot: boolean;
  needs_urgent_care: boolean;
}

export interface VisitReading {
  patient: PatientReading;
  clinician: ClinicianReading;
  flags: ReadingFlags;
  perImage: {
    side: FootSide;
    view: CaptureView;
    patient?: PatientReading | null;
    clinician?: ClinicianReading | null;
    flags?: ReadingFlags | null;
  }[];
  modelVersion?: string | null;
}

export interface CaptureDetection {
  /** True if a foot was detected with confidence above DETECTION_THRESHOLD. */
  detected: boolean;
  /** 0..1 confidence score from the foot detector. */
  confidence: number;
  /** Foot silhouette area in analysis-pixel units. */
  silhouettePx: number;
  brightness?: number;
  blur?: number;
  reasons?: string[];
}

export interface CapturedImage {
  side: FootSide;
  view: CaptureView;
  /** The photograph as taken. What clinicians and patients see. */
  dataUrl: string;
  /**
   * Lighting-corrected copy sent to the model. Absent on captures made before
   * the two were separated, in which case `dataUrl` is the corrected image and
   * the model simply receives that — the old behaviour.
   */
  analysisDataUrl?: string;
  capturedAt: number;
  /**
   * IANA timezone of the device at the moment of capture, e.g.
   * "America/New_York". Stored with the instant because the instant alone
   * cannot say what time the patient saw on their own clock. Optional:
   * captures made before this was recorded fall back to the reader's device.
   */
  timeZone?: string;
  /**
   * Wound segmentation result for this photo, when the measurement service
   * answered. Absent means NOT MEASURED — service unavailable, or no region
   * above threshold. It never means "healthy": the model knows one class and
   * has never been shown a healthy foot. See lib/woundMeasurement.ts.
   */
  measurement?: import("./woundMeasurement").WoundMeasurementResult;
  source?: "live" | "upload";
  detection?: CaptureDetection;
  aiResult?: {
    assessment?: string | null;
    summary?: string | null;
    probability?: number | null;
    confidence?: string | null;
    heatmap_url?: string | null;
    scan_id?: string | null;
    storage_url?: string | null;
    urgent_flags?: string[];
    patient?: PatientReading | null;
    clinician?: ClinicianReading | null;
    flags?: ReadingFlags | null;
    error?: string | null;
    raw?: unknown;
  };
  quality?: {
    passed: boolean;
    brightness: number;
    sharpness: number;
    width: number;
    height: number;
    issues: string[];
  };
  storagePath?: string;
}

export interface PhotoScreeningFinding {
  foot: FootSide;
  surface: "top" | "sole";
  what_we_saw: string;
  location_plain: string;
  concern: "low" | "medium" | "high";
  why_it_matters: string;
  /** 2–4 plain sentences shown when the person taps the marker: what this
   *  is, why it can become a problem for someone with diabetes, and what
   *  makes it better or worse. */
  deeper_explanation: string;
  /** True when the model can't rule out that a dark area is a cast shadow /
   *  lighting gradient rather than real discoloration — the UI shows it as
   *  "may be lighting; retake to confirm" instead of a hard finding.
   *  Optional because results saved before this field existed lack it. */
  lighting_artifact_possible?: boolean;
  region: { x: number; y: number; w: number; h: number } | null;
}

export interface PhotoScreeningResult {
  capture_quality: {
    usable: boolean;
    retake: { image: string; reason: string }[];
  };
  overall: {
    headline: string;
    level: ScreeningLevel;
  };
  findings: PhotoScreeningFinding[];
  /** Plain positives actually visible in the photos ("the skin on top of
   *  both feet looks intact with even color"). Reassurance, not clearance. */
  looks_good: string[];
  /**
   * Keeping-it-that-way advice. Present only at level "clear" — enforced in
   * enforceScreeningSafety, not merely prompted.
   *
   * Kept separate from what_to_do because what_to_do is what this check asks
   * you to act on, and a healthy result has nothing to act on. Merging them
   * would make every clear result read as though something had been found.
   */
  maintenance_tips: string[];
  /** Plain sentences connecting the person's questionnaire answers to what
   *  they should watch ("because you feel numbness in your right foot…"). */
  personal_notes: string[];
  what_to_do: string[];
  when_to_get_help: string[];
  limits: string;
  not_a_diagnosis: true;
}

export interface FootMesh {
  side: FootSide;
  coveragePct: number;
  seedSignature: string;
  capturedAt: number;
  /**
   * Reconstructed heightmap from live camera capture. Row-major grid
   * normalized 0..1; absent when reconstruction failed (camera denied,
   * silhouette too small, etc.) and we should fall back to a placeholder.
   */
  heightmap?: {
    width: number;
    height: number;
    heights: number[];
    silhouettePx: number;
  };
  /** Best detection observed during the 3D scan window. */
  detection?: CaptureDetection;
}

export interface DetectionRegion {
  type: "wound" | "redness" | "dryness" | "callus";
  side: FootSide;
  view: CaptureView;
  /** The model's bounding region. Kept as the fallback shape, never drawn
   *  as a hard rectangle — see components/result/ResultOverlay. */
  polygon: [number, number][];
  confidence: number;
  /** The richer vocabulary; `type` is the narrower legacy one. */
  kind?: import("./wound/changeKind").ChangeKind;
  /** Traced outline in 0..1 coordinates, when segmentation produced one. */
  contour?: [number, number][] | null;
  /** Null when there is no reliable millimetre scale. */
  lengthMm?: number | null;
  widthMm?: number | null;
  areaMm2?: number | null;
  /** Always available — pixels need no calibration. */
  lengthPx?: number;
  widthPx?: number;
  /** False when millimetres are scaled from an unreliable foot outline. */
  scaleReliable?: boolean;
}

export interface VolumetricMetrics {
  side: FootSide;
  woundVolumeMm3?: number;
  woundDepthMm?: number;
  footLengthMm: number;
  plantarAreaCm2: number;
  bilateralAsymmetryIndex: number;
  archProfileMm: number;
}

export interface AnalysisResult {
  visitId: string;
  scoredAt: number;
  riskLevel: RiskLevel;
  riskFactors: string[];
  detections: DetectionRegion[];
  volumetrics: VolumetricMetrics[];
  trend: "improving" | "stable" | "worsening" | "first_scan";
  screening?: PhotoScreeningResult;
  reading?: VisitReading;
  /**
   * Deterministic measurements of the wound-like findings the image model
   * localised (lib/wound). The model says what it is; these say how big it is,
   * which is the part that can be tracked between visits.
   */
  ulcers?: UlcerAnalysis[];
}

/**
 * A view the patient chose not to photograph.
 *
 * Recorded rather than simply left absent, because "no photo of the left
 * sole" and "the left foot was amputated" mean very different things to a
 * clinician reading the report. An absent image is ambiguous; this is not.
 */
export interface SkippedSlot {
  side: FootSide;
  view: CaptureView;
  /** Free text from the patient. Optional — never required to proceed. */
  reason?: string;
  skippedAt: number;
}

export interface Visit {
  id: string;
  startedAt: number;
  completedAt?: number;
  images: CapturedImage[];
  /** Views the patient explicitly skipped. Absent means none were skipped. */
  skippedSlots?: SkippedSlot[];
  meshes: FootMesh[];
  result?: AnalysisResult;
  /** Camera + measured-pressure circulation check (lib/perfusion). */
  perfusion?: FootPerfusionAssessment | null;
}
