"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { FootSide } from "@/lib/types";

/**
 * Reference photo per view. Each of the four is a distinct image, so unlike
 * the illustration this replaced there is no mirroring — a left foot is not a
 * flipped right foot to a patient checking their own toes against the guide,
 * and on the sole view the big toe and arch genuinely swap sides.
 */
const GUIDE_PHOTO: Record<string, string> = {
  "right-top": "/guide/right-top.png",
  "right-sole": "/guide/right-sole.png",
  "left-top": "/guide/left-top.png",
  "left-sole": "/guide/left-sole.png",
};

export function PhotoGuideAnimation({
  side,
  view,
}: {
  side: FootSide;
  view: "top" | "sole";
}) {
  const reduceMotion = useReducedMotion();
  const id = `${side}-${view}`;
  const sideLabel = side === "left" ? "LEFT" : "RIGHT";

  return (
    <div className="relative h-full min-h-[260px] w-full overflow-hidden bg-surface-sunken">
      <svg
        viewBox="0 0 300 390"
        className="h-full w-full"
        role="img"
        aria-label={`Example photo showing the ${view === "top" ? "top" : "sole"} of the ${side} foot fully inside the frame`}
      >
        <defs>
          <filter id={`${id}-shadow`} x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="8" stdDeviation="8" floodColor="#1F4E79" floodOpacity="0.16" />
          </filter>
          {/* Keeps the photo inside the same rounded guide frame the dashed
              outline draws, so the reference occupies exactly the box the
              patient is being asked to fill. */}
          <clipPath id={`${id}-frame`}>
            <rect x="66" y="38" width="168" height="315" rx="28" />
          </clipPath>
        </defs>

        <rect x="0" y="0" width="300" height="390" fill="transparent" />
        <circle cx="38" cy="58" r="48" fill="#FFFFFF" opacity="0.7" />
        <circle cx="270" cy="116" r="66" fill="#FFFFFF" opacity="0.55" />

        <g clipPath={`url(#${id}-frame)`}>
          <motion.g
            initial={false}
            animate={
              reduceMotion
                ? undefined
                : { y: [0, -3, 0], rotate: [0, -0.7, 0] }
            }
            transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
            style={{ transformOrigin: "150px 210px" }}
            filter={`url(#${id}-shadow)`}
          >
            {/* `slice` fills the frame and crops the surplus background rather
                than letterboxing: the source photos are 3:4 and this box is
                taller and narrower, so the sides are what get trimmed. */}
            <image
              href={GUIDE_PHOTO[id]}
              x="66"
              y="38"
              width="168"
              height="315"
              preserveAspectRatio="xMidYMid slice"
            />
          </motion.g>
        </g>


        <motion.rect
          x="66"
          y="38"
          width="168"
          height="315"
          rx="28"
          fill="none"
          stroke="#1F4E79"
          strokeWidth="3"
          strokeDasharray="12 9"
          animate={reduceMotion ? undefined : { strokeDashoffset: [0, -42] }}
          transition={{ duration: 2.6, repeat: Infinity, ease: "linear" }}
        />

        {/* Swept by transform, not by animating y1/y2: framer-motion has no
            interpolator for those SVG attributes, so it wrote "undefined"
            into them on every frame and the browser rejected each one
            ("<line> attribute y1: Expected length"). */}
        <motion.line
          x1="83"
          x2="217"
          y1="94"
          y2="94"
          stroke="#337A62"
          strokeWidth="3"
          strokeLinecap="round"
          opacity="0.55"
          animate={reduceMotion ? undefined : { y: [0, 221, 0], opacity: [0, 0.65, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        />

        <g transform="translate(18 16)">
          <rect width="104" height="27" rx="13.5" fill="#1F4E79" />
          <text x="52" y="18" textAnchor="middle" fill="white" fontSize="11" fontWeight="700" letterSpacing="1.1">
            {sideLabel} · {view === "top" ? "TOP" : "SOLE"}
          </text>
        </g>

        <g transform="translate(211 317)">
          <motion.g
            animate={reduceMotion ? undefined : { y: [0, -5, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            <rect x="0" y="0" width="54" height="40" rx="9" fill="#FFFFFF" stroke="#1F4E79" strokeWidth="2" />
            <circle cx="27" cy="20" r="9" fill="#EDF3F9" stroke="#1F4E79" strokeWidth="2" />
            <circle cx="45" cy="9" r="2.5" fill="#337A62" />
          </motion.g>
        </g>
      </svg>

      <div className="pointer-events-none absolute inset-x-3 bottom-2 flex flex-col items-center gap-1.5">
        <span className="rounded-full bg-primary px-3 py-1 text-[11px] font-bold text-white shadow-sm">
          {side === "left" ? "Left" : "Right"} foot — {view === "top"
            ? "TOP (toenails facing the camera)"
            : "SOLE (bottom of foot facing the camera)"}
        </span>
        <div className="flex justify-center gap-1.5 text-[11px] font-semibold text-ink-soft">
          <span className="rounded-full bg-surface-raised/95 px-2 py-1 shadow-sm">Whole foot</span>
          <span className="rounded-full bg-surface-raised/95 px-2 py-1 shadow-sm">No flash</span>
          <span className="rounded-full bg-surface-raised/95 px-2 py-1 shadow-sm">Coin/card optional</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Stroke-only ghost of the same foot shape, overlaid on the live camera so
 * the patient can line their foot up with the exact silhouette the guide
 * showed. Same geometry as the animated guide — the two must never drift
 * apart, or the guide teaches one framing and the camera asks for another.
 */
export function FootGhostOverlay({
  side,
  view,
}: {
  side: FootSide;
  view: "top" | "sole";
}) {
  const mirror = side === "left";
  return (
    <svg
      viewBox="0 0 300 390"
      className="pointer-events-none absolute inset-0 h-full w-full"
      aria-hidden
    >
      <g
        transform={mirror ? "translate(300 0) scale(-1 1)" : undefined}
        fill="none"
        stroke="white"
        strokeOpacity="0.65"
        strokeWidth="3"
        strokeDasharray="10 7"
      >
        <path d="M150 337 C119 337 103 314 108 278 C112 247 110 222 104 193 C96 154 99 117 116 94 C126 81 139 75 150 75 C164 75 178 84 187 99 C201 123 203 157 196 194 C190 224 188 248 192 279 C197 314 181 337 150 337 Z" />
        <ellipse cx="116" cy="83" rx="18" ry="25" />
        <ellipse cx="140" cy="68" rx="14" ry="21" />
        <ellipse cx="161" cy="66" rx="12" ry="19" />
        <ellipse cx="181" cy="72" rx="10" ry="16" />
        <ellipse cx="197" cy="83" rx="8" ry="13" />
        {view === "top" ? (
          // Ankle/leg direction cue for the top view
          <path d="M126 316 C128 344 126 368 124 390 M176 314 C174 342 176 366 178 390" />
        ) : (
          // Heel + ball pads for the sole view
          <>
            <ellipse cx="150" cy="130" rx="44" ry="40" strokeOpacity="0.35" />
            <ellipse cx="151" cy="292" rx="36" ry="34" strokeOpacity="0.35" />
          </>
        )}
      </g>
      <text
        x="150"
        y="374"
        textAnchor="middle"
        fill="white"
        fillOpacity="0.85"
        fontSize="13"
        fontWeight="700"
      >
        {side === "left" ? "LEFT" : "RIGHT"} · {view === "top" ? "TOP" : "SOLE"}
      </text>
    </svg>
  );
}
