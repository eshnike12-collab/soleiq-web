"use client";

import { useState } from "react";
import { useSoleiqStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Tabs } from "@/components/ui/tabs";
import { RiskBadge } from "@/components/result/RiskBadge";
import { ResultOverlay } from "@/components/result/ResultOverlay";
import { FootMeshViewer } from "@/components/three/FootMeshViewer";
import { ContributingFactors } from "@/components/result/ContributingFactors";
import { VolumetricMetrics } from "@/components/result/VolumetricMetrics";
import { ClinicalDetail } from "@/components/result/ClinicalDetail";
import type { FootSide } from "@/lib/types";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

type TopTab = "summary" | "clinical";

export function Results() {
  const visit = useSoleiqStore((s) => s.currentVisit);
  const goNext = useSoleiqStore((s) => s.goNext);
  const result = visit?.result;
  const [tab, setTab] = useState<TopTab>("summary");
  if (!result || !visit) {
    // Defensive: should never be reached because Processing only advances on
    // success, but never render a blank screen — show why and how to recover.
    return (
      <div className="flex h-full flex-col items-center justify-center text-center">
        <Info className="h-10 w-10 text-warmGray-100" />
        <h1 className="mt-3 text-xl font-semibold text-warmGray-800">
          No analysis available yet
        </h1>
        <p className="mt-1 max-w-[280px] text-sm text-warmGray-600">
          We don't have a scored result for this visit. Re-run the foot scan or
          go back to capture again.
        </p>
        <Button
          className="mt-6"
          onClick={() => {
            const goBack = useSoleiqStore.getState().goBack;
            goBack();
          }}
        >
          Back to scan
        </Button>
      </div>
    );
  }

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

      {/* Top-level tabs: Summary vs Clinical detail */}
      <div className="mb-3 inline-flex w-full rounded-xl bg-warmGray-50 p-1 text-sm">
        {(
          [
            { id: "summary", label: "Summary" },
            { id: "clinical", label: "Clinical detail" },
          ] as { id: TopTab; label: string }[]
        ).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "flex-1 rounded-lg py-2 font-medium transition-colors",
              tab === t.id
                ? "bg-white text-brand shadow-sm"
                : "text-warmGray-600"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "summary" ? (
        <>
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
        </>
      ) : (
        <ClinicalDetail />
      )}

      <div className="mt-5">
        <Button fullWidth onClick={goNext}>
          See next steps
        </Button>
      </div>
    </div>
  );
}
