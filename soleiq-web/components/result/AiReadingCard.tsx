"use client";

/**
 * Renders the aggregated AI reading for one foot. Consumes the per-image
 * `aiResult` records that analyzeFootImage() stores on CapturedImage in
 * the visit store. Picks the worst-case assessment across the 4 views
 * of a foot, then surfaces its summary + urgent flags for that view.
 *
 * Never renders anything if the AI hasn't replied yet — the rest of the
 * Results screen (mock volumetrics + risk badge) still shows.
 */

import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CapturedImage, FootSide } from "@/lib/types";

interface Props {
  side: FootSide;
  images: CapturedImage[]; // typically the 4 views for one foot
}

type Assessment =
  | "ulcer_likely"
  | "ulcer_possible"
  | "uncertain"
  | "non_diagnostic"
  | "no_ulcer";

// Worst → best. worst-case wins when aggregating across views.
const SEVERITY: Record<Assessment, number> = {
  ulcer_likely: 5,
  ulcer_possible: 4,
  uncertain: 3,
  non_diagnostic: 2,
  no_ulcer: 1,
};

const BADGE: Record<
  Assessment,
  { text: string; cls: string; Icon: typeof AlertTriangle }
> = {
  ulcer_likely: {
    text: "Likely ulcer",
    cls: "bg-urgent-soft text-urgent",
    Icon: AlertTriangle,
  },
  ulcer_possible: {
    text: "Possible ulcer — clinician review",
    cls: "bg-warn-soft text-warn",
    Icon: AlertTriangle,
  },
  uncertain: {
    text: "Uncertain — recapture or in-person review",
    cls: "bg-slate-100 text-ink-soft",
    Icon: Info,
  },
  non_diagnostic: {
    text: "Image not diagnostic",
    cls: "bg-slate-100 text-ink-faint",
    Icon: Info,
  },
  no_ulcer: {
    text: "No ulcer detected",
    cls: "bg-success-soft text-success",
    Icon: CheckCircle2,
  },
};

export function AiReadingCard({ side, images }: Props) {
  const readings = images
    .map((img) => ({ img, r: img.aiResult }))
    .filter((x): x is { img: CapturedImage; r: NonNullable<CapturedImage["aiResult"]> } =>
      !!x.r,
    );

  // Not-yet path — no AI replies have landed for this foot. Show a soft
  // "analyzing" note; the rest of the Results screen still renders.
  if (readings.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-100 bg-surface-sunken p-3.5 text-sm leading-relaxed text-ink-faint">
        <span className="font-semibold text-ink-soft">AI reading</span>{" "}
        — no per-image analysis has landed yet for the {side} foot.
      </div>
    );
  }

  // Worst-case assessment across the views of this foot.
  const worst = [...readings].sort((a, b) => {
    const sa = SEVERITY[(a.r.assessment ?? "uncertain") as Assessment] ?? 0;
    const sb = SEVERITY[(b.r.assessment ?? "uncertain") as Assessment] ?? 0;
    return sb - sa;
  })[0];

  const badge = BADGE[(worst.r.assessment ?? "uncertain") as Assessment] ?? BADGE.uncertain;
  const Icon = badge.Icon;

  // Merged urgent flags across ALL views, de-duplicated by text.
  const urgentFlags = Array.from(
    new Set(readings.flatMap((x) => x.r.urgent_flags ?? [])),
  );

  return (
    <div className="rounded-2xl border border-slate-200 bg-surface-raised p-4">
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wide text-ink-faint">
          AI reading — {side} foot
        </span>
        {worst.r.confidence && (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium uppercase text-ink-faint">
            {worst.r.confidence} confidence
          </span>
        )}
      </div>

      <div
        className={cn(
          "mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold",
          badge.cls,
        )}
      >
        <Icon className="h-3.5 w-3.5" /> {badge.text}
      </div>

      {worst.r.summary && (
        <p className="mt-2.5 text-sm leading-relaxed text-ink-soft">
          {worst.r.summary}
        </p>
      )}

      {urgentFlags.length > 0 && (
        <div className="mt-2.5 rounded-xl border border-urgent/25 bg-urgent-soft p-3 text-sm">
          <p className="font-bold text-urgent">Urgent flags</p>
          <ul className="mt-1 list-disc space-y-1 pl-4 leading-relaxed text-ink">
            {urgentFlags.slice(0, 4).map((f, i) => (
              <li key={i}>{f}</li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-2.5 text-xs text-ink-faint">
        Highest-severity view: {worst.img.view.replace("_", " ")} · based on {readings.length}/
        {images.length} views analyzed
      </p>
    </div>
  );
}
