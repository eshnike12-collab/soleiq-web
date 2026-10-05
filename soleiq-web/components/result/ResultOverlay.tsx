"use client";

import type { DetectionRegion } from "@/lib/types";

// Detection outline colours, aligned to the app's palette tokens: coral
// (urgent), amber (attention), terracotta, cool neutral — never a harsh
// saturated red. These are drawn over a photograph, so each is the darker end
// of its family to stay visible against skin tones.
//
// The KEYS are the detection types the model emits and are not presentation —
// do not rename them here.
const STROKE: Record<DetectionRegion["type"], string> = {
  wound: "#B8402F",
  redness: "#8A6209",
  dryness: "#A85A2A",
  callus: "#64748B",
};

export function ResultOverlay({
  imageSrc,
  detections,
}: {
  imageSrc: string;
  detections: DetectionRegion[];
}) {
  return (
    <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl bg-slate-800">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageSrc}
        alt="Foot capture"
        className="h-full w-full object-cover"
      />
      <svg
        viewBox="0 0 1 1"
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full"
      >
        {detections.map((d, i) => (
          <polygon
            key={i}
            points={d.polygon.map((p) => `${p[0]},${p[1]}`).join(" ")}
            fill={STROKE[d.type]}
            fillOpacity={0.18}
            stroke={STROKE[d.type]}
            strokeWidth={0.005}
          />
        ))}
      </svg>
      <div className="absolute bottom-2 left-2 flex flex-wrap gap-1">
        {detections.map((d, i) => (
          <span
            key={i}
            className="rounded-full bg-slate-900/70 px-2 py-0.5 text-xs font-medium text-white"
          >
            {d.type} · {(d.confidence * 100).toFixed(0)}%
          </span>
        ))}
      </div>
    </div>
  );
}
