"use client";

import { Info } from "lucide-react";
import { useSoleiqStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { ScreeningReport } from "@/components/result/ScreeningReport";

export function Results() {
  const visit = useSoleiqStore((state) => state.currentVisit);
  const goNext = useSoleiqStore((state) => state.goNext);
  const screening = visit?.result?.screening;

  if (!visit || !screening) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-soft">
          <Info className="h-7 w-7 text-primary" />
        </span>
        <h1 className="mt-4 text-xl font-bold text-ink">No photo result available</h1>
        <p className="mt-2 max-w-[280px] text-[15px] leading-relaxed text-ink-soft">Return to capture and submit all four photos.</p>
      </div>
    );
  }

  return (
    <div className="-mx-1 flex h-full flex-col overflow-y-auto px-1 pb-2">
      <ScreeningReport
        screening={screening}
        images={visit.images.map((image) => ({
          side: image.side,
          view: image.view,
          dataUrl: image.dataUrl,
        }))}
      />
      <div className="mt-4"><Button fullWidth onClick={goNext}>Save or share this check</Button></div>
    </div>
  );
}
