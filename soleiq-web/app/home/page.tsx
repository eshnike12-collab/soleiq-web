"use client";

/**
 * Patient dashboard — the home base after login and after saving a check.
 * Shows the latest saved result, the visit history, and the main actions:
 * start a new visit, open results, share with the doctor. Sign out lives
 * here too. Doctors/admins who land here get links to their own consoles;
 * RLS decides what anyone can actually read.
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Camera,
  ChevronRight,
  FolderOpen,
  Loader2,
  LogOut,
  ShieldCheck,
  Stethoscope,
} from "lucide-react";
import { AuthGate } from "@/components/auth/AuthGate";
import { ShareWithDoctorDialog } from "@/components/share/ShareWithDoctorDialog";
import { useAuth, signOut } from "@/lib/auth";
import { listMyPriorVisits } from "@/lib/db";
import { useSoleiqStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { ScreeningLevel, Visit } from "@/lib/types";

const LEVEL_CHIP: Record<ScreeningLevel, { label: string; className: string }> = {
  clear: { label: "Looks clear", className: "bg-teal-50 text-teal-800" },
  watch: { label: "Watch this", className: "bg-amber-50 text-amber-800" },
  see_someone_soon: { label: "See someone soon", className: "bg-orange-100 text-orange-900" },
  urgent: { label: "Urgent", className: "bg-risk-high text-white" },
};

const fmtDate = (ts: number) =>
  new Date(ts).toLocaleDateString(undefined, { dateStyle: "medium" });

function DashboardContent() {
  const { profile } = useAuth();
  const router = useRouter();
  const setStep = useSoleiqStore((s) => s.setStep);
  const [visits, setVisits] = useState<Visit[] | null>(null);
  const [shareOpen, setShareOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    listMyPriorVisits().then((rows) => {
      if (!cancelled) setVisits(rows);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // listMyPriorVisits returns oldest-first; the dashboard reads newest-first.
  const ordered = useMemo(() => (visits ? [...visits].reverse() : null), [visits]);
  const latest = ordered?.find((visit) => visit.result?.screening) ?? ordered?.[0] ?? null;
  const latestLevel = latest?.result?.screening?.overall.level;

  const startNewVisit = () => {
    setStep(0);
    router.push("/");
  };

  return (
    <div className="mx-auto min-h-screen w-full max-w-md px-4 py-6">
      {/* Header */}
      <header className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-brand to-blue-800 text-sm font-bold text-white">
            SQ
          </span>
          <div>
            <h1 className="text-lg font-semibold leading-tight text-warmGray-800">
              My dashboard
            </h1>
            <p className="text-[11px] text-warmGray-600">
              {profile?.email ?? "Signed in"}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void signOut().then(() => router.replace("/login"))}
          className="inline-flex items-center gap-1.5 rounded-xl border border-warmGray-100 bg-white px-3 py-2 text-xs font-semibold text-warmGray-800"
        >
          <LogOut className="h-3.5 w-3.5" /> Sign out
        </button>
      </header>

      {/* Latest result */}
      <section className="rounded-2xl border border-warmGray-100 bg-white p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-warmGray-600">
          Latest check
        </p>
        {visits === null ? (
          <div className="flex items-center gap-2 py-4 text-sm text-warmGray-600">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : latest?.result?.screening ? (
          <>
            <div className="mt-2 flex items-center justify-between gap-2">
              <span
                className={cn(
                  "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
                  LEVEL_CHIP[latestLevel ?? "clear"].className
                )}
              >
                {LEVEL_CHIP[latestLevel ?? "clear"].label}
              </span>
              <span className="text-[11px] text-warmGray-600">{fmtDate(latest.startedAt)}</span>
            </div>
            <p className="mt-2 text-sm leading-snug text-warmGray-800">
              {latest.result.screening.overall.headline}
            </p>
            <Link
              href="/results"
              className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand"
            >
              View full result <ChevronRight className="h-4 w-4" />
            </Link>
          </>
        ) : (
          <p className="py-3 text-sm text-warmGray-600">
            No saved checks yet — your first one will appear here.
          </p>
        )}
      </section>

      {/* Primary action */}
      <button
        type="button"
        onClick={startNewVisit}
        className="mt-3 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-brand text-sm font-semibold text-white"
      >
        <Camera className="h-4 w-4" /> Start a new foot check
      </button>

      {/* Secondary actions */}
      <div className="mt-2 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setShareOpen(true)}
          className="inline-flex h-11 items-center justify-center gap-1.5 rounded-2xl border border-warmGray-100 bg-white text-xs font-semibold text-warmGray-800"
        >
          <Stethoscope className="h-3.5 w-3.5" /> Share with doctor
        </button>
        <Link
          href="/results"
          className="inline-flex h-11 items-center justify-center gap-1.5 rounded-2xl border border-warmGray-100 bg-white text-xs font-semibold text-warmGray-800"
        >
          <FolderOpen className="h-3.5 w-3.5" /> Open results
        </Link>
      </div>

      {/* Staff shortcuts */}
      {(profile?.role === "admin" || profile?.role === "doctor") && (
        <div className="mt-2 grid gap-2">
          {profile.role === "admin" && (
            <Link
              href="/admin"
              className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-2xl bg-warmGray-800 text-xs font-semibold text-white"
            >
              <ShieldCheck className="h-3.5 w-3.5" /> Admin console
            </Link>
          )}
          <Link
            href="/dashboard"
            className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-2xl border border-warmGray-100 bg-white text-xs font-semibold text-warmGray-800"
          >
            <Stethoscope className="h-3.5 w-3.5" /> Doctor dashboard
          </Link>
        </div>
      )}

      {/* History */}
      <section className="mt-5">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-warmGray-600">
          My timeline
        </p>
        {visits === null ? null : ordered && ordered.length > 0 ? (
          <div className="overflow-hidden rounded-2xl border border-warmGray-100 bg-white">
            {ordered.map((visit, index) => {
              const level = visit.result?.screening?.overall.level;
              return (
                <div
                  key={visit.id}
                  className={cn(
                    "flex items-center justify-between gap-2 p-3",
                    index > 0 && "border-t border-warmGray-50"
                  )}
                >
                  <div>
                    <p className="text-sm font-medium text-warmGray-800">
                      {fmtDate(visit.startedAt)}
                    </p>
                    <p className="text-[11px] text-warmGray-600">
                      {visit.images.length} photo{visit.images.length === 1 ? "" : "s"}
                    </p>
                  </div>
                  {level ? (
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold",
                        LEVEL_CHIP[level].className
                      )}
                    >
                      {LEVEL_CHIP[level].label}
                    </span>
                  ) : (
                    <span className="text-[11px] text-warmGray-600">no result</span>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="rounded-2xl border border-warmGray-100 bg-white p-3 text-sm text-warmGray-600">
            Checks you save will show up here so you can track changes over time.
          </p>
        )}
      </section>

      <p className="mt-6 text-center text-[10px] italic text-warmGray-600">
        SoleIQ is a wellness monitoring tool and is not a substitute for
        professional medical diagnosis.
      </p>

      <ShareWithDoctorDialog open={shareOpen} onClose={() => setShareOpen(false)} />
    </div>
  );
}

export default function HomePage() {
  return (
    <AuthGate>
      <DashboardContent />
    </AuthGate>
  );
}
