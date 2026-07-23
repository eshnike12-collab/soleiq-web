"use client";

/**
 * "Open Results".
 *
 * Role-based views:
 *   - patient → the simplified ScreeningReport of their own latest check.
 *   - doctor / admin → the full ClinicalReport: complete intake questionnaire
 *     plus every saved check with the AI output in clinical detail.
 *
 * Who sees whose data:
 *   - no query param → the signed-in user's own record
 *   - ?patient=<auth_uid> → that patient's record; Postgres RLS only returns
 *     rows if the viewer is that patient, an assigned doctor, or an admin,
 *     so an unauthorized viewer simply gets the empty state. The role branch
 *     here is presentation only — RLS is the security boundary.
 */

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, FileQuestion, Loader2 } from "lucide-react";
import { AuthGate } from "@/components/auth/AuthGate";
import { ScreeningReport } from "@/components/result/ScreeningReport";
import { ClinicalReport } from "@/components/result/ClinicalReport";
import {
  getPatientIntake,
  listVisitsForUser,
  type PatientIntakeRow,
} from "@/lib/db";
import { useAuth } from "@/lib/auth";
import type { Visit } from "@/lib/types";

function ResultsContent() {
  const params = useSearchParams();
  const targetPatient = params.get("patient");
  const { loading: authLoading, userId, profile } = useAuth();
  const isClinician = profile?.role === "doctor" || profile?.role === "admin";
  const [visits, setVisits] = useState<Visit[] | null>(null);
  const [intake, setIntake] = useState<PatientIntakeRow | null>(null);

  useEffect(() => {
    if (authLoading) return;
    const authUid = targetPatient ?? userId;
    if (!authUid) return;
    let cancelled = false;
    setVisits(null);
    void Promise.all([
      listVisitsForUser(authUid),
      isClinician ? getPatientIntake(authUid) : Promise.resolve(null),
    ]).then(([visitRows, intakeRow]) => {
      if (cancelled) return;
      // listVisitsForUser returns oldest first; the report reads newest first.
      setVisits([...visitRows].reverse());
      setIntake(intakeRow);
    });
    return () => {
      cancelled = true;
    };
  }, [targetPatient, authLoading, isClinician, userId]);

  const backHref = isClinician && targetPatient ? "/dashboard" : "/home";
  const loading = authLoading || visits === null;
  const latest =
    visits?.find((visit) => visit.result?.screening) ?? visits?.[0] ?? null;

  return (
    <div
      className={
        isClinician
          ? "mx-auto min-h-screen w-full max-w-2xl px-4 py-6"
          : "mx-auto min-h-screen w-full max-w-md px-4 py-6"
      }
    >
      <Link
        href={backHref}
        className="mb-4 inline-flex items-center gap-1 text-xs font-medium text-warmGray-600 hover:text-brand"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back
      </Link>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 text-sm text-warmGray-600">
          <Loader2 className="mb-2 h-5 w-5 animate-spin" /> Loading the record…
        </div>
      ) : isClinician ? (
        intake || (visits && visits.length > 0) ? (
          <ClinicalReport intake={intake} visits={visits ?? []} />
        ) : (
          <EmptyState forPatientParam={Boolean(targetPatient)} />
        )
      ) : latest?.result?.screening ? (
        <>
          <ScreeningReport
            eyebrow={`Saved check · ${new Date(latest.startedAt).toLocaleDateString(undefined, { dateStyle: "medium" })}`}
            screening={latest.result.screening}
            images={latest.images.map((image) => ({
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
        <EmptyState forPatientParam={Boolean(targetPatient)} />
      )}
    </div>
  );
}

function EmptyState({ forPatientParam }: { forPatientParam: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <FileQuestion className="h-10 w-10 text-warmGray-100" />
      <h1 className="mt-3 text-xl font-semibold text-warmGray-800">No saved results yet</h1>
      <p className="mt-1 max-w-[280px] text-sm text-warmGray-600">
        {forPatientParam
          ? "This patient has no saved foot checks, or your account doesn't have access to them."
          : "Finish a foot check and tap Save — it will be here next time you sign in."}
      </p>
      {!forPatientParam && (
        <Link href="/" className="mt-5 text-sm font-semibold text-brand">
          Start a foot check
        </Link>
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
