"use client";

import { useState } from "react";
import { useSoleiqStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Tabs } from "@/components/ui/tabs";
import { RiskBadge } from "@/components/result/RiskBadge";
import { ResultOverlay } from "@/components/result/ResultOverlay";
import { AiReadingCard } from "@/components/result/AiReadingCard";
import { ContributingFactors } from "@/components/result/ContributingFactors";
import { VolumetricMetrics } from "@/components/result/VolumetricMetrics";
import { ClinicalDetail } from "@/components/result/ClinicalDetail";
import { PatientReadingCard } from "@/components/result/PatientReadingCard";
import { ClinicianSnapshot } from "@/components/result/ClinicianSnapshot";
import type { FootSide, VisitReading } from "@/lib/types";
import { AlertOctagon, Info, PhoneCall } from "lucide-react";
import { cn } from "@/lib/utils";

type TopTab = "summary" | "clinical";

/**
 * Full-screen takeover shown instead of the normal results layout when
 * the AI flags needs_urgent_care. The one job of this screen is routing
 * the patient to real-world care promptly — details are secondary.
 */
function UrgentCareState({
  reading,
  onShowDetails,
}: {
  reading: VisitReading;
  onShowDetails: () => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-risk-high/10">
          <AlertOctagon className="h-9 w-9 text-risk-high" />
        </div>
        <h1 className="mt-4 text-2xl font-semibold text-warmGray-800">
          Please get this looked at promptly
        </h1>
        <p className="mt-2 max-w-[300px] text-sm leading-relaxed text-warmGray-800">
          {reading.patient.headline}
        </p>
        <div className="mt-5 w-full rounded-2xl border border-risk-high/30 bg-risk-high/5 p-4 text-left">
          <p className="flex items-center gap-2 text-sm font-semibold text-risk-high">
            <PhoneCall className="h-4 w-4" />
            What to do now
          </p>
          <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-warmGray-800">
            <li>
              Contact your foot clinic, wound-care team, or urgent care{" "}
              <span className="font-semibold">today</span>.
            </li>
            <li>Stay off the affected foot as much as you can.</li>
            <li>Don&apos;t cut, drain, or treat the area yourself.</li>
          </ul>
        </div>
        <p className="mt-3 max-w-[300px] text-[11px] leading-snug text-warmGray-600">
          This is a screening alert based on your photos, not a diagnosis —
          but findings like these are safest checked in person quickly.
        </p>
      </div>
      <div className="space-y-2 pt-4">
        <Button fullWidth size="lg" variant="outline" onClick={onShowDetails}>
          View full results
        </Button>
      </div>
    </div>
  );
}

export function Results() {
  const visit = useSoleiqStore((s) => s.currentVisit);
  const goNext = useSoleiqStore((s) => s.goNext);
  const result = visit?.result;
  const reading = result?.reading;
  const [tab, setTab] = useState<TopTab>("summary");
  const [urgentDismissed, setUrgentDismissed] = useState(false);

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
          We don&apos;t have a scored result for this visit. Re-run the foot
          scan or go back to capture again.
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

  // Urgent takeover — replaces the normal layout entirely until the
  // patient explicitly opens the details.
  if (reading?.flags.needs_urgent_care && !urgentDismissed) {
    return (
      <UrgentCareState
        reading={reading}
        onShowDetails={() => setUrgentDismissed(true)}
      />
    );
  }

  return (
    <div className="-mx-1 flex h-full flex-col overflow-y-auto px-1 pb-2">
      <header className="mb-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-brand">
          {reading ? "Your results" : "Clinical summary"}
        </p>
        <div className="mt-0.5 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-warmGray-800">
            {reading ? "Foot check results" : "Foot risk assessment"}
          </h1>
          <RiskBadge risk={result.riskLevel} />
        </div>
      </header>

      {reading?.flags.needs_urgent_care && (
        <button
          onClick={() => setUrgentDismissed(false)}
          className="mb-3 flex w-full items-center gap-2 rounded-2xl border border-risk-high/30 bg-risk-high/5 p-3 text-left text-[12px] font-medium leading-snug text-risk-high"
        >
          <AlertOctagon className="h-4 w-4 shrink-0" />
          This result needs prompt attention — tap to see what to do now.
        </button>
      )}

      <div className="mb-4 flex items-start gap-2 rounded-2xl border border-blue-100 bg-blue-50 p-3 text-[12px] leading-snug text-blue-800">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          <span className="font-semibold">
            Screening support, not a diagnosis.
          </span>{" "}
          This reading comes from your photos and may be wrong in either
          direction. It doesn&apos;t replace an in-person examination.
        </p>
      </div>

      {/* Top-level tabs: patient summary vs clinician view */}
      <div className="mb-3 inline-flex w-full rounded-xl bg-warmGray-50 p-1 text-sm">
        {(
          [
            { id: "summary", label: "Summary" },
            { id: "clinical", label: "For your clinician" },
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
        reading ? (
          <PatientReadingCard reading={reading} />
        ) : (
          // Legacy layout — seeded demo data with detection overlays and
          // simulated volumetrics (no dual AI reading available).
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
                const sideImages = visit.images.filter((i) => i.side === side);
                return (
                  <div className="space-y-3">
                    <ResultOverlay imageSrc={soleImg} detections={sideDetections} />
                    <AiReadingCard side={side} images={sideImages} />
                    {v && <VolumetricMetrics m={v} />}
                  </div>
                );
              }}
            />

            <div className="mt-4">
              <ContributingFactors factors={result.riskFactors} />
            </div>
          </>
        )
      ) : (
        <div className="space-y-4">
          {reading && <ClinicianSnapshot reading={reading} />}
          <ClinicalDetail />
        </div>
      )}

      <div className="mt-5">
        <Button fullWidth onClick={goNext}>
          See next steps
        </Button>
      </div>
    </div>
  );
}
