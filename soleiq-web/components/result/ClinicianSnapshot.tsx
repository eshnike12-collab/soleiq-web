"use client";

/**
 * "For your clinician" — the structured AI snapshot a podiatrist or
 * wound-care clinician reads: morphology, differential, Wagner estimate,
 * finding booleans, follow-up, and the per-image breakdown.
 */

import { Check, Minus } from "lucide-react";
import type { VisitReading } from "@/lib/types";
import { cn } from "@/lib/utils";

const VIEW_LABEL: Record<string, string> = {
  top: "Top",
  sole: "Sole",
  heel: "Heel",
  between_toes: "Between toes",
};

function FindingChip({ label, present }: { label: string; present: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium",
        present
          ? "border-risk-high/30 bg-risk-high/5 text-risk-high"
          : "border-warmGray-100 bg-warmGray-50 text-warmGray-600",
      )}
    >
      {present ? <Check className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
      {label}
    </span>
  );
}

export function ClinicianSnapshot({ reading }: { reading: VisitReading }) {
  const c = reading.clinician;

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-warmGray-100 bg-white p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-warmGray-600">
          AI visual snapshot — worst-affected image
        </p>
        <p className="mt-2 text-sm leading-relaxed text-warmGray-800">
          {c.morphology}
        </p>

        {c.differential.length > 0 && (
          <div className="mt-3">
            <p className="text-xs font-semibold text-warmGray-800">
              Differential (most likely first)
            </p>
            <ol className="mt-1 list-decimal space-y-0.5 pl-5 text-sm text-warmGray-800">
              {c.differential.map((d, i) => (
                <li key={i}>{d}</li>
              ))}
            </ol>
          </div>
        )}

        <div className="mt-3 flex items-center justify-between rounded-xl bg-warmGray-50 px-3 py-2">
          <span className="text-xs font-medium text-warmGray-600">
            Estimated Wagner grade (visual only)
          </span>
          <span className="text-sm font-semibold text-warmGray-800">
            {c.estimated_wagner_grade}
          </span>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          <FindingChip label="Erythema" present={c.erythema} />
          <FindingChip label="Exudate" present={c.exudate} />
          <FindingChip label="Necrosis" present={c.necrosis} />
          <FindingChip label="Infection signs" present={c.infection_signs} />
        </div>

        <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-800">
          <span className="font-semibold">Suggested follow-up: </span>
          {c.suggested_followup}
        </div>
      </div>

      {/* Per-image breakdown */}
      <div className="rounded-2xl border border-warmGray-100 bg-white p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-warmGray-600">
          Per-image readings
        </p>
        <div className="mt-2 divide-y divide-warmGray-50">
          {reading.perImage.map((img, i) => (
            <div key={i} className="flex items-baseline justify-between gap-3 py-1.5">
              <span className="shrink-0 text-xs font-medium text-warmGray-800">
                {img.side === "left" ? "L" : "R"} · {VIEW_LABEL[img.view] ?? img.view}
              </span>
              <span className="min-w-0 flex-1 truncate text-right text-xs text-warmGray-600">
                {img.patient
                  ? `${img.patient.likely_finding} (${img.patient.severity})`
                  : "no reading"}
              </span>
            </div>
          ))}
        </div>
        {reading.modelVersion && (
          <p className="mt-2 text-[10px] text-warmGray-600">
            Model {reading.modelVersion}. Visual estimates from photographs —
            not a wound measurement or a diagnosis.
          </p>
        )}
      </div>
    </div>
  );
}
