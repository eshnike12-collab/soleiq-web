"use client";

import { AlertTriangle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A1C → eAG (estimated Average Glucose) reference chart.
 * Sources: ADA 2025/2026 Standards of Care; Nathan et al. eAG formula.
 *
 *    eAG (mg/dL) = 28.7 × A1C − 46.7
 *    eAG (mmol/L) = eAG (mg/dL) / 18
 */

interface Zone {
  min: number;
  max: number;
  label: string;
  tone: string; // background color
  text: string;
}

const ZONES: Zone[] = [
  { min: 4.0, max: 5.7, label: "Normal", tone: "bg-teal-200", text: "text-teal-900" },
  { min: 5.7, max: 6.5, label: "Prediabetes", tone: "bg-amber-200", text: "text-amber-900" },
  { min: 6.5, max: 7.0, label: "Diabetes — at target", tone: "bg-blue-200", text: "text-blue-900" },
  { min: 7.0, max: 9.0, label: "Above target", tone: "bg-orange-300", text: "text-orange-900" },
  { min: 9.0, max: 14.0, label: "Severe", tone: "bg-risk-high/70", text: "text-white" },
];

const ROWS: { a1c: string; mgdl: string; mmol: string; meaning: string }[] = [
  { a1c: "5.0%", mgdl: "97", mmol: "5.4", meaning: "Normal" },
  { a1c: "5.7%", mgdl: "117", mmol: "6.5", meaning: "Prediabetes threshold" },
  { a1c: "6.0%", mgdl: "126", mmol: "7.0", meaning: "Prediabetes" },
  { a1c: "6.5%", mgdl: "140", mmol: "7.8", meaning: "Diabetes diagnosis" },
  { a1c: "7.0%", mgdl: "154", mmol: "8.6", meaning: "Typical adult target" },
  { a1c: "7.5%", mgdl: "169", mmol: "9.4", meaning: "Loosened (older / frail)" },
  { a1c: "8.0%", mgdl: "183", mmol: "10.2", meaning: "Suboptimal" },
  { a1c: "9.0%", mgdl: "212", mmol: "11.8", meaning: "High risk" },
  { a1c: "10.0%", mgdl: "240", mmol: "13.3", meaning: "Severe hyperglycemia" },
  { a1c: "11.0%", mgdl: "269", mmol: "14.9", meaning: "Severe" },
  { a1c: "12.0%", mgdl: "298", mmol: "16.6", meaning: "Severe" },
];

const ETHNIC_OFFSETS: Record<string, { delta: number; note: string }> = {
  "Black or African American": {
    delta: 0.26,
    note: "A1C runs ~0.26% higher than in White patients at the same actual average glucose (red-cell turnover differences). The diagnostic cutoff (6.5%) is unchanged.",
  },
  Asian: {
    delta: 0.24,
    note: "A1C runs ~0.24% higher than in White patients at the same actual average glucose. ADA also screens Asian Americans at BMI ≥23.",
  },
  "Hispanic or Latino": {
    delta: 0.08,
    note: "A1C runs ~0.08% higher than in White patients at the same actual average glucose.",
  },
};

const HEMO_HIGH_RISK_ETHNICITIES = [
  "Black or African American",
  "Asian",
  "Middle Eastern or North African",
  "Hispanic or Latino",
];

const a1cToEag = (a1c: number) => 28.7 * a1c - 46.7;

export function A1cReferenceChart({
  currentA1c,
  ethnicity,
}: {
  currentA1c?: number;
  ethnicity?: string;
}) {
  const eagFromInput =
    currentA1c && Number.isFinite(currentA1c) && currentA1c > 0
      ? a1cToEag(currentA1c)
      : undefined;

  const offset = ethnicity ? ETHNIC_OFFSETS[ethnicity] : undefined;
  const showHemoCaution = !ethnicity || HEMO_HIGH_RISK_ETHNICITIES.includes(ethnicity);

  return (
    <div className="mt-3 space-y-3 rounded-2xl border border-warmGray-100 bg-white p-3 text-xs leading-snug text-warmGray-800">
      <p>
        A1C reflects average glucose over the past ~3 months. The estimated
        average glucose (eAG) makes that average concrete.
      </p>
      <p className="font-mono text-[11px] text-warmGray-600">
        eAG (mg/dL) = 28.7 × A1C − 46.7
      </p>

      <ZoneBar currentA1c={currentA1c} />

      {eagFromInput !== undefined && (
        <div className="rounded-xl bg-blue-50 p-2 text-blue-900">
          <span className="font-semibold">At {currentA1c?.toFixed(1)}%, </span>
          eAG ≈ <span className="font-semibold">{Math.round(eagFromInput)} mg/dL</span>{" "}
          ({(eagFromInput / 18).toFixed(1)} mmol/L)
          {offset && (
            <span>
              ; biological adjustment for {ethnicity}: ≈{" "}
              <span className="font-semibold">
                {Math.round(a1cToEag(currentA1c! - offset.delta))} mg/dL
              </span>{" "}
              if measured as a White reference.
            </span>
          )}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-warmGray-100">
        <table className="w-full">
          <thead className="bg-warmGray-50/80 text-[10px] uppercase tracking-wide text-warmGray-600">
            <tr>
              <th className="px-2 py-1.5 text-left">A1C</th>
              <th className="px-2 py-1.5 text-left">eAG mg/dL</th>
              <th className="px-2 py-1.5 text-left">mmol/L</th>
              <th className="px-2 py-1.5 text-left">Meaning</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r) => {
              const a1cVal = parseFloat(r.a1c);
              const highlight =
                currentA1c != null &&
                Math.abs(currentA1c - a1cVal) < 0.25;
              return (
                <tr
                  key={r.a1c}
                  className={cn(
                    "border-t border-warmGray-100",
                    highlight && "bg-blue-50 font-medium"
                  )}
                >
                  <td className="px-2 py-1.5 font-mono">{r.a1c}</td>
                  <td className="px-2 py-1.5">{r.mgdl}</td>
                  <td className="px-2 py-1.5">{r.mmol}</td>
                  <td className="px-2 py-1.5">{r.meaning}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {offset && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-2 text-amber-900">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <p>
            <span className="font-semibold">Ethnic variation: </span>
            {offset.note} Diagnostic cutoffs are not adjusted by ethnicity. For
            tighter precision use CGM-derived GMI / time-in-range or
            fructosamine.
          </p>
        </div>
      )}

      {showHemoCaution && (
        <div className="flex items-start gap-2 rounded-xl border border-risk-high/30 bg-risk-high/10 p-2 text-risk-high">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <p>
            <span className="font-semibold">A1C unreliable in hemoglobinopathies. </span>
            Sickle-cell trait/disease and thalassemia (more prevalent in
            African, Mediterranean, South Asian, and Middle Eastern
            populations) skew A1C readings. Use fructosamine, glycated
            albumin, or CGM if hemoglobinopathy is known or suspected.
          </p>
        </div>
      )}

      <p className="text-[10px] italic text-warmGray-600">
        Source: ADA Standards of Care 2025/2026; Nathan et al. eAG-A1C
        relationship; DPP-A1C ethnic variation analysis.
      </p>
    </div>
  );
}

function ZoneBar({ currentA1c }: { currentA1c?: number }) {
  const min = 4.0;
  const max = 14.0;
  const clampedA1c =
    currentA1c != null && Number.isFinite(currentA1c)
      ? Math.max(min, Math.min(max, currentA1c))
      : undefined;
  const markerPct =
    clampedA1c != null ? ((clampedA1c - min) / (max - min)) * 100 : null;

  return (
    <div>
      <div className="relative h-7 w-full overflow-hidden rounded-lg">
        {ZONES.map((z) => {
          const left = ((z.min - min) / (max - min)) * 100;
          const width = ((z.max - z.min) / (max - min)) * 100;
          return (
            <div
              key={z.label}
              className={cn("absolute top-0 h-full", z.tone)}
              style={{ left: `${left}%`, width: `${width}%` }}
              title={z.label}
            />
          );
        })}
        {markerPct != null && (
          <div
            className="absolute top-0 h-full w-[3px] bg-warmGray-800"
            style={{ left: `calc(${markerPct}% - 1.5px)` }}
          />
        )}
      </div>
      <div className="mt-1 flex justify-between text-[9px] font-medium uppercase tracking-wide text-warmGray-600">
        <span>4%</span>
        <span>5.7</span>
        <span>6.5</span>
        <span>7</span>
        <span>9</span>
        <span>14%</span>
      </div>
      {clampedA1c != null && (
        <p className="mt-1 text-[11px] font-medium text-warmGray-800">
          Marker at {clampedA1c.toFixed(1)}%
        </p>
      )}
    </div>
  );
}
