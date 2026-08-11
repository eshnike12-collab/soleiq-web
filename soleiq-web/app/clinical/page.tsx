import Link from "next/link";

/**
 * Retired: this route previously embedded a complete clinical summary in the
 * URL. Canonical reports require an exact report ID, RLS, and an audit event.
 */
export default function RetiredClinicalLinkPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-5">
      <main className="max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-center">
        <h1 className="text-xl font-semibold text-slate-950">Clinical links have changed</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          For privacy, clinical data is no longer carried in a share URL.
          Clinicians should open the exact authorized report from their hospital
          worklist.
        </p>
        <Link href="/login" className="mt-4 inline-block text-sm font-semibold text-brand">
          Sign in
        </Link>
      </main>
    </div>
  );
}
