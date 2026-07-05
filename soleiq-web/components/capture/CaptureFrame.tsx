"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, ImagePlus, RotateCcw } from "lucide-react";
import { useSoleiqStore } from "@/lib/store";
import type { CaptureView, FootSide } from "@/lib/types";
import {
  DETECTION_THRESHOLD,
  detectFootInVideo,
  summarizeReasons,
  type DetectionMetrics,
  type FailureReason,
} from "@/lib/footDetection";
import { countFacesInVideo } from "@/lib/faceDetection";
import { AnalyzeFootError } from "@/lib/analyzeFootImage";
import { submitImageForAnalysis } from "@/lib/visitAnalysis";
import {
  attachDeviceMotion,
  computeGuide,
  resetFrameDiff,
  COUNTDOWN_TICK_MS,
  READY_HOLD_MS,
  SAMPLE_INTERVAL_MS as GUIDE_SAMPLE_INTERVAL_MS,
  type GuideSignals,
  type GuideState,
} from "@/lib/captureGuide";
import { QualityIndicator } from "./QualityIndicator";
import { AutoShutterOverlay } from "./AutoShutterOverlay";
import { Button } from "@/components/ui/button";

/**
 * Capture state machine. Replaces the older ad-hoc captured boolean so
 * the detection loop, the UI, and the auto-advance timer can all react
 * coherently to upload + live shutter without racing each other.
 *
 *   live        → scanner running, no image picked yet
 *   processing  → upload in flight: file read + canvas resize + Storage push
 *   captured    → image is locked in for this step; preview shown;
 *                 user can still retake before the auto-advance fires
 *   error       → upload failed; user sees the error and can retry
 */
type CaptureState = "live" | "processing" | "captured" | "error";

const VIEW_LABEL: Record<CaptureView, string> = {
  top: "Top of foot",
  sole: "Sole",
  heel: "Heel",
  between_toes: "Between toes",
};

const VIEW_HINT: Record<CaptureView, string> = {
  top: "Place phone above the foot, looking down.",
  sole: "Show the bottom of the foot.",
  heel: "Show the back of the heel.",
  between_toes: "Spread toes — frame the gaps.",
};

/** Sample rate + all-green hold thresholds live in lib/captureGuide.ts so
 *  the guide layer and this component share one source of truth. */
const SAMPLE_INTERVAL_MS = GUIDE_SAMPLE_INTERVAL_MS;
const DETECTION_TIMEOUT_MS = 20000;

/**
 * Chips shown under the video preview. Read from GuideSignals (composite
 * of framing + steadiness), NOT the raw QualitySignals — this way the
 * user sees the same signals the countdown gate uses.
 */
const GUIDE_LABELS: { key: keyof GuideSignals; label: string }[] = [
  { key: "alignment", label: "Foot centered" },
  { key: "distance", label: "Distance OK" },
  { key: "exposure", label: "Lighting OK" },
  { key: "sharpness", label: "Sharp focus" },
  { key: "steadiness", label: "Hold steady" },
];

interface Props {
  side: FootSide;
  view: CaptureView;
  onCaptured: () => void;
  step?: { current: number; total: number };
}

