import type { Visit } from "../types";

const day = 24 * 60 * 60 * 1000;
const now = Date.now();

const seedVisit = (offsetDays: number, woundVolumeMm3: number, id: string): Visit => {
  const startedAt = now - offsetDays * day;
  return {
    id,
    startedAt,
    completedAt: startedAt + 12 * 60 * 1000,
    images: (["top", "sole", "heel", "between_toes"] as const).flatMap((view) =>
      (["right", "left"] as const).map((side) => ({
        side,
        view,
        dataUrl: "/sample-foot.svg",
        capturedAt: startedAt,
      }))
    ),
    result: {
      visitId: id,
      scoredAt: startedAt + 11 * 60 * 1000,
      riskLevel: "high",
      riskFactors: [
        "Active wound on right sole",
        "Prior ulcer history",
        "Reported numbness in right foot",
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
          confidence: 0.9,
        },
      ],
      volumetrics: [
        {
          side: "right",
          woundVolumeMm3,
          woundDepthMm: woundVolumeMm3 / 70,
          footLengthMm: 268,
          plantarAreaCm2: 145,
          bilateralAsymmetryIndex: 0.06,
          archProfileMm: 17,
        },
        {
          side: "left",
          footLengthMm: 270,
          plantarAreaCm2: 147,
          bilateralAsymmetryIndex: 0.06,
          archProfileMm: 19,
        },
      ],
      trend: "improving",
    },
  };
};

export const MOCK_PRIOR_VISITS: Visit[] = [
  seedVisit(42, 280, "v_minus42"),
  seedVisit(28, 240, "v_minus28"),
  seedVisit(14, 200, "v_minus14"),
];
