"use client";

/**
 * Circulation and wound-size read-out for the results screen.
 *
 * Deliberately separate from the image model's narrative: these are
 * measurements with units, and they are the ones that can be compared with the
 * last visit.
 */

import { Droplets, Ruler } from "lucide-react";
import type { FootPerfusionAssessment, PerfusionConcern } from "@/lib/perfusion";
import { CONCERN_LABEL } from "@/lib/perfusion";
import type { UlcerAnalysis } from "@/lib/wound";

const CONCERN_STYLE: Record<PerfusionConcern, string> = {
  unknown: "bg-surface-sunken text-ink-soft",
  reassuring: "bg-secondary-soft text-secondary",
  monitor: "bg-warn-soft text-warn",
  urgent: "bg-urgent-soft text-urgent",
};

export function PerfusionCard({ perfusion }: { perfusion: FootPerfusionAssessment }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-surface-raised p-4 shadow-card">
      <div className="flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-soft text-primary">
          <Droplets className="h-[18px] w-[18px]" />
        </span>
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink-faint">
          Circulation
        </p>
        <span
          className={`ml-auto rounded-full px-2.5 py-1 text-[11px] font-bold ${CONCERN_STYLE[perfusion.concern]}`}
        >
          {CONCERN_LABEL[perfusion.concern]}
        </span>
      </div>
      <ul className="mt-3 space-y-1.5 text-[13px] leading-snug text-ink-soft">
        {perfusion.reasons.map((reason) => (
          <li key={reason} className="flex gap-2">
            <span className="mt-1.5 inline-block h-1 w-1 shrink-0 rounded-full bg-ink-faint" />
            <span>{reason}</span>
          </li>
        ))}
      </ul>
      {perfusion.actions.length > 0 && (
        <div className="mt-2.5 rounded-xl bg-surface-sunken p-2.5">
          <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-ink-faint">
            What to do
          </p>
          <ul className="mt-1 space-y-1 text-[13px] leading-snug text-ink">
            {perfusion.actions.map((action) => (
              <li key={action}>• {action}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

export function UlcerMeasurementCard({ ulcers }: { ulcers: UlcerAnalysis[] }) {
  if (ulcers.length === 0) return null;
  return (
    <section className="rounded-2xl border border-slate-200 bg-surface-raised p-4 shadow-card">
      <div className="flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-soft text-primary">
          <Ruler className="h-[18px] w-[18px]" />
        </span>
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink-faint">
          Measured areas
        </p>
      </div>

      <div className="mt-3 space-y-3">
        {ulcers.map((ulcer, index) => {
          const { measurement } = ulcer;
          return (
            <div
              key={`${ulcer.side}-${ulcer.view}-${index}`}
              className="rounded-xl bg-surface-sunken p-3"
            >
              <p className="text-[13px] font-bold capitalize text-ink">
                {ulcer.side} foot · {ulcer.view}
              </p>
              <p className="mt-1 text-[15px] font-bold text-ink">
                {measurement.areaMm2 !== null
                  ? `${measurement.areaMm2} mm²`
                  : `${measurement.areaFootPct}% of the foot in view`}
                {measurement.maxLengthMm !== null && (
                  <span className="ml-2 text-[13px] font-semibold text-ink-soft">
                    {measurement.maxLengthMm} × {measurement.maxWidthMm} mm
                  </span>
                )}
              </p>
              <p className="mt-1 text-[13px] text-ink-soft">
                Tissue: {measurement.tissue.granulationPct}% red ·{" "}
                {measurement.tissue.sloughPct}% yellow ·{" "}
                {measurement.tissue.escharPct}% dark
              </p>
              {ulcer.notes.map((note) => (
                <p key={note} className="mt-1.5 text-[13px] leading-snug text-ink-soft">
                  {note}
                </p>
              ))}
            </div>
          );
        })}
      </div>
    </section>
  );
}
