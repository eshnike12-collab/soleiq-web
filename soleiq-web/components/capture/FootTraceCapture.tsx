"use client";

/**
 * Camera front-end for foot perfusion measurement.
 *
 * Two modes, same machinery:
 *  - "pulse": hold still for ~20 s while the colour trace of the foot is
 *    recorded, then measure pulsatility (lib/perfusion).
 *  - "refill": press a toe, hold, release, keep filming — capillary refill.
 *
 * Only per-frame channel means leave this component. No video of the foot is
 * buffered or uploaded; the foot photos the exam stores go through the
 * existing consented capture path, not this one.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Loader2, X } from "lucide-react";
import { ROI_SIZE, frameFromImageData, frameMeanRgb } from "@/lib/vitals/preprocess";
import { resampleTraces, type TimedSample } from "@/lib/vitals/resample";
import type { RgbTraces } from "@/lib/vitals/pos";

const TARGET_HZ = 30;

export type TraceMode = "pulse" | "refill";

export interface FootTraceResult {
  mode: TraceMode;
  /** Raw timed samples — what capillary refill needs. */
  samples: TimedSample[];
  /** Uniformly resampled traces — what the pulse pipeline needs. */
  traces: RgbTraces | null;
  sampleRateHz: number;
  measuredFps: number;
  durationSeconds: number;
}

const GUIDE_COPY: Record<TraceMode, { title: string; hint: string }> = {
  pulse: {
    title: "Hold the foot still",
    hint: "Fill the circle with the top of the foot. Rest it on something and keep it still.",
  },
  refill: {
    title: "Press, hold, then let go",
    hint: "Press a toe pad firmly until it goes pale, hold about five seconds, then let go and keep filming.",
  },
};

export function FootTraceCapture({
  mode,
  seconds,
  onComplete,
  onCancel,
  onUnavailable,
}: {
  mode: TraceMode;
  seconds: number;
  onComplete: (result: FootTraceResult) => void;
  onCancel: () => void;
  onUnavailable: (message: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const samplesRef = useRef<TimedSample[]>([]);
  const runningRef = useRef(false);
  const startedAtRef = useRef(0);
  const [ready, setReady] = useState(false);
  const [progress, setProgress] = useState(0);

  const stop = useCallback(() => {
    runningRef.current = false;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const finish = useCallback(() => {
    if (!runningRef.current) return;
    runningRef.current = false;
    const samples = samplesRef.current;
    stop();
    const resampled = resampleTraces(samples, TARGET_HZ);
    onComplete({
      mode,
      samples,
      traces: resampled?.traces ?? null,
      sampleRateHz: TARGET_HZ,
      measuredFps: resampled ? Math.round(resampled.measuredFps * 10) / 10 : 0,
      durationSeconds: resampled?.durationSeconds ?? 0,
    });
  }, [mode, onComplete, stop]);

  useEffect(() => {
    let cancelled = false;
    const canvas = document.createElement("canvas");
    canvas.width = ROI_SIZE;
    canvas.height = ROI_SIZE;
    const context = canvas.getContext("2d", { willReadFrequently: true });

    const sampleOnce = (timestamp: number) => {
      const video = videoRef.current;
      if (!video || !context || video.videoWidth === 0) return;
      // Fixed central ROI matching the on-screen circle — a foot filling the
      // guide puts skin in every sampled pixel.
      const size = Math.min(video.videoWidth, video.videoHeight) * 0.45;
      const x = (video.videoWidth - size) / 2;
      const y = (video.videoHeight - size) / 2;
      try {
        context.drawImage(video, x, y, size, size, 0, 0, ROI_SIZE, ROI_SIZE);
        const pixels = context.getImageData(0, 0, ROI_SIZE, ROI_SIZE).data;
        const [r, g, b] = frameMeanRgb(frameFromImageData(pixels));
        samplesRef.current.push({ t: timestamp, r, g, b });
      } catch {
        /* a dropped frame should not fail the measurement */
      }
    };

    type FrameCallbackVideo = HTMLVideoElement & {
      requestVideoFrameCallback?: (cb: (now: number) => void) => number;
    };
    const loop = () => {
      const video = videoRef.current as FrameCallbackVideo | null;
      if (!runningRef.current || !video) return;
      const step = (now: number) => {
        if (!runningRef.current) return;
        sampleOnce(now);
        const elapsed = (now - startedAtRef.current) / 1000;
        setProgress(Math.min(elapsed / seconds, 1));
        if (elapsed >= seconds) {
          finish();
          return;
        }
        loop();
      };
      if (typeof video.requestVideoFrameCallback === "function") {
        video.requestVideoFrameCallback(step);
      } else {
        requestAnimationFrame(step);
      }
    };

    const start = async () => {
      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        onUnavailable("This browser can't open the camera for a perfusion reading.");
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          // Rear camera: the patient is filming their own foot.
          video: {
            facingMode: "environment",
            width: { ideal: 640 },
            height: { ideal: 480 },
            frameRate: { ideal: TARGET_HZ },
          },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();
        setReady(true);
        runningRef.current = true;
        startedAtRef.current = performance.now();
        loop();
      } catch {
        onUnavailable(
          "The camera didn't open. Allow camera access, or skip this step — the foot exam doesn't need it."
        );
      }
    };

    void start();
    return () => {
      cancelled = true;
      stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const remaining = Math.max(0, Math.ceil(seconds - progress * seconds));
  const guide = GUIDE_COPY[mode];

  return (
    <div className="relative flex h-full min-h-[300px] flex-col overflow-hidden rounded-3xl bg-ink">
      <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />

      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="h-[45%] w-[45%] rounded-full border-4 border-white/70" />
      </div>

      {!ready && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-ink/80 text-white">
          <Loader2 className="h-6 w-6 animate-spin" />
          <p className="text-sm font-semibold">Starting the camera…</p>
        </div>
      )}

      <button
        type="button"
        onClick={() => {
          stop();
          onCancel();
        }}
        aria-label="Stop the reading"
        className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-full bg-ink/60 text-white"
      >
        <X className="h-5 w-5" />
      </button>

      <div className="absolute inset-x-3 bottom-3 rounded-2xl bg-ink/70 p-3 text-white backdrop-blur-sm">
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1.5 text-sm font-bold">
            <Camera className="h-4 w-4" /> {guide.title}
          </span>
          <span className="text-xs font-semibold text-white/80">{remaining}s left</span>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/25">
          <div
            className="h-full rounded-full bg-white transition-[width] duration-300"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
        <p className="mt-2 text-[11px] leading-snug text-white/80">{guide.hint}</p>
      </div>
    </div>
  );
}
