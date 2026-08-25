"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, Check, Play, RotateCcw, Video } from "lucide-react";
import {
  CORRECTIVE_HINTS,
  DELTA_H,
  DELTA_W,
  FRESH_TRACKING,
  HINT_TEXT,
  SWEEP_CONFIG,
  decideFrame,
  descriptorOf,
  referenceFor,
  scheduledHint,
  sweepProgress,
  trackingAfter,
  validateScan,
  viewpointSpread,
  type RejectReason,
  type RejectTally,
  type ScanState,
  type ScanVerdict,
  type SweepHint,
  type TrackingState,
} from "@/lib/scan3d/sweep";
import { laplacianVariance } from "@/lib/scan3d/frameScore";
import {
  ScanClientError,
  awaitScan,
  debugUrl,
  deleteBank,
  uploadScanVideo,
  type BankStatus,
} from "@/lib/scan3d/scanClient";
import type { FootSide } from "@/lib/types";

/**
 * One guided lap around the foot.
 *
 *   idle -> countdown -> capturing -> processing -> complete | failed
 *
 * Ported from the mobile app. The capture logic is identical — the same
 * sweep.ts drives both — but the DOM plumbing is native here rather than
 * react-native-web: a real <video> in the tree instead of an element appended
 * imperatively to a host div, which is what used to leave the preview black
 * after the first failure.
 *
 * Usable frames are pooled server-side per foot (the "bank"), so a lap that
 * falls short adds to what is already saved instead of being discarded.
 */

const REJECT_LABEL: Record<RejectReason, string> = {
  blurry: "blurry",
  too_dark: "too dark",
  too_bright: "too bright",
  duplicate: "same angle",
  no_baseline: "camera not moving",
  too_fast: "moving too fast",
};

const STAGE_COPY: Record<string, string> = {
  queued: "Waiting for the reconstruction service…",
  matching: "Matching features between your frames…",
  reconstructing: "Working out where each frame was taken from…",
  texturing: "Building the surface…",
  ready: "Done.",
};

/**
 * Downscale a video frame by repeated halving.
 *
 * `drawImage(video, 0, 0, 48, 36)` in one step does not do this: a 27x
 * reduction samples only a small neighbourhood, so most source pixels are
 * never read and sensor noise survives at near full amplitude — which the
 * novelty check then reads as camera movement. Each halving averages a 2x2
 * block, approximating the INTER_AREA resize the service uses.
 */
function drawDownscaled(
  video: HTMLVideoElement,
  scratch: [HTMLCanvasElement, HTMLCanvasElement],
  dst: HTMLCanvasElement,
  w: number,
  h: number
): void {
  let cw = video.videoWidth || 1280;
  let ch = video.videoHeight || 960;
  let src: CanvasImageSource = video;
  let i = 0;

  while (cw > w * 2 && ch > h * 2) {
    const nw = Math.max(w, cw >> 1);
    const nh = Math.max(h, ch >> 1);
    const cur = scratch[i % 2];
    cur.width = nw;
    cur.height = nh;
    const ctx = cur.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(src, 0, 0, cw, ch, 0, 0, nw, nh);
    src = cur;
    cw = nw;
    ch = nh;
    i++;
  }

  const dctx = dst.getContext("2d", { willReadFrequently: true });
  if (!dctx) return;
  dctx.imageSmoothingEnabled = true;
  dctx.imageSmoothingQuality = "high";
  dctx.drawImage(src, 0, 0, cw, ch, 0, 0, w, h);
}

