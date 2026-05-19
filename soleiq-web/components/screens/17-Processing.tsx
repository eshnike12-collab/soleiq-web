"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { useSoleiqStore } from "@/lib/store";
import {
  PROCESSING_COPY,
  simulateAIPipeline,
} from "@/lib/simulators/aiPipeline";
import {
  evaluateVisitForAnalysis,
  type CaptureGateResult,
} from "@/lib/captureGate";
import {
  SCREEN_ORDER,
} from "@/lib/flow-config";
import { Button } from "@/components/ui/button";

export function Processing() {
  const goNext = useSoleiqStore((s) => s.goNext);
  const goTo = useSoleiqStore((s) => s.goTo);
  const visit = useSoleiqStore((s) => s.currentVisit);
  const profile = useSoleiqStore((s) => s.profile);
  const setResult = useSoleiqStore((s) => s.setResult);
  const setProcessing = useSoleiqStore((s) => s.setProcessing);
  const [copyIndex, setCopyIndex] = useState(0);
  const [gate, setGate] = useState<CaptureGateResult | null>(null);

  // ----- HARD GATE -----
  // Evaluate the visit once on mount. If any capture failed foot detection we
  // refuse to call simulateAIPipeline at all — no placeholder results are
  // produced. Clinician is sent back to recapture.
  useEffect(() => {
    if (!visit) return;
    const result = evaluateVisitForAnalysis(visit);
    setGate(result);
    if (!result.ok) {
      // Critical: never reach simulateAIPipeline.
      return;
    }

    setProcessing(true);
    const t = setInterval(
      () => setCopyIndex((i) => (i + 1) % PROCESSING_COPY.length),
      1500
    );
    simulateAIPipeline(visit, profile).then((r) => {
      setResult(r);
      setProcessing(false);
      goNext();
    });
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Block UI state — analysis refused.
  if (gate && !gate.ok) {
    const recapturePrep = SCREEN_ORDER.findIndex(
      (s) => s.id === "capture_prep"
    );
    return (
      <div className="flex h-full flex-col">
        <header className="mb-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-risk-high">
            Analysis blocked
          </p>
          <h1 className="mt-0.5 flex items-center gap-2 text-xl font-semibold text-warmGray-800">
            <AlertTriangle className="h-5 w-5 text-risk-high" />
            No foot detected
          </h1>
          <p className="mt-1 text-sm text-warmGray-600">
            Please retake the image with the full foot in frame. We won't
            generate any analysis until the capture passes detection.
          </p>
        </header>

        <div className="rounded-2xl border border-risk-high/30 bg-risk-high/5 p-3 text-sm text-warmGray-800">
          <p className="font-semibold text-risk-high">Detected issues</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-xs">
            {gate.issues.map((msg, i) => (
              <li key={i}>{msg}</li>
            ))}
          </ul>
          <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-warmGray-600">
            <div>
              <p className="font-medium text-warmGray-800">Image confidence</p>
              <p>{(gate.meanImageConfidence * 100).toFixed(0)}%</p>
            </div>
            <div>
              <p className="font-medium text-warmGray-800">Mesh confidence</p>
              <p>{(gate.meanMeshConfidence * 100).toFixed(0)}%</p>
            </div>
          </div>
        </div>

        <div className="mt-auto pt-4">
          <Button
            fullWidth
            size="lg"
            onClick={() =>
              recapturePrep >= 0 ? goTo(recapturePrep) : goNext()
            }
          >
            <RotateCcw className="mr-2 h-4 w-4" /> Retake foot scan
          </Button>
        </div>
      </div>
    );
  }

  // Normal processing UI.
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
        This usually takes about 15 seconds.
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
