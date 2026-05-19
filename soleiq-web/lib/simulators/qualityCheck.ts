// Deterministic mock for demo purposes — see PRD section 6.1 for the eventual real implementation.
export type QualityCheckId =
  | "alignment"
  | "distance"
  | "blur"
  | "lighting"
  | "shadow"
  | "occlusion";

export const QUALITY_CHECKS: { id: QualityCheckId; label: string; delayMs: number }[] = [
  { id: "alignment", label: "Foot aligned", delayMs: 250 },
  { id: "distance", label: "Distance OK", delayMs: 500 },
  { id: "lighting", label: "Lighting OK", delayMs: 800 },
  { id: "blur", label: "Sharp focus", delayMs: 1100 },
  { id: "shadow", label: "No shadow", delayMs: 1500 },
  { id: "occlusion", label: "Frame clear", delayMs: 1900 },
];

export const ALL_GREEN_HOLD_MS = 1200;
