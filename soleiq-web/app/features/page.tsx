"use client";

/**
 * Features hub — a searchable tile grid linking to every patient feature.
 * Also claims any pending care-circle invites for this login (fire-and-forget)
 * so shared records light up without an extra step.
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  BadgeCheck,
  BookOpen,
  CalendarDays,
  GitCompare,
  History,
  MessageSquare,
  Search,
  ShoppingBag,
  Users,
  type LucideIcon,
} from "lucide-react";
import { AuthGate } from "@/components/auth/AuthGate";
import { BrandLogo } from "@/components/brand/Logo";
import { PatientNav } from "@/components/patient/PatientNav";
import { claimCareCircleInvites } from "@/lib/careCircle";

/**
 * Tile colors rotate through this palette IN ORDER, one hue per tile — so
 * every feature gets its own color, and a newly added tile automatically
 * takes the next unused hue (just append the tile to TILES; don't pick a
 * color by hand). Exactly one green (sage) by design.
 */
const TILE_TINTS: { gradient: string; iconColor: string }[] = [
  { gradient: "bg-gradient-to-br from-blue-50 to-blue-100", iconColor: "text-blue-600" }, // navy
  { gradient: "bg-gradient-to-br from-indigo-100 to-slate-50", iconColor: "text-indigo-600" }, // indigo
  { gradient: "bg-gradient-to-br from-amber-50 to-amber-100", iconColor: "text-amber-600" }, // honey
  { gradient: "bg-gradient-to-br from-teal-100 to-teal-50", iconColor: "text-teal-600" }, // sage — the one green
  { gradient: "bg-gradient-to-br from-red-100 to-orange-50", iconColor: "text-red-500" }, // coral
  { gradient: "bg-gradient-to-br from-violet-100 to-pink-100", iconColor: "text-violet-600" }, // plum
  { gradient: "bg-gradient-to-br from-orange-100 to-orange-50", iconColor: "text-orange-600" }, // terracotta
  { gradient: "bg-gradient-to-br from-pink-100 to-rose-100", iconColor: "text-rose-600" }, // blush
  { gradient: "bg-gradient-to-br from-sky-100 to-slate-50", iconColor: "text-sky-600" }, // sky
  { gradient: "bg-gradient-to-br from-blue-100 to-indigo-100", iconColor: "text-blue-800" }, // deep navy
  { gradient: "bg-gradient-to-br from-emerald-50 to-slate-50", iconColor: "text-emerald-600" }, // moss
  { gradient: "bg-gradient-to-br from-slate-100 to-slate-50", iconColor: "text-slate-600" }, // stone
];

interface FeatureTile {
  name: string;
  href: string;
  icon: LucideIcon;
  caption: string;
}

const TILES: FeatureTile[] = [
  {
    name: "Summary",
    href: "/features/summary",
    icon: Activity,
    caption: "Your risk status at a glance",
  },
  {
    name: "History",
    href: "/features/history",
    icon: History,
    caption: "Every past check",
  },
  {
    name: "Comparison",
    href: "/compare",
    icon: GitCompare,
    caption: "Two checks side by side",
  },
  {
    name: "Care Team",
    href: "/features/care-team",
    icon: Users,
    caption: "Who can see your results",
  },
  {
    name: "Visits",
    href: "/features/visits",
    icon: CalendarDays,
    caption: "Clinical visits and notes",
  },
  {
    name: "Product Recommendations",
    href: "/features/recommendations",
    icon: ShoppingBag,
    caption: "What was suggested and why",
  },
  {
    name: "Research",
    href: "/features/research",
    icon: BookOpen,
    caption: "Read about your condition",
  },
  {
    name: "Membership",
    href: "/features/membership",
    icon: BadgeCheck,
    caption: "Your plan and limits",
  },
  {
    name: "Feedback",
    href: "/features/feedback",
    icon: MessageSquare,
    caption: "Tell us what to improve",
  },
];

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
    <div className="min-h-screen px-5 py-8 pb-24">
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
                  className={`flex aspect-square flex-col items-center justify-between rounded-2xl border border-slate-200/60 p-4 text-center shadow-card transition duration-150 hover:shadow-lifted active:scale-[0.98] sm:aspect-auto sm:min-h-[10.5rem] ${tile.tint.gradient}`}
                >
                  <span className="font-bold text-ink">{tile.name}</span>
                  <Icon className={`h-10 w-10 ${tile.tint.iconColor}`} />
                  <span className="text-xs text-ink-soft">{tile.caption}</span>
                </Link>
              );
            })}
          </div>
        )}
      </main>
      <PatientNav active="features" />
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
