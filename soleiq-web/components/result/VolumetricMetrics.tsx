"use client";

import type { VolumetricMetrics as M } from "@/lib/types";

export function VolumetricMetrics({ m }: { m: M }) {
  const rows: { label: string; value: string }[] = [
    { label: "Foot length", value: `${m.footLengthMm} mm` },
    { label: "Plantar area", value: `${m.plantarAreaCm2} cm²` },
    { label: "Asymmetry index", value: m.bilateralAsymmetryIndex.toFixed(2) },
    { label: "Arch profile", value: `${m.archProfileMm} mm` },
  ];
  if (m.woundVolumeMm3 != null)
    rows.unshift({ label: "Wound volume", value: `${m.woundVolumeMm3} mm³` });
  if (m.woundDepthMm != null)
    rows.splice(1, 0, { label: "Wound depth", value: `${m.woundDepthMm.toFixed(1)} mm` });

  return (
    <div className="rounded-3xl border border-slate-100 bg-surface-raised p-4 shadow-card">
      <h3 className="mb-3 text-[15px] font-bold text-ink">
        Volumetric metrics
      </h3>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
        {rows.map((r) => (
          <div key={r.label}>
            <dt className="text-xs text-ink-faint">{r.label}</dt>
            <dd className="mt-0.5 text-[15px] font-semibold text-ink">{r.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
