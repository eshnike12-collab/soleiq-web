import Link from "next/link";

export default function RetiredAuthUidRoute() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-5">
      <div className="max-w-md rounded-2xl border border-slate-200 bg-surface-raised p-6 text-center shadow-card">
        <h1 className="text-xl font-bold text-ink">This patient route has moved</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">
          Auth user IDs are no longer used in clinical URLs. Open the patient
          from your hospital-scoped worklist.
        </p>
        <Link href="/dashboard" className="mt-3 inline-flex min-h-[44px] items-center py-2 text-sm font-bold text-primary transition-colors hover:text-primary-deep">
          Open my hospital worklist
        </Link>
      </div>
    </div>
  );
}
