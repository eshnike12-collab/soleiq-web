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
  clear: "bg-secondary-soft text-teal-800",
  watch: "bg-warn-soft text-warn",
  see_someone_soon: "bg-orange-50 text-orange-700",
  urgent: "bg-urgent-soft text-red-800",
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
      <div className="flex min-h-screen items-center justify-center gap-2 text-[15px] text-ink-soft">
        <Loader2 className="h-5 w-5 animate-spin text-primary" /> Loading shared records…
      </div>
    );
  }
  if (share === null) {
    return (
      <div className="min-h-screen px-5 py-8">
        <main className="mx-auto flex max-w-3xl flex-col items-center rounded-3xl border border-slate-200 bg-surface-raised p-7 text-center shadow-card">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-soft">
            <ShieldCheck className="h-6 w-6 text-primary" />
          </span>
          <h1 className="mt-3 text-xl font-bold text-ink">No access</h1>
          <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">
            This patient hasn&apos;t shared their records with you, or the access
            was revoked.
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

  return (
    <div className="min-h-screen px-5 py-8 pb-24">
      <main className="mx-auto max-w-3xl">
        <Link href="/features/care-team" className="inline-flex min-h-[44px] items-center py-2 text-sm font-semibold text-primary transition-colors hover:text-primary-deep">
          ← Care Team
        </Link>
        <div className="mt-3 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-soft text-primary">
            <ShieldCheck className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-2xl font-bold text-ink">
              {share.patientName}
            </h1>
            <p className="text-xs text-ink-faint">
              Shared with you as {share.role === "clinician" ? "a clinician" : share.role}
              {share.role === "clinician"
                ? " — you see the clinical detail."
                : " — you see the same view the patient sees."}
            </p>
          </div>
        </div>

        {checks.length === 0 ? (
          <div className="mt-6 flex flex-col items-center rounded-3xl border border-slate-200 bg-surface-raised p-6 text-center shadow-card">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary-soft">
              <ShieldCheck className="h-6 w-6 text-secondary" />
            </span>
            <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">
              No checks to show yet — new results will appear here as soon as
              they&apos;re shared.
            </p>
          </div>
        ) : (
          <ul className="mt-5 space-y-3">
            {checks.map((check) => (
              <li key={check.reportId}>
                <Link
                  href={`/shared/${patientId}/${check.reportId}`}
                  className="block rounded-3xl border border-slate-200 bg-surface-raised p-5 shadow-card transition duration-150 hover:shadow-lifted active:scale-[0.99]"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold text-ink">
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
                      <span className="rounded-full bg-warn-soft px-2 py-0.5 text-[10px] font-semibold uppercase text-warn">
                        Pending review
                      </span>
                    )}
                  </div>
                  {check.headline && (
                    <p className="mt-2 text-[15px] leading-relaxed text-ink">
                      {check.headline}
                    </p>
                  )}
                  <p className="mt-2 text-xs font-bold text-primary">
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
