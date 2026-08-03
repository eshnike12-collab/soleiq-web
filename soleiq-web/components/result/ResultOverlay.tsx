"use client";

import type { DetectionRegion } from "@/lib/types";

// Muted, token-aligned detection colors: coral (urgent), honey amber (warn),
// warm orange, warm neutral — never harsh saturated red.
const STROKE: Record<DetectionRegion["type"], string> = {
  wound: "#A94F3F",
  redness: "#BC8F26",
  dryness: "#B06B2A",
  callus: "#837B6C",
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
