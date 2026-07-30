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
  Search,
  ShoppingBag,
  Users,
  type LucideIcon,
} from "lucide-react";
import { AuthGate } from "@/components/auth/AuthGate";
import { PatientNav } from "@/components/patient/PatientNav";
import { claimCareCircleInvites } from "@/lib/careCircle";

interface FeatureTile {
  name: string;
  href: string;
  icon: LucideIcon;
  caption: string;
  gradient: string;
  iconColor: string;
}

const TILES: FeatureTile[] = [
  {
    name: "Summary",
    href: "/features/summary",
    icon: Activity,
    caption: "Your risk status at a glance",
    gradient: "bg-gradient-to-br from-indigo-100 to-pink-100",
    iconColor: "text-indigo-600",
  },
  {
    name: "History",
    href: "/features/history",
    icon: History,
    caption: "Every past check",
    gradient: "bg-gradient-to-br from-sky-100 to-violet-100",
    iconColor: "text-sky-600",
  },
  {
    name: "Comparison",
    href: "/compare",
    icon: GitCompare,
    caption: "Two checks side by side",
    gradient: "bg-gradient-to-br from-amber-100 to-rose-100",
    iconColor: "text-amber-600",
  },
  {
    name: "Care Team",
    href: "/features/care-team",
    icon: Users,
    caption: "Who can see your results",
    gradient: "bg-gradient-to-br from-teal-100 to-emerald-100",
    iconColor: "text-teal-600",
  },
  {
    name: "Visits",
    href: "/features/visits",
    icon: CalendarDays,
    caption: "Clinical visits and notes",
    gradient: "bg-gradient-to-br from-rose-100 to-orange-100",
    iconColor: "text-rose-600",
  },
  {
    name: "Product Recommendations",
    href: "/features/recommendations",
    icon: ShoppingBag,
    caption: "What was suggested and why",
    gradient: "bg-gradient-to-br from-violet-100 to-sky-100",
    iconColor: "text-violet-600",
  },
  {
    name: "Research",
    href: "/features/research",
    icon: BookOpen,
    caption: "Read about your condition",
    gradient: "bg-gradient-to-br from-emerald-100 to-lime-100",
    iconColor: "text-emerald-600",
  },
  {
    name: "Membership",
    href: "/features/membership",
    icon: BadgeCheck,
    caption: "Your plan and limits",
    gradient: "bg-gradient-to-br from-fuchsia-100 to-indigo-100",
    iconColor: "text-fuchsia-600",
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
    if (!needle) return TILES;
    return TILES.filter((tile) => tile.name.toLowerCase().includes(needle));
  }, [query]);

  return (
    <div className="min-h-screen bg-[#f4f6f8] px-5 py-8 pb-24">
      <main className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-semibold text-slate-950">Features</h1>
        <div className="relative mt-4">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search features…"
            className="w-full rounded-full border border-slate-200 bg-white py-2.5 pl-11 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand focus:outline-none"
          />
        </div>
        {visible.length === 0 ? (
          <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
            No features match &ldquo;{query.trim()}&rdquo;.
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {visible.map((tile) => {
              const Icon = tile.icon;
              return (
                <Link
                  key={tile.href}
                  href={tile.href}
                  className={`flex aspect-square flex-col items-center justify-between rounded-2xl p-4 text-center sm:aspect-auto sm:min-h-[10.5rem] ${tile.gradient}`}
                >
                  <span className="font-semibold text-slate-900">{tile.name}</span>
                  <Icon className={`h-10 w-10 ${tile.iconColor}`} />
                  <span className="text-[11px] text-slate-600">{tile.caption}</span>
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
