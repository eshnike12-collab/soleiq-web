"use client";

import { ChevronLeft } from "lucide-react";
import { useSoleiqStore } from "@/lib/store";

/**
 * Inline back control rendered in the flow's header row (never floating, so
 * it can't overlap the Continue button). Hidden on Welcome where there is
 * nothing to go back to.
 */
export function BackButton() {
  const currentStep = useSoleiqStore((s) => s.currentStep);
  const historyLen = useSoleiqStore((s) => s.history.length);
  const goBack = useSoleiqStore((s) => s.goBack);
  if (currentStep === 0 && historyLen === 0) return null;
  return (
    <button
      onClick={goBack}
      className="
        inline-flex h-11 w-11 shrink-0 items-center justify-center
        rounded-full border border-slate-200 bg-surface-raised text-ink
        shadow-card transition-transform
        hover:bg-slate-50 active:scale-95
      "
      aria-label="Back"
      title="Back (←)"
    >
      <ChevronLeft className="h-5 w-5" />
    </button>
  );
}
