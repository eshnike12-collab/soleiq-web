import Link from "next/link";
import {
  ArrowRight,
  Camera,
  FileClock,
  GitCompare,
  LineChart,
  ShieldCheck,
  Users,
} from "lucide-react";
import { AppTopBar } from "@/components/chrome/AppTopBar";
import { T } from "@/components/chrome/T";
import { FeedbackButton } from "@/components/feedback/FeedbackButton";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { AuthConfigurationError } from "@/components/auth/AuthConfigurationError";
import { getPatientDashboard } from "@/server/patients";
import { pageAccess } from "@/server/page-access";
import { PatientNav } from "@/components/patient/PatientNav";
import { SharedWithMeCard } from "@/components/patient/SharedWithMeCard";
import { RescanReminderCard } from "@/components/patient/RescanReminderCard";
import { Greeting } from "@/components/patient/Greeting";
import {
  PhotoStageBadge,
  photoStageLabel,
} from "@/components/patient/PhotoStageBadge";
import { LocalTime } from "@/components/ui/LocalTime";
import { MedicalCard, SectionHeader } from "@/components/ui/medical";
import { PatientAssistant } from "@/components/patient/PatientAssistant";

export const dynamic = "force-dynamic";

/**
 * The four risk levels the reports table already stores, mapped to the shared
 * tone vocabulary. The LABEL is still the raw value with underscores swapped —
 * unchanged, because the wording of a risk level is clinical content, not
 * presentation.
 */
const riskStyle: Record<string, string> = {
  clear: "bg-secondary-soft text-secondary",
  watch: "bg-warn-soft text-warn",
  see_someone_soon: "bg-orange-100 text-orange-700",
  urgent: "bg-urgent-soft text-urgent",
};

