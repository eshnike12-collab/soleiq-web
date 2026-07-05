"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Camera, RotateCcw } from "lucide-react";
import { useSoleiqStore } from "@/lib/store";
import {
  aggregateVisitResult,
  assessVisitReadiness,
  submitImageForAnalysis,
} from "@/lib/visitAnalysis";
import {
  evaluateVisitForAnalysis,
  type CaptureGateResult,
} from "@/lib/captureGate";
import { SCREEN_ORDER } from "@/lib/flow-config";
import { Button } from "@/components/ui/button";
import type { CapturedImage } from "@/lib/types";

const PROCESSING_COPY = [
  "Analyzing your foot photos.",
  "Reviewing skin texture and color.",
  "Checking each area for anything unusual.",
  "Preparing your plain-language summary.",
  "Preparing the clinician snapshot.",
];

/** Give slow analyses this long before declaring the visit failed. Each
 *  image's own request already times out client-side at 45 s. */
const RESULT_WAIT_TIMEOUT_MS = 90_000;

const VIEW_LABEL: Record<string, string> = {
  top: "top",
  sole: "sole",
  heel: "heel",
  between_toes: "between the toes",
};

function describeImage(img: CapturedImage): string {
  return `${img.side === "left" ? "Left" : "Right"} foot — ${VIEW_LABEL[img.view] ?? img.view}`;
}

