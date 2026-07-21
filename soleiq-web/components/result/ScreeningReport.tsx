"use client";

/**
 * Presentational renderer for a PhotoScreeningResult. Shared by the in-flow
 * Results screen (18-Results, store-backed) and /results ("Open Results",
 * DB-backed) so a saved analysis renders identically to a fresh one.
 */

import { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Eye,
  Stethoscope,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type {
  PhotoScreeningFinding,
  PhotoScreeningResult,
  ScreeningLevel,
} from "@/lib/types";

export interface ScreeningImage {
  side: "left" | "right";
  view: string;
  dataUrl: string;
}

const STATUS: Record<ScreeningLevel, { label: string; className: string }> = {
  clear: { label: "Looks clear", className: "bg-teal-50 text-teal-800" },
  watch: { label: "Watch this", className: "bg-amber-50 text-amber-800" },
  see_someone_soon: { label: "See someone soon", className: "bg-orange-100 text-orange-900" },
  urgent: { label: "Urgent, get care now", className: "bg-risk-high text-white" },
};

export function ScreeningReport({
  screening,
  images,
  eyebrow = "Photo check result",
}: {
  screening: PhotoScreeningResult;
  images: ScreeningImage[];
  eyebrow?: string;
}) {
  const status = STATUS[screening.overall.level];
  return (
    <>
      <header className="mb-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-brand">{eyebrow}</p>
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
            <FindingCard
              key={`${finding.foot}-${finding.surface}-${index}`}
              finding={finding}
              image={images.find(
                (candidate) => candidate.side === finding.foot && candidate.view === finding.surface
              )}
            />
          ))
        )}

        {(screening.looks_good?.length ?? 0) > 0 && (
          <Card>
            <p className="flex items-center gap-2 text-sm font-semibold text-teal-800">
              <CheckCircle2 className="h-4 w-4 text-teal-600" /> What looked healthy
            </p>
            <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-warmGray-800">
              {screening.looks_good.map((item) => <li key={item}>{item}</li>)}
            </ul>
            <p className="mt-2 text-xs text-warmGray-600">
              Good signs — but keep up your daily checks; photos cannot see everything.
            </p>
          </Card>
        )}

        {(screening.personal_notes?.length ?? 0) > 0 && (
          <Card className="border-blue-100 bg-blue-50">
            <p className="flex items-center gap-2 text-sm font-semibold text-blue-800">
              <ClipboardList className="h-4 w-4" /> Based on your answers
            </p>
            <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-blue-800">
              {screening.personal_notes.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </Card>
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
    </>
  );
}

const CONCERN_RING: Record<PhotoScreeningFinding["concern"], string> = {
  low: "border-amber-600 bg-amber-600/15",
  medium: "border-orange-600 bg-orange-600/15",
  high: "border-risk-high bg-risk-high/20",
};

function FindingCard({
  finding,
  image,
}: {
  finding: PhotoScreeningFinding;
  image?: ScreeningImage;
}) {
  const [open, setOpen] = useState(false);
  const hasDetail = Boolean(finding.deeper_explanation);
  const toggle = () => hasDetail && setOpen((value) => !value);

  return (
    <Card>
      {image && (
        // The wrapper takes the image's own aspect ratio (w-full h-auto), so
        // the marker's fractional coordinates line up with the photo exactly —
        // a fixed-aspect box with object-contain would letterbox and drift.
        <div className="relative mb-3 overflow-hidden rounded-xl bg-warmGray-50">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image.dataUrl} alt={`${finding.foot} foot ${finding.surface}`} className="h-auto w-full" />
          {finding.region && (
            <button
              type="button"
              onClick={toggle}
              aria-expanded={open}
              aria-label={`Marked spot: ${finding.what_we_saw}. Tap for a deeper explanation.`}
              className={cn(
                "absolute rounded-full border-2 outline-offset-2",
                CONCERN_RING[finding.concern]
              )}
              style={{
                left: `${finding.region.x * 100}%`,
                top: `${finding.region.y * 100}%`,
                width: `${finding.region.w * 100}%`,
                height: `${finding.region.h * 100}%`,
              }}
            >
              <span
                className={cn(
                  "pointer-events-none absolute inset-0 animate-ping rounded-full border-2 opacity-60",
                  CONCERN_RING[finding.concern]
                )}
              />
            </button>
          )}
        </div>
      )}
      <button
        type="button"
        onClick={toggle}
        className="flex w-full items-start justify-between gap-2 text-left"
        aria-expanded={open}
      >
        <span>
          <span className="block text-sm font-semibold text-warmGray-800">{finding.what_we_saw}</span>
          <span className="mt-1 block text-xs text-warmGray-600">{finding.location_plain}</span>
        </span>
        {hasDetail && (
          <ChevronDown
            className={cn(
              "mt-0.5 h-4 w-4 shrink-0 text-warmGray-600 transition-transform",
              open && "rotate-180"
            )}
          />
        )}
      </button>
      <p className="mt-2 text-xs leading-relaxed text-warmGray-800">{finding.why_it_matters}</p>
      {hasDetail && !open && (
        <p className="mt-2 text-[11px] font-medium text-brand">
          {finding.region ? "Tap the marked spot for what this means" : "Tap for what this means"}
        </p>
      )}
      {open && (
        <div className="mt-2 rounded-xl bg-warmGray-50 p-3 text-xs leading-relaxed text-warmGray-800">
          {finding.deeper_explanation}
        </div>
      )}
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