export function OrbitSweepCapture({
  side,
  bankId,
  onComplete,
}: {
  side: FootSide;
  /** Pools this foot's usable frames across every attempt. */
  bankId: string;
  onComplete?: (scanId: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const smallRef = useRef<HTMLCanvasElement | null>(null);
  const scratchRef = useRef<[HTMLCanvasElement, HTMLCanvasElement] | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const clockRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const startedAtRef = useRef(0);
  const bankedRef = useRef<Float32Array[]>([]);
  const samplesRef = useRef<Float32Array[]>([]);
  const tallyRef = useRef<RejectTally>({});
  const sampledRef = useRef(0);
  const trackingRef = useRef<TrackingState>(FRESH_TRACKING);

  const [state, setState] = useState<ScanState>("idle");
  const [countdown, setCountdown] = useState(0);
  const [remainingMs, setRemainingMs] = useState(SWEEP_CONFIG.scanMs);
  const [banked, setBanked] = useState(0);
  const [rejected, setRejected] = useState(0);
  const [tally, setTally] = useState<RejectTally>({});
  const [viewpoints, setViewpoints] = useState(0);
  const [hint, setHint] = useState<SweepHint>("start");
  const [corrective, setCorrective] = useState(false);
  const [verdict, setVerdict] = useState<ScanVerdict | null>(null);
  const [bank, setBank] = useState<BankStatus | null>(null);
  const [stage, setStage] = useState<string>("queued");
  const [camError, setCamError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const supported =
    typeof navigator !== "undefined" &&
    typeof navigator.mediaDevices?.getUserMedia === "function";

  const clearTimers = useCallback(() => {
    if (tickRef.current) clearInterval(tickRef.current);
    if (clockRef.current) clearInterval(clockRef.current);
    tickRef.current = null;
    clockRef.current = null;
  }, []);

  const stopStream = useCallback(() => {
    clearTimers();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, [clearTimers]);

  useEffect(() => () => stopStream(), [stopStream]);

  const finishRecording = useCallback(async (): Promise<Blob | null> => {
    const rec = recorderRef.current;
    recorderRef.current = null;
    if (!rec || rec.state === "inactive") return null;
    await new Promise<void>((resolve) => {
      rec.onstop = () => resolve();
      rec.stop();
    });
    const blob = new Blob(chunksRef.current, { type: rec.mimeType || "video/webm" });
    return blob.size > 0 ? blob : null;
  }, []);

  // ---- one sample -------------------------------------------------------
  const sample = useCallback(() => {
    const video = videoRef.current;
    const small = smallRef.current;
    const scratch = scratchRef.current;
    if (!video || !small || !scratch || video.readyState < 2) return;

    drawDownscaled(video, scratch, small, DELTA_W, DELTA_H);
    const sctx = small.getContext("2d", { willReadFrequently: true });
    if (!sctx) return;
    const px = sctx.getImageData(0, 0, DELTA_W, DELTA_H).data;
    const gray = new Float32Array(DELTA_W * DELTA_H);
    let sum = 0;
    for (let i = 0, j = 0; j < gray.length; i += 4, j++) {
      gray[j] = px[i] * 0.299 + px[i + 1] * 0.587 + px[i + 2] * 0.114;
      sum += gray[j];
    }
    const luma = sum / gray.length;
    const sharpness = laplacianVariance(gray, DELTA_W, DELTA_H);

    sampledRef.current += 1;
    const desc = descriptorOf(gray);
    samplesRef.current.push(desc);

    const elapsedMs = Date.now() - startedAtRef.current;
    const all = bankedRef.current;
    const decision = decideFrame(
      gray,
      {
        previous: referenceFor(all, trackingRef.current),
        recent: all.slice(-SWEEP_CONFIG.noveltyWindow),
        bankedCount: all.length,
        elapsedMs,
      },
      sharpness,
      luma
    );

    setViewpoints(viewpointSpread(samplesRef.current));
    const isCorrective = CORRECTIVE_HINTS.has(decision.hint);
    setCorrective(isCorrective);
    setHint(isCorrective ? decision.hint : scheduledHint(elapsedMs));

    trackingRef.current = trackingAfter(
      trackingRef.current,
      decision.bank,
      decision.reason
    );

    if (!decision.bank) {
      if (decision.reason) {
        const t = tallyRef.current;
        t[decision.reason] = (t[decision.reason] ?? 0) + 1;
        setTally({ ...t });
        setRejected(sampledRef.current - bankedRef.current.length);
      }
      return;
    }
    bankedRef.current.push(desc);
    setBanked(bankedRef.current.length);
  }, []);

  // ---- upload -----------------------------------------------------------
  const upload = useCallback(async () => {
    clearTimers();
    setError(null);
    let video: Blob | null = null;
    try {
      video = await finishRecording();
    } catch {
      /* fall through to the no-recording branch */
    }
    stopStream();

    if (!video) {
      setError(
        "This browser could not record the sweep, so there is nothing to send. " +
          "Try Chrome or Safari on a device with a camera."
      );
      setState("failed");
      return;
    }

    try {
      const scanId = await uploadScanVideo({ video, side, bankId });
      const done = await awaitScan(scanId, (s) => setStage(s.status));
      setBank(done.bank ?? null);
      if (done.status === "banked") {
        setError(done.failure_reason ?? "More frames are needed.");
        setState("failed");
        return;
      }
      onComplete?.(scanId);
      setState("complete");
    } catch (e) {
      // eslint-disable-next-line no-console -- surfaced to the debug UI link below
      console.error("[soleiq] scan failed:", e, debugUrl(""));
      setError(
        e instanceof ScanClientError
          ? e.message
          : "Could not build the 3D model. Please try again."
      );
      setState("failed");
    }
  }, [bankId, clearTimers, finishRecording, onComplete, side, stopStream]);

  const finishCapture = useCallback(async () => {
    clearTimers();
    const v = validateScan(bankedRef.current, {
      samples: samplesRef.current,
      rejects: tallyRef.current,
    });
    setVerdict(v);
    // Uploaded either way: its usable frames go into the bank for this foot,
    // and the service decides whether the bank is now enough to reconstruct.
    setState("processing");
    await upload();
  }, [clearTimers, upload]);

  const beginCapture = useCallback(() => {
    startedAtRef.current = Date.now();
    setState("capturing");
    setRemainingMs(SWEEP_CONFIG.scanMs);
    setHint("capture_top");
    tickRef.current = setInterval(sample, SWEEP_CONFIG.sampleMs);
    clockRef.current = setInterval(() => {
      const left = SWEEP_CONFIG.scanMs - (Date.now() - startedAtRef.current);
      setRemainingMs(Math.max(0, left));
      if (left <= 0) void finishCapture();
    }, 100);
  }, [finishCapture, sample]);

  const start = useCallback(async () => {
    setCamError(null);
    setError(null);
    setVerdict(null);
    bankedRef.current = [];
    samplesRef.current = [];
    tallyRef.current = {};
    sampledRef.current = 0;
    trackingRef.current = FRESH_TRACKING;
    setTally({});
    setBanked(0);
    setRejected(0);
    setViewpoints(0);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 960 },
        },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) throw new Error("preview element missing");
      video.srcObject = stream;
      await video.play();

      if (!smallRef.current) {
        const c = document.createElement("canvas");
        c.width = DELTA_W;
        c.height = DELTA_H;
        smallRef.current = c;
      }
      if (!scratchRef.current) {
        scratchRef.current = [
          document.createElement("canvas"),
          document.createElement("canvas"),
        ];
      }

      try {
        chunksRef.current = [];
        const mime = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"].find(
          (t) => MediaRecorder.isTypeSupported(t)
        );
        const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
        rec.ondataavailable = (e) => {
          if (e.data.size > 0) chunksRef.current.push(e.data);
        };
        rec.start(1000);
        recorderRef.current = rec;
      } catch {
        recorderRef.current = null;
      }

      setState("countdown");
      let n = Math.ceil(SWEEP_CONFIG.countdownMs / 1000);
      setCountdown(n);
      const cd = setInterval(() => {
        n -= 1;
        setCountdown(n);
        if (n <= 0) {
          clearInterval(cd);
          beginCapture();
        }
      }, 1000);
    } catch (e) {
      setCamError(
        e instanceof Error && /denied|NotAllowed|Permission/i.test(e.message)
          ? "Camera access was blocked. Allow it in your browser and try again."
          : "Could not open the camera on this device."
      );
      setState("idle");
    }
  }, [beginCapture]);

  const resetScan = useCallback(() => {
    void deleteBank(bankId).catch(() => {
      /* the bank may not exist yet; nothing to clear */
    });
    stopStream();
    recorderRef.current = null;
    bankedRef.current = [];
    samplesRef.current = [];
    tallyRef.current = {};
    sampledRef.current = 0;
    trackingRef.current = FRESH_TRACKING;
    setBank(null);
    setVerdict(null);
    setError(null);
    setBanked(0);
    setRejected(0);
    setViewpoints(0);
    setTally({});
    setState("idle");
  }, [bankId, stopStream]);

  // ---- render -----------------------------------------------------------
  if (!supported) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-surface-raised p-6 shadow-card">
        <p className="flex items-center gap-2 font-bold text-ink">
          <AlertTriangle className="h-4 w-4 text-warn" /> Camera unavailable
        </p>
        <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">
          3D scanning needs a browser with camera access. Open this page on a
          phone or laptop with a camera.
        </p>
      </div>
    );
  }

  const seconds = Math.ceil(remainingMs / 1000);
  const lapPct = Math.round(
    ((SWEEP_CONFIG.scanMs - remainingMs) / SWEEP_CONFIG.scanMs) * 100
  );
  const pct = Math.round(sweepProgress(banked, viewpoints) * 100);
  const rejectSummary = (Object.keys(tally) as RejectReason[])
    .filter((k) => (tally[k] ?? 0) > 0)
    .map((k) => `${tally[k]} ${REJECT_LABEL[k]}`)
    .join(" · ");

  return (
    <div className="space-y-4">
      {camError && (
        <p className="rounded-2xl bg-urgent-soft px-4 py-3 text-sm font-semibold text-red-800">
          {camError}
        </p>
      )}

      <div className="relative overflow-hidden rounded-3xl bg-slate-900">
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className="aspect-[4/3] w-full object-cover"
        />

        {state === "idle" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-900/70 px-6 text-center">
            <Video className="h-8 w-8 text-white/80" />
            <p className="text-sm font-semibold text-white">
              {Math.round(SWEEP_CONFIG.scanMs / 1000)}-second scan
            </p>
            <p className="max-w-xs text-xs leading-snug text-white/70">
              Move the camera slowly once around the foot, keeping it in frame.
            </p>
          </div>
        )}

        {state === "countdown" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/60">
            <span className="text-6xl font-bold text-white">{countdown}</span>
            <span className="mt-2 text-sm text-white">Get the foot in frame</span>
          </div>
        )}

        {state === "capturing" && (
          <>
            <div className="absolute inset-x-2 top-2 flex items-start justify-between gap-2">
              <div className="rounded-2xl bg-black/60 px-3 py-1.5">
                <span className="block text-3xl font-bold leading-none text-white">
                  {seconds}
                </span>
                <span className="mt-0.5 block text-[10px] text-white/70">
                  seconds left
                </span>
              </div>
              <div
                className={`max-w-[60%] rounded-2xl px-3 py-2 ${
                  corrective ? "bg-amber-500" : "bg-black/60"
                }`}
              >
                <span className="text-right text-sm font-semibold text-white">
                  {HINT_TEXT[hint]}
                </span>
              </div>
            </div>
            <div className="absolute inset-x-2 bottom-2">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/25">
                <div
                  className="h-full bg-white transition-[width] duration-100"
                  style={{ width: `${lapPct}%` }}
                />
              </div>
            </div>
          </>
        )}

        {state === "processing" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-900/80 px-6 text-center">
            <span className="h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            <p className="text-sm text-white">{STAGE_COPY[stage] ?? "Working…"}</p>
          </div>
        )}
      </div>

      {/* Coverage. Frames AND viewpoints — either alone is a bar that lies. */}
      {(state === "capturing" || state === "countdown") && (
        <div>
          <div className="mb-1 flex items-baseline justify-between">
            <span className="text-xs font-bold text-ink">Scan coverage</span>
            <span className="text-xs text-ink-soft">
              {banked} frames · {viewpoints}/{SWEEP_CONFIG.minViewpoints} viewpoints
            </span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-surface-sunken">
            <div
              className="h-full bg-primary transition-[width]"
              style={{ width: `${pct}%` }}
            />
          </div>
          {rejected > 0 && (
            <p className="mt-1 text-[11px] text-ink-faint">
              {rejected} skipped{rejectSummary ? ` (${rejectSummary})` : ""}
            </p>
          )}
        </div>
      )}

      {state === "failed" && (
        <div className="rounded-3xl border border-amber-200 bg-warn-soft p-5">
          <p className="flex items-center gap-2 font-bold text-ink">
            <AlertTriangle className="h-4 w-4 text-warn" />
            {bank ? "Frames saved — keep going" : "Rescan needed"}
          </p>
          <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">{error}</p>

          {bank && (
            <div className="mt-4">
              <div className="mb-1 flex items-baseline justify-between">
                <span className="text-xs font-bold text-ink">Saved for this foot</span>
                <span className="text-xs text-ink-soft">
                  {bank.accepted_frames} / {bank.required_frames} frames
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-white">
                <div
                  className="h-full bg-warn"
                  style={{
                    width: `${Math.min(100, Math.round((bank.accepted_frames / bank.required_frames) * 100))}%`,
                  }}
                />
              </div>
              <p className="mt-2 text-[11px] leading-snug text-ink-faint">
                Pooled across {bank.scans} scan{bank.scans === 1 ? "" : "s"}. Only
                frames showing an angle not already saved are kept, so rescanning
                the same side will not fill this bar — move the camera to parts of
                the foot you have not captured yet.
              </p>
            </div>
          )}
        </div>
      )}

      {state === "complete" && (
        <div className="rounded-3xl border border-slate-200 bg-surface-raised p-5 shadow-card">
          <p className="flex items-center gap-2 font-bold text-ink">
            <Check className="h-4 w-4 text-secondary" /> 3D model ready
          </p>
          {verdict && (
            <p className="mt-1 text-[15px] text-ink-soft">
              Built from {verdict.acceptedCount} usable frames.
            </p>
          )}
        </div>
      )}

      <div className="flex flex-col gap-2">
        {(state === "idle" || state === "failed" || state === "complete") && (
          <button
            type="button"
            onClick={() => void start()}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-bold text-white shadow-button transition-transform duration-150 active:scale-[0.98]"
          >
            {state === "idle" ? (
              <>
                <Video className="h-4 w-4" /> Start scan
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                {bank && bank.short_by > 0
                  ? `Scan again — ${bank.short_by} more frame${bank.short_by === 1 ? "" : "s"} needed`
                  : "Scan again"}
              </>
            )}
          </button>
        )}
        {(state === "failed" || state === "complete") && (
          <button
            type="button"
            onClick={resetScan}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl border border-slate-200 px-5 py-3 text-sm font-bold text-primary transition-colors hover:bg-surface-sunken"
          >
            <RotateCcw className="h-4 w-4" />
            {bank && bank.accepted_frames > 0
              ? `Reset — discard all ${bank.accepted_frames} saved frames`
              : "Reset scan"}
          </button>
        )}
      </div>
    </div>
  );
}
