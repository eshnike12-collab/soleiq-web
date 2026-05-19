"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, RotateCcw } from "lucide-react";
import { useSoleiqStore } from "@/lib/store";
import type { CaptureView, FootSide } from "@/lib/types";
import {
  DETECTION_THRESHOLD,
  detectFootInVideo,
  summarizeReasons,
  type DetectionMetrics,
  type FailureReason,
  type QualitySignals,
} from "@/lib/footDetection";
import { countFacesInVideo } from "@/lib/faceDetection";
import { QualityIndicator } from "./QualityIndicator";
import { AutoShutterOverlay } from "./AutoShutterOverlay";
import { Button } from "@/components/ui/button";

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

const SAMPLE_INTERVAL_MS = 200;
const ALL_GREEN_HOLD_MS = 1000;
const DETECTION_TIMEOUT_MS = 20000;

const QUALITY_LABELS: { key: keyof QualitySignals; label: string }[] = [
  { key: "alignment", label: "Foot aligned" },
  { key: "distance", label: "Distance OK" },
  { key: "lighting", label: "Lighting OK" },
  { key: "blur", label: "Sharp focus" },
  { key: "shadow", label: "No shadow" },
  { key: "occlusion", label: "Frame clear" },
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
  const captured = useRef(false);
  const lastGoodStart = useRef<number | null>(null);
  const startTime = useRef<number>(0);

  const addImage = useSoleiqStore((s) => s.addImage);

  // Reset on (side, view) change so the component can be reused inside a sequence.
  useEffect(() => {
    captured.current = false;
    lastGoodStart.current = null;
    startTime.current = Date.now();
    setMetrics(null);
    setFaceDetected(false);
    setShutterFlash(false);
    setThumb(undefined);
    setTimedOut(false);
  }, [side, view]);

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
    const tick = setInterval(() => {
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

      // All quality signals are real — not faked. Auto-shutter only when every
      // signal is true AND we're above the confidence threshold AND no face is
      // currently in the frame, sustained.
      const allGreen =
        m.quality.alignment &&
        m.quality.distance &&
        m.quality.blur &&
        m.quality.lighting &&
        m.quality.shadow &&
        m.quality.occlusion &&
        m.confidence >= DETECTION_THRESHOLD &&
        m.detected &&
        !faceDetected;

      if (allGreen) {
        if (lastGoodStart.current === null) lastGoodStart.current = Date.now();
        if (
          Date.now() - lastGoodStart.current >= ALL_GREEN_HOLD_MS &&
          !captured.current
        ) {
          doCapture(false, m);
        }
      } else {
        lastGoodStart.current = null;
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
  }, [streamReady, fallback, side, view]);

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
    addImage({
      side,
      view,
      dataUrl,
      capturedAt: Date.now(),
      detection: {
        detected: m.detected,
        confidence: m.confidence,
        silhouettePx: m.silhouettePx,
        brightness: m.brightness,
        blur: m.blur,
        reasons: m.reasons,
      },
    });
    setTimeout(
      () => {
        setShutterFlash(false);
        onCaptured();
      },
      manual ? 350 : 700
    );
  };

  const restart = () => {
    captured.current = false;
    lastGoodStart.current = null;
    startTime.current = Date.now();
    setMetrics(null);
    setTimedOut(false);
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
        {fallback ? (
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
        <FootOutlineOverlay />
        <AutoShutterOverlay show={shutterFlash} thumbnail={thumb} />

        {/* Live confidence pill */}
        {metrics && (
          <span
            className={cnPill(metrics.detected, metrics.confidence)}
          >
            {metrics.detected ? "Foot detected" : "No foot"} ·{" "}
            {(metrics.confidence * 100).toFixed(0)}%
          </span>
        )}

        {/* Retry overlay when timed out without ever detecting a foot */}
        {(timedOut || (fallback && !captured.current)) && !captured.current && (
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

      {/* Real quality indicators (NOT faked). Each pill ties to a real signal. */}
      <div className="flex flex-wrap gap-1.5">
        {QUALITY_LABELS.map(({ key, label }) => (
          <QualityIndicator
            key={key}
            label={label}
            passed={!!quality && quality[key]}
          />
        ))}
      </div>

      {showRetryHelp && !timedOut && (
        <p className="text-[11px] text-warmGray-600">
          {failureMsg}.
        </p>
      )}

      <div className="flex justify-end">
        <Button
          variant="subtle"
          size="sm"
          disabled={
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
