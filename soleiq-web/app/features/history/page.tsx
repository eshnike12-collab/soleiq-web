"use client";

/**
 * History — every past check, newest first, with a client-side date-range
 * filter. Each row links to the exact stored report.
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CalendarSearch, History } from "lucide-react";
import { AuthGate } from "@/components/auth/AuthGate";
import { PatientNav } from "@/components/patient/PatientNav";
import {
  listMyCanonicalChecks,
  type CanonicalCheck,
} from "@/lib/canonicalScreenings";

const riskChip: Record<string, string> = {
  clear: "bg-teal-100 text-teal-900",
  watch: "bg-amber-100 text-amber-900",
  see_someone_soon: "bg-orange-100 text-orange-900",
  urgent: "bg-red-200 text-red-950",
};

function HistoryContent() {
  const [checks, setChecks] = useState<CanonicalCheck[] | null>(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  useEffect(() => {
    let cancelled = false;
    void listMyCanonicalChecks()
      .then((rows) => {
        if (!cancelled) setChecks([...rows].reverse());
      })
      .catch(() => {
        if (!cancelled) setChecks([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    if (!checks) return [];
    // Interpret the date inputs in the user's local timezone: From is the
    // start of that day, To is the end of that day (inclusive).
    const fromMs = from ? new Date(`${from}T00:00:00`).getTime() : null;
    const toMs = to ? new Date(`${to}T23:59:59.999`).getTime() : null;
    return checks.filter((check) => {
      if (fromMs !== null && check.startedAt < fromMs) return false;
      if (toMs !== null && check.startedAt > toMs) return false;
      return true;
    });
  }, [checks, from, to]);

  return (
    <div className="min-h-screen px-5 py-8 pb-24">
      <main className="mx-auto max-w-3xl">
        <Link
          href="/features"
          className="inline-flex min-h-[44px] items-center gap-1 py-2 text-sm font-semibold text-primary transition-colors hover:text-primary-deep"
        >
          <ArrowLeft className="h-4 w-4" /> Features
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-ink">History</h1>

        <div className="mt-4 rounded-3xl border border-slate-200 bg-surface-raised p-6 shadow-card">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">
            Filter by date
          </p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <label className="text-xs font-semibold text-ink-soft">
              From
              <input
                type="date"
                value={from}
                onChange={(event) => setFrom(event.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-surface-raised px-3 py-2.5 text-sm font-normal text-ink focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary-soft"
              />
            </label>
            <label className="text-xs font-semibold text-ink-soft">
              To
              <input
                type="date"
                value={to}
                onChange={(event) => setTo(event.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-surface-raised px-3 py-2.5 text-sm font-normal text-ink focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary-soft"
              />
            </label>
          </div>
          {checks !== null && (
            <p className="mt-3 text-xs text-ink-faint">
              Showing {filtered.length} of {checks.length} checks
            </p>
          )}
        </div>

        {checks === null ? (
          <div className="mt-4 space-y-3">
            <div className="h-28 animate-pulse rounded-3xl border border-slate-200 bg-surface-raised" />
            <div className="h-28 animate-pulse rounded-3xl border border-slate-200 bg-surface-raised" />
            <div className="h-28 animate-pulse rounded-3xl border border-slate-200 bg-surface-raised" />
          </div>
        ) : checks.length === 0 ? (
          <div className="mt-4 flex flex-col items-center rounded-3xl border border-slate-200 bg-surface-raised p-6 text-center shadow-card">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-soft">
              <History className="h-6 w-6 text-primary" />
            </span>
            <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">
              No checks yet — your completed foot checks will appear here.
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="mt-4 flex flex-col items-center rounded-3xl border border-slate-200 bg-surface-raised p-6 text-center shadow-card">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-warn-soft">
              <CalendarSearch className="h-6 w-6 text-warn" />
            </span>
            <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">
              No checks in this date range. Try widening the filter.
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {filtered.map((check) => (
              <Link
                key={check.reportId}
                href={`/records/${check.reportId}`}
                className="block rounded-3xl border border-slate-200 bg-surface-raised p-6 shadow-card transition duration-150 hover:shadow-lifted active:scale-[0.99]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs text-ink-faint">
                      {new Date(check.startedAt).toLocaleString()}
                    </p>
                    <p className="mt-1 font-bold text-ink">
                      {check.headline ?? "Screening summary"}
                    </p>
                    {check.hospitalName && (
                      <p className="mt-0.5 truncate text-xs text-ink-faint">
                        {check.hospitalName}
                      </p>
                    )}
                  </div>
                  <span className="flex shrink-0 items-center gap-1.5">
                    {check.status !== "released" && (
                      <span className="rounded-full bg-warn-soft px-2 py-0.5 text-[11px] font-semibold text-warn">
                        Pending review
                      </span>
                    )}
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ${
                        riskChip[check.riskLevel] ?? "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {check.riskLevel.replaceAll("_", " ")}
                    </span>
                  </span>
                </div>
                {check.photos.length > 0 && (
                  <div className="mt-3 flex -space-x-2">
                    {check.photos.slice(0, 4).map((photo) => (
                      <span
                        key={photo.assetId}
                        className="block h-10 w-10 overflow-hidden rounded-xl border-2 border-white bg-surface-sunken"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={photo.url}
                          alt={`${photo.side} foot ${photo.view}`}
                          className="h-full w-full object-cover"
                          // A signed URL is minted from the stored path without
                          // checking the object exists, so a row whose file was
                          // deleted yields a URL that 404s. Drop the thumbnail
                          // rather than render a broken-image icon over an
                          // otherwise perfectly good report.
                          onError={(event) => {
                            event.currentTarget.parentElement?.remove();
                          }}
                        />
                      </span>
                    ))}
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
      </main>
      <PatientNav active="features" />
    </div>
  );
}

export default function HistoryPage() {
  return (
    <AuthGate>
      <HistoryContent />
    </AuthGate>
  );
}
