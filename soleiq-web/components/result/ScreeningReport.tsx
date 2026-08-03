"use client";

/**
 * Presentational renderer for a PhotoScreeningResult. Shared by the in-flow
 * Results screen (18-Results, store-backed) and /results ("Open Results",
 * DB-backed) so a saved analysis renders identically to a fresh one.
 */

import { useState } from "react";
import {
  AlertCircle,
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

const STATUS: Record<
  ScreeningLevel,
  { label: string; banner: string; iconWrap: string; labelColor: string; Icon: typeof CheckCircle2 }
> = {
  clear: {
    label: "Looks clear",
    banner: "bg-success-soft",
    iconWrap: "bg-surface-raised text-success",
    labelColor: "text-success",
    Icon: CheckCircle2,
  },
  watch: {
    label: "Watch this",
    banner: "bg-warn-soft",
    iconWrap: "bg-surface-raised text-warn",
    labelColor: "text-warn",
    Icon: Eye,
  },
  see_someone_soon: {
    label: "See someone soon",
    banner: "bg-urgent-soft",
    iconWrap: "bg-surface-raised text-urgent",
    labelColor: "text-urgent",
    Icon: Stethoscope,
  },
  urgent: {
    label: "Urgent, get care now",
    banner: "bg-urgent-soft",
    iconWrap: "bg-surface-raised text-urgent",
    labelColor: "text-urgent",
    Icon: AlertTriangle,
  },
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
  const StatusIcon = status.Icon;
  return (
    <>
      <header className="mb-4">
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-primary">{eyebrow}</p>
        <div className={cn("mt-3 rounded-3xl p-5", status.banner)}>
          <div className="flex items-start gap-4">
            <span
              className={cn(
                "flex h-12 w-12 shrink-0 items-center justify-center rounded-full shadow-card",
                status.iconWrap
              )}
            >
              <StatusIcon className="h-6 w-6" />
            </span>
            <div className="min-w-0">
              <p className={cn("text-sm font-bold", status.labelColor)}>{status.label}</p>
              <h1 className="mt-1 text-xl font-bold leading-snug text-ink">
                {screening.overall.headline}
              </h1>
            </div>
          </div>
        </div>
      </header>

      {screening.overall.level === "urgent" && (
        <div className="mb-4 rounded-3xl border border-urgent/25 bg-urgent-soft p-4">
          <p className="flex items-center gap-2 font-bold text-urgent"><AlertTriangle className="h-5 w-5 shrink-0" /> Get prompt professional care</p>
          <p className="mt-1.5 text-[15px] leading-relaxed text-ink">Do not wait for another photo check if you see spreading redness, drainage or pus, red streaks, dark tissue, or a deep/open wound.</p>
        </div>
      )}

      <div className="space-y-4">
        {screening.findings.length === 0 ? (
          <Card className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-success-soft">
              <CheckCircle2 className="h-5 w-5 text-success" />
            </span>
            <p className="text-[15px] leading-relaxed text-ink">No visible surface concern was flagged in these photos. A photo cannot rule out every foot problem.</p>
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
            <p className="flex items-center gap-2 text-[15px] font-bold text-ink">
              <CheckCircle2 className="h-5 w-5 text-success" /> What looked healthy
            </p>
            <ul className="mt-3 space-y-2">
              {screening.looks_good.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-[15px] leading-relaxed text-ink-soft">
                  <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-success" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-sm leading-relaxed text-ink-faint">
              Good signs — but keep up your daily checks; photos cannot see everything.
            </p>
          </Card>
        )}

        {(screening.personal_notes?.length ?? 0) > 0 && (
          <Card className="border-blue-100 bg-primary-soft shadow-none">
            <p className="flex items-center gap-2 text-[15px] font-bold text-primary">
              <ClipboardList className="h-5 w-5" /> Based on your answers
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-[15px] leading-relaxed text-ink">
              {screening.personal_notes.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </Card>
        )}

        <ListCard icon={CheckCircle2} title="What to do next" items={screening.what_to_do} />
        <ListCard icon={Stethoscope} title="When to get help" items={screening.when_to_get_help} />

        <div className="rounded-3xl border border-blue-100 bg-primary-soft p-4">
          <p className="flex items-start gap-2 text-sm font-bold text-primary"><Eye className="mt-0.5 h-4 w-4 shrink-0" /> What photos cannot show</p>
          <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{screening.limits}</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-surface-raised p-4">
          <p className="text-sm font-bold text-ink">This is not a diagnosis.</p>
          <p className="mt-1 text-sm leading-relaxed text-ink-faint">If you are worried, symptoms are changing, or your care team gave you different instructions, contact a medical professional.</p>
        </div>
      </div>
    </>
  );
}

const CONCERN_RING: Record<PhotoScreeningFinding["concern"], string> = {
  low: "border-amber-500 bg-amber-500/15",
  medium: "border-orange-600 bg-orange-600/15",
  high: "border-urgent bg-urgent/20",
};

const CONCERN_TONE: Record<
  PhotoScreeningFinding["concern"],
  { chip: string; Icon: typeof AlertCircle }
> = {
  low: { chip: "bg-warn-soft text-warn", Icon: Eye },
  medium: { chip: "bg-orange-100 text-orange-700", Icon: AlertCircle },
  high: { chip: "bg-urgent-soft text-urgent", Icon: AlertTriangle },
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
  const tone = CONCERN_TONE[finding.concern];
  const ToneIcon = tone.Icon;

  return (
    <Card>
      {image && (
        // The wrapper takes the image's own aspect ratio (w-full h-auto), so
        // the marker's fractional coordinates line up with the photo exactly —
        // a fixed-aspect box with object-contain would letterbox and drift.
        <div className="relative mb-3 overflow-hidden rounded-2xl bg-slate-50">
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
        className="flex w-full items-start gap-3 text-left"
        aria-expanded={open}
      >
        <span
          className={cn(
            "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
            tone.chip
          )}
        >
          <ToneIcon className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-bold leading-snug text-ink">{finding.what_we_saw}</span>
          <span className="mt-0.5 block text-xs text-ink-faint">{finding.location_plain}</span>
        </span>
        {hasDetail && (
          <ChevronDown
            className={cn(
              "mt-1 h-5 w-5 shrink-0 text-ink-faint transition-transform duration-200",
              open && "rotate-180"
            )}
          />
        )}
      </button>
      <p className="mt-2.5 text-[15px] leading-relaxed text-ink-soft">{finding.why_it_matters}</p>
      {finding.lighting_artifact_possible && (
        <p className="mt-2.5 rounded-xl bg-warn-soft px-3 py-2 text-sm leading-relaxed text-amber-800">
          This darker area may just be a shadow or uneven lighting. Retake this
          photo in bright, even light to confirm before worrying.
        </p>
      )}
      {hasDetail && !open && (
        <p className="mt-2.5 text-sm font-semibold text-primary">
          {finding.region ? "Tap the marked spot for what this means" : "Tap for what this means"}
        </p>
      )}
      {open && (
        <div className="mt-2.5 rounded-2xl bg-surface-sunken p-3.5 text-[15px] leading-relaxed text-ink-soft">
          {finding.deeper_explanation}
        </div>
      )}
    </Card>
  );
}

function ListCard({ icon: Icon, title, items }: { icon: typeof CheckCircle2; title: string; items: string[] }) {
  return (
    <Card>
      <p className="flex items-center gap-2.5 text-[15px] font-bold text-ink">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-soft">
          <Icon className="h-4 w-4 text-primary" />
        </span>
        {title}
      </p>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-[15px] leading-relaxed text-ink-soft">
        {items.map((item) => <li key={item}>{item}</li>)}
      </ul>
    </Card>
  );
}
