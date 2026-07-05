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
    cls: "bg-risk-high text-white",
    Icon: AlertTriangle,
  },
  ulcer_possible: {
    text: "Possible ulcer — clinician review",
    cls: "bg-amber-400 text-amber-950",
    Icon: AlertTriangle,
  },
  uncertain: {
    text: "Uncertain — recapture or in-person review",
    cls: "bg-amber-200 text-amber-950",
    Icon: Info,
  },
  non_diagnostic: {
    text: "Image not diagnostic",
    cls: "bg-warmGray-100 text-warmGray-800",
    Icon: Info,
  },
  no_ulcer: {
    text: "No ulcer detected",
    cls: "bg-teal-600 text-white",
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
      <div className="rounded-2xl border border-warmGray-100 bg-warmGray-50 p-3 text-xs text-warmGray-600">
        <span className="font-semibold text-warmGray-800">AI reading</span>{" "}
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
    <div className="rounded-2xl border border-warmGray-100 bg-white p-3">
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-brand">
          AI reading — {side} foot
        </span>
        {worst.r.confidence && (
          <span className="rounded-full bg-warmGray-50 px-1.5 py-0.5 text-[9px] font-medium uppercase text-warmGray-600">
            {worst.r.confidence} confidence
          </span>
        )}
      </div>

      <div
        className={cn(
          "mt-1.5 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold",
          badge.cls,
        )}
      >
        <Icon className="h-3 w-3" /> {badge.text}
      </div>

      {worst.r.summary && (
        <p className="mt-2 text-[12px] leading-snug text-warmGray-800">
          {worst.r.summary}
        </p>
      )}

      {urgentFlags.length > 0 && (
        <div className="mt-2 rounded-xl border border-risk-high/25 bg-risk-high/5 p-2 text-[11px] text-risk-high">
          <p className="font-semibold">Urgent flags</p>
          <ul className="mt-0.5 list-disc space-y-0.5 pl-4">
            {urgentFlags.slice(0, 4).map((f, i) => (
              <li key={i}>{f}</li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-2 text-[10px] italic text-warmGray-600">
        Highest-severity view: {worst.img.view.replace("_", " ")} · based on {readings.length}/
        {images.length} views analyzed
      </p>
    </div>
  );
}