export default async function PatientHomePage() {
  const data = await pageAccess(getPatientDashboard);
  if (data.configurationError) {
    return <AuthConfigurationError message={data.configurationError} />;
  }
  const latest = data.reports[0] as any;
  const latestSummary = latest?.patient_summary as any;
  const patientName = data.patient?.full_name || data.profile?.full_name || null;

  return (
    <div className="min-h-screen lg:pl-64">
      <AppTopBar
        title={
          <h1 className="truncate text-lg font-bold text-ink">
            {patientName || <T k="nav.footHealth" />}
          </h1>
        }
        actions={
          <>
            <FeedbackButton prefillEmail={data.profile?.email ?? null} />
            <SignOutButton />
          </>
        }
      />
      <main className="mx-auto max-w-5xl space-y-5 px-5 py-7 pb-28 lg:px-8 lg:pb-12">
        {/* ── Identity ──────────────────────────────────────────────────── */}
        <div>
          <Greeting name={patientName} />
          <h2 className="mt-1 text-[25px] font-bold leading-[1.18] tracking-[-0.015em] text-ink sm:text-[29px]">
            Your foot health
          </h2>
        </div>

        {/* ── Primary action ────────────────────────────────────────────────
            Status, when the last check happened, and the one thing to do
            today — in that order, because that is the order the questions get
            asked in. Every value below already existed on this page. */}
        <section className="overflow-hidden rounded-2xl border border-blue-200 bg-primary-soft shadow-card">
          <div className="p-6 sm:p-7">
            <p className="mc-section-title text-primary">Guided four-photo check</p>

            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
              {latest ? (
                <>
                  <span
                    className={`whitespace-nowrap rounded-full px-3 py-1 text-[13px] font-semibold capitalize ${
                      riskStyle[latest.risk_level] ?? "bg-slate-100 text-ink-soft"
                    }`}
                  >
                    {latest.risk_level.replaceAll("_", " ")}
                  </span>
                  {latest.status !== "released" && (
                    <span className="rounded-full bg-warn-soft px-3 py-1 text-[13px] font-semibold text-warn">
                      Pending review
                    </span>
                  )}
                  <span className="text-[14px] text-ink-soft">
                    Last check{" "}
                    <LocalTime
                      value={latest.finalized_at || latest.created_at}
                      mode="date"
                      className="font-semibold text-ink"
                    />
                  </span>
                </>
              ) : (
                <span className="text-[14px] text-ink-soft">No checks yet</span>
              )}
            </div>

            <p className="mt-4 max-w-xl text-[16px] leading-relaxed text-ink-soft">
              Take top and sole photos of both feet. SoleIQ screens visible
              surface changes and explains when to contact your care team.
            </p>

            <Link
              href="/"
              className="mt-5 inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-primary px-6 text-[16px] font-bold text-white shadow-button transition-colors duration-150 hover:bg-primary-deep active:scale-[0.99]"
            >
              <Camera className="h-[18px] w-[18px]" aria-hidden="true" />
              {latest ? "Start Foot Check" : "Start your first check"}
            </Link>
          </div>
        </section>

        <RescanReminderCard />
        <SharedWithMeCard />

        {/* ── Latest check ──────────────────────────────────────────────── */}
        <MedicalCard>
          <SectionHeader
            title="Latest check"
            action={
              latest && (
                <Link
                  href={`/records/${latest.id}`}
                  className="inline-flex min-h-[44px] items-center gap-1 text-[14px] font-bold text-primary transition-colors hover:text-primary-deep"
                >
                  Open exact report <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              )
            }
          />

          {latest ? (
            <>
              <p className="mt-1 text-[14px] text-ink-faint">
                {latest.hospital_name_snapshot}
              </p>
              <p className="mt-3 text-[16px] leading-relaxed text-ink">
                {latestSummary?.overall?.headline ||
                  "Your care team released a patient-safe screening summary."}
              </p>
              {(latest.photos ?? []).length > 0 && (
                /* Two across on a phone, four from `sm`. At four columns on a
                   390px screen each photo was ~80px and its caption had to be
                   9px to fit — unreadable, and these are the patient's own
                   foot photos, the thing they actually want to look at. */
                <div className="mt-4 grid max-w-md grid-cols-2 gap-2 sm:grid-cols-4">
                  {(latest.photos ?? []).slice(0, 4).map((photo: any) => (
                    <Link
                      key={photo.assetId}
                      href={`/records/${latest.id}`}
                      className="relative block overflow-hidden rounded-xl bg-surface-sunken"
                    >
                      <PhotoStageBadge
                        baseline={photo.baseline}
                        latest={photo.latest}
                      />
                      <div className="aspect-square">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={photo.url}
                          alt={`${photo.side} foot ${photo.view}${
                            photoStageLabel(photo) ? ` — ${photoStageLabel(photo)}` : ""
                          }`}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <span className="absolute inset-x-0 bottom-0 bg-black/55 px-1 py-1 text-center text-[12px] font-semibold uppercase tracking-wide text-white sm:text-[11px]">
                        {photo.side === "left" ? "L" : "R"} · {photo.view}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center py-6 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-soft">
                <Camera className="h-7 w-7 text-primary" aria-hidden="true" />
              </span>
              <p className="mt-4 max-w-md text-[15px] leading-relaxed text-ink-soft">
                No checks yet — your results and photos will appear here as soon
                as a check finishes analyzing. Reports marked &ldquo;Pending
                review&rdquo; are visible to you and your care team but
                haven&apos;t been checked by a clinician yet.
              </p>
            </div>
          )}
        </MedicalCard>

        {/* ── Report history ───────────────────────────────────────────── */}
        <MedicalCard>
          <SectionHeader
            title="Report history"
            icon={FileClock}
            action={
              data.reports.length >= 2 && (
                <Link
                  href="/compare"
                  className="inline-flex min-h-[44px] items-center gap-1 text-[14px] font-bold text-primary transition-colors hover:text-primary-deep"
                >
                  Compare over time <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              )
            }
          />
          <div className="mt-2 divide-y divide-slate-100">
            {data.reports.length === 0 ? (
              <div className="flex flex-col items-center py-6 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary-soft">
                  <FileClock className="h-6 w-6 text-secondary" aria-hidden="true" />
                </span>
                <p className="mt-3 text-[15px] text-ink-soft">
                  No reports yet — each finished check is saved here for you.
                </p>
              </div>
            ) : (
              data.reports.map((report: any) => (
                <Link
                  key={report.id}
                  href={`/records/${report.id}`}
                  className="-mx-2 flex items-center justify-between gap-4 rounded-xl px-2 py-4 transition-colors hover:bg-slate-50"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    {(report.photos ?? []).length > 0 && (
                      <div className="flex shrink-0 -space-x-2">
                        {(report.photos ?? []).slice(0, 4).map((photo: any) => (
                          <span
                            key={photo.assetId}
                            className={`block h-10 w-10 overflow-hidden rounded-lg border-2 border-white bg-surface-sunken ${
                              photo.latest ? "ring-2 ring-primary" : ""
                            }`}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={photo.url}
                              alt={`${photo.side} ${photo.view}${
                                photoStageLabel(photo) ? ` — ${photoStageLabel(photo)}` : ""
                              }`}
                              className="h-full w-full object-cover"
                            />
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-ink">
                        {report.hospital_name_snapshot}
                      </p>
                      <p className="text-[13px] text-ink-faint">
                        <LocalTime
                          value={report.finalized_at || report.created_at}
                          mode="date"
                        />{" "}
                        · version {report.version}
                      </p>
                    </div>
                  </div>
                  <span className="flex shrink-0 items-center gap-2">
                    {report.status !== "released" && (
                      <span className="hidden rounded-full bg-warn-soft px-2.5 py-1 text-[12px] font-semibold text-warn sm:inline">
                        Pending review
                      </span>
                    )}
                    <span
                      className={`whitespace-nowrap rounded-full px-2.5 py-1 text-[12px] font-semibold capitalize ${
                        riskStyle[report.risk_level] ?? "bg-slate-100 text-ink-soft"
                      }`}
                    >
                      {report.risk_level.replaceAll("_", " ")}
                    </span>
                    <ArrowRight
                      className="h-4 w-4 shrink-0 text-ink-faint"
                      aria-hidden="true"
                    />
                  </span>
                </Link>
              ))
            )}
          </div>
        </MedicalCard>

        {/* ── Supporting destinations ───────────────────────────────────────
            Links only, all to routes that already exist. The hospital count
            keeps its own card because it is data, not navigation. */}
        <section className="grid gap-4 sm:grid-cols-2">
          <MedicalCard>
            <p className="mc-section-title">Hospital connections</p>
            <p className="mt-2 text-[28px] font-bold leading-none text-ink">
              {data.enrollments.length}
            </p>
            <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">
              {data.enrollments.length
                ? "Your reports stay separated by hospital."
                : "Your account is not linked to a hospital patient record yet. You can still complete a local check."}
            </p>
            <Link
              href="/access"
              className="mt-3 inline-flex min-h-[44px] items-center gap-1.5 text-[14px] font-bold text-primary transition-colors hover:text-primary-deep"
            >
              <ShieldCheck className="h-4 w-4" aria-hidden="true" /> Who can see my
              records?
            </Link>
          </MedicalCard>

          <MedicalCard padded={false}>
            <p className="mc-section-title px-5 pb-1 pt-5 sm:px-6 sm:pt-6">
              Keep track
            </p>
            <ul className="divide-y divide-slate-100">
              {[
                { href: "/features/history", label: "Progress", icon: LineChart },
                { href: "/compare", label: "Comparison", icon: GitCompare },
                { href: "/features/care-team", label: "Care Team", icon: Users },
              ].map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="flex min-h-[52px] items-center gap-3 px-5 py-3 text-[15px] font-semibold text-ink transition-colors hover:bg-slate-50 sm:px-6"
                  >
                    <item.icon
                      className="h-[18px] w-[18px] shrink-0 text-primary"
                      aria-hidden="true"
                    />
                    {item.label}
                    <ArrowRight
                      className="ms-auto h-4 w-4 shrink-0 text-ink-faint"
                      aria-hidden="true"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </MedicalCard>
        </section>
      </main>
      <PatientNav active="home" />
      <PatientAssistant />
    </div>
  );
}
