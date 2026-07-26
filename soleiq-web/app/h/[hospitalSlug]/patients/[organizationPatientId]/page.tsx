import Link from "next/link";
import { HospitalShell } from "@/components/hospital/HospitalShell";
import { EmptyState, PageHeader } from "@/components/hospital/Ui";
import { getPatientClinicalRecord } from "@/server/patients";
import { pageAccess } from "@/server/page-access";

export const dynamic = "force-dynamic";

export default async function PatientClinicalPage({
  params,
}: {
  params: Promise<{ hospitalSlug: string; organizationPatientId: string }>;
}) {
  const { hospitalSlug, organizationPatientId } = await params;
  const requestId = crypto.randomUUID();
  const data = await pageAccess(() =>
    getPatientClinicalRecord(
      hospitalSlug,
      organizationPatientId,
      requestId
    )
  );
  const patient = Array.isArray((data.enrollment as any).patients)
    ? (data.enrollment as any).patients[0]
    : (data.enrollment as any).patients;
  const facility = Array.isArray((data.enrollment as any).facilities)
    ? (data.enrollment as any).facilities[0]
    : (data.enrollment as any).facilities;
  return (
    <HospitalShell slug={data.hospital.slug} hospitalName={data.hospital.displayName} role="doctor">
      <PageHeader
        eyebrow="Authorized patient record"
        title={patient?.full_name || "Patient"}
        description={`${facility?.name || "No facility"} · Hospital ID ${data.enrollment.mrn || "not recorded"}. Timeline links preserve the exact report version.`}
      />
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="font-semibold">Longitudinal report timeline</h3>
        {data.reports.length === 0 ? (
          <div className="mt-4"><EmptyState>No authorized reports yet.</EmptyState></div>
        ) : (
          <div className="mt-4 divide-y divide-slate-100">
            {data.reports.map((report: any) => {
              const session = Array.isArray(report.screening_sessions)
                ? report.screening_sessions[0]
                : report.screening_sessions;
              return (
                <Link
                  key={report.id}
                  href={`/h/${data.hospital.slug}/patients/${data.enrollment.id}/reports/${report.id}`}
                  className="flex items-center justify-between gap-4 py-4"
                >
                  <div>
                    <p className="font-medium">
                      {session?.started_at
                        ? new Date(session.started_at).toLocaleDateString()
                        : new Date(report.created_at).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-slate-500">
                      Version {report.version} · {report.status.replaceAll("_", " ")}
                    </p>
                  </div>
                  <span className="text-sm font-semibold capitalize text-brand">
                    {report.risk_level.replaceAll("_", " ")} →
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </HospitalShell>
  );
}
