"use client";

/**
 * In-app live camera for the four-photo flow. Streams getUserMedia into a
 * <video>, captures a frame to JPEG on shutter, and hands back a File that
 * goes through the same prepareFootPhoto() quality gate as uploads.
 *
 * The old "Take photo" control was a file input with capture="environment",
 * which desktop browsers treat as a plain upload dialog — this component is
 * the fix. If the camera can't start (no device, permission denied,
 * insecure context), onUnavailable fires so the caller can steer the user
 * to the upload path instead.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Monitor, RefreshCcw, Smartphone, Sun, X } from "lucide-react";
import { measureLightingUnevenness } from "@/lib/photoQuality";
import { FootGhostOverlay } from "./PhotoGuideAnimation";
import type { FootSide } from "@/lib/types";

type CameraOrientation = "portrait" | "landscape";

const ORIENTATION_KEY = "soleiq-camera-orientation";

/** Default: portrait on a vertically-held phone, landscape on a laptop; an
 *  explicit user choice (localStorage) always wins. */
function detectOrientation(): CameraOrientation {
  if (typeof window === "undefined") return "portrait";
  const stored = window.localStorage.getItem(ORIENTATION_KEY);
  if (stored === "portrait" || stored === "landscape") return stored;
  return window.matchMedia("(orientation: portrait)").matches
    ? "portrait"
    : "landscape";
}

