"use client";

/**
 * One shared report, rendered for a care-circle viewer. Family/caregiver
 * grants get exactly the patient view; clinician grants additionally get
 * the clinical-detail sections. The clinical summary is only ever FETCHED
 * for clinician grants (see getSharedReport) — role comes from the viewer's
 * grant row, and RLS decides whether any of it is readable at all.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { AuthGate } from "@/components/auth/AuthGate";
import { RecommendationBlock } from "@/components/result/RecommendationBlock";
import {
  SharedPatient,
  SharedReportDetail,
  getSharedReport,
  listSharedWithMe,
} from "@/lib/careCircle";

// Soft-tinted summary panel per risk level (sage / honey / coral).
const RISK_PANEL: Record<string, string> = {
  clear: "bg-secondary-soft text-teal-800",
  watch: "bg-warn-soft text-warn",
  see_someone_soon: "bg-orange-50 text-orange-700",
  urgent: "bg-urgent-soft text-urgent",
};

function SharedReportContent() {
  const params = useParams<{ patientId: string; reportId: string }>();
  const patientId = params?.patientId ?? "";
  const reportId = params?.reportId ?? "";
  const [share, setShare] = useState<SharedPatient | null | undefined>(undefined);
  const [report, setReport] = useState<SharedReportDetail | null>(null);

  useEffect(() => {
    if (!patientId || !reportId) return;
    (async () => {
      const shares = await listSharedWithMe();
      const match = shares.find((s) => s.patientId === patientId) ?? null;
      setShare(match);
      if (match) setReport(await getSharedReport(reportId, match.role));
    })();
  }, [patientId, reportId]);

  if (share === undefined || (share && !report)) {
    return (
      <div className="flex min-h-screen items-center justify-center gap-2 bg-surface text-[15px] text-ink-soft">
        <Loader2 className="h-5 w-5 animate-spin text-primary" /> Loading report…
      </div>
    );
  }
  if (share === null || !report) {
    return (
      <div className="min-h-screen bg-surface px-5 py-8">
        <main className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-surface-raised p-7 text-center shadow-card">
          <h1 className="text-xl font-bold text-ink">Report unavailable</h1>
          <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">
            The report doesn&apos;t exist or access was revoked.
          </p>
          <Link
            href="/features/care-team"
            className="mt-3 inline-flex min-h-[44px] items-center py-2 text-sm font-bold text-primary transition-colors hover:text-primary-deep"
          >
            ← Back to Care Team
          </Link>
        </main>
      </div>
    );
  }

  const summary = report.patientSummary ?? {};
  const clinical = report.clinicalSummary;
  const isClinician = share.role === "clinician";

  return (
    <div className="min-h-screen bg-surface px-5 py-8 pb-24">
      <main className="mx-auto max-w-3xl">
        <Link
          href={`/shared/${patientId}`}
          className="inline-flex min-h-[44px] items-center py-2 text-sm font-semibold text-primary transition-colors hover:text-primary-deep"
        >
          ← {share.patientName}&apos;s checks
        </Link>
        <article className="mt-4 rounded-3xl border border-slate-200 bg-surface-raised p-7 shadow-card">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">
            Shared report · {isClinician ? "clinical view" : "patient view"}
          </p>
          <h1 className="mt-2 text-2xl font-bold text-ink">
            {report.hospitalName ?? "Foot check"}
          </h1>
          <p className="mt-1 text-xs text-ink-faint">
            {new Date(report.date).toLocaleString()}
            {report.status !== "released" ? " · pending clinician review" : ""}
          </p>

          <div className={`mt-6 rounded-2xl p-5 ${RISK_PANEL[report.riskLevel] ?? "bg-primary-soft text-primary"}`}>
            <p className="text-xs font-bold uppercase tracking-wide">
              {report.riskLevel.replaceAll("_", " ")}
            </p>
            <p className="mt-2 text-lg font-bold text-ink">
              {report.headline ?? "Screening summary"}
            </p>
          </div>

          {report.photos.length > 0 && (
            <section className="mt-6">
              <h2 className="font-bold text-ink">Photos from this check</h2>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {report.photos.map((photo) => (
                  <a
                    key={photo.assetId}
                    href={photo.url}
                    target="_blank"
                    rel="noreferrer"
                    className="relative block overflow-hidden rounded-2xl bg-surface-sunken"
                  >
                    <div className="aspect-square">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photo.url}
                        alt={`${photo.side} foot ${photo.view}`}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <span className="absolute inset-x-0 bottom-0 bg-black/50 px-1.5 py-1 text-center text-[10px] font-semibold uppercase text-white">
                      {photo.side} · {photo.view}
                    </span>
                  </a>
                ))}
              </div>
            </section>
          )}

          {(summary?.findings ?? []).map((finding: any, index: number) => (
            <section key={index} className="mt-4 rounded-2xl border border-slate-100 p-5">
              <h2 className="font-bold text-ink">{finding.what_we_saw}</h2>
              <p className="mt-1 text-xs text-ink-faint">{finding.location_plain}</p>
              <p className="mt-2 text-[15px] leading-relaxed text-ink">
                {finding.why_it_matters}
              </p>
            </section>
          ))}

          {(summary?.what_to_do ?? []).length > 0 && (
            <section className="mt-6">
              <h2 className="font-bold text-ink">What to do next</h2>
              <ul className="mt-2 list-disc space-y-2 pl-5 text-[15px] text-ink">
                {(summary?.what_to_do ?? []).map((item: string) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          )}

          {isClinician && clinical && (
            <section className="mt-6 rounded-2xl border border-indigo-100 bg-indigo-50/50 p-5">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-indigo-700">
                Clinical detail
              </p>
              {(clinical?.findings ?? []).map((finding: any, index: number) => (
                <div key={index} className="mt-3 rounded-2xl border border-indigo-100 bg-surface-raised p-4">
                  <p className="text-sm font-bold text-ink">
                    {finding.what_we_saw}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-faint">
                    {[finding.foot && `${finding.foot} foot`, finding.surface, finding.concern && `${finding.concern} concern`]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  {finding.why_it_matters && (
                    <p className="mt-1.5 text-[15px] leading-relaxed text-ink">
                      {finding.why_it_matters}
                    </p>
                  )}
                </div>
              ))}
              {(clinical?.personal_notes ?? []).length > 0 && (
                <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-ink-soft">
                  {(clinical?.personal_notes ?? []).map((note: string) => (
                    <li key={note}>{note}</li>
                  ))}
                </ul>
              )}
            </section>
          )}

          <RecommendationBlock
            recommendation={report.recommendation}
            audience={isClinician ? "clinician" : "patient"}
          />

          <p className="mt-6 text-xs leading-relaxed text-ink-faint">
            {summary?.limits || "Photos cannot show problems beneath the skin."}{" "}
            This is screening support, not a diagnosis.
          </p>
        </article>
      </main>
    </div>
  );
}

export default function SharedReportPage() {
  return (
    <AuthGate>
      <SharedReportContent />
    </AuthGate>
  );
}
