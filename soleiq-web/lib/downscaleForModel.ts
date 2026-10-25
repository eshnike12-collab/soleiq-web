"use client";

/**
 * Shrink a captured photo to the size the vision model actually uses.
 *
 * 1568px is Anthropic's documented optimal long edge: anything larger is
 * downscaled server-side before the model ever sees it, so sending a 4000px
 * phone photo buys no detail at all and costs upload time on a patient's data
 * connection, tokens, and latency on every single check.
 *
 * THE FULL-RESOLUTION ORIGINAL IS NOT TOUCHED. Only the copy handed to the
 * model is reduced. Storage keeps the original, and so does the measurement
 * pipeline in lib/woundMeasurement.ts — a wound measured on a downscaled
 * frame would report a different number of pixels, and the millimetre
 * conversion depends on that frame being the one the scale reference was in.
 */

/** Documented optimal long edge for Claude vision. */
export const MODEL_MAX_EDGE = 1568;

/** Re-encode quality. 0.85 is visually clean on skin texture at this size. */
const JPEG_QUALITY = 0.85;

/**
 * Returns a JPEG data URL no larger than MODEL_MAX_EDGE on its long side.
 *
 * Returns the input unchanged if it is already small enough, or if anything
 * goes wrong — a failed downscale must never block a check, and the original
 * is always a valid thing to send.
 */
export async function downscaleForModel(dataUrl: string): Promise<string> {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return dataUrl;
  }
  try {
    // Decoded by hand rather than with `fetch(dataUrl)`.
    //
    // The app's CSP is `connect-src 'self'`, and a data: URL is not 'self' —
    // so fetching one is blocked, the catch below swallowed it, and this
    // function silently returned the original at full size. It looked like it
    // was working: every photo came back valid, just unshrunk. Decoding the
    // base64 directly involves no network primitive and no CSP directive.
    const bitmap = await createImageBitmap(dataUrlToBlob(dataUrl));
    const longEdge = Math.max(bitmap.width, bitmap.height);

    if (longEdge <= MODEL_MAX_EDGE) {
      bitmap.close?.();
      return dataUrl;
    }

    const scale = MODEL_MAX_EDGE / longEdge;
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) {
      bitmap.close?.();
      return dataUrl;
    }
    // Browser-native resampling. Explicit rather than default because the
    // default is implementation-dependent and skin texture is the signal.
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();

    return canvas.toDataURL("image/jpeg", JPEG_QUALITY);
  } catch (reason) {
    // Never block a check over a failed resize — but say so, because a silent
    // fallback here is indistinguishable from success and costs every patient
    // the upload.
    console.warn("[downscale] falling back to the original photo:", reason);
    return dataUrl;
  }
}

/** base64 data URL -> Blob, without touching fetch. */
function dataUrlToBlob(dataUrl: string): Blob {
  const comma = dataUrl.indexOf(",");
  const header = dataUrl.slice(0, comma);
  const mime = /:(.*?);/.exec(header)?.[1] ?? "image/jpeg";
  const binary = atob(dataUrl.slice(comma + 1));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

/** Approximate byte size of a data URL's payload. */
export function dataUrlBytes(dataUrl: string): number {
  const comma = dataUrl.indexOf(",");
  if (comma < 0) return 0;
  // base64 carries 3 bytes per 4 characters.
  return Math.floor(((dataUrl.length - comma - 1) * 3) / 4);
}