export function LiveCamera({
  onCapture,
  onClose,
  onUnavailable,
  guideSide,
  guideView,
}: {
  onCapture: (file: File) => void;
  onClose: () => void;
  onUnavailable: (message: string) => void;
  /** When provided, a ghost outline of the requested shot is drawn over the
   *  preview so the patient can line the foot up with it. */
  guideSide?: FootSide;
  guideView?: "top" | "sole";
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [ready, setReady] = useState(false);
  const [facing, setFacing] = useState<"environment" | "user">("environment");
  const [canFlip, setCanFlip] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [captureError, setCaptureError] = useState<string | null>(null);
  const [unevenLight, setUnevenLight] = useState(false);
  const [orientation, setOrientation] = useState<CameraOrientation>(detectOrientation);

  const chooseOrientation = (value: CameraOrientation) => {
    try {
      window.localStorage.setItem(ORIENTATION_KEY, value);
    } catch {
      /* private mode — the in-memory choice still applies */
    }
    setOrientation(value);
  };

  // Follow device rotation while the camera is open — but only when the user
  // hasn't made an explicit Phone/Laptop choice.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(orientation: portrait)");
    const onChange = () => {
      const stored = window.localStorage.getItem(ORIENTATION_KEY);
      if (stored === "portrait" || stored === "landscape") return;
      setOrientation(media.matches ? "portrait" : "landscape");
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  // Live lighting check: sample the preview about once a second and warn on
  // strong directional shadows BEFORE the shot is taken. Advisory only — it
  // never blocks the shutter.
  useEffect(() => {
    if (!ready) return;
    const SAMPLE = 96;
    const canvas = document.createElement("canvas");
    canvas.width = SAMPLE;
    canvas.height = SAMPLE;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return;
    const timer = setInterval(() => {
      const video = videoRef.current;
      if (!video || video.videoWidth === 0) return;
      try {
        context.drawImage(video, 0, 0, SAMPLE, SAMPLE);
        const pixels = context.getImageData(0, 0, SAMPLE, SAMPLE).data;
        const gray = new Float32Array(SAMPLE * SAMPLE);
        for (let i = 0; i < gray.length; i++) {
          gray[i] =
            pixels[i * 4] * 0.299 + pixels[i * 4 + 1] * 0.587 + pixels[i * 4 + 2] * 0.114;
        }
        // High threshold: lighting is auto-corrected after capture, so only
        // truly harsh light (deep shadow across the frame) earns a hint.
        setUnevenLight(measureLightingUnevenness(gray, SAMPLE, SAMPLE) > 0.85);
      } catch {
        /* sampling is best-effort */
      }
    }, 900);
    return () => clearInterval(timer);
  }, [ready]);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    let cancelled = false;
    setReady(false);

    const start = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        onUnavailable("This browser can't open a camera here. Use Upload photo instead.");
        return;
      }
      try {
        // Ask for a stream shaped like the mode we'll display. Browsers may
        // still grant a different shape (phones often ignore landscape
        // requests); the shutter compensates by cropping the capture to the
        // previewed region, so preview and JPEG always match regardless.
        const stream = await navigator.mediaDevices.getUserMedia({
          video:
            orientation === "portrait"
              ? {
                  facingMode: { ideal: facing },
                  width: { ideal: 1080 },
                  height: { ideal: 1920 },
                  aspectRatio: { ideal: 9 / 16 },
                }
              : {
                  facingMode: { ideal: facing },
                  width: { ideal: 1920 },
                  height: { ideal: 1080 },
                  aspectRatio: { ideal: 16 / 9 },
                },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => undefined);
        }
        setReady(true);
        const devices = await navigator.mediaDevices.enumerateDevices().catch(() => []);
        if (!cancelled) {
          setCanFlip(devices.filter((device) => device.kind === "videoinput").length > 1);
        }
      } catch (reason) {
        if (cancelled) return;
        const name = reason instanceof DOMException ? reason.name : "";
        onUnavailable(
          name === "NotAllowedError"
            ? "Camera permission was denied. Allow camera access in your browser, or use Upload photo."
            : name === "NotFoundError"
              ? "No camera was found on this device. Use Upload photo instead."
              : "The camera could not start. Use Upload photo instead."
        );
      }
    };

    void start();
    return () => {
      cancelled = true;
      stop();
    };
  }, [facing, orientation, onUnavailable, stop]);

  /** Max output edge. The quality gate downsizes to 1400 anyway; capping the
   *  capture canvas keeps memory low enough that iOS Safari's toBlob doesn't
   *  bail out (it returns null on large canvases / low-memory devices). */
  const MAX_CAPTURE_EDGE = 1600;

  const finishCapture = (blob: Blob) => {
    stop();
    setCapturing(false);
    onCapture(new File([blob], `camera-${Date.now()}.jpg`, { type: "image/jpeg" }));
  };

  const failCapture = (message: string) => {
    // Never a silent dead end: keep the camera open, tell the user, let
    // them tap the shutter again.
    setCapturing(false);
    setCaptureError(message);
  };

  const shutter = () => {
    if (capturing) return;
    setCaptureError(null);
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) {
      failCapture("The camera is still starting — give it a second and tap again.");
      return;
    }
    setCapturing(true);
    try {
      // WYSIWYG capture: the preview shows an object-cover crop of the
      // stream, so capture exactly that region. Crop the source frame to the
      // preview element's aspect ratio (centered, like object-cover), then
      // scale. This is what keeps portrait phone shots upright and framed
      // exactly as previewed even when the browser granted a landscape
      // stream — no rotation ever needed, frames arrive upright.
      const viewAspect =
        video.clientWidth > 0 && video.clientHeight > 0
          ? video.clientWidth / video.clientHeight
          : video.videoWidth / video.videoHeight;
      const sourceAspect = video.videoWidth / video.videoHeight;
      let sx = 0;
      let sy = 0;
      let sw = video.videoWidth;
      let sh = video.videoHeight;
      if (sourceAspect > viewAspect) {
        sw = Math.round(video.videoHeight * viewAspect);
        sx = Math.round((video.videoWidth - sw) / 2);
      } else if (sourceAspect < viewAspect) {
        sh = Math.round(video.videoWidth / viewAspect);
        sy = Math.round((video.videoHeight - sh) / 2);
      }
      const scale = Math.min(1, MAX_CAPTURE_EDGE / Math.max(sw, sh));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(sw * scale));
      canvas.height = Math.max(1, Math.round(sh * scale));
      const context = canvas.getContext("2d");
      if (!context) {
        failCapture("This browser couldn't read the camera frame. Try again, or use Upload photo.");
        return;
      }
      context.drawImage(video, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => {
          if (blob) {
            finishCapture(blob);
            return;
          }
          // iOS Safari can return null from toBlob. Fall back to a data URL,
          // which uses a different (usually more forgiving) code path.
          try {
            const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
            const base64 = dataUrl.split(",")[1];
            if (!base64) throw new Error("empty data URL");
            const bytes = atob(base64);
            const array = new Uint8Array(bytes.length);
            for (let i = 0; i < bytes.length; i++) array[i] = bytes.charCodeAt(i);
            finishCapture(new Blob([array], { type: "image/jpeg" }));
          } catch {
            failCapture(
              "Couldn't save that shot — your phone may be low on memory. Tap the shutter again, or use Upload photo."
            );
          }
        },
        "image/jpeg",
        0.92
      );
    } catch {
      failCapture("Something went wrong taking the photo. Tap the shutter to try again.");
    }
  };

  return (
    <div className="absolute inset-0 flex flex-col justify-center bg-black">
      {/* Portrait mode fills the tall frame; landscape mode letterboxes a
          16:9 strip in the middle. The shutter captures exactly the visible
          video region, so this wrapper defines the photo's framing. */}
      <div
        className={
          orientation === "portrait"
            ? "relative h-full w-full"
            : "relative aspect-video w-full"
        }
      >
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className="absolute inset-0 h-full w-full object-cover"
        />
        {ready && guideSide && guideView && (
          <FootGhostOverlay side={guideSide} view={guideView} />
        )}
      </div>
      {!ready && (
        <p className="absolute inset-x-0 top-1/2 -translate-y-1/2 text-center text-sm text-white/80">
          Starting camera…
        </p>
      )}

      {ready && unevenLight && !captureError && (
        <div className="absolute inset-x-3 top-14 flex items-center justify-center gap-1.5 rounded-2xl bg-amber-600/90 px-3 py-2 text-center">
          <Sun className="h-4 w-4 shrink-0 text-white" />
          <p className="text-xs font-semibold text-white">
            Very harsh light — a bit more even lighting will help, but you can
            still take the photo.
          </p>
        </div>
      )}

      {captureError && (
        <div className="absolute inset-x-3 top-14 rounded-2xl bg-black/70 p-3 text-center">
          <p className="text-xs font-semibold text-white">{captureError}</p>
          <button
            type="button"
            onClick={() => setCaptureError(null)}
            className="mt-1.5 text-xs font-semibold text-white/80 underline"
          >
            Dismiss
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={() => {
          stop();
          onClose();
        }}
        aria-label="Close camera"
        className="absolute left-3 top-3 rounded-full bg-black/50 p-2 text-white"
      >
        <X className="h-5 w-5" />
      </button>

      {canFlip && (
        <button
          type="button"
          onClick={() => setFacing((value) => (value === "environment" ? "user" : "environment"))}
          aria-label="Switch camera"
          className="absolute right-3 top-3 rounded-full bg-black/50 p-2 text-white"
        >
          <RefreshCcw className="h-5 w-5" />
        </button>
      )}

      {/* Phone (portrait) / Laptop (landscape) mode toggle */}
      <div className="absolute left-1/2 top-3 flex -translate-x-1/2 overflow-hidden rounded-full bg-black/50 text-[11px] font-semibold text-white">
        <button
          type="button"
          onClick={() => chooseOrientation("portrait")}
          aria-pressed={orientation === "portrait"}
          className={
            orientation === "portrait"
              ? "flex items-center gap-1 bg-white/25 px-2.5 py-1.5"
              : "flex items-center gap-1 px-2.5 py-1.5 opacity-70"
          }
        >
          <Smartphone className="h-3.5 w-3.5" /> Phone
        </button>
        <button
          type="button"
          onClick={() => chooseOrientation("landscape")}
          aria-pressed={orientation === "landscape"}
          className={
            orientation === "landscape"
              ? "flex items-center gap-1 bg-white/25 px-2.5 py-1.5"
              : "flex items-center gap-1 px-2.5 py-1.5 opacity-70"
          }
        >
          <Monitor className="h-3.5 w-3.5" /> Laptop
        </button>
      </div>

      <div className="absolute inset-x-0 bottom-4 flex justify-center">
        <button
          type="button"
          onClick={shutter}
          disabled={!ready || capturing}
          aria-label="Take photo"
          className="h-16 w-16 rounded-full border-4 border-white bg-white/30 transition active:scale-95 disabled:opacity-40"
        >
          <span
            className={
              capturing
                ? "mx-auto block h-11 w-11 animate-pulse rounded-full bg-white/60"
                : "mx-auto block h-11 w-11 rounded-full bg-white"
            }
          />
        </button>
      </div>
    </div>
  );
}