export function CaptureFrame({ side, view, onCaptured, step }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [streamReady, setStreamReady] = useState(false);
  const [fallback, setFallback] = useState(false);
  const [metrics, setMetrics] = useState<DetectionMetrics | null>(null);
  const [faceDetected, setFaceDetected] = useState(false);
  const lastFaceCheck = useRef(0);
  const [shutterFlash, setShutterFlash] = useState(false);
  const [thumb, setThumb] = useState<string | undefined>();
  const [timedOut, setTimedOut] = useState(false);
  // Capture state machine — see CaptureState above. Ref mirror exists for
  // synchronous guards inside the detection setInterval callback so an
  // in-flight tick never races a "captured" transition.
  const captured = useRef(false);
  const [captureState, setCaptureState] = useState<CaptureState>("live");
  const [captureError, setCaptureError] = useState<string | null>(null);
  // The image that's now this step's official capture (uploaded or shot).
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  // The auto-advance timer; held in a ref so a retake click can cancel it.
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastGoodStart = useRef<number | null>(null);
  const startTime = useRef<number>(0);

  // Guided-capture state — computed at ~5 fps from the composed guide.
  const [guide, setGuide] = useState<GuideState | null>(null);
  // Countdown state (3 → 2 → 1 → shutter). null = not counting.
  const [countdown, setCountdown] = useState<number | null>(null);
  const countdownTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Mirror the latest DetectionMetrics into a ref so the countdown's
  // deferred setTimeout callback can pass the freshest frame to doCapture.
  const metricsRef = useRef<DetectionMetrics | null>(null);

  const addImage = useSoleiqStore((s) => s.addImage);
  const currentVisit = useSoleiqStore((s) => s.currentVisit);
  const patientDbId = useSoleiqStore((s) => s.patientDbId);

  // Derived booleans for the existing render branches.
  const isCaptured = captureState === "captured";
  const isProcessing = captureState === "processing";

  // Reset on (side, view) change so the component can be reused inside a sequence.
  // Critical to ensure the upload/capture is tagged with the CURRENT step,
  // not the previous one — the props `side` and `view` change, but state
  // and refs would carry over without this reset.
  useEffect(() => {
    captured.current = false;
    setCaptureState("live");
    setCaptureError(null);
    setCapturedImage(null);
    if (advanceTimer.current) {
      clearTimeout(advanceTimer.current);
      advanceTimer.current = null;
    }
    lastGoodStart.current = null;
    startTime.current = Date.now();
    setMetrics(null);
    setFaceDetected(false);
    setShutterFlash(false);
    setThumb(undefined);
    setTimedOut(false);
    setGuide(null);
    setCountdown(null);
    if (countdownTimer.current) {
      clearTimeout(countdownTimer.current);
      countdownTimer.current = null;
    }
    resetFrameDiff(); // otherwise first-tick diff after step change is huge
  }, [side, view]);

  // Attach DeviceMotion once (idempotent inside the helper). Without a user
  // gesture on iOS 13+ the sensor stays cold; that's OK — the frame-diff
  // signal alone is enough to gate the countdown.
  useEffect(() => {
    attachDeviceMotion();
  }, []);

  // Make sure the countdown timer is torn down on unmount so it can't fire
  // into a nonexistent component.
  useEffect(() => {
    return () => {
      if (countdownTimer.current) clearTimeout(countdownTimer.current);
    };
  }, []);

  // Once captured (live or upload), release the camera tracks. Keeping the
  // stream alive after capture wastes power and keeps the OS camera-in-use
  // indicator on.
  useEffect(() => {
    if (!isCaptured) return;
    const stream = videoRef.current?.srcObject as MediaStream | null;
    stream?.getTracks().forEach((t) => t.stop());
  }, [isCaptured]);

  // Make sure the auto-advance timer is cleared if the component unmounts
  // mid-flight (e.g. user navigates away during the 350ms preview).
  useEffect(() => {
    return () => {
      if (advanceTimer.current) clearTimeout(advanceTimer.current);
    };
  }, []);

  // Webcam stream.
  useEffect(() => {
    let cancelled = false;
    let stream: MediaStream | undefined;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setStreamReady(true);
        }
      } catch {
        setFallback(true);
        setStreamReady(true);
      }
    })();
    return () => {
      cancelled = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // Real-time detection loop — no fake timers, every tick reads the actual frame.
  useEffect(() => {
    if (!streamReady || fallback) return;
    // Once we've captured (upload or live shutter), tear the loop down
    // entirely. We don't want quality pills flashing under a frozen preview.
    if (isCaptured) return;
    const tick = setInterval(() => {
      if (captured.current) return;
      const v = videoRef.current;
      if (!v) return;
      const m = detectFootInVideo(v);
      if (!m) return;

      // Run the native FaceDetector on a slower cadence (Chrome / Android
      // Chrome). A detected face poisons the capture gate so a face never gets
      // confused for a foot.
      if (Date.now() - lastFaceCheck.current > 500) {
        lastFaceCheck.current = Date.now();
        countFacesInVideo(v).then((n) => {
          if (n !== null) setFaceDetected(n > 0);
        });
      }

      if (faceDetected && !m.reasons.includes("face_detected" as FailureReason)) {
        m.reasons = ["face_detected", ...m.reasons];
      }
      setMetrics(m);
      metricsRef.current = m;

      // ---- Guided capture ----
      // Compose the 5 gate signals (alignment / distance / sharpness /
      // exposure / steadiness) via the guide module. AllGreen = safe to
      // start the 3-2-1 countdown.
      const g = computeGuide(m);
      // Face-in-frame overrides everything — it's a hard reject not a
      // "hint," so we blank the countdown and don't let the countdown
      // start even if the other signals happen to be green.
      const gate =
        g.allGreen &&
        m.confidence >= DETECTION_THRESHOLD &&
        m.detected &&
        !faceDetected;
      setGuide(g);

      if (gate) {
        if (lastGoodStart.current === null) lastGoodStart.current = Date.now();
        // Held all-green for READY_HOLD_MS → arm the countdown once.
        if (
          Date.now() - lastGoodStart.current >= READY_HOLD_MS &&
          countdown === null &&
          !captured.current
        ) {
          startCountdown();
        }
      } else {
        // Any signal drop cancels an in-flight countdown so we don't
        // fire the shutter during motion / poor framing.
        lastGoodStart.current = null;
        if (countdown !== null) abortCountdown();
      }

      // After DETECTION_TIMEOUT_MS without ever seeing a foot, surface a
      // visible retry prompt. We still don't auto-shutter.
      if (
        !captured.current &&
        Date.now() - startTime.current >= DETECTION_TIMEOUT_MS &&
        !timedOut
      ) {
        setTimedOut(true);
      }
    }, SAMPLE_INTERVAL_MS);
    return () => clearInterval(tick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streamReady, fallback, side, view, isCaptured, countdown]);

  /**
   * 3-2-1 countdown. Called ONLY from the detection loop once the gate has
   * been all-green for READY_HOLD_MS. Any signal drop aborts via
   * abortCountdown() so we never fire the shutter mid-motion.
   */
  const startCountdown = () => {
    if (captured.current || countdown !== null) return;
    let n = 3;
    setCountdown(n);
    const tick = () => {
      n -= 1;
      if (captured.current) return;
      if (n <= 0) {
        setCountdown(null);
        countdownTimer.current = null;
        // Fire the shutter with the most recent metrics; doCapture
        // rechecks the hard gate before actually writing.
        doCapture(false, metricsRef.current);
        return;
      }
      setCountdown(n);
      countdownTimer.current = setTimeout(tick, COUNTDOWN_TICK_MS);
    };
    countdownTimer.current = setTimeout(tick, COUNTDOWN_TICK_MS);
  };

  const abortCountdown = () => {
    if (countdownTimer.current) {
      clearTimeout(countdownTimer.current);
      countdownTimer.current = null;
    }
    setCountdown(null);
  };

  const doCapture = (manual: boolean, m: DetectionMetrics | null) => {
    // Hard gate: refuse to capture if foot isn't detected, low confidence, or
    // a face is in view.
    if (
      !m ||
      !m.detected ||
      m.confidence < DETECTION_THRESHOLD ||
      faceDetected
    ) {
      return;
    }
    if (captured.current) return;
    captured.current = true;
    let dataUrl = "/sample-foot.svg";
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 390;
      canvas.height = 520;
      const ctx = canvas.getContext("2d");
      if (ctx && videoRef.current) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        dataUrl = canvas.toDataURL("image/jpeg", 0.75);
      }
    } catch {}
    setShutterFlash(true);
    setThumb(dataUrl);
    // Freeze the captured frame in the viewport + tear down the detection
    // loop. Same finalize path as handleUpload.
    finalizeCapture({
      dataUrl,
      source: "live",
      detection: {
        detected: m.detected,
        confidence: m.confidence,
        silhouettePx: m.silhouettePx,
        brightness: m.brightness,
        blur: m.blur,
        reasons: m.reasons,
      },
      advanceDelayMs: manual ? 350 : 700,
    });
  };

  /**
   * Shared capture finalize. Used by BOTH live shutter and upload paths so
   * the state machine, store write, Storage push, and auto-advance are
   * identical regardless of where the image came from.
   */
  const finalizeCapture = (opts: {
    dataUrl: string;
    source: "live" | "upload";
    detection: {
      detected: boolean;
      confidence: number;
      silhouettePx: number;
      brightness: number;
      blur: number;
      reasons: FailureReason[];
    };
    advanceDelayMs: number;
  }) => {
    const capturedAt = Date.now();
    setCapturedImage(opts.dataUrl);
    setCaptureState("captured");
    setCaptureError(null);

    // 1. Local visit store — REPLACES any prior image for this (side, view).
    addImage({
      side,
      view,
      dataUrl: opts.dataUrl,
      capturedAt,
      source: opts.source,
      detection: opts.detection,
    });

    // 2. Foundation AI analysis via the app's /api/analyze route.
    //    The server route ALSO handles the Supabase Storage upload and
    //    the scans-row insert now (Phase 6) — so the client no longer
    //    talks to Storage directly and the service-role key never
    //    enters the browser bundle.
    //    SINGLE code path — both live capture and upload flow through
    //    finalizeCapture, so both feed the same analyzer here.
    //    Fire-and-forget: the auto-advance timer below fires immediately
    //    so users don't stare at a spinner between views; the AI reply
    //    lands on the store keyed by (side, view) whenever it arrives.
    void submitImageForAnalysis(
      { side, view, dataUrl: opts.dataUrl, capturedAt },
      {
        source: opts.source,
        visitId: currentVisit?.id ?? null,
        patientId: patientDbId ?? null,
      },
    ).catch((err: unknown) => {
      // The failure is already recorded on the image (Processing offers a
      // retry). A 404 while /api/analyze is not deployed is expected —
      // log softly. All other errors are warnings.
      if (err instanceof AnalyzeFootError && err.kind === "not_wired") {
        // eslint-disable-next-line no-console
        console.info("[analyze] /api/analyze not deployed yet", side, view);
      } else {
        // eslint-disable-next-line no-console
        console.warn("[analyze] failed", side, view, err);
      }
    });

    // 3. Auto-advance — but only after a brief preview window so the user
    //    can see the captured image, and only if they don't retake in time.
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    advanceTimer.current = setTimeout(() => {
      setShutterFlash(false);
      onCaptured();
    }, opts.advanceDelayMs);
  };

  const restart = () => {
    captured.current = false;
    lastGoodStart.current = null;
    startTime.current = Date.now();
    setMetrics(null);
    setTimedOut(false);
  };

  // Hidden file-input trigger for the "Upload image" button. Lets a
  // clinician pick a photo from disk instead of using the live camera —
  // useful when the device camera is unavailable, the angle is awkward,
  // or you just want to feed a known image into the pipeline.
  const uploadInputRef = useRef<HTMLInputElement>(null);

  const openUploadPicker = () => {
    // Immediately pause the live loop the moment the user expresses intent
    // to upload — well before the file is read. Prevents the auto-shutter
    // from firing in the milliseconds between "Upload" click and file pick.
    captured.current = true;
    setCaptureState("processing");
    setCaptureError(null);
    uploadInputRef.current?.click();
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reset the input so picking the same file twice in a row still fires.
    e.target.value = "";
    if (!file) {
      // User cancelled the picker — return to live mode so they can either
      // try again or use the live shutter.
      captured.current = false;
      setCaptureState("live");
      return;
    }

    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });

      // Downscale + recompress to match what the camera path produces, so
      // the visit store + analysis pipeline see consistent bytes regardless
      // of how the image got here. HEIC images may fail to decode in <img>
      // on non-Safari browsers — in that case we fall back to the original
      // data URL (Storage upload still works; preview may render later).
      const resized = await new Promise<string>((resolve) => {
        const img = new Image();
        img.onload = () => {
          const W = 390;
          const H = 520;
          const canvas = document.createElement("canvas");
          canvas.width = W;
          canvas.height = H;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            resolve(dataUrl);
            return;
          }
          // Cover-fit: scale + crop so the foot fills the frame the same
          // way the live capture canvas does.
          const scale = Math.max(W / img.width, H / img.height);
          const dw = img.width * scale;
          const dh = img.height * scale;
          ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);
          resolve(canvas.toDataURL("image/jpeg", 0.75));
        };
        img.onerror = () => resolve(dataUrl);
        img.src = dataUrl;
      });

      setShutterFlash(true);
      setThumb(resized);
      finalizeCapture({
        dataUrl: resized,
        source: "upload",
        detection: {
          detected: true,
          confidence: 0.95,
          silhouettePx: 50000,
          brightness: 0.55,
          blur: 0.05,
          reasons: [],
        },
        // Longer auto-advance window for uploads so the user has a moment
        // to spot a wrong-file mistake and tap "Use a different image".
        advanceDelayMs: 1500,
      });
    } catch (err) {
      console.warn("[upload] failed", err);
      captured.current = false;
      setCapturedImage(null);
      setCaptureState("error");
      setCaptureError(
        err instanceof Error
          ? err.message
          : "Could not read the selected file. Try a JPG, PNG, or HEIC."
      );
    }
  };

  /** Cancels the in-flight auto-advance and reopens the file picker. */
  const retakeUpload = () => {
    if (advanceTimer.current) {
      clearTimeout(advanceTimer.current);
      advanceTimer.current = null;
    }
    openUploadPicker();
  };

  /** Returns to live mode so the user can use the camera again. */
  const cancelToLive = () => {
    if (advanceTimer.current) {
      clearTimeout(advanceTimer.current);
      advanceTimer.current = null;
    }
    captured.current = false;
    setCapturedImage(null);
    setCaptureError(null);
    setShutterFlash(false);
    setCaptureState("live");
  };

  const quality = metrics?.quality;
  const failureMsg = metrics ? summarizeReasons(metrics.reasons) : null;
  const showRetryHelp = !!metrics && !metrics.detected;

  return (
    <div className="flex h-full flex-col gap-3">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-brand">
            {side === "right" ? "Right foot" : "Left foot"}
          </p>
          <h1 className="mt-0.5 text-lg font-semibold text-warmGray-800">
            {VIEW_LABEL[view]}
          </h1>
          <p className="text-xs text-warmGray-600">{VIEW_HINT[view]}</p>
        </div>
        {step && (
          <div className="rounded-full bg-warmGray-50 px-2.5 py-1 text-[11px] font-medium text-warmGray-600">
            {step.current} / {step.total}
          </div>
        )}
      </header>

      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-3xl bg-warmGray-800">
        {isCaptured && capturedImage ? (
          // Captured (live or upload) — show the frozen frame INSTEAD of the
          // live video. This is the user-visible confirmation that the image
          // is now THIS step's capture.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={capturedImage}
            alt={`${side} ${view} captured`}
            className="h-full w-full object-cover"
          />
        ) : fallback ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src="/sample-foot.svg"
            alt="Sample"
            className="h-full w-full object-cover"
          />
        ) : (
          <video
            ref={videoRef}
            playsInline
            muted
            className="h-full w-full object-cover"
          />
        )}
        {!isCaptured && <FootOutlineOverlay />}
        <AutoShutterOverlay show={shutterFlash} thumbnail={thumb} />

        {/* 3-2-1 countdown — appears when all guide signals have been
            green for READY_HOLD_MS. Absorbing pointer events so the
            manual capture button still works underneath. */}
        {countdown !== null && !isCaptured && (
          <div
            aria-live="assertive"
            className="pointer-events-none absolute inset-0 flex items-center justify-center"
          >
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-black/55 text-5xl font-bold text-white shadow-lg backdrop-blur-md">
              {countdown}
            </div>
          </div>
        )}

        {/* Live confidence pill — only while the scanner is actually live */}
        {!isCaptured && metrics && (
          <span
            className={cnPill(metrics.detected, metrics.confidence)}
          >
            {metrics.detected ? "Foot detected" : "No foot"} ·{" "}
            {(metrics.confidence * 100).toFixed(0)}%
          </span>
        )}

        {/* Captured confirmation pill + retake controls — replaces the
            live pill once locked in. Visible during the entire preview
            window so the user can react if they picked the wrong image. */}
        {isCaptured && (
          <>
            <span className="absolute left-2 top-2 rounded-full bg-teal-600 px-2.5 py-1 text-[11px] font-semibold text-white shadow">
              ✓ Saved for this step
            </span>
            <div className="absolute right-2 top-2 flex gap-1.5">
              <button
                onClick={retakeUpload}
                className="rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-semibold text-warmGray-800 shadow hover:bg-white"
                title="Pick a different image"
              >
                Use a different image
              </button>
            </div>
          </>
        )}

        {/* Processing overlay — file picker open / file being read */}
        {isProcessing && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-white">
            <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-medium">
              Preparing image…
            </span>
          </div>
        )}

        {/* Retry overlay when timed out without ever detecting a foot */}
        {(timedOut || (fallback && !isCaptured)) && !isCaptured && (
          <div className="absolute inset-x-3 bottom-3 rounded-2xl bg-risk-high/90 p-3 text-white shadow-lg">
            <p className="text-sm font-semibold">
              No foot detected
            </p>
            <p className="mt-0.5 text-xs">
              Please retake the image with the full foot in frame.
              {failureMsg ? ` ${failureMsg}.` : ""}
            </p>
            <button
              onClick={restart}
              className="mt-2 inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-1 text-xs font-medium"
            >
              <RotateCcw className="h-3 w-3" /> Reset detection
            </button>
          </div>
        )}
      </div>

      {/* Guide signal chips — same 5 signals the countdown gates on. */}
      <div className="flex flex-wrap gap-1.5">
        {GUIDE_LABELS.map(({ key, label }) => (
          <QualityIndicator
            key={key}
            label={label}
            passed={!!guide?.signals[key]}
          />
        ))}
      </div>

      {/* Primary hint — the ONE thing the patient should do right now. */}
      {!isCaptured && !timedOut && guide?.primaryHint && (
        <p className="text-center text-xs font-medium text-warmGray-800">
          {guide.primaryHint}
        </p>
      )}

      {showRetryHelp && !timedOut && (
        <p className="text-[11px] text-warmGray-600">
          {failureMsg}.
        </p>
      )}

      {/* Error banner — only visible after a failed upload */}
      {captureState === "error" && captureError && (
        <div className="flex items-start gap-2 rounded-2xl bg-risk-high/10 px-3 py-2 text-xs text-risk-high">
          <span aria-hidden>⚠️</span>
          <div className="flex-1">
            <p className="font-semibold">Couldn't use that image</p>
            <p className="opacity-80">{captureError}</p>
          </div>
          <button
            onClick={cancelToLive}
            className="rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-risk-high"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Hidden file input. accept covers the common camera-roll formats
          on iOS (HEIC, JPEG), Android (JPEG, PNG, WEBP), and desktop.
          capture="environment" prefers the back camera if the OS treats
          this as a camera capture rather than a library pick. */}
      <input
        ref={uploadInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp,image/heic,image/heif"
        className="hidden"
        onChange={handleUpload}
      />

      <div className="flex items-center justify-end gap-2">
        <Button
          variant="subtle"
          size="sm"
          onClick={openUploadPicker}
          disabled={isProcessing}
        >
          <ImagePlus className="mr-1.5 h-4 w-4" />
          {isCaptured ? "Use a different image" : "Upload image"}
        </Button>
        <Button
          variant="subtle"
          size="sm"
          disabled={
            isCaptured ||
            isProcessing ||
            !metrics?.detected ||
            metrics.confidence < DETECTION_THRESHOLD ||
            faceDetected
          }
          onClick={() => doCapture(true, metrics)}
        >
          <Camera className="mr-1.5 h-4 w-4" /> Capture now
        </Button>
      </div>
    </div>
  );
}

