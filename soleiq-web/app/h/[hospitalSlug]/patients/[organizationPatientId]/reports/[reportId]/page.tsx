import { HospitalShell } from "@/components/hospital/HospitalShell";
import { PageHeader } from "@/components/hospital/Ui";
import { ReportActions } from "@/components/hospital/ReportActions";
import { ReportChat } from "@/components/hospital/ReportChat";
import { ReportPhotos } from "@/components/hospital/ReportPhotos";
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
  const clinical = data.report.clinical_summary as any;
  const findings = Array.isArray(clinical?.findings) ? clinical.findings : [];
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
        <div className="space-y-5">
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-semibold">Clinical screening summary</h3>
              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold capitalize text-brand">
                {data.report.risk_level.replaceAll("_", " ")}
              </span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-slate-700">
              {clinical?.overall?.headline || clinical?.summary || "Structured clinical result recorded."}
            </p>
            <p className="mt-3 text-xs text-slate-500">
              Photo-based screening support only. It does not establish a diagnosis
              or replace an in-person examination.
            </p>
          </section>
          <ReportPhotos assets={(data as any).mediaAssets ?? []} />
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h3 className="font-semibold">Visible findings ({findings.length})</h3>
            <div className="mt-3 space-y-3">
              {findings.length === 0 ? (
                <p className="text-sm text-slate-500">No visible findings were recorded.</p>
              ) : findings.map((finding: any, index: number) => (
                <article key={index} className="rounded-xl border border-slate-100 p-4">
                  <p className="font-medium">{finding.what_we_saw || "Finding"}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {finding.foot} foot · {finding.surface} · {finding.location_plain}
                  </p>
                  <p className="mt-2 text-sm text-slate-700">{finding.why_it_matters}</p>
                </article>
              ))}
            </div>
          </section>
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
