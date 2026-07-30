import { HospitalShell } from "@/components/hospital/HospitalShell";
import { PageHeader } from "@/components/hospital/Ui";
import { ReportActions } from "@/components/hospital/ReportActions";
import { ReportChat } from "@/components/hospital/ReportChat";
import { ReportTabs } from "@/components/hospital/ReportTabs";
import { RecommendationBlock } from "@/components/result/RecommendationBlock";
import { getExactReport } from "@/server/reports";
import { pageAccess } from "@/server/page-access";

export const dynamic = "force-dynamic";

export default async function ExactReportPage({
  params,
}: {
  params: Promise<{
    hospitalSlug: string;
    organizationPatientId: string;
    reportId: string;
  }>;
}) {
  const { hospitalSlug, organizationPatientId, reportId } = await params;
  const data = await pageAccess(() =>
    getExactReport(
      hospitalSlug,
      organizationPatientId,
      reportId,
      crypto.randomUUID()
    )
  );
  const patient = Array.isArray((data.enrollment as any).patients)
    ? (data.enrollment as any).patients[0]
    : (data.enrollment as any).patients;
  const facility = Array.isArray((data.enrollment as any).facilities)
    ? (data.enrollment as any).facilities[0]
    : (data.enrollment as any).facilities;
  const clinical = data.report.clinical_summary as any;
  return (
    <HospitalShell slug={data.hospital.slug} hospitalName={data.hospital.displayName} role="doctor">
      <PageHeader
        eyebrow={`Exact report · version ${data.report.version}`}
        title={patient?.full_name || "Patient report"}
        description={`${data.report.hospital_name_snapshot} · ${new Date(data.report.created_at).toLocaleString()} · ${data.report.status.replaceAll("_", " ")}`}
        action={
          <a
            href={`/api/h/${data.hospital.slug}/reports/${data.report.id}/export?organizationPatientId=${data.enrollment.id}`}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-brand"
          >
            Secure export
          </a>
        }
      />
      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        {/* Overview opens by default; the full record (all findings with
            regions, screening detail, capture quality, complete intake
            sheet, identifiers, review history) lives behind the Enhanced
            metrics tab. */}
        <div>
          <ReportTabs
            clinical={clinical}
            riskLevel={data.report.risk_level}
            assets={(data as any).mediaAssets ?? []}
            intake={(patient?.demographics as any) ?? null}
            patient={patient ?? null}
            mrn={(data.enrollment as any).mrn ?? null}
            facilityName={facility?.name ?? null}
            reviews={((data.report as any).report_reviews ?? []) as any}
            hospitalSlug={data.hospital.slug}
            analysisRunId={(data.report as any).analysis_run_id ?? null}
            reportVersion={data.report.version}
          />
          <RecommendationBlock
            recommendation={(data as any).recommendation ?? null}
            audience="clinician"
          />
        </div>
        <div className="space-y-5">
          <ReportActions
            hospitalSlug={data.hospital.slug}
            reportId={data.report.id}
            status={data.report.status}
          />
          <ReportChat
            hospitalSlug={data.hospital.slug}
            reportId={data.report.id}
            patientName={patient?.full_name}
          />
        </div>
      </div>
    </HospitalShell>
  );
}