export function Processing() {
  const goNext = useSoleiqStore((s) => s.goNext);
  const goTo = useSoleiqStore((s) => s.goTo);
  const visit = useSoleiqStore((s) => s.currentVisit);
  const patientDbId = useSoleiqStore((s) => s.patientDbId);
  const setResult = useSoleiqStore((s) => s.setResult);
  const setProcessing = useSoleiqStore((s) => s.setProcessing);
  const [copyIndex, setCopyIndex] = useState(0);
  const [gate, setGate] = useState<CaptureGateResult | null>(null);
  const [pipelineError, setPipelineError] = useState<string | null>(null);
  const [badPhotos, setBadPhotos] = useState<CapturedImage[]>([]);
  const [timedOut, setTimedOut] = useState(false);
  // One-shot guards so React Strict Mode's double-effect-fire (dev) doesn't
  // run the pipeline twice and skip past Results.
  const ran = useRef(false);
  const advanced = useRef(false);

  // ----- HARD GATE + kickoff -----
  // Evaluate the visit once on mount. If any capture failed foot detection
  // we stop before waiting on any AI results — clinician is sent back to
  // recapture. Otherwise, resubmit any image whose analysis never landed
  // (page reload, transient network failure) and start the wait timer.
  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    if (!visit) return;
    const result = evaluateVisitForAnalysis(visit);
    setGate(result);
    if (!result.ok) return;

    setProcessing(true);

    // Resubmit images with no reply or a recorded failure.
    for (const img of visit.images) {
      if (!img.aiResult || img.aiResult.error) {
        void submitImageForAnalysis(img, {
          source: img.source ?? "live",
          visitId: visit.id,
          patientId: patientDbId,
        }).catch(() => {
          /* failure is recorded on the image; surfaced below */
        });
      }
    }

    const copyTimer = setInterval(
      () => setCopyIndex((i) => (i + 1) % PROCESSING_COPY.length),
      1500,
    );
    const timeout = setTimeout(() => setTimedOut(true), RESULT_WAIT_TIMEOUT_MS);
    return () => {
      clearInterval(copyTimer);
      clearTimeout(timeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ----- Settle watcher -----
  // Re-runs whenever an AI reply lands on the store. Once every image has
  // a reply: bad photos → retake screen; all clean → aggregate + advance.
  useEffect(() => {
    if (!visit || advanced.current) return;
    if (gate && !gate.ok) return;

    const readiness = assessVisitReadiness(visit);

    if (readiness.badPhotoImages.length > 0) {
      setProcessing(false);
      setBadPhotos(readiness.badPhotoImages);
      return;
    }

    if (readiness.settled) {
      advanced.current = true;
      setResult(aggregateVisitResult(visit));
      setProcessing(false);
      goNext();
      return;
    }

    if (timedOut || readiness.failedImages.length > 0) {
      // Every remaining image either failed or the clock ran out.
      if (readiness.pendingCount === 0 || timedOut) {
        setProcessing(false);
        setPipelineError(
          readiness.failedImages.length > 0
            ? `Analysis failed for ${readiness.failedImages.length} image${readiness.failedImages.length === 1 ? "" : "s"}. Check your connection and try again.`
            : "Analysis is taking longer than expected. Check your connection and try again.",
        );
      }
    }
  }, [visit, gate, timedOut, goNext, setProcessing, setResult]);

  const recapturePrep = SCREEN_ORDER.findIndex((s) => s.id === "capture_prep");
  const goRecapture = () =>
    recapturePrep >= 0 ? goTo(recapturePrep) : goNext();

  // ----- Bad photo state — the AI couldn't read one or more images -----
  if (badPhotos.length > 0) {
    return (
      <div className="flex h-full flex-col">
        <header className="mb-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-amber-800">
            Photo check
          </p>
          <h1 className="mt-0.5 flex items-center gap-2 text-xl font-semibold text-warmGray-800">
            <Camera className="h-5 w-5 text-amber-600" />
            Let&apos;s retake a few photos
          </h1>
          <p className="mt-1 text-sm text-warmGray-600">
            Some photos couldn&apos;t be read clearly, so we haven&apos;t
            generated a result. This is about the photo, not your foot.
          </p>
        </header>

        <div className="rounded-2xl border border-amber-600/30 bg-amber-50 p-3 text-sm text-warmGray-800">
          <p className="font-semibold">Photos to retake</p>
          <ul className="mt-2 space-y-2 text-xs">
            {badPhotos.map((img, i) => (
              <li key={i}>
                <span className="font-medium">{describeImage(img)}</span>
                {img.aiResult?.patient?.headline && (
                  <span className="block text-warmGray-600">
                    {img.aiResult.patient.headline}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-auto pt-4">
          <Button fullWidth size="lg" onClick={goRecapture}>
            <RotateCcw className="mr-2 h-4 w-4" /> Retake photos
          </Button>
        </div>
      </div>
    );
  }

  // ----- Blocked state — pre-flight gate or pipeline failure -----
  if ((gate && !gate.ok) || pipelineError) {
    return (
      <div className="flex h-full flex-col">
        <header className="mb-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-risk-high">
            Analysis blocked
          </p>
          <h1 className="mt-0.5 flex items-center gap-2 text-xl font-semibold text-warmGray-800">
            <AlertTriangle className="h-5 w-5 text-risk-high" />
            {pipelineError ? "Analysis didn't finish" : "No foot detected"}
          </h1>
          <p className="mt-1 text-sm text-warmGray-600">
            {pipelineError
              ? "We couldn't finish analyzing your photos."
              : "Please retake the image with the full foot in frame. We won't generate any analysis until the capture passes detection."}
          </p>
        </header>

        <div className="rounded-2xl border border-risk-high/30 bg-risk-high/5 p-3 text-sm text-warmGray-800">
          <p className="font-semibold text-risk-high">Detected issues</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-xs">
            {(gate?.ok === false ? gate.issues : []).map((msg, i) => (
              <li key={i}>{msg}</li>
            ))}
            {pipelineError && <li className="font-medium">{pipelineError}</li>}
          </ul>
          {gate && !gate.ok && (
            <div className="mt-3 text-[11px] text-warmGray-600">
              <p className="font-medium text-warmGray-800">Image confidence</p>
              <p>{(gate.meanImageConfidence * 100).toFixed(0)}%</p>
            </div>
          )}
        </div>

        <div className="mt-auto pt-4">
          <Button fullWidth size="lg" onClick={goRecapture}>
            <RotateCcw className="mr-2 h-4 w-4" /> Retake foot scan
          </Button>
        </div>
      </div>
    );
  }

  // ----- Normal processing UI -----
  return (
    <div className="flex h-full flex-col items-center justify-center text-center">
      <div className="relative mb-8 h-24 w-24">
        <motion.div
          className="absolute inset-0 rounded-full border-[3px] border-blue-50 border-t-brand"
          animate={{ rotate: 360 }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "linear" }}
        />
        <div className="absolute inset-3 flex items-center justify-center rounded-full bg-blue-50 text-xs font-semibold text-brand">
          AI
        </div>
      </div>
      <h2 className="text-xl font-semibold text-warmGray-800">
        Analyzing your scans
      </h2>
      <p className="mt-1 text-sm text-warmGray-600">
        This usually takes under a minute.
      </p>
      <div className="mt-8 h-10 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.p
            key={copyIndex}
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -16, opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="text-sm font-medium text-warmGray-800"
          >
            {PROCESSING_COPY[copyIndex]}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
}
