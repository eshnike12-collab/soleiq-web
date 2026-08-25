"use client";

import { ChevronLeft } from "lucide-react";
import { useSoleiqStore } from "@/lib/store";
import { useT } from "@/lib/i18n/I18nProvider";

/**
 * Inline back control rendered in the flow's header row (never floating, so
 * it can't overlap the Continue button). Hidden on Welcome where there is
 * nothing to go back to.
 */
export function BackButton() {
  const d = useT();
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
      aria-label={d.flow.back}
      title={d.flow.backHint}
    >
      <ChevronLeft className="h-5 w-5 rtl-flip" />
    </button>
  );
}
