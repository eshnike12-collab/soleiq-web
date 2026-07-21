"use client";

/**
 * "Open Results" — loads the most recent saved analysis and renders it in
 * the shared screening report view.
 *
 * Who sees whose data:
 *   - no query param → the signed-in user's own last saved analysis
 *   - ?patient=<auth_uid> → that patient's last analysis; RLS only returns
 *     rows if the viewer is that patient, an assigned doctor, or an admin,
 *     so an unauthorized viewer simply gets the empty state.
 */

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, FileQuestion, Loader2 } from "lucide-react";
import { AuthGate } from "@/components/auth/AuthGate";
import { ScreeningReport } from "@/components/result/ScreeningReport";
import { getLatestVisitWithResult } from "@/lib/db";
import { useAuth } from "@/lib/auth";
import type { Visit } from "@/lib/types";

function ResultsContent() {
  const params = useSearchParams();
  const targetPatient = params.get("patient");
  const { profile } = useAuth();
  const [visit, setVisit] = useState<Visit | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getLatestVisitWithResult(targetPatient).then((row) => {
      if (cancelled) return;
      setVisit(row);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [targetPatient]);

  const backHref =
    targetPatient && profile && profile.role !== "patient" ? "/dashboard" : "/";

  return (
    <div className="mx-auto min-h-screen w-full max-w-md px-4 py-6">
      <Link
        href={backHref}
        className="mb-4 inline-flex items-center gap-1 text-xs font-medium text-warmGray-600 hover:text-brand"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back
      </Link>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 text-sm text-warmGray-600">
          <Loader2 className="mb-2 h-5 w-5 animate-spin" /> Loading the last saved check…
        </div>
      ) : visit?.result?.screening ? (
        <>
          <ScreeningReport
            eyebrow={`Saved check · ${new Date(visit.startedAt).toLocaleDateString(undefined, { dateStyle: "medium" })}`}
            screening={visit.result.screening}
            images={visit.images.map((image) => ({
              side: image.side,
              view: image.view,
              dataUrl: image.dataUrl,
            }))}
          />
          <p className="mt-4 text-center text-[11px] text-warmGray-600">
            This is the most recent saved check. Newer, unsaved checks are not shown here.
          </p>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <FileQuestion className="h-10 w-10 text-warmGray-100" />
          <h1 className="mt-3 text-xl font-semibold text-warmGray-800">No saved results yet</h1>
          <p className="mt-1 max-w-[280px] text-sm text-warmGray-600">
            {targetPatient
              ? "This patient has no saved foot checks, or your account doesn't have access to them."
              : "Finish a foot check and tap Save — it will be here next time you sign in."}
          </p>
          {!targetPatient && (
            <Link href="/" className="mt-5 text-sm font-semibold text-brand">
              Start a foot check
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

export default function ResultsPage() {
  return (
    <AuthGate>
      <Suspense
        fallback={
          <div className="flex min-h-screen items-center justify-center text-sm text-warmGray-600">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…
          </div>
        }
      >
        <ResultsContent />
      </Suspense>
    </AuthGate>
  );
}
