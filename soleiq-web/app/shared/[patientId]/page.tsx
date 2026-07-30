"use client";

/**
 * Care-circle viewer: the checks one patient has shared with the signed-in
 * user. The viewer's role comes from their own grant row (never from the
 * URL), and every read below runs under RLS — revoked grants return nothing.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Loader2, ShieldCheck } from "lucide-react";
import { AuthGate } from "@/components/auth/AuthGate";
import {
  SharedCheckSummary,
  SharedPatient,
  listSharedChecks,
  listSharedWithMe,
} from "@/lib/careCircle";

const RISK_CHIP: Record<string, string> = {
  clear: "bg-teal-50 text-teal-700",
  watch: "bg-amber-50 text-amber-700",
  see_someone_soon: "bg-orange-50 text-orange-700",
  urgent: "bg-red-50 text-red-700",
};

function SharedPatientContent() {
  const params = useParams<{ patientId: string }>();
  const patientId = params?.patientId ?? "";
  const [share, setShare] = useState<SharedPatient | null | undefined>(undefined);
  const [checks, setChecks] = useState<SharedCheckSummary[]>([]);

  useEffect(() => {
    if (!patientId) return;
    (async () => {
      const shares = await listSharedWithMe();
      const match = shares.find((s) => s.patientId === patientId) ?? null;
      setShare(match);
      if (match) setChecks(await listSharedChecks(patientId));
    })();
  }, [patientId]);

  if (share === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center gap-2 bg-[#f4f6f8] text-sm text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading shared records…
      </div>
    );
  }
  if (share === null) {
    return (
      <div className="min-h-screen bg-[#f4f6f8] px-5 py-8">
        <main className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white p-7 text-center">
          <h1 className="text-xl font-semibold text-slate-950">No access</h1>
          <p className="mt-2 text-sm text-slate-500">
            This patient hasn&apos;t shared their records with you, or the access
            was revoked.
          </p>
          <Link
            href="/features/care-team"
            className="mt-4 inline-block text-sm font-semibold text-brand"
          >
            ← Back to Care Team
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f6f8] px-5 py-8 pb-24">
      <main className="mx-auto max-w-3xl">
        <Link href="/features/care-team" className="text-sm font-semibold text-brand">
          ← Care Team
        </Link>
        <div className="mt-3 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-brand">
            <ShieldCheck className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-2xl font-semibold text-slate-950">
              {share.patientName}
            </h1>
            <p className="text-xs text-slate-500">
              Shared with you as {share.role === "clinician" ? "a clinician" : share.role}
              {share.role === "clinician"
                ? " — you see the clinical detail."
                : " — you see the same view the patient sees."}
            </p>
          </div>
        </div>

        {checks.length === 0 ? (
          <p className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
            No checks to show yet.
          </p>
        ) : (
          <ul className="mt-5 space-y-3">
            {checks.map((check) => (
              <li key={check.reportId}>
                <Link
                  href={`/shared/${patientId}/${check.reportId}`}
                  className="block rounded-3xl border border-slate-200 bg-white p-5"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-slate-900">
                      {new Date(check.date).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                        RISK_CHIP[check.riskLevel] ?? "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {check.riskLevel.replaceAll("_", " ")}
                    </span>
                    {check.status !== "released" && (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-500">
                        Pending review
                      </span>
                    )}
                  </div>
                  {check.headline && (
                    <p className="mt-2 text-sm leading-relaxed text-slate-700">
                      {check.headline}
                    </p>
                  )}
                  <p className="mt-2 text-xs font-semibold text-brand">
                    Open report →
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}

export default function SharedPatientPage() {
  return (
    <AuthGate>
      <SharedPatientContent />
    </AuthGate>
  );
}
