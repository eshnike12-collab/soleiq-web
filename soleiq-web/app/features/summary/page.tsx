"use client";

/**
 * Summary — the patient's current risk status at a glance: latest check as a
 * color-coded hero card plus quick stats across all checks.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Camera } from "lucide-react";
import { AuthGate } from "@/components/auth/AuthGate";
import { PatientNav } from "@/components/patient/PatientNav";
import {
  listMyCanonicalChecks,
  type CanonicalCheck,
} from "@/lib/canonicalScreenings";

const riskHero: Record<string, string> = {
  clear: "bg-teal-50 border-teal-200",
  watch: "bg-amber-50 border-amber-200",
  see_someone_soon: "bg-orange-50 border-orange-100",
  urgent: "bg-red-100 border-red-200",
};

const riskChip: Record<string, string> = {
  clear: "bg-teal-100 text-teal-900",
  watch: "bg-amber-100 text-amber-900",
  see_someone_soon: "bg-orange-100 text-orange-900",
  urgent: "bg-red-200 text-red-950",
};

function SummaryContent() {
  const [checks, setChecks] = useState<CanonicalCheck[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    void listMyCanonicalChecks()
      .then((rows) => {
        if (!cancelled) setChecks(rows);
      })
      .catch(() => {
        if (!cancelled) setChecks([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const latest = checks && checks.length > 0 ? checks[checks.length - 1] : null;

  return (
    <div className="min-h-screen px-5 py-8 pb-24">
      <main className="mx-auto max-w-3xl">
        <Link
          href="/features"
          className="inline-flex min-h-[44px] items-center gap-1 py-2 text-sm font-semibold text-primary transition-colors hover:text-primary-deep"
        >
          <ArrowLeft className="h-4 w-4" /> Features
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-ink">Summary</h1>

        {checks === null ? (
          <div className="mt-4 space-y-4">
            <div className="h-64 animate-pulse rounded-3xl border border-slate-200 bg-surface-raised" />
            <div className="h-24 animate-pulse rounded-3xl border border-slate-200 bg-surface-raised" />
          </div>
        ) : latest === null ? (
          <div className="mt-4 flex flex-col items-center rounded-3xl border border-slate-200 bg-surface-raised p-6 text-center shadow-card">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-soft">
              <Camera className="h-7 w-7 text-primary" />
            </span>
            <p className="mt-3 text-xs font-bold uppercase tracking-[0.16em] text-primary">
              No checks yet
            </p>
            <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">
              Once you complete your first foot check, your risk status and
              photos will appear here.
            </p>
            <Link
              href="/"
              className="mt-5 inline-flex min-h-[44px] items-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-bold text-white shadow-button transition-transform duration-150 active:scale-[0.98]"
            >
              <Camera className="h-4 w-4" /> Start a foot check
            </Link>
          </div>
        ) : (
          <>
            <section
              className={`mt-4 rounded-3xl border p-6 shadow-card ${
                riskHero[latest.riskLevel] ?? "bg-surface-raised border-slate-200"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">
                  Current status
                </p>
                <span className="flex shrink-0 items-center gap-1.5">
                  {latest.status !== "released" && (
                    <span className="rounded-full bg-warn-soft px-2.5 py-1 text-xs font-semibold text-warn">
                      Pending review
                    </span>
                  )}
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                      riskChip[latest.riskLevel] ?? "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {latest.riskLevel.replaceAll("_", " ")}
                  </span>
                </span>
              </div>
              <h2 className="mt-3 text-xl font-bold text-ink">
                {latest.headline ?? "Your latest screening summary is ready."}
              </h2>
              <p className="mt-1 text-xs text-ink-faint">
                {new Date(latest.startedAt).toLocaleString()}
                {latest.hospitalName ? ` · ${latest.hospitalName}` : ""}
              </p>
              {latest.photos.length > 0 && (
                <div className="mt-4 grid grid-cols-4 gap-2">
                  {latest.photos.slice(0, 4).map((photo) => (
                    <span
                      key={photo.assetId}
                      className="relative block overflow-hidden rounded-2xl bg-surface-sunken"
                    >
                      <span className="block aspect-square">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={photo.url}
                          alt={`${photo.side} foot ${photo.view}`}
                          className="h-full w-full object-cover"
                        />
                      </span>
                      <span className="absolute inset-x-0 bottom-0 bg-black/45 px-1 py-0.5 text-center text-[9px] font-semibold uppercase text-white">
                        {photo.side === "left" ? "L" : "R"} · {photo.view}
                      </span>
                    </span>
                  ))}
                </div>
              )}
              <Link
                href={`/records/${latest.reportId}`}
                className="mt-3 inline-flex min-h-[44px] items-center gap-1 py-2 text-sm font-bold text-primary transition-colors hover:text-primary-deep"
              >
                View full report <ArrowRight className="h-4 w-4" />
              </Link>
            </section>

            <section className="mt-4 grid grid-cols-3 gap-3">
              <div className="rounded-2xl border border-slate-200 bg-surface-raised p-4 shadow-card">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
                  Checks
                </p>
                <p className="mt-1 text-2xl font-bold text-ink">
                  {checks.length}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-surface-raised p-4 shadow-card">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
                  Last check
                </p>
                <p className="mt-1 text-sm font-bold text-ink">
                  {new Date(latest.startedAt).toLocaleDateString()}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-surface-raised p-4 shadow-card">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
                  Risk
                </p>
                <p className="mt-1 text-sm font-bold capitalize text-ink">
                  {latest.riskLevel.replaceAll("_", " ")}
                </p>
              </div>
            </section>
          </>
        )}
      </main>
      <PatientNav active="features" />
    </div>
  );
}

export default function SummaryPage() {
  return (
    <AuthGate>
      <SummaryContent />
    </AuthGate>
  );
}
