"use client";

import { AlertTriangle, CheckCircle2, Eye, Info, Stethoscope } from "lucide-react";
import { useSoleiqStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { PhotoScreeningFinding, ScreeningLevel } from "@/lib/types";

const STATUS: Record<ScreeningLevel, { label: string; className: string }> = {
  clear: { label: "Looks clear", className: "bg-teal-50 text-teal-800" },
  watch: { label: "Watch this", className: "bg-amber-50 text-amber-800" },
  see_someone_soon: { label: "See someone soon", className: "bg-orange-100 text-orange-900" },
  urgent: { label: "Urgent, get care now", className: "bg-risk-high text-white" },
};

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

  const status = STATUS[screening.overall.level];
  return (
    <div className="-mx-1 flex h-full flex-col overflow-y-auto px-1 pb-2">
      <header className="mb-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-brand">Photo check result</p>
        <span className={cn("mt-2 inline-flex rounded-full px-3 py-1.5 text-sm font-semibold", status.className)}>
          {status.label}
        </span>
        <h1 className="mt-3 text-xl font-semibold leading-snug text-warmGray-800">
          {screening.overall.headline}
        </h1>
      </header>

      {screening.overall.level === "urgent" && (
        <div className="mb-3 rounded-2xl bg-risk-high p-4 text-white">
          <p className="flex items-center gap-2 font-semibold"><AlertTriangle className="h-5 w-5" /> Get prompt professional care</p>
          <p className="mt-1 text-sm text-white/90">Do not wait for another photo check if you see spreading redness, drainage or pus, red streaks, dark tissue, or a deep/open wound.</p>
        </div>
      )}

      <div className="space-y-3">
        {screening.findings.length === 0 ? (
          <Card className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-teal-600" />
            <p className="text-sm text-warmGray-800">No visible surface concern was flagged in these photos. A photo cannot rule out every foot problem.</p>
          </Card>
        ) : (
          screening.findings.map((finding, index) => (
            <FindingCard key={`${finding.foot}-${finding.surface}-${index}`} finding={finding} />
          ))
        )}

        <ListCard icon={CheckCircle2} title="What to do next" items={screening.what_to_do} />
        <ListCard icon={Stethoscope} title="When to get help" items={screening.when_to_get_help} />

        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-3 text-xs leading-relaxed text-blue-800">
          <p className="flex items-start gap-2 font-semibold"><Eye className="mt-0.5 h-4 w-4 shrink-0" /> What photos cannot show</p>
          <p className="mt-1">{screening.limits}</p>
        </div>
        <div className="rounded-2xl border border-warmGray-100 p-3 text-xs text-warmGray-600">
          <p className="font-semibold text-warmGray-800">This is not a diagnosis.</p>
          <p className="mt-1">If you are worried, symptoms are changing, or your care team gave you different instructions, contact a medical professional.</p>
        </div>
      </div>

      <div className="mt-4"><Button fullWidth onClick={goNext}>Save or share this check</Button></div>
    </div>
  );
}

function FindingCard({ finding }: { finding: PhotoScreeningFinding }) {
  const visit = useSoleiqStore.getState().currentVisit;
  const image = visit?.images.find(
    (candidate) => candidate.side === finding.foot && candidate.view === finding.surface
  );
  return (
    <Card>
      {image && (
        <div className="relative mb-3 aspect-[4/3] overflow-hidden rounded-xl bg-warmGray-50">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image.dataUrl} alt={`${finding.foot} foot ${finding.surface}`} className="h-full w-full object-contain" />
          {finding.region && (
            <span
              className="absolute rounded-lg border-2 border-risk-high bg-risk-high/20"
              style={{
                left: `${finding.region.x * 100}%`,
                top: `${finding.region.y * 100}%`,
                width: `${finding.region.w * 100}%`,
                height: `${finding.region.h * 100}%`,
              }}
            />
          )}
        </div>
      )}
      <p className="text-sm font-semibold text-warmGray-800">{finding.what_we_saw}</p>
      <p className="mt-1 text-xs text-warmGray-600">{finding.location_plain}</p>
      <p className="mt-2 text-xs leading-relaxed text-warmGray-800">{finding.why_it_matters}</p>
    </Card>
  );
}

function ListCard({ icon: Icon, title, items }: { icon: typeof CheckCircle2; title: string; items: string[] }) {
  return (
    <Card>
      <p className="flex items-center gap-2 text-sm font-semibold text-warmGray-800"><Icon className="h-4 w-4 text-brand" /> {title}</p>
      <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-warmGray-800">
        {items.map((item) => <li key={item}>{item}</li>)}
      </ul>
    </Card>
  );
}
