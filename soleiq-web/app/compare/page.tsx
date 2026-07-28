"use client";

/**
 * Patient Comparison tab — side-by-side view of any two past assessments,
 * with risk change, finding diffs, and paired photos. Data comes from the
 * patient's own stored reports (RLS-scoped); photos are short-lived signed
 * URLs.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { AuthGate } from "@/components/auth/AuthGate";
import {
  ComparisonView,
  type ComparableCheck,
} from "@/components/compare/ComparisonView";
import { listMyCanonicalChecks } from "@/lib/canonicalScreenings";

function CompareContent() {
  const [checks, setChecks] = useState<ComparableCheck[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    void listMyCanonicalChecks()
      .then((rows) => {
        if (cancelled) return;
        setChecks(
          rows.map((check) => ({
            id: check.reportId,
            date: check.startedAt,
            riskLevel: check.riskLevel,
            status: check.status,
            headline: check.headline,
            findings: check.findings,
            looksGood: check.looksGood,
            notes: check.notes,
            photos: check.photos.map((photo) => ({
              side: photo.side,
              view: photo.view,
              url: photo.url,
            })),
          }))
        );
      })
      .catch(() => setChecks([]));
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#f4f6f8]">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-4">
          <div>
            <Link
              href="/home"
              className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-brand"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> My dashboard
            </Link>
            <h1 className="mt-0.5 text-lg font-semibold text-slate-950">
              Compare your checks
            </h1>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-5 py-6">
        {checks === null ? (
          <div className="flex items-center justify-center gap-2 py-24 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading your checks…
          </div>
        ) : (
          <ComparisonView checks={checks} />
        )}
      </main>
    </div>
  );
}

export default function ComparePage() {
  return (
    <AuthGate>
      <CompareContent />
    </AuthGate>
  );
}
