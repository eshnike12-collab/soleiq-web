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
    abi?: number;
  };
  priorEvents: {
    type: "ulcer" | "amputation";
    side: "left" | "right";
    region: FootRegion;
    year: number;
  }[];
  recentSurgery: { flag: boolean; procedures?: string[] };
  numbness: Numbness;
  alcohol: boolean;
  smoking: boolean;
  shoeSizeUS: number;
  footLengthMm: number;
  painPresent: boolean;
  painPoints: string[];
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
  dataUrl: string;
  capturedAt: number;
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
  polygon: [number, number][];
  confidence: number;
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
}

export interface Visit {
  id: string;
  startedAt: number;
  completedAt?: number;
  images: CapturedImage[];
  meshes: FootMesh[];
  result?: AnalysisResult;
}
