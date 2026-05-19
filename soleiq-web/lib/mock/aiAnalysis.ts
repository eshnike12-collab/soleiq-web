import type { AnalysisResult } from "../types";

type Variant = "low" | "medium" | "high";

export const MOCK_RESULTS: Record<
  Variant,
  Omit<AnalysisResult, "visitId" | "scoredAt">
> = {
  low: {
    riskLevel: "low",
    riskFactors: [
      "No active wounds detected",
      "Symmetric foot geometry",
      "Reported no current pain",
    ],
    detections: [],
    volumetrics: [
      {
        side: "right",
        footLengthMm: 268,
        plantarAreaCm2: 145,
        bilateralAsymmetryIndex: 0.03,
        archProfileMm: 18,
      },
      {
        side: "left",
        footLengthMm: 270,
        plantarAreaCm2: 147,
        bilateralAsymmetryIndex: 0.03,
        archProfileMm: 19,
      },
    ],
    trend: "first_scan",
  },
  medium: {
    riskLevel: "medium",
    riskFactors: [
      "Type 2 diabetes diagnosed >5 years ago",
      "Mild redness detected on right sole",
      "Reported numbness in right foot — neuropathy risk",
    ],
    detections: [
      {
        type: "redness",
        side: "right",
        view: "sole",
        polygon: [
          [0.42, 0.55],
          [0.58, 0.55],
          [0.6, 0.68],
          [0.4, 0.7],
        ],
        confidence: 0.78,
      },
      {
        type: "dryness",
        side: "left",
        view: "heel",
        polygon: [
          [0.35, 0.78],
          [0.65, 0.78],
          [0.65, 0.92],
          [0.35, 0.92],
        ],
        confidence: 0.71,
      },
    ],
    volumetrics: [
      {
        side: "right",
        footLengthMm: 268,
        plantarAreaCm2: 145,
        bilateralAsymmetryIndex: 0.04,
        archProfileMm: 18,
      },
      {
        side: "left",
        footLengthMm: 270,
        plantarAreaCm2: 147,
        bilateralAsymmetryIndex: 0.04,
        archProfileMm: 19,
      },
    ],
    trend: "first_scan",
  },
  high: {
    riskLevel: "high",
    riskFactors: [
      "Prior ulcer history on right foot",
      "Active wound detected on right sole",
      "Long-standing diabetes with reported numbness",
    ],
    detections: [
      {
        type: "wound",
        side: "right",
        view: "sole",
        polygon: [
          [0.46, 0.5],
          [0.6, 0.52],
          [0.62, 0.66],
          [0.44, 0.64],
        ],
        confidence: 0.91,
      },
      {
        type: "redness",
        side: "right",
        view: "sole",
        polygon: [
          [0.4, 0.46],
          [0.66, 0.46],
          [0.68, 0.7],
          [0.38, 0.7],
        ],
        confidence: 0.84,
      },
    ],
    volumetrics: [
      {
        side: "right",
        woundVolumeMm3: 220,
        woundDepthMm: 3.4,
        footLengthMm: 268,
        plantarAreaCm2: 145,
        bilateralAsymmetryIndex: 0.07,
        archProfileMm: 17,
      },
      {
        side: "left",
        footLengthMm: 270,
        plantarAreaCm2: 147,
        bilateralAsymmetryIndex: 0.07,
        archProfileMm: 19,
      },
    ],
    trend: "first_scan",
  },
};
