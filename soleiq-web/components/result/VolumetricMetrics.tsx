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
    <div className="rounded-2xl border border-warmGray-100 bg-white p-4">
      <h3 className="mb-2 text-sm font-semibold text-warmGray-800">
        Volumetric metrics
      </h3>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        {rows.map((r) => (
          <div key={r.label}>
            <dt className="text-warmGray-600">{r.label}</dt>
            <dd className="font-medium text-warmGray-800">{r.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
