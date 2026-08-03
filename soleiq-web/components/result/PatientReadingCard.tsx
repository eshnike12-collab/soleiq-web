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
  none: "bg-success-soft text-success",
  mild: "bg-primary-soft text-primary",
  moderate: "bg-warn-soft text-warn",
  severe: "bg-urgent-soft text-urgent",
};

const CONFIDENCE_COPY: Record<string, string> = {
  low: "Low — the photos only tell part of the story.",
  medium: "Medium — based on what's visible in the photos.",
  high: "High — but a photo still can't rule everything out.",
};

export function PatientReadingCard({ reading }: { reading: VisitReading }) {
  const p = reading.patient;

  return (
    <div className="space-y-4">
      {/* Headline */}
      <div className="rounded-3xl border border-slate-100 bg-surface-raised p-4 shadow-card">
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink-faint">
          What we saw
        </p>
        <h2 className="mt-1.5 text-lg font-bold leading-snug text-ink">
          {p.headline}
        </h2>
        <div
          className={cn(
            "mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold",
            SEVERITY_STYLE[p.severity],
          )}
        >
          <HeartPulse className="h-4 w-4" />
          {SEVERITY_LABEL[p.severity]}
        </div>
        <p className="mt-3 text-sm leading-relaxed text-ink-soft">
          This looks most like:{" "}
          <span className="font-semibold text-ink">
            {p.likely_finding}
          </span>
        </p>
        <p className="mt-1 text-sm leading-relaxed text-ink-soft">
          How confident is this reading?{" "}
          {CONFIDENCE_COPY[p.confidence] ?? CONFIDENCE_COPY.low}
        </p>
      </div>

      {/* Self-care steps */}
      {p.care_guidance.length > 0 && (
        <div className="rounded-3xl border border-slate-100 bg-surface-raised p-4 shadow-card">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink-faint">
            What you can do now
          </p>
          <ul className="mt-3 space-y-2.5">
            {p.care_guidance.map((step, i) => (
              <li key={i} className="flex items-start gap-2.5 text-[15px] leading-relaxed text-ink">
                <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-success" />
                {step}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Warning signs */}
      {p.see_a_clinician_if.length > 0 && (
        <div className="rounded-3xl border border-warn/25 bg-warn-soft p-4">
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-warn">
            <PhoneCall className="h-3.5 w-3.5" />
            See a clinician if
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-[15px] leading-relaxed text-ink">
            {p.see_a_clinician_if.map((sign, i) => (
              <li key={i}>{sign}</li>
            ))}
          </ul>
        </div>
      )}

      <p className="px-1 text-xs leading-relaxed text-ink-faint">
        This is a screening reading from your photos — it may be wrong in
        either direction and is not a diagnosis. Your own symptoms matter
        more than a photo: when in doubt, get checked.
      </p>
    </div>
  );
}
