"use client";

import { useSoleiqStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Tabs } from "@/components/ui/tabs";
import { RiskBadge } from "@/components/result/RiskBadge";
import { ResultOverlay } from "@/components/result/ResultOverlay";
import { FootMeshViewer } from "@/components/three/FootMeshViewer";
import { ContributingFactors } from "@/components/result/ContributingFactors";
import { VolumetricMetrics } from "@/components/result/VolumetricMetrics";
import type { FootSide } from "@/lib/types";
import { Info } from "lucide-react";

export function Results() {
  const visit = useSoleiqStore((s) => s.currentVisit);
  const goNext = useSoleiqStore((s) => s.goNext);
  const result = visit?.result;
  if (!result || !visit) return null;

  return (
    <div className="-mx-1 flex h-full flex-col overflow-y-auto px-1 pb-2">
      <header className="mb-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-brand">
          Clinical summary
        </p>
        <div className="mt-0.5 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-warmGray-800">
            Foot risk assessment
          </h1>
          <RiskBadge risk={result.riskLevel} />
        </div>
      </header>

      <div className="mb-4 flex items-start gap-2 rounded-2xl border border-blue-100 bg-blue-50 p-3 text-[12px] leading-snug text-blue-800">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          <span className="font-semibold">Decision support, not a directive.</span>{" "}
          These findings support your clinical judgment. They do not replace
          examination, mandate immediate action, or constitute a diagnosis.
        </p>
      </div>

      <Tabs<FootSide>
        tabs={[
          { id: "right", label: "Right foot" },
          { id: "left", label: "Left foot" },
        ]}
        initial="right"
        render={(side) => {
          const soleImg =
            visit.images.find((i) => i.side === side && i.view === "sole")
              ?.dataUrl ?? "/sample-foot.svg";
          const sideDetections = result.detections.filter(
            (d) => d.side === side
          );
          const v = result.volumetrics.find((m) => m.side === side);
          return (
            <div className="space-y-3">
              <ResultOverlay imageSrc={soleImg} detections={sideDetections} />
              <FootMeshViewer side={side} />
              {v && <VolumetricMetrics m={v} />}
            </div>
          );
        }}
      />

      <div className="mt-4">
        <ContributingFactors factors={result.riskFactors} />
      </div>

      <div className="mt-5">
        <Button fullWidth onClick={goNext}>See next steps</Button>
      </div>
    </div>
  );
}
