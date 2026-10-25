"use client";

import { useId, useState } from "react";
import type { DetectionRegion } from "@/lib/types";
import { CHANGE_LABEL } from "@/lib/wound/changeKind";
import { shapeFor, sizeLabel } from "@/lib/wound/overlayShape";

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

/**
 * The photo, with each visible change outlined as a mold.
 *
 * WHAT REPLACED WHAT. This used to draw the model's bounding region as a
 * four-corner <polygon> — a hard rectangle over someone's foot. Two things
 * were wrong with that. It asserted a boundary the system had not actually
 * found, and it hid the one thing worth comparing between visits: the shape.
 * A wound closes from its edges inward long before its bounding box moves.
 *
 * Three states, and they look different on purpose:
 *
 *   traced       segmentation found a border    solid stroke, soft glow
 *   approximate  only the model's region        DASHED, labelled as such
 *   neither      nothing drawn at all           caller shows location in text
 *
 * The dashed case is the honest version of the old rectangle: same
 * information, but the shape no longer claims to be measured.
 */
export function ResultOverlay({
  imageSrc,
  detections,
  onSelect,
}: {
  imageSrc: string;
  detections: DetectionRegion[];
  /** Tapping a shape opens the finding's deeper explanation. */
  onSelect?: (detection: DetectionRegion, index: number) => void;
}) {
  const glowId = useId();
  const [active, setActive] = useState<number | null>(null);

  const shapes = detections.map((detection) => ({
    detection,
    shape: shapeFor(detection),
  }));
  const drawable = shapes.filter((entry) => entry.shape !== null);
  const kindsShown = Array.from(
    new Set(drawable.map((entry) => entry.detection.type))
  );

  return (
    <figure className="m-0">
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
          role="presentation"
        >
          <defs>
            {/* The glow is what makes a shape read as a mold lying on the
                skin rather than a sticker pasted over it. */}
            <filter id={glowId} x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="0.006" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {drawable.map(({ detection, shape }, i) => {
            const colour = STROKE[detection.type];
            const approximate = shape!.confidence === "approximate";
            return (
              <path
                key={i}
                d={shape!.d}
                fill={colour}
                fillOpacity={approximate ? 0.12 : 0.18}
                stroke={colour}
                strokeWidth={active === i ? 0.008 : 0.005}
                strokeLinejoin="round"
                // Dashed says "approximate area" in the line itself, before
                // anyone reads the label.
                strokeDasharray={approximate ? "0.02 0.015" : undefined}
                filter={`url(#${glowId})`}
                className={onSelect ? "cursor-pointer" : undefined}
                onClick={() => {
                  setActive(i);
                  onSelect?.(detection, i);
                }}
              />
            );
          })}
        </svg>

        {/* Labels. Positioned from each shape's centre and clamped inward, so
            a label never leaves the frame and never sits on the shape it is
            naming. */}
        {drawable.map(({ detection, shape }, i) => {
          const [cx, cy] = shape!.centre;
          const size = sizeLabel(detection);
          const name = CHANGE_LABEL[detection.kind ?? "dryness"] ?? detection.type;
          const above = cy > 0.5;
          return (
            <span
              key={i}
              style={{
                left: `${Math.min(Math.max(cx, 0.14), 0.86) * 100}%`,
                top: `${Math.min(Math.max(above ? cy - 0.1 : cy + 0.1, 0.05), 0.95) * 100}%`,
              }}
              className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full bg-slate-900/80 px-2 py-0.5 text-[11px] font-semibold text-white backdrop-blur-sm"
            >
              {name}
              {size ? ` · ${size}` : ""}
              {shape!.confidence === "approximate" ? " · approximate area" : ""}
            </span>
          );
        })}
      </div>

      {kindsShown.length > 0 && (
        <figcaption className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
          {kindsShown.map((type) => (
            <span
              key={type}
              className="inline-flex items-center gap-1.5 text-[12px] font-medium text-ink-soft"
            >
              <span
                aria-hidden="true"
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: STROKE[type] }}
              />
              {CHANGE_LABEL[
                (drawable.find((e) => e.detection.type === type)?.detection
                  .kind ?? "dryness") as keyof typeof CHANGE_LABEL
              ] ?? type}
            </span>
          ))}
          {drawable.some((e) => e.shape!.confidence === "approximate") && (
            <span className="text-[12px] text-ink-faint">
              Dashed outlines are approximate areas, not measured borders.
            </span>
          )}
        </figcaption>
      )}
    </figure>
  );
}
