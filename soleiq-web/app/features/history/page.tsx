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
import { LocalTime } from "@/components/ui/LocalTime";
import {
  EmptyState,
  LoadingState,
  MedicalCard,
  PageHeader,
  TimelineItem,
  type MedicalTone,
} from "@/components/ui/medical";
import {
  listMyCanonicalChecks,
  type CanonicalCheck,
} from "@/lib/canonicalScreenings";
import { PatientAssistant } from "@/components/patient/PatientAssistant";

const riskChip: Record<string, string> = {
  clear: "bg-secondary-soft text-secondary",
  watch: "bg-warn-soft text-warn",
  see_someone_soon: "bg-orange-100 text-orange-700",
  urgent: "bg-urgent-soft text-urgent",
};

/** Rail colour per risk level, so the timeline reads at a glance. */
const riskTone: Record<string, MedicalTone> = {
  clear: "positive",
  watch: "attention",
  see_someone_soon: "attention",
  urgent: "urgent",
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
    <div className="min-h-screen px-5 py-8 pb-28 lg:pb-12 lg:pl-[17.25rem] lg:pr-8">
      <main className="mx-auto max-w-3xl">
        <Link
          href="/features"
          className="inline-flex min-h-[44px] items-center gap-1.5 text-[14px] font-semibold text-primary transition-colors hover:text-primary-deep"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Features
        </Link>

        <PageHeader
          className="mt-2"
          eyebrow="Foot checks"
          title="Progress"
          description="Every completed check, newest first."
        />

        {/* Filter — same two inputs, same state, same date maths. */}
        <MedicalCard className="mt-5">
          <p className="mc-section-title">Filter by date</p>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="history-from" className="field-label">
                From
              </label>
              <input
                id="history-from"
                type="date"
                value={from}
                onChange={(event) => setFrom(event.target.value)}
                className="min-h-[44px] w-full rounded-xl border border-slate-200 bg-surface-raised px-3 text-[15px] text-ink focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary-soft"
              />
            </div>
            <div>
              <label htmlFor="history-to" className="field-label">
                To
              </label>
              <input
                id="history-to"
                type="date"
                value={to}
                onChange={(event) => setTo(event.target.value)}
                className="min-h-[44px] w-full rounded-xl border border-slate-200 bg-surface-raised px-3 text-[15px] text-ink focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary-soft"
              />
            </div>
          </div>
          {checks !== null && (
            <p className="mt-3 text-[13px] text-ink-faint" aria-live="polite">
              Showing {filtered.length} of {checks.length} checks
            </p>
          )}
        </MedicalCard>

        {checks === null ? (
          <LoadingState className="mt-5" label="Loading your saved checks…" />
        ) : checks.length === 0 ? (
          <MedicalCard className="mt-5">
            <EmptyState icon={History} title="No checks yet">
              Your completed foot checks will appear here.
            </EmptyState>
          </MedicalCard>
        ) : filtered.length === 0 ? (
          <MedicalCard className="mt-5">
            <EmptyState icon={CalendarSearch} tone="attention" title="Nothing in this range">
              No checks in this date range. Try widening the filter.
            </EmptyState>
          </MedicalCard>
        ) : (
          /* A timeline rather than a stack of cards: these entries are one
             series over time, and the rail is what says so. */
          <ol className="mt-6 list-none">
            {filtered.map((check, index) => (
              <TimelineItem
                key={check.reportId}
                tone={riskTone[check.riskLevel] ?? "info"}
                last={index === filtered.length - 1}
              >
                <Link
                  href={`/records/${check.reportId}`}
                  className="block rounded-2xl border border-slate-200 bg-surface-raised p-5 shadow-card transition duration-150 hover:border-blue-200 hover:shadow-lifted active:scale-[0.995]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[13px] text-ink-faint">
                        <LocalTime value={check.startedAt} />
                      </p>
                      <p className="mt-1 text-[17px] font-bold leading-snug text-ink">
                        {check.headline ?? "Screening summary"}
                      </p>
                      {check.hospitalName && (
                        <p className="mt-1 truncate text-[13px] text-ink-faint">
                          {check.hospitalName}
                        </p>
                      )}
                    </div>
                    <span className="flex shrink-0 flex-col items-end gap-1.5">
                      <span
                        className={`whitespace-nowrap rounded-full px-2.5 py-1 text-[12px] font-semibold capitalize ${
                          riskChip[check.riskLevel] ?? "bg-slate-100 text-ink-soft"
                        }`}
                      >
                        {check.riskLevel.replaceAll("_", " ")}
                      </span>
                      {check.status !== "released" && (
                        <span className="rounded-full bg-warn-soft px-2 py-0.5 text-[11px] font-semibold text-warn">
                          Pending review
                        </span>
                      )}
                    </span>
                  </div>
                  {check.photos.length > 0 && (
                    <div className="mt-4 flex gap-2">
                      {check.photos.slice(0, 4).map((photo) => (
                        <span
                          key={photo.assetId}
                          title={
                            photo.baseline && photo.latest
                              ? "Baseline and latest"
                              : photo.baseline
                                ? "Baseline"
                                : photo.latest
                                  ? "Latest"
                                  : undefined
                          }
                          className={`block h-14 w-14 overflow-hidden rounded-lg border border-slate-200 bg-surface-sunken ${
                            photo.latest
                              ? "ring-2 ring-primary"
                              : photo.baseline
                                ? "ring-2 ring-teal-400"
                                : ""
                          }`}
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
              </TimelineItem>
            ))}
          </ol>
        )}
      </main>
      <PatientNav active="features" />
      <PatientAssistant />
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
