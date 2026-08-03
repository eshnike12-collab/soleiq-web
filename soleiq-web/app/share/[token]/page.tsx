import { TokenAcceptance } from "@/components/auth/TokenAcceptance";

export default async function PatientSharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-5">
      <main className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">Patient-directed access</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-950">Accept record access</h1>
        <div className="mt-5"><TokenAcceptance token={token} kind="patient_share" /></div>
      </main>
    </div>
  );
}
