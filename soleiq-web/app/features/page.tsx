"use client";

/**
 * Features hub — a searchable tile grid linking to every patient feature.
 * Also claims any pending care-circle invites for this login (fire-and-forget)
 * so shared records light up without an extra step.
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { AuthGate } from "@/components/auth/AuthGate";
import { BrandLogo } from "@/components/brand/Logo";
import { PatientNav } from "@/components/patient/PatientNav";
import { claimCareCircleInvites } from "@/lib/careCircle";
import {
  PATIENT_FEATURES,
  type PatientFeature,
} from "@/components/patient/patientFeatures";
import { PatientAssistant } from "@/components/patient/PatientAssistant";

/**
 * Tile tints rotate through this palette IN ORDER, one per tile — so every
 * feature gets its own colour, and a newly added tile automatically takes the
 * next unused hue (append to TILES; don't pick a colour by hand).
 *
 * Flat tints, not gradients. Twelve gradients stacked in a grid is the single
 * loudest thing a screen can do, and this is a medical index — the colour is
 * here to help someone find the tile they used last time, not to decorate.
 */
const TILE_TINTS: { surface: string; iconColor: string }[] = [
  { surface: "bg-blue-100", iconColor: "text-blue-700" },
  { surface: "bg-indigo-100", iconColor: "text-indigo-600" },
  { surface: "bg-amber-50", iconColor: "text-amber-600" },
  { surface: "bg-teal-100", iconColor: "text-teal-600" }, // the one green
  { surface: "bg-red-100", iconColor: "text-red-600" },
  { surface: "bg-violet-100", iconColor: "text-violet-600" },
  { surface: "bg-orange-50", iconColor: "text-orange-600" },
  { surface: "bg-pink-100", iconColor: "text-rose-600" },
  { surface: "bg-sky-100", iconColor: "text-sky-600" },
  { surface: "bg-blue-50", iconColor: "text-blue-800" },
  { surface: "bg-emerald-50", iconColor: "text-emerald-700" },
  { surface: "bg-slate-100", iconColor: "text-slate-600" },
];

/* The list itself lives in components/patient/patientFeatures.ts so this grid
   and the sidebar's dropdown cannot drift apart — they had already, with 3D
   Scan and Privacy present in one and missing from the other. */
type FeatureTile = PatientFeature;
const TILES: FeatureTile[] = PATIENT_FEATURES;

function FeaturesContent() {
  const [query, setQuery] = useState("");

  useEffect(() => {
    // Fire-and-forget: link any pending care-circle invites for this login.
    void claimCareCircleInvites().catch(() => {});
  }, []);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const tinted = TILES.map((tile, index) => ({
      ...tile,
      tint: TILE_TINTS[index % TILE_TINTS.length],
    }));
    if (!needle) return tinted;
    return tinted.filter((tile) => tile.name.toLowerCase().includes(needle));
  }, [query]);

  return (
    <div className="min-h-screen px-5 py-8 pb-24 lg:pb-12 lg:pl-[17.25rem] lg:pr-8">
      <main className="mx-auto max-w-3xl">
        <div className="flex items-center gap-3">
          <BrandLogo size={44} />
          <h1 className="text-3xl font-bold text-ink">Features</h1>
        </div>
        <div className="relative mt-4">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search features…"
            className="w-full rounded-full border border-slate-200 bg-surface-raised py-3 pl-11 pr-4 text-[15px] text-ink shadow-card placeholder:text-ink-faint focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary-soft"
          />
        </div>
        {visible.length === 0 ? (
          <div className="mt-6 flex flex-col items-center rounded-3xl border border-slate-200 bg-surface-raised p-6 text-center shadow-card">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-soft">
              <Search className="h-6 w-6 text-primary" />
            </span>
            <p className="mt-3 text-[15px] text-ink-soft">
              No features match &ldquo;{query.trim()}&rdquo;. Try a shorter word.
            </p>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {visible.map((tile) => {
              const Icon = tile.icon;
              return (
                <Link
                  key={tile.href}
                  href={tile.href}
                  /* White card, tinted icon. The colour identifies the tile
                     without turning the whole grid into a swatch book, and
                     dark text on white is the readable pairing. */
                  className="flex min-h-[9.5rem] flex-col items-start gap-3 rounded-2xl border border-slate-200 bg-surface-raised p-4 text-left shadow-card transition duration-150 hover:border-blue-200 hover:shadow-lifted active:scale-[0.98] sm:min-h-[10.5rem] sm:p-5"
                >
                  <span
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tile.tint.surface}`}
                  >
                    <Icon
                      className={`h-[22px] w-[22px] ${tile.tint.iconColor}`}
                      aria-hidden="true"
                    />
                  </span>
                  <span className="mt-auto block text-[16px] font-bold leading-snug text-ink">
                    {tile.name}
                  </span>
                  <span className="block text-[13px] leading-snug text-ink-soft">
                    {tile.caption}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </main>
      <PatientNav active="features" />
      <PatientAssistant />
    </div>
  );
}

export default function FeaturesPage() {
  return (
    <AuthGate>
      <FeaturesContent />
    </AuthGate>
  );
}
