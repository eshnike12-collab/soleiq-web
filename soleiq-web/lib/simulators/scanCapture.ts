// Deterministic mock for demo purposes — see PRD section 6.2.
import type { ScanPath } from "../types";

export const SCAN_DURATION_MS: Record<ScanPath, number> = {
  lidar: 10000,
  tof: 10000,
  photogrammetry: 12000,
};

export const SCAN_LABELS: Record<ScanPath, string> = {
  lidar: "LiDAR depth detected",
  tof: "ToF depth detected",
  photogrammetry: "Photogrammetry — guided arc",
};
