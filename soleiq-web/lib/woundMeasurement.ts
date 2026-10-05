"use client";

import { requestScanAuth, scanServiceStatus } from "./scan3d/scanClient";
import type { CaptureView, DetectionRegion, FootSide } from "./types";

/**
 * Wound segmentation and measurement for one captured photograph.
 *
 * Calls the foot-AI service's /segment endpoint, which runs the trained
 * U-Net + MobileNetV3 segmenter and measures the largest region it finds.
 * The browser calls the service directly, the way the 3D scan already does —
 * proxying a photo through a Next route would upload it twice.
 *
 * NEVER THROWS, AND NEVER BLOCKS A CHECK.
 *
 * A measurement is an enhancement on top of the screening, not a gate in
 * front of it. If the service is unconfigured, unreachable, slow, or has no
 * checkpoint loaded, this returns `null` and the check proceeds exactly as it
 * did before. A patient must never be unable to submit their photos because a
 * measurement service is down.
 *
 * WHAT A NULL MEANS, AND WHAT IT DOES NOT
 *
 * `null` means "not measured" — service unavailable, or no region above
 * threshold. It does NOT mean "healthy", and nothing downstream may render it
 * as such. The model knows one class, wound, and has never been shown a
 * healthy foot; absence of a detection is absence of evidence.
 */

/** How long a single photo's measurement may take before it is abandoned. */
const SEGMENT_TIMEOUT_MS = 20_000;

export interface WoundMeasurementResult {
  /** True when a region above threshold was found and measured. */
  found: boolean;
  areaPx: number;
  /** Share of the frame. Always available — needs no scale reference. */
  areaFrac: number;
  perimeterPx: number;
  /** Millimetre values, or null when no scale reference was in frame. */
  areaMm2: number | null;
  lengthMm: number | null;
  widthMm: number | null;
  perimeterMm: number | null;
  /** Contour in the original frame's pixels, for overlay rendering. */
  polygon: [number, number][];
  /** Peak probability inside the region. */
  confidence: number;
  modelVersion: string;
  frame: { width: number; height: number };
  scaleAvailable: boolean;
}

export async function segmentPhoto(
  blob: Blob,
  options: {
    /** Millimetres per pixel, when a scale reference is known. Omit and every
     *  mm field comes back null rather than a figure the calibration cannot
     *  support. */
    mmPerPx?: number | null;
    signal?: AbortSignal;
  } = {}
): Promise<WoundMeasurementResult | null> {
  const status = scanServiceStatus();
  if (!status.ok) return null;

  let token: string | null = null;
  try {
    const auth = await requestScanAuth();
    token = auth?.token ?? null;
  } catch {
    // The service fails closed for remote callers without a token; there is
    // nothing useful to try without one.
    return null;
  }

  const form = new FormData();
  form.append("file", blob, "photo.jpg");
  if (typeof options.mmPerPx === "number" && Number.isFinite(options.mmPerPx)) {
    form.append("mm_per_px", String(options.mmPerPx));
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SEGMENT_TIMEOUT_MS);
  options.signal?.addEventListener("abort", () => controller.abort(), {
    once: true,
  });

  try {
    const response = await fetch(`${status.baseUrl}/segment`, {
      method: "POST",
      body: form,
      signal: controller.signal,
      ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {}),
    });
    if (!response.ok) return null;
    const payload = await response.json();
    if (!payload?.found || !payload.measurement) {
      // No region above threshold. Reported as not-found, never as healthy.
      return null;
    }
    const m = payload.measurement;
    return {
      found: true,
      areaPx: m.area_px,
      areaFrac: m.area_frac,
      perimeterPx: m.perimeter_px,
      areaMm2: m.area_mm2 ?? null,
      lengthMm: m.length_mm ?? null,
      widthMm: m.width_mm ?? null,
      perimeterMm: m.perimeter_mm ?? null,
      polygon: (m.contour ?? []) as [number, number][],
      confidence: payload.peak_probability ?? 0,
      modelVersion: payload.model_version ?? "unknown",
      frame: payload.frame ?? { width: 0, height: 0 },
      scaleAvailable: Boolean(payload.scale_available),
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** The measurement as the overlay renderer's detection shape. */
export function toDetection(
  measurement: WoundMeasurementResult,
  side: FootSide,
  view: CaptureView
): DetectionRegion {
  return {
    // The model has exactly one class. Anything else would be a claim it
    // cannot make — see the note at the top of this file.
    type: "wound",
    side,
    view,
    polygon: measurement.polygon,
    confidence: measurement.confidence,
  };
}
