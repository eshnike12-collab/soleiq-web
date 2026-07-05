"use client";

import { useSoleiqStore } from "@/lib/store";
import {
  buildClinicalDetail,
  type AxisScore,
  type RiskAxis,
} from "@/lib/clinicalDetail";
import { cn } from "@/lib/utils";
import { AlertTriangle, Calendar, Stethoscope, BookOpen, Activity } from "lucide-react";

const SCORE_STYLE: Record<AxisScore, string> = {
  low: "bg-teal-50 text-teal-800 border-teal-100",
  medium: "bg-amber-50 text-amber-800 border-amber-100",
  high: "bg-risk-high/10 text-risk-high border-risk-high/30",
};

const SCORE_PILL: Record<AxisScore, string> = {
  low: "bg-teal-100 text-teal-900",
  medium: "bg-amber-100 text-amber-900",
  high: "bg-risk-high text-white",
};

export function ClinicalDetail() {
  const visit = useSoleiqStore((s) => s.currentVisit);
  const profile = useSoleiqStore((s) => s.profile);
  const data = buildClinicalDetail(visit, profile);

  if (!data) {
    return (
      <div className="rounded-2xl border border-warmGray-100 bg-white p-4 text-sm text-warmGray-600">
        Clinical detail unavailable — analysis hasn't been scored yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Capture-quality strip */}
      <Section icon={Activity} title="Capture quality">
        <div className="rounded-2xl border border-warmGray-100 bg-white p-3 text-xs">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-semibold text-warmGray-800">
              Overall detection confidence
            </span>
            <span className="font-mono text-warmGray-800">
              {(data.captureQuality.overallConfidence * 100).toFixed(0)}%
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-warmGray-100">
            <div
              className="h-full bg-brand"
              style={{
                width: `${data.captureQuality.overallConfidence * 100}%`,
              }}
            />
          </div>
          <details className="mt-3">
            <summary className="cursor-pointer text-brand">
              Per-capture confidence
            </summary>
            <div className="mt-2 overflow-hidden rounded-lg border border-warmGray-100">
              <table className="w-full text-[11px]">
                <thead className="bg-warmGray-50 text-warmGray-600">
                  <tr>
                    <th className="px-2 py-1 text-left">Side</th>
                    <th className="px-2 py-1 text-left">View</th>
                    <th className="px-2 py-1 text-right">Confidence</th>
                    <th className="px-2 py-1 text-right">Silhouette px</th>
                  </tr>
                </thead>
                <tbody>
                  {data.captureQuality.images.map((i, idx) => (
                    <tr key={`i-${idx}`} className="border-t border-warmGray-100">
                      <td className="px-2 py-1 capitalize">{i.side}</td>
                      <td className="px-2 py-1">{i.view}</td>
                      <td className="px-2 py-1 text-right font-mono">
                        {(i.confidence * 100).toFixed(0)}%
                      </td>
                      <td className="px-2 py-1 text-right font-mono">
                        {i.silhouettePx}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </div>
      </Section>

      {/* Risk axes */}
      <Section icon={Stethoscope} title="Risk axes — weighted breakdown">
        <div className="space-y-2">
          {data.riskAxes.map((axis) => (
            <RiskAxisCard key={axis.id} axis={axis} />
          ))}
        </div>
      </Section>

      {/* Vascular / Glycemic / Neuropathic snapshots */}
      <Section icon={Activity} title="Snapshots">
        <div className="grid gap-2 sm:grid-cols-3">
          <SnapshotCard
            title="Vascular"
            rows={[
              ["PAD status", data.vascular.status],
              ["ABI", data.vascular.abi?.toFixed(2) ?? "—"],
              ["Claudication", data.vascular.claudication ? "yes" : "no"],
              ["Rest pain", data.vascular.restPain ? "yes" : "no"],
              ["Vascular signs", `${data.vascular.signsCount}`],
            ]}
          />
          <SnapshotCard
            title="Glycemic"
            rows={[
              ["HbA1c", data.glycemic.hba1cText],
              [
                "eAG",
                data.glycemic.eAGmgdl != null
                  ? `${data.glycemic.eAGmgdl} mg/dL`
                  : "—",
              ],
              ["Latest meter", data.glycemic.glucoseLabel ?? "—"],
              ["Diabetes type", data.glycemic.diabetesType ?? "none"],
              [
                "Years",
                data.glycemic.yearsWithDiabetes != null
                  ? `${data.glycemic.yearsWithDiabetes}`
                  : "—",
              ],
            ]}
          />
          <SnapshotCard
            title="Neuropathy / history"
            rows={[
              ["Numbness", data.neuropathic.numbness],
              ["Prior ulcers", `${data.neuropathic.priorUlcers}`],
              ["Prior amputations", `${data.neuropathic.priorAmputations}`],
            ]}
          />
        </div>
      </Section>

      {/* Mechanical */}
      {(data.mechanical.archProfileMm?.right ||
        data.mechanical.archProfileMm?.left) && (
        <Section icon={Activity} title="Mechanical / volumetric (per foot)">
          <div className="overflow-hidden rounded-2xl border border-warmGray-100 bg-white">
            <table className="w-full text-xs">
              <thead className="bg-warmGray-50 text-[10px] uppercase tracking-wide text-warmGray-600">
                <tr>
                  <th className="px-3 py-2 text-left">Metric</th>
                  <th className="px-3 py-2 text-right">Right</th>
                  <th className="px-3 py-2 text-right">Left</th>
                </tr>
              </thead>
              <tbody className="text-warmGray-800">
                <tr className="border-t border-warmGray-100">
                  <td className="px-3 py-2">Foot length (mm)</td>
                  <td className="px-3 py-2 text-right font-mono">
                    {data.mechanical.footLengthMm?.right ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-right font-mono">
                    {data.mechanical.footLengthMm?.left ?? "—"}
                  </td>
                </tr>
                <tr className="border-t border-warmGray-100">
                  <td className="px-3 py-2">Arch profile (mm)</td>
                  <td className="px-3 py-2 text-right font-mono">
                    {data.mechanical.archProfileMm?.right ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-right font-mono">
                    {data.mechanical.archProfileMm?.left ?? "—"}
                  </td>
                </tr>
                <tr className="border-t border-warmGray-100">
                  <td className="px-3 py-2">Wound volume (mm³)</td>
                  <td className="px-3 py-2 text-right font-mono">
                    {data.mechanical.woundVolumeMm3?.right ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-right font-mono">
                    {data.mechanical.woundVolumeMm3?.left ?? "—"}
                  </td>
                </tr>
                <tr className="border-t border-warmGray-100">
                  <td className="px-3 py-2">Bilateral asymmetry</td>
                  <td
                    className="px-3 py-2 text-right font-mono"
                    colSpan={2}
                  >
                    {data.mechanical.asymmetryIndex?.toFixed(2) ?? "—"}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {/* Follow-up */}
      <Section icon={Calendar} title="Recommended follow-up">
        <div className="rounded-2xl border border-brand/30 bg-blue-50 p-3">
          <p className="text-sm font-semibold text-brand">
            {data.followUp.cadence}
          </p>
          <p className="mt-1 text-xs leading-snug text-warmGray-800">
            {data.followUp.rationale}
          </p>
        </div>
      </Section>

      {/* Differential */}
      <Section icon={AlertTriangle} title="Differential considerations">
        <ul className="space-y-1.5 rounded-2xl border border-warmGray-100 bg-white p-3 text-sm text-warmGray-800">
          {data.differential.map((d) => (
            <li key={d} className="flex items-start gap-2">
              <span className="mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-warmGray-600" />
              {d}
            </li>
          ))}
        </ul>
      </Section>

      {/* Citations */}
      <Section icon={BookOpen} title="Clinical references">
        <ul className="space-y-1.5 text-[11px] leading-snug text-warmGray-600">
          {data.citations.map((c) => (
            <li key={c.label}>
              {c.url ? (
                <a
                  href={c.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-brand hover:underline"
                >
                  {c.label}
                </a>
              ) : (
                c.label
              )}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[10px] italic text-warmGray-600">
          Decision support. Not a diagnosis. Final clinical judgment rests with
          the treating provider.
        </p>
      </Section>
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Stethoscope;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h3 className="mb-1.5 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-warmGray-600">
        <Icon className="h-3.5 w-3.5 text-brand" />
        {title}
      </h3>
      {children}
    </section>
  );
}

function RiskAxisCard({ axis }: { axis: RiskAxis }) {
  return (
    <div
      className={cn(
        "rounded-2xl border p-3 text-xs leading-snug",
        SCORE_STYLE[axis.score]
      )}
    >
      <div className="flex items-center justify-between">
        <span className="font-semibold">{axis.label}</span>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase",
            SCORE_PILL[axis.score]
          )}
        >
          {axis.score}
        </span>
      </div>
      <ul className="mt-2 space-y-1">
        {axis.signals.map((s) => (
          <li key={s} className="flex items-start gap-2">
            <span className="mt-1.5 inline-block h-1 w-1 shrink-0 rounded-full bg-current opacity-50" />
            <span>{s}</span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[10px] opacity-70">
        Weight: {(axis.weight * 100).toFixed(0)}% of overall score
      </p>
    </div>
  );
}

function SnapshotCard({
  title,
  rows,
}: {
  title: string;
  rows: [string, string | undefined][];
}) {
  return (
    <div className="rounded-2xl border border-warmGray-100 bg-white p-3 text-xs">
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-warmGray-600">
        {title}
      </p>
      <dl className="space-y-1">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between">
            <dt className="text-warmGray-600">{k}</dt>
            <dd className="font-medium text-warmGray-800">{v ?? "—"}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
