import Link from "next/link";
import { ArrowRight, Camera, FileClock, ShieldCheck } from "lucide-react";
import { BrandLogo } from "@/components/brand/Logo";
import { FeedbackButton } from "@/components/feedback/FeedbackButton";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { AuthConfigurationError } from "@/components/auth/AuthConfigurationError";
import { getPatientDashboard } from "@/server/patients";
import { pageAccess } from "@/server/page-access";
import { PatientNav } from "@/components/patient/PatientNav";
import { SharedWithMeCard } from "@/components/patient/SharedWithMeCard";

export const dynamic = "force-dynamic";

const riskStyle: Record<string, string> = {
  clear: "bg-secondary-soft text-teal-800",
  watch: "bg-warn-soft text-amber-800",
  see_someone_soon: "bg-orange-100 text-orange-900",
  urgent: "bg-urgent-soft text-red-800",
};

export default async function PatientHomePage() {
  const data = await pageAccess(getPatientDashboard);
  if (data.configurationError) {
    return <AuthConfigurationError message={data.configurationError} />;
  }
  const latest = data.reports[0] as any;
  const latestSummary = latest?.patient_summary as any;
  return (
    <div className="min-h-screen bg-surface">
      <header className="border-b border-slate-200 bg-surface-raised">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            <BrandLogo size={44} />
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">SoleIQ</p>
              <h1 className="text-lg font-bold text-ink">
                {data.patient?.full_name || data.profile?.full_name || "My foot health"}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <FeedbackButton prefillEmail={data.profile?.email ?? null} />
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl space-y-6 px-5 py-8 pb-24">
        <SharedWithMeCard />
        <section className="grid gap-4 md:grid-cols-[1.4fr_1fr]">
          <div className="rounded-3xl bg-gradient-to-br from-primary to-primary-deep p-7 text-white shadow-lifted">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-200">Guided four-photo check</p>
            <h2 className="mt-2 text-3xl font-bold">Check in with your feet.</h2>
            <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-blue-100">
              Take top and sole photos of both feet. SoleIQ screens visible
              surface changes and explains when to contact your care team.
            </p>
            <Link href="/" className="mt-6 inline-flex min-h-[44px] items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-bold text-primary shadow-button transition-transform duration-150 active:scale-[0.98]">
              <Camera className="h-4 w-4" /> Start a foot check
            </Link>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-surface-raised p-6 shadow-card">
            <p className="text-xs font-bold uppercase tracking-wide text-ink-faint">Hospital connections</p>
            <p className="mt-2 text-3xl font-bold text-ink">{data.enrollments.length}</p>
            <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">
              {data.enrollments.length
                ? "Your reports stay separated by hospital."
                : "Your account is not linked to a hospital patient record yet. You can still complete a local check."}
            </p>
            <Link href="/access" className="mt-4 inline-flex min-h-[44px] items-center gap-1 py-2 text-sm font-bold text-primary transition-colors hover:text-primary-deep">
              <ShieldCheck className="h-4 w-4" /> Who can see my records?
            </Link>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-surface-raised p-6 shadow-card">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-ink-faint">Latest result</p>
              <h2 className="mt-1 text-xl font-bold text-ink">
                {latest ? latest.hospital_name_snapshot : "No hospital report yet"}
              </h2>
            </div>
            {latest && (
              <span className="flex shrink-0 items-center gap-1.5">
                {latest.status !== "released" && (
                  <span className="rounded-full bg-warn-soft px-2.5 py-1 text-xs font-semibold text-warn">
                    Pending review
                  </span>
                )}
                <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${riskStyle[latest.risk_level]}`}>
                  {latest.risk_level.replaceAll("_", " ")}
                </span>
              </span>
            )}
          </div>
          {latest ? (
            <>
              <p className="mt-4 text-[15px] leading-relaxed text-ink">
                {latestSummary?.overall?.headline || "Your care team released a patient-safe screening summary."}
              </p>
              {(latest.photos ?? []).length > 0 && (
                <div className="mt-4 grid max-w-md grid-cols-4 gap-2">
                  {(latest.photos ?? []).slice(0, 4).map((photo: any) => (
                    <Link
                      key={photo.assetId}
                      href={`/records/${latest.id}`}
                      className="relative block overflow-hidden rounded-2xl bg-surface-sunken"
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
              <Link href={`/records/${latest.id}`} className="mt-3 inline-flex min-h-[44px] items-center gap-1 py-2 text-sm font-bold text-primary transition-colors hover:text-primary-deep">
                Open exact report <ArrowRight className="h-4 w-4" />
              </Link>
            </>
          ) : (
            <div className="mt-4 flex flex-col items-center py-4 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-soft">
                <Camera className="h-7 w-7 text-primary" />
              </span>
              <p className="mt-3 max-w-md text-[15px] leading-relaxed text-ink-soft">
                No checks yet — your results and photos will appear here as soon
                as a check finishes analyzing. Reports marked &ldquo;Pending
                review&rdquo; are visible to you and your care team but
                haven&apos;t been checked by a clinician yet.
              </p>
              <Link href="/" className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-bold text-white shadow-button transition-transform duration-150 active:scale-[0.98]">
                <Camera className="h-4 w-4" /> Start your first check
              </Link>
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-surface-raised p-6 shadow-card">
          <div className="flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 font-bold text-ink">
              <FileClock className="h-4 w-4 text-primary" /> Report history
            </h2>
            {data.reports.length >= 2 && (
              <Link href="/compare" className="inline-flex min-h-[44px] items-center py-2 text-xs font-bold text-primary transition-colors hover:text-primary-deep">
                Compare over time →
              </Link>
            )}
          </div>
          <div className="mt-3 divide-y divide-slate-100">
            {data.reports.length === 0 ? (
              <div className="flex flex-col items-center py-6 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary-soft">
                  <FileClock className="h-6 w-6 text-secondary" />
                </span>
                <p className="mt-3 text-[15px] text-ink-soft">
                  No reports yet — each finished check is saved here for you.
                </p>
              </div>
            ) : data.reports.map((report: any) => (
              <Link key={report.id} href={`/records/${report.id}`} className="flex items-center justify-between gap-4 py-4 transition-colors hover:bg-surface">
                <div className="flex min-w-0 items-center gap-3">
                  {(report.photos ?? []).length > 0 && (
                    <div className="flex shrink-0 -space-x-2">
                      {(report.photos ?? []).slice(0, 4).map((photo: any) => (
                        <span
                          key={photo.assetId}
                          className="block h-10 w-10 overflow-hidden rounded-xl border-2 border-white bg-surface-sunken"
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
                    <p className="truncate font-semibold text-ink">{report.hospital_name_snapshot}</p>
                    <p className="text-xs text-ink-faint">
                      {new Date(report.finalized_at || report.created_at).toLocaleDateString()} · version {report.version}
                    </p>
                  </div>
                </div>
                <span className="flex shrink-0 items-center gap-1.5">
                  {report.status !== "released" && (
                    <span className="rounded-full bg-warn-soft px-2 py-0.5 text-[11px] font-semibold text-warn">
                      Pending review
                    </span>
                  )}
                  <span className="text-xs font-bold capitalize text-primary">{report.risk_level.replaceAll("_", " ")} →</span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      </main>
      <PatientNav active="home" />
    </div>
  );
}
