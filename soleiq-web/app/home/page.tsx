import Link from "next/link";
import { ArrowRight, Camera, FileClock, ShieldCheck } from "lucide-react";
import { FeedbackButton } from "@/components/feedback/FeedbackButton";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { AuthConfigurationError } from "@/components/auth/AuthConfigurationError";
import { getPatientDashboard } from "@/server/patients";
import { pageAccess } from "@/server/page-access";

export const dynamic = "force-dynamic";

const riskStyle: Record<string, string> = {
  clear: "bg-emerald-50 text-emerald-800",
  watch: "bg-amber-50 text-amber-900",
  see_someone_soon: "bg-orange-100 text-orange-900",
  urgent: "bg-red-100 text-red-900",
};

export default async function PatientHomePage() {
  const data = await pageAccess(getPatientDashboard);
  if (data.configurationError) {
    return <AuthConfigurationError message={data.configurationError} />;
  }
  const latest = data.reports[0] as any;
  const latestSummary = latest?.patient_summary as any;
  return (
    <div className="min-h-screen bg-[#f4f6f8]">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">SoleIQ</p>
            <h1 className="text-lg font-semibold text-slate-950">
              {data.patient?.full_name || data.profile?.full_name || "My foot health"}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <FeedbackButton prefillEmail={data.profile?.email ?? null} />
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl space-y-6 px-5 py-8">
        <section className="grid gap-4 md:grid-cols-[1.4fr_1fr]">
          <div className="rounded-3xl bg-gradient-to-br from-brand to-blue-800 p-7 text-white">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-100">Guided four-photo check</p>
            <h2 className="mt-2 text-3xl font-semibold">Check in with your feet.</h2>
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-blue-100">
              Take top and sole photos of both feet. SoleIQ screens visible
              surface changes and explains when to contact your care team.
            </p>
            <Link href="/" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-brand">
              <Camera className="h-4 w-4" /> Start a foot check
            </Link>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Hospital connections</p>
            <p className="mt-2 text-3xl font-semibold text-slate-950">{data.enrollments.length}</p>
            <p className="mt-2 text-sm text-slate-600">
              {data.enrollments.length
                ? "Your reports stay separated by hospital."
                : "Your account is not linked to a hospital patient record yet. You can still complete a local check."}
            </p>
            <Link href="/access" className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-brand">
              <ShieldCheck className="h-4 w-4" /> Who can see my records?
            </Link>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Latest released result</p>
              <h2 className="mt-1 text-xl font-semibold text-slate-950">
                {latest ? latest.hospital_name_snapshot : "No released hospital report yet"}
              </h2>
            </div>
            {latest && (
              <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${riskStyle[latest.risk_level]}`}>
                {latest.risk_level.replaceAll("_", " ")}
              </span>
            )}
          </div>
          {latest ? (
            <>
              <p className="mt-4 text-sm leading-relaxed text-slate-700">
                {latestSummary?.overall?.headline || "Your care team released a patient-safe screening summary."}
              </p>
              {(latest.photos ?? []).length > 0 && (
                <div className="mt-4 grid max-w-md grid-cols-4 gap-2">
                  {(latest.photos ?? []).slice(0, 4).map((photo: any) => (
                    <Link
                      key={photo.assetId}
                      href={`/records/${latest.id}`}
                      className="relative block overflow-hidden rounded-xl bg-slate-100"
                    >
                      <div className="aspect-square">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={photo.url}
                          alt={`${photo.side} foot ${photo.view}`}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <span className="absolute inset-x-0 bottom-0 bg-black/45 px-1 py-0.5 text-center text-[9px] font-semibold uppercase text-white">
                        {photo.side === "left" ? "L" : "R"} · {photo.view}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
              <Link href={`/records/${latest.id}`} className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand">
                Open exact report <ArrowRight className="h-4 w-4" />
              </Link>
            </>
          ) : (
            <p className="mt-4 text-sm text-slate-500">
              Preliminary screening support is not shown here until a clinician releases the patient-facing report.
            </p>
          )}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6">
          <h2 className="flex items-center gap-2 font-semibold text-slate-950">
            <FileClock className="h-4 w-4 text-brand" /> Released report history
          </h2>
          <div className="mt-3 divide-y divide-slate-100">
            {data.reports.length === 0 ? (
              <p className="py-5 text-sm text-slate-500">No released reports.</p>
            ) : data.reports.map((report: any) => (
              <Link key={report.id} href={`/records/${report.id}`} className="flex items-center justify-between gap-4 py-4">
                <div className="flex min-w-0 items-center gap-3">
                  {(report.photos ?? []).length > 0 && (
                    <div className="flex shrink-0 -space-x-2">
                      {(report.photos ?? []).slice(0, 4).map((photo: any) => (
                        <span
                          key={photo.assetId}
                          className="block h-10 w-10 overflow-hidden rounded-lg border-2 border-white bg-slate-100"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={photo.url}
                            alt={`${photo.side} ${photo.view}`}
                            className="h-full w-full object-cover"
                          />
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-900">{report.hospital_name_snapshot}</p>
                    <p className="text-xs text-slate-500">
                      {new Date(report.finalized_at || report.created_at).toLocaleDateString()} · version {report.version}
                    </p>
                  </div>
                </div>
                <span className="shrink-0 text-xs font-semibold capitalize text-brand">{report.risk_level.replaceAll("_", " ")} →</span>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
