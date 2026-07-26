import Link from "next/link";

export default function RetiredAuthUidRoute() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-5">
      <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-center">
        <h1 className="text-xl font-semibold text-slate-950">This patient route has moved</h1>
        <p className="mt-2 text-sm text-slate-600">
          Auth user IDs are no longer used in clinical URLs. Open the patient
          from your hospital-scoped worklist.
        </p>
        <Link href="/dashboard" className="mt-4 inline-block text-sm font-semibold text-brand">
          Open my hospital worklist
        </Link>
      </div>
    </div>
  );
}
