"use client";

/**
 * Guided auto-capture — the single source of truth for the framing /
 * quality / steadiness signals that decide when to fire the shutter.
 *
 * Called at ~5 fps from CaptureFrame's per-frame loop. Reuses the
 * grayscale buffer the foot detector already produced (no double
 * decoding of the video frame).
 *
 * All thresholds live at the top of this file so they're easy to tune
 * without hunting through the component tree.
 */

import type { DetectionMetrics } from "./footDetection";

// ---------------------------------------------------------------------------
// TUNABLE CONSTANTS — everything you'd want to change is here.
// ---------------------------------------------------------------------------

/** Per-frame sample rate for the detection/guide loop (ms). */
export const SAMPLE_INTERVAL_MS = 200; // ~5 fps

/** All checks must stay green this long before the countdown starts (ms). */
export const READY_HOLD_MS = 800;

/** One tick of the 3-2-1 countdown (ms). */
export const COUNTDOWN_TICK_MS = 500;

/**
 * Frame-to-frame mean absolute difference (0..1) above which the phone
 * is moving. Computed against the previous grayscale frame at
 * ANALYSIS_W × ANALYSIS_H. Higher = less strict.
 */
export const STEADINESS_DIFF_MAX = 0.04;

/**
 * Linear DeviceMotion acceleration magnitude (m/s²) above which we call
 * the phone shaky. Computed from `accelerationIncludingGravity` minus
 * gravity. If DeviceMotion isn't available (desktop, some browsers) we
 * silently fall back to the frame-diff signal only.
 */
export const STEADINESS_ACCEL_MAX = 1.5;

// ---------------------------------------------------------------------------
// Public output
// ---------------------------------------------------------------------------

export interface GuideSignals {
  /** Foot centered in the outline. */
  alignment: boolean;
  /** Foot fills the outline (not too far, not too close). */
  distance: boolean;
  /** Sharp enough (variance-of-Laplacian above threshold). */
  sharpness: boolean;
  /** Luminance in an acceptable band (not too dark, not blown out). */
  exposure: boolean;
  /** Phone is steady enough (video OR IMU signal). */
  steadiness: boolean;
}

export interface GuideState {
  /** Every signal green → safe to start the countdown. */
  allGreen: boolean;
  signals: GuideSignals;
  /**
   * The single most important instruction to show the user right now,
   * e.g. "Move closer", "Center foot in outline", "Hold steady", "More light".
   * null when all signals are green.
   */
  primaryHint: string | null;
  /** Frame-to-frame diff score used for the steadiness signal (debug). */
  frameDiff: number;
  /** Last-known DeviceMotion linear-accel magnitude (debug). */
  motionAccel: number;
}

// ---------------------------------------------------------------------------
// Frame differencing (video-based steadiness)
// ---------------------------------------------------------------------------

let prevGray: Uint8Array | null = null;

/**
 * Normalized mean absolute difference between the current grayscale
 * frame and the previous one, in 0..1. First call primes the buffer
 * and returns 0.
 */
export function frameDiffScore(gray: Uint8Array): number {
  if (!prevGray || prevGray.length !== gray.length) {
    prevGray = new Uint8Array(gray);
    return 0;
  }
  let sum = 0;
  for (let i = 0; i < gray.length; i++) {
    const d = gray[i] - prevGray[i];
    sum += d < 0 ? -d : d;
  }
  const norm = sum / (gray.length * 255);
  prevGray.set(gray);
  return norm;
}

export function resetFrameDiff(): void {
  prevGray = null;
}

// ---------------------------------------------------------------------------
// DeviceMotion (IMU-based steadiness)
// ---------------------------------------------------------------------------

let lastAccelMag = 0;
let deviceMotionAttached = false;
let deviceMotionAvailable = false;

/**
 * Idempotent. Safe to call from a useEffect in CaptureFrame. On iOS 13+
 * DeviceMotion requires an explicit permission request AFTER a user
 * gesture — we skip that here to avoid a permission prompt for every
 * scan; the frame-diff signal is enough steadiness data on its own.
 */
export function attachDeviceMotion(): void {
  if (deviceMotionAttached || typeof window === "undefined") return;
  if (typeof DeviceMotionEvent === "undefined") return;
  deviceMotionAttached = true;
  window.addEventListener(
    "devicemotion",
    (ev: DeviceMotionEvent) => {
      const a = ev.accelerationIncludingGravity ?? ev.acceleration;
      if (!a) return;
      const mag = Math.hypot(a.x ?? 0, a.y ?? 0, a.z ?? 0);
      // If we can access acceleration (without gravity), use its raw
      // magnitude; otherwise strip out gravity (~9.81 m/s²).
      const linear = ev.acceleration
        ? mag
        : Math.abs(mag - 9.81);
      lastAccelMag = linear;
      deviceMotionAvailable = true;
    },
    { passive: true }
  );
}

export function isDeviceSteadyByMotion(): { available: boolean; steady: boolean; accel: number } {
  return {
    available: deviceMotionAvailable,
    steady: lastAccelMag <= STEADINESS_ACCEL_MAX,
    accel: lastAccelMag,
  };
}

// ---------------------------------------------------------------------------
// Compose
// ---------------------------------------------------------------------------

/**
 * Given a detector output + steadiness readings, decide the composite
 * guide state and pick the primary hint to show the user.
 */
export function computeGuide(detection: DetectionMetrics): GuideState {
  const diff = frameDiffScore(detection.gray);
  const motion = isDeviceSteadyByMotion();

  const steadyByVideo = diff <= STEADINESS_DIFF_MAX;
  const steadyByMotion = motion.available ? motion.steady : true; // don't punish for missing sensor
  const steady = steadyByVideo && steadyByMotion;

  const signals: GuideSignals = {
    alignment: detection.quality.alignment,
    distance: detection.quality.distance,
    sharpness: detection.quality.blur,
    exposure: detection.quality.lighting,
    steadiness: steady,
  };

  const allGreen = Object.values(signals).every(Boolean);
  const primaryHint = allGreen ? null : pickPrimaryHint(detection, signals);

  return {
    allGreen,
    signals,
    primaryHint,
    frameDiff: diff,
    motionAccel: motion.accel,
  };
}

/**
 * Priority order matters — we surface the SINGLE most important next
 * action so patients don't have to interpret six checkboxes.
 */
function pickPrimaryHint(m: DetectionMetrics, s: GuideSignals): string {
  if (!m.detected && m.silhouettePx < 800) return "Point the camera at the foot";
  if (!s.distance) return m.silhouettePx < 2000 ? "Move closer" : "Move back";
  if (!s.alignment) return "Center the foot in the outline";
  if (!s.exposure) return m.brightness < 90 ? "Add more light" : "Reduce glare";
  if (!s.sharpness) return "Hold steady — foot is out of focus";
  if (!s.steadiness) return "Hold steady";
  return "Ready — hold still";
}
