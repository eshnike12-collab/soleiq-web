/**
 * Lightweight face-detection wrapper for capture gating.
 *
 * Uses the Chrome `FaceDetector` Shape Detection API when available — that's
 * native-speed, no model download. On other browsers (Safari/Firefox/iOS),
 * `isFaceDetectorSupported()` returns false and the foot detector's stricter
 * aspect-ratio heuristic is the only defense.
 */

interface NativeFaceDetector {
  detect(source: HTMLVideoElement | HTMLCanvasElement | ImageBitmap): Promise<unknown[]>;
}

interface FaceDetectorConstructor {
  new (options?: { fastMode?: boolean; maxDetectedFaces?: number }): NativeFaceDetector;
}

declare global {
  interface Window {
    FaceDetector?: FaceDetectorConstructor;
  }
}

let detector: NativeFaceDetector | null | undefined;

export function isFaceDetectorSupported(): boolean {
  if (typeof window === "undefined") return false;
  return typeof window.FaceDetector === "function";
}

function getDetector(): NativeFaceDetector | null {
  if (detector !== undefined) return detector;
  if (!isFaceDetectorSupported()) {
    detector = null;
    return null;
  }
  try {
    detector = new window.FaceDetector!({ fastMode: true, maxDetectedFaces: 3 });
    return detector;
  } catch {
    detector = null;
    return null;
  }
}

/** Returns the number of faces seen, or null if detection couldn't run. */
export async function countFacesInVideo(
  video: HTMLVideoElement
): Promise<number | null> {
  const d = getDetector();
  if (!d) return null;
  if (!video.videoWidth || !video.videoHeight) return null;
  try {
    const faces = await d.detect(video);
    return faces.length;
  } catch {
    return null;
  }
}
