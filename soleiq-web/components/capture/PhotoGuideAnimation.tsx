"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { FootSide } from "@/lib/types";

export function PhotoGuideAnimation({
  side,
  view,
}: {
  side: FootSide;
  view: "top" | "sole";
}) {
  const reduceMotion = useReducedMotion();
  const id = `${side}-${view}`;
  const mirror = side === "left";
  const sideLabel = side === "left" ? "LEFT" : "RIGHT";

  return (
    <div className="relative h-full min-h-[260px] w-full overflow-hidden bg-gradient-to-b from-blue-50 to-white">
      <svg
        viewBox="0 0 300 390"
        className="h-full w-full"
        role="img"
        aria-label={`Example photo showing the ${view === "top" ? "top" : "sole"} of the ${side} foot fully inside the frame`}
      >
        <defs>
          <linearGradient id={`${id}-skin`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#E9C7A7" />
            <stop offset="1" stopColor="#C99670" />
          </linearGradient>
          <linearGradient id={`${id}-sole`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#F0D0B2" />
            <stop offset="1" stopColor="#D5A27B" />
          </linearGradient>
          <filter id={`${id}-shadow`} x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="8" stdDeviation="8" floodColor="#1F4E79" floodOpacity="0.16" />
          </filter>
        </defs>

        <rect x="0" y="0" width="300" height="390" fill="transparent" />
        <circle cx="38" cy="58" r="48" fill="#FFFFFF" opacity="0.7" />
        <circle cx="270" cy="116" r="66" fill="#FFFFFF" opacity="0.55" />

        <g transform={mirror ? "translate(300 0) scale(-1 1)" : undefined}>
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
            <path
              d="M150 337 C119 337 103 314 108 278 C112 247 110 222 104 193 C96 154 99 117 116 94 C126 81 139 75 150 75 C164 75 178 84 187 99 C201 123 203 157 196 194 C190 224 188 248 192 279 C197 314 181 337 150 337 Z"
              fill={`url(#${id}-${view === "top" ? "skin" : "sole"})`}
              stroke="#A96F4D"
              strokeWidth="2"
            />
            <ellipse cx="116" cy="83" rx="18" ry="25" fill={`url(#${id}-${view === "top" ? "skin" : "sole"})`} stroke="#A96F4D" strokeWidth="2" />
            <ellipse cx="140" cy="68" rx="14" ry="21" fill={`url(#${id}-${view === "top" ? "skin" : "sole"})`} stroke="#A96F4D" strokeWidth="2" />
            <ellipse cx="161" cy="66" rx="12" ry="19" fill={`url(#${id}-${view === "top" ? "skin" : "sole"})`} stroke="#A96F4D" strokeWidth="2" />
            <ellipse cx="181" cy="72" rx="10" ry="16" fill={`url(#${id}-${view === "top" ? "skin" : "sole"})`} stroke="#A96F4D" strokeWidth="2" />
            <ellipse cx="197" cy="83" rx="8" ry="13" fill={`url(#${id}-${view === "top" ? "skin" : "sole"})`} stroke="#A96F4D" strokeWidth="2" />

            {view === "top" ? (
              <>
                <path d="M124 121 C145 109 174 111 191 128" fill="none" stroke="#B77E61" strokeWidth="2" opacity="0.6" />
                <path d="M139 130 C145 174 139 211 132 247" fill="none" stroke="#8FA6B8" strokeWidth="1.8" opacity="0.65" />
                <path d="M162 126 C166 165 174 199 177 237" fill="none" stroke="#8FA6B8" strokeWidth="1.8" opacity="0.55" />
                <path d="M151 146 C143 166 133 177 124 183" fill="none" stroke="#8FA6B8" strokeWidth="1.4" opacity="0.5" />
                <ellipse cx="114" cy="75" rx="10" ry="9" fill="#F4D9CA" opacity="0.85" />
                <ellipse cx="139" cy="62" rx="7" ry="7" fill="#F4D9CA" opacity="0.85" />
                <ellipse cx="160" cy="60" rx="6" ry="6" fill="#F4D9CA" opacity="0.85" />
                <ellipse cx="180" cy="67" rx="5" ry="5" fill="#F4D9CA" opacity="0.85" />
              </>
            ) : (
              <>
                <ellipse cx="150" cy="128" rx="43" ry="37" fill="#D4916A" opacity="0.34" />
                <ellipse cx="151" cy="290" rx="34" ry="31" fill="#C9805B" opacity="0.32" />
                <path d="M121 170 C143 181 143 236 124 252" fill="none" stroke="#B87859" strokeWidth="3" opacity="0.45" />
                <path d="M175 170 C163 195 164 230 180 252" fill="none" stroke="#B87859" strokeWidth="2" opacity="0.35" />
                <path d="M126 139 C143 151 168 151 187 138" fill="none" stroke="#B87859" strokeWidth="2" opacity="0.35" />
                <path d="M132 275 C145 266 162 266 174 276" fill="none" stroke="#B87859" strokeWidth="2" opacity="0.35" />
              </>
            )}
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

        <motion.line
          x1="83"
          x2="217"
          y1="100"
          y2="100"
          stroke="#0F6E56"
          strokeWidth="3"
          strokeLinecap="round"
          opacity="0.55"
          animate={reduceMotion ? undefined : { y1: [94, 315, 94], y2: [94, 315, 94], opacity: [0, 0.65, 0] }}
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
            <circle cx="27" cy="20" r="9" fill="#E6F1FB" stroke="#1F4E79" strokeWidth="2" />
            <circle cx="45" cy="9" r="2.5" fill="#0F6E56" />
          </motion.g>
        </g>
      </svg>

      <div className="pointer-events-none absolute inset-x-3 bottom-2 flex justify-center gap-1.5 text-[10px] font-medium text-warmGray-600">
        <span className="rounded-full bg-white/90 px-2 py-1 shadow-sm">Whole foot</span>
        <span className="rounded-full bg-white/90 px-2 py-1 shadow-sm">No flash</span>
        <span className="rounded-full bg-white/90 px-2 py-1 shadow-sm">Coin/card optional</span>
      </div>
    </div>
  );
}
