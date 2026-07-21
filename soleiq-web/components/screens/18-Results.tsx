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
        <Info className="h-10 w-10 text-warmGray-100" />
        <h1 className="mt-3 text-xl font-semibold">No photo result available</h1>
        <p className="mt-1 text-sm text-warmGray-600">Return to capture and submit all four photos.</p>
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
