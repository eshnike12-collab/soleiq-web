import Link from "next/link";
import { ArrowLeft, ClipboardList, Images, ListChecks } from "lucide-react";
import { getPatientReleasedReport } from "@/server/patients";
import { EmailReportButton } from "@/components/patient/EmailReportButton";
import { PatientPhotoGallery } from "@/components/patient/PatientPhotoGallery";
import { SkippedViews } from "@/components/patient/SkippedViewCard";
import { pageAccess } from "@/server/page-access";
import { RecommendationBlock } from "@/components/result/RecommendationBlock";
import { LocalTime } from "@/components/ui/LocalTime";
import { MedicalAlert, MedicalCard, SectionHeader } from "@/components/ui/medical";
import { PatientAssistant } from "@/components/patient/PatientAssistant";

export const dynamic = "force-dynamic";

// Soft-tinted summary panel per risk level. Tints only — the risk WORDING
// below is clinical content and is rendered from the stored value unchanged.
const riskPanel: Record<string, string> = {
  clear: "bg-secondary-soft text-secondary",
  watch: "bg-warn-soft text-warn",
  see_someone_soon: "bg-orange-50 text-orange-700",
  urgent: "bg-urgent-soft text-urgent",
};

export default async function PatientReportPage({
  params,
}: {
  params: Promise<{ reportId: string }>;
}) {
  const { reportId } = await params;
  const report = await pageAccess(() =>
    getPatientReleasedReport(reportId, crypto.randomUUID())
  );
  const summary = report.patient_summary as any;
  const photos = (report as any).photos ?? [];
  const skippedSlots = (report as any).skippedSlots ?? [];
  const findings = summary?.findings ?? [];
  const whatToDo = summary?.what_to_do ?? [];

  return (
    <div className="min-h-screen px-5 py-8 lg:pl-[17.25rem] lg:pr-8">
      <main className="mx-auto max-w-3xl">
        <Link
          href="/home"
          className="inline-flex min-h-[44px] items-center gap-1.5 text-[14px] font-semibold text-primary transition-colors hover:text-primary-deep"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> My results
        </Link>

        <article className="mt-2 space-y-4">
          {/* ── Record header ──────────────────────────────────────────── */}
          <MedicalCard>
            <p className="mc-section-title text-primary">
              {report.status === "released"
                ? "Released patient report"
                : "Patient report"}{" "}
              · version {report.version}
            </p>
            <h1 className="mt-1.5 text-[25px] font-bold leading-[1.18] tracking-[-0.015em] text-ink sm:text-[29px]">
              {report.hospital_name_snapshot}
            </h1>
            <p className="mt-1.5 text-[14px] text-ink-faint">
              {report.status === "released" ? "Released" : "Completed"}{" "}
              <LocalTime value={report.finalized_at || report.created_at} />
            </p>

            {report.status !== "released" && (
              <MedicalAlert tone="attention" className="mt-4">
                <span className="font-bold text-ink">
                  Pending clinician review.
                </span>{" "}
                These results are available to you and your care team right
                away, but a clinician hasn&apos;t reviewed them yet — guidance
                may be updated after review.
              </MedicalAlert>
            )}

            {/* Result status. Wording unchanged from the stored summary. */}
            <div
              className={`mt-5 rounded-2xl p-5 ${
                riskPanel[report.risk_level] ?? "bg-primary-soft text-primary"
              }`}
            >
              <p className="text-[13px] font-bold uppercase tracking-[0.07em]">
                {report.risk_level.replaceAll("_", " ")}
              </p>
              <p className="mt-2 text-[19px] font-bold leading-snug text-ink">
                {summary?.overall?.headline ||
                  "Your care team released this screening summary."}
              </p>
            </div>
          </MedicalCard>

          {/* ── Images ─────────────────────────────────────────────────── */}
          {(photos.length > 0 || skippedSlots.length > 0) && (
            <MedicalCard>
              <SectionHeader title="Your photos from this check" icon={Images} />
              {photos.length > 0 && <PatientPhotoGallery photos={photos} />}
              {/* A skipped view is shown as an explicit gap. Three photos
                  where four were asked for otherwise looks like a complete
                  check of three things. */}
              <SkippedViews slots={skippedSlots} />
            </MedicalCard>
          )}

          {/* ── Assessment ─────────────────────────────────────────────── */}
          {findings.length > 0 && (
            <MedicalCard>
              <SectionHeader title="What we saw" icon={ClipboardList} />
              <div className="mt-3 divide-y divide-slate-100">
                {findings.map((finding: any, index: number) => (
                  <section key={index} className="py-4 first:pt-1 last:pb-0">
                    <h3 className="text-[17px] font-bold text-ink">
                      {finding.what_we_saw}
                    </h3>
                    {finding.location_plain && (
                      <p className="mt-1 text-[13px] text-ink-faint">
                        {finding.location_plain}
                      </p>
                    )}
                    <p className="mt-2 text-[16px] leading-relaxed text-ink-soft">
                      {finding.why_it_matters}
                    </p>
                  </section>
                ))}
              </div>
            </MedicalCard>
          )}

          {/* ── Recommendations ────────────────────────────────────────── */}
          <MedicalCard>
            <SectionHeader title="What to do next" icon={ListChecks} />
            <ul className="mt-3 space-y-2.5">
              {whatToDo.map((item: string) => (
                <li key={item} className="flex gap-3 text-[16px] leading-relaxed text-ink">
                  <span
                    className="mt-[0.6rem] h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
                    aria-hidden="true"
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </MedicalCard>

          <RecommendationBlock
            recommendation={(report as any).recommendation ?? null}
          />

          {/* ── Actions ────────────────────────────────────────────────── */}
          <MedicalCard>
            <EmailReportButton reportId={reportId} />
          </MedicalCard>

          <p className="px-1 pb-2 text-[13px] leading-relaxed text-ink-faint">
            {summary?.limits ||
              "Photos cannot show problems beneath the skin."}{" "}
            This is screening support, not a diagnosis.
          </p>
        </article>
      </main>
      <PatientAssistant />
    </div>
  );
}
