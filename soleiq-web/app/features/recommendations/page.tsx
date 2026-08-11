"use client";

/**
 * Product Recommendations — every over-the-counter suggestion the app has
 * generated for this patient, newest first, each tied to the report it was
 * frozen with and explained by the signals that triggered it.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ExternalLink, ShoppingBag } from "lucide-react";
import { AuthGate } from "@/components/auth/AuthGate";
import { PatientNav } from "@/components/patient/PatientNav";
import {
  listMyRecommendations,
  type MyRecommendation,
} from "@/lib/canonicalScreenings";

const riskChip: Record<string, string> = {
  clear: "bg-teal-100 text-teal-900",
  watch: "bg-amber-100 text-amber-900",
  see_someone_soon: "bg-orange-100 text-orange-900",
  urgent: "bg-red-200 text-red-950",
};

function RecommendationsContent() {
  const [recommendations, setRecommendations] = useState<
    MyRecommendation[] | null
  >(null);

  useEffect(() => {
    let cancelled = false;
    void listMyRecommendations()
      .then((rows) => {
        if (!cancelled) setRecommendations(rows);
      })
      .catch(() => {
        if (!cancelled) setRecommendations([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen px-5 py-8 pb-24">
      <main className="mx-auto max-w-3xl">
        <Link
          href="/features"
          className="inline-flex min-h-[44px] items-center gap-1 py-2 text-sm font-semibold text-primary transition-colors hover:text-primary-deep"
        >
          <ArrowLeft className="h-4 w-4" /> Features
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-ink">
          Product Recommendations
        </h1>

        {recommendations === null ? (
          <div className="mt-4 space-y-3">
            <div className="h-40 animate-pulse rounded-3xl border border-slate-200 bg-surface-raised" />
            <div className="h-40 animate-pulse rounded-3xl border border-slate-200 bg-surface-raised" />
          </div>
        ) : recommendations.length === 0 ? (
          <div className="mt-4 flex flex-col items-center rounded-3xl border border-slate-200 bg-surface-raised p-6 text-center shadow-card">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-soft">
              <ShoppingBag className="h-6 w-6 text-primary" />
            </span>
            <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">
              No recommendations yet — suggestions appear here after your next
              foot check.
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {recommendations.map((entry) => (
              <section
                key={entry.reportId}
                className="rounded-3xl border border-slate-200 bg-surface-raised p-6 shadow-card"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs text-ink-faint">
                      {new Date(entry.createdAt).toLocaleDateString()}
                      {entry.hospitalName ? ` · ${entry.hospitalName}` : ""}
                    </p>
                    <Link
                      href={`/records/${entry.reportId}`}
                      className="mt-1 inline-flex min-h-[44px] items-center py-1 text-sm font-bold text-primary transition-colors hover:text-primary-deep"
                    >
                      From this report →
                    </Link>
                  </div>
                  {entry.riskLevel && (
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ${
                        riskChip[entry.riskLevel] ?? "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {entry.riskLevel.replaceAll("_", " ")}
                    </span>
                  )}
                </div>

                <div className="mt-4 space-y-3">
                  {entry.products.map((product) => (
                    <div
                      key={product.id}
                      className="rounded-2xl border border-slate-100 bg-surface-raised p-4"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-bold text-ink">
                          {product.name}
                        </p>
                        <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-semibold text-primary">
                          {product.helpsWith}
                        </span>
                      </div>
                      <p className="mt-2 text-[15px] leading-relaxed text-ink">
                        {product.howItHelps}
                      </p>
                      <p className="mt-1 text-xs text-ink-faint">
                        {product.reason}
                      </p>
                      {product.caution && (
                        <p className="mt-2 rounded-xl bg-warn-soft px-3 py-2 text-xs leading-relaxed text-amber-900">
                          {product.caution}
                        </p>
                      )}
                      <a
                        href={product.url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 inline-flex min-h-[44px] items-center gap-1 py-2 text-[13px] font-bold text-primary transition-colors hover:text-primary-deep"
                      >
                        Where to find it <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  ))}
                </div>

                {entry.patientSignals.length > 0 && (
                  <details className="mt-4 rounded-2xl bg-surface-sunken px-4 py-3">
                    <summary className="cursor-pointer text-xs font-semibold text-ink-soft">
                      Why this was recommended
                    </summary>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-ink-soft">
                      {entry.patientSignals.map((signal) => (
                        <li key={signal}>{signal}</li>
                      ))}
                    </ul>
                  </details>
                )}
              </section>
            ))}
          </div>
        )}

        <p className="mt-6 text-xs leading-relaxed text-ink-faint">
          These are over-the-counter suggestions generated from your screening
          results. They are not medical advice — talk to your care team before
          changing how you care for your feet.
        </p>
      </main>
      <PatientNav active="features" />
    </div>
  );
}

export default function RecommendationsPage() {
  return (
    <AuthGate>
      <RecommendationsContent />
    </AuthGate>
  );
}
