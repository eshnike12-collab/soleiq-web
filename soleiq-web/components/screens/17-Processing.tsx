"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { motion } from "framer-motion";
import { useSoleiqStore } from "@/lib/store";
import { analyzeFootPhotos, PhotoRetakeError } from "@/lib/analyzeFootPhotos";
import { SCREEN_ORDER } from "@/lib/flow-config";
import { Button } from "@/components/ui/button";

export function Processing() {
  const visit = useSoleiqStore((state) => state.currentVisit);
  const profile = useSoleiqStore((state) => state.profile);
  const setResult = useSoleiqStore((state) => state.setResult);
  const setProcessing = useSoleiqStore((state) => state.setProcessing);
  const goNext = useSoleiqStore((state) => state.goNext);
  const goTo = useSoleiqStore((state) => state.goTo);
  const [issues, setIssues] = useState<string[]>([]);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current || !visit) return;
    ran.current = true;
    setProcessing(true);
    analyzeFootPhotos(visit, profile)
      .then((result) => {
        setResult(result);
        setProcessing(false);
        goNext();
      })
      .catch((reason) => {
        setProcessing(false);
        setIssues(
          reason instanceof PhotoRetakeError
            ? reason.reasons
            : [reason instanceof Error ? reason.message : "The photo check failed."]
        );
      });
    // One request per screen mount, including React Strict Mode.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (issues.length > 0) {
    const captureStep = SCREEN_ORDER.findIndex((screen) => screen.id === "right_foot");
    return (
      <div className="flex h-full flex-col">
        <header>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-risk-high">Retake needed</p>
          <h1 className="mt-1 flex items-center gap-2 text-xl font-semibold text-warmGray-800">
            <AlertTriangle className="h-5 w-5 text-risk-high" /> We cannot check these photos yet
          </h1>
          <p className="mt-1 text-sm text-warmGray-600">
            A careful result needs clear photos. No screening result was generated.
          </p>
        </header>
        <div className="mt-4 rounded-2xl border border-risk-high/30 bg-risk-high/5 p-3">
          <ul className="list-disc space-y-1 pl-5 text-sm text-warmGray-800">
            {issues.map((issue) => <li key={issue}>{issue}</li>)}
          </ul>
        </div>
        <div className="mt-auto pt-4">
          <Button fullWidth onClick={() => goTo(captureStep)}>
            <RotateCcw className="mr-2 h-4 w-4" /> Review and retake photos
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col items-center justify-center text-center">
      <motion.div
        className="h-20 w-20 rounded-full border-[3px] border-blue-50 border-t-brand"
        animate={{ rotate: 360 }}
        transition={{ duration: 1.4, repeat: Infinity, ease: "linear" }}
      />
      <h1 className="mt-6 text-xl font-semibold text-warmGray-800">Checking all four photos</h1>
      <p className="mt-2 max-w-[280px] text-sm text-warmGray-600">
        First we check photo quality, then visible skin and nail concerns. Photos cannot show problems beneath the skin.
      </p>
    </div>
  );
}
