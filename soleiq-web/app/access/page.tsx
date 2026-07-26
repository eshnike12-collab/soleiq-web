import Link from "next/link";
import { AccessManager } from "@/components/patient/AccessManager";
import { getPatientAccessSummary } from "@/server/patient-access";
import { pageAccess } from "@/server/page-access";

export const dynamic = "force-dynamic";

export default async function PatientAccessPage() {
  const data = await pageAccess(() =>
    getPatientAccessSummary(crypto.randomUUID())
  );
  return (
    <div className="min-h-screen bg-[#f4f6f8] px-5 py-8">
      <main className="mx-auto max-w-3xl">
        <Link href="/home" className="text-sm font-semibold text-brand">← My foot health</Link>
        <header className="my-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">Privacy & access</p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-950">Who can see my records?</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Care-team assignments and patient consent are separate. Revoking
            consent removes consent-derived access immediately; it does not end a
            hospital care-team assignment.
          </p>
        </header>
        <AccessManager initial={data} />
      </main>
    </div>
  );
}

