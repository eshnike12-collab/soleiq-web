"use client";

import type { DetectionRegion } from "@/lib/types";

const STROKE: Record<DetectionRegion["type"], string> = {
  wound: "#C00000",
  redness: "#BF8F00",
  dryness: "#854F0B",
  callus: "#5F5E5A",
};

export function ResultOverlay({
  imageSrc,
  detections,
}: {
  imageSrc: string;
  detections: DetectionRegion[];
}) {
  return (
    <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl bg-warmGray-800">
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
            className="rounded-full bg-black/60 px-2 py-0.5 text-xs text-white"
          >
            {d.type} · {(d.confidence * 100).toFixed(0)}%
          </span>
        ))}
      </div>
    </div>
  );
}
