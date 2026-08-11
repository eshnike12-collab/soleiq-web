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
    <div className="min-h-screen px-5 py-8">
      <main className="mx-auto max-w-3xl">
        <Link href="/home" className="inline-flex min-h-[44px] items-center py-2 text-sm font-semibold text-primary transition-colors hover:text-primary-deep">← My foot health</Link>
        <header className="my-5">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Privacy & access</p>
          <h1 className="mt-1 text-2xl font-bold text-ink">Who can see my records?</h1>
          <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">
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

