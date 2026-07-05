"use client";

/**
 * Patient-facing view of the visit's AI reading. Calm, plain language,
 * framed as screening support ("this looks like…"), never a diagnosis.
 */

import { CheckCircle2, HeartPulse, PhoneCall } from "lucide-react";
import type { ReadingSeverity, VisitReading } from "@/lib/types";
import { cn } from "@/lib/utils";

const SEVERITY_LABEL: Record<ReadingSeverity, string> = {
  none: "Nothing concerning found",
  mild: "Mild — worth keeping an eye on",
  moderate: "Moderate — worth getting checked",
  severe: "Serious — needs prompt care",
};

const SEVERITY_STYLE: Record<ReadingSeverity, string> = {
  none: "bg-teal-50 text-teal-800 border-teal-100",
  mild: "bg-blue-50 text-brand border-blue-100",
  moderate: "bg-amber-50 text-amber-800 border-amber-600/30",
  severe: "bg-risk-high/5 text-risk-high border-risk-high/30",
};

const CONFIDENCE_COPY: Record<string, string> = {
  low: "Low — the photos only tell part of the story.",
  medium: "Medium — based on what's visible in the photos.",
  high: "High — but a photo still can't rule everything out.",
};

export function PatientReadingCard({ reading }: { reading: VisitReading }) {
  const p = reading.patient;

  return (
    <div className="space-y-3">
      {/* Headline */}
      <div className="rounded-2xl border border-warmGray-100 bg-white p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-warmGray-600">
          What we saw
        </p>
        <h2 className="mt-1 text-lg font-semibold leading-snug text-warmGray-800">
          {p.headline}
        </h2>
        <div
          className={cn(
            "mt-3 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium",
            SEVERITY_STYLE[p.severity],
          )}
        >
          <HeartPulse className="h-3.5 w-3.5" />
          {SEVERITY_LABEL[p.severity]}
        </div>
        <p className="mt-2 text-xs text-warmGray-600">
          This looks most like:{" "}
          <span className="font-medium text-warmGray-800">
            {p.likely_finding}
          </span>
        </p>
        <p className="mt-1 text-xs text-warmGray-600">
          How confident is this reading?{" "}
          {CONFIDENCE_COPY[p.confidence] ?? CONFIDENCE_COPY.low}
        </p>
      </div>

      {/* Self-care steps */}
      {p.care_guidance.length > 0 && (
        <div className="rounded-2xl border border-warmGray-100 bg-white p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-warmGray-600">
            What you can do now
          </p>
          <ul className="mt-2 space-y-2">
            {p.care_guidance.map((step, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-warmGray-800">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" />
                {step}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Warning signs */}
      {p.see_a_clinician_if.length > 0 && (
        <div className="rounded-2xl border border-amber-600/30 bg-amber-50 p-4">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-amber-800">
            <PhoneCall className="h-3.5 w-3.5" />
            See a clinician if
          </p>
          <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-warmGray-800">
            {p.see_a_clinician_if.map((sign, i) => (
              <li key={i}>{sign}</li>
            ))}
          </ul>
        </div>
      )}

      <p className="px-1 text-[11px] leading-snug text-warmGray-600">
        This is a screening reading from your photos — it may be wrong in
        either direction and is not a diagnosis. Your own symptoms matter
        more than a photo: when in doubt, get checked.
      </p>
    </div>
  );
}
