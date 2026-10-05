/**
 * Which shape the camera preview takes.
 *
 * Pulled out of LiveCamera as a pure function so the rule can be tested
 * directly. It is worth testing because getting it wrong is not a cosmetic
 * problem: the failure mode was a phone held upright showing a 16:9
 * letterboxed strip across the middle of the screen, for every check, with no
 * obvious way back.
 */

export type CameraOrientation = "portrait" | "landscape";

export const ORIENTATION_KEY = "soleiq-camera-orientation";

export interface OrientationInput {
  /** Phone or tablet — a camera someone holds and points. */
  handheld: boolean;
  /** Any previously saved Phone/Laptop choice. */
  stored: string | null;
  /** Whether the viewport is currently taller than it is wide. */
  viewportPortrait: boolean;
}

/**
 * ON A HANDHELD THIS IS ALWAYS PORTRAIT, and `stored` is ignored.
 *
 * That precedence is the whole fix. The Phone/Laptop toggle used to sit at
 * the top centre of the viewfinder — where a thumb goes while lining up a
 * shot — and tapping "Laptop" wrote `landscape` to localStorage permanently.
 * Every later check then honoured it, including the rotation handler, which
 * deliberately stood down whenever an explicit choice existed.
 *
 * A phone camera is portrait. Modelling that as a preference rather than a
 * property of the device is what let one accidental tap become permanent.
 */
export function resolveOrientation(input: OrientationInput): CameraOrientation {
  if (input.handheld) return "portrait";
  if (input.stored === "portrait" || input.stored === "landscape") {
    return input.stored;
  }
  return input.viewportPortrait ? "portrait" : "landscape";
}

/**
 * The previous rule, kept only so the regression test can state exactly what
 * changed. Not called by the app.
 */
export function resolveOrientationLegacy(
  input: OrientationInput
): CameraOrientation {
  if (input.stored === "portrait" || input.stored === "landscape") {
    return input.stored;
  }
  return input.viewportPortrait ? "portrait" : "landscape";
}

/**
 * Is this a device whose camera is held rather than mounted?
 *
 * A coarse pointer means touch. The width test catches touch laptops and the
 * occasional phone reporting a fine pointer. Either is sufficient.
 */
export function detectHandheld(win: Window | undefined = typeof window === "undefined" ? undefined : window): boolean {
  if (!win?.matchMedia) return true;
  return (
    win.matchMedia("(pointer: coarse)").matches ||
    win.matchMedia("(max-width: 820px)").matches
  );
}