function cnPill(detected: boolean, conf: number): string {
  const base =
    "absolute right-3 top-3 rounded-full px-2 py-1 text-[10px] font-medium backdrop-blur-sm";
  if (detected && conf >= DETECTION_THRESHOLD)
    return `${base} bg-teal-400/85 text-teal-950`;
  if (conf >= 0.3) return `${base} bg-amber-400/85 text-amber-950`;
  return `${base} bg-black/55 text-white`;
}

function FootOutlineOverlay() {
  return (
    <svg
      viewBox="0 0 100 130"
      className="pointer-events-none absolute inset-0 h-full w-full"
      preserveAspectRatio="xMidYMid meet"
    >
      <ellipse cx="50" cy="80" rx="22" ry="38" fill="none" stroke="white" strokeOpacity="0.7" strokeWidth="1" strokeDasharray="3 3" />
      <circle cx="42" cy="22" r="4" fill="none" stroke="white" strokeOpacity="0.7" strokeWidth="1" strokeDasharray="2 2" />
      <circle cx="50" cy="18" r="3" fill="none" stroke="white" strokeOpacity="0.7" strokeWidth="1" strokeDasharray="2 2" />
      <circle cx="56" cy="20" r="2.5" fill="none" stroke="white" strokeOpacity="0.7" strokeWidth="1" strokeDasharray="2 2" />
      <circle cx="61" cy="24" r="2" fill="none" stroke="white" strokeOpacity="0.7" strokeWidth="1" strokeDasharray="2 2" />
      <circle cx="65" cy="29" r="2" fill="none" stroke="white" strokeOpacity="0.7" strokeWidth="1" strokeDasharray="2 2" />
    </svg>
  );
}
