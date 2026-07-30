"use client";

/**
 * History — every past check, newest first, with a client-side date-range
 * filter. Each row links to the exact stored report.
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AuthGate } from "@/components/auth/AuthGate";
import { PatientNav } from "@/components/patient/PatientNav";
import {
  listMyCanonicalChecks,
  type CanonicalCheck,
} from "@/lib/canonicalScreenings";

const riskChip: Record<string, string> = {
  clear: "bg-teal-100 text-teal-900",
  watch: "bg-amber-100 text-amber-900",
  see_someone_soon: "bg-red-100 text-red-900",
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
    <div className="min-h-screen bg-[#f4f6f8] px-5 py-8 pb-24">
      <main className="mx-auto max-w-3xl">
        <Link
          href="/features"
          className="inline-flex items-center gap-1 text-sm font-semibold text-brand"
        >
          <ArrowLeft className="h-4 w-4" /> Features
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-slate-950">History</h1>

        <div className="mt-4 rounded-3xl border border-slate-200 bg-white p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">
            Filter by date
          </p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <label className="text-xs font-semibold text-slate-500">
              From
              <input
                type="date"
                value={from}
                onChange={(event) => setFrom(event.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-normal text-slate-900 focus:border-brand focus:outline-none"
              />
            </label>
            <label className="text-xs font-semibold text-slate-500">
              To
              <input
                type="date"
                value={to}
                onChange={(event) => setTo(event.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-normal text-slate-900 focus:border-brand focus:outline-none"
              />
            </label>
          </div>
          {checks !== null && (
            <p className="mt-3 text-xs text-slate-500">
              Showing {filtered.length} of {checks.length} checks
            </p>
          )}
        </div>

        {checks === null ? (
          <div className="mt-4 space-y-3">
            <div className="h-28 animate-pulse rounded-3xl border border-slate-200 bg-white" />
            <div className="h-28 animate-pulse rounded-3xl border border-slate-200 bg-white" />
            <div className="h-28 animate-pulse rounded-3xl border border-slate-200 bg-white" />
          </div>
        ) : checks.length === 0 ? (
          <div className="mt-4 rounded-3xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
            No checks yet. Your completed foot checks will appear here.
          </div>
        ) : filtered.length === 0 ? (
          <div className="mt-4 rounded-3xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
            No checks in this date range. Try widening the filter.
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {filtered.map((check) => (
              <Link
                key={check.reportId}
                href={`/records/${check.reportId}`}
                className="block rounded-3xl border border-slate-200 bg-white p-6"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs text-slate-500">
                      {new Date(check.startedAt).toLocaleString()}
                    </p>
                    <p className="mt-1 font-semibold text-slate-950">
                      {check.headline ?? "Screening summary"}
                    </p>
                    {check.hospitalName && (
                      <p className="mt-0.5 truncate text-xs text-slate-500">
                        {check.hospitalName}
                      </p>
                    )}
                  </div>
                  <span className="flex shrink-0 items-center gap-1.5">
                    {check.status !== "released" && (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
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
                        className="block h-10 w-10 overflow-hidden rounded-lg border-2 border-white bg-slate-100"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={photo.url}
                          alt={`${photo.side} foot ${photo.view}`}
                          className="h-full w-full object-cover"
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
