"use client";

import { ChevronLeft } from "lucide-react";
import { useSoleiqStore } from "@/lib/store";

export function BackButton() {
  const currentStep = useSoleiqStore((s) => s.currentStep);
  const historyLen = useSoleiqStore((s) => s.history.length);
  const goBack = useSoleiqStore((s) => s.goBack);
  // Hide on Welcome (no prior screen) and when there's nothing to go back to.
  // History-aware so the button shows from Timeline (step 99) when the user
  // arrived via Save-to-timeline from Next Steps.
  if (currentStep === 0 && historyLen === 0) return null;
  if (historyLen === 0 && currentStep === 0) return null;
  return (
    <button
      onClick={goBack}
      className="
        absolute bottom-14 left-3 z-20
        inline-flex h-10 w-10 items-center justify-center
        rounded-full border border-warmGray-100 bg-white text-warmGray-800
        shadow-[0_2px_8px_rgba(28,28,28,0.08)]
        hover:bg-warmGray-50
      "
      aria-label="Back"
      title="Back (←)"
    >
      <ChevronLeft className="h-5 w-5" />
    </button>
  );
}
