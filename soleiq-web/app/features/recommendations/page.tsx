"use client";

/**
 * Product Recommendations — every over-the-counter suggestion the app has
 * generated for this patient, newest first, each tied to the report it was
 * frozen with and explained by the signals that triggered it.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { AuthGate } from "@/components/auth/AuthGate";
import { PatientNav } from "@/components/patient/PatientNav";
import {
  listMyRecommendations,
  type MyRecommendation,
} from "@/lib/canonicalScreenings";

const riskChip: Record<string, string> = {
  clear: "bg-teal-100 text-teal-900",
  watch: "bg-amber-100 text-amber-900",
  see_someone_soon: "bg-red-100 text-red-900",
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
    <div className="min-h-screen bg-[#f4f6f8] px-5 py-8 pb-24">
      <main className="mx-auto max-w-3xl">
        <Link
          href="/features"
          className="inline-flex items-center gap-1 text-sm font-semibold text-brand"
        >
          <ArrowLeft className="h-4 w-4" /> Features
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-slate-950">
          Product Recommendations
        </h1>

        {recommendations === null ? (
          <div className="mt-4 space-y-3">
            <div className="h-40 animate-pulse rounded-3xl border border-slate-200 bg-white" />
            <div className="h-40 animate-pulse rounded-3xl border border-slate-200 bg-white" />
          </div>
        ) : recommendations.length === 0 ? (
          <div className="mt-4 rounded-3xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
            Recommendations appear here after your next check.
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {recommendations.map((entry) => (
              <section
                key={entry.reportId}
                className="rounded-3xl border border-slate-200 bg-white p-6"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs text-slate-500">
                      {new Date(entry.createdAt).toLocaleDateString()}
                      {entry.hospitalName ? ` · ${entry.hospitalName}` : ""}
                    </p>
                    <Link
                      href={`/records/${entry.reportId}`}
                      className="mt-1 inline-block text-sm font-semibold text-brand"
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
                      className="rounded-2xl border border-slate-100 p-4"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-slate-950">
                          {product.name}
                        </p>
                        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-brand">
                          {product.helpsWith}
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-relaxed text-slate-700">
                        {product.howItHelps}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {product.reason}
                      </p>
                      {product.caution && (
                        <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900">
                          {product.caution}
                        </p>
                      )}
                      <a
                        href={product.url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand"
                      >
                        Where to find it <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  ))}
                </div>

                {entry.patientSignals.length > 0 && (
                  <details className="mt-4 rounded-2xl bg-slate-50 px-4 py-3">
                    <summary className="cursor-pointer text-xs font-semibold text-slate-600">
                      Why this was recommended
                    </summary>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-slate-600">
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

        <p className="mt-6 text-xs leading-relaxed text-slate-500">
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
