import Link from "next/link";
import { HospitalShell } from "@/components/hospital/HospitalShell";
import { EmptyState, PageHeader } from "@/components/hospital/Ui";
import { getPatientClinicalRecord } from "@/server/patients";
import { pageAccess } from "@/server/page-access";
import { LocalTime } from "@/components/ui/LocalTime";
import { ReportLiveRefresh } from "@/components/live/ReportLiveRefresh";
import {
  MedicationsBlock,
  type ReportedMedications,
} from "@/components/result/MedicationsBlock";

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
      <ReportLiveRefresh />
      <PageHeader
        eyebrow={
          /* Unclaimed is part of what this record IS, so it goes in the
             eyebrow where the record is named rather than in a side note. */
          patient?.linked_user_id
            ? "Authorized patient record"
            : "Authorized patient record — UNCLAIMED"
        }
        title={patient?.full_name || "Patient"}
        description={`${facility?.name || "No facility"} · Hospital ID ${data.enrollment.mrn || "not recorded"}. Timeline links preserve the exact report version.`}
      />
      {!patient?.linked_user_id && (
        <p className="mb-4 rounded-2xl bg-warn-soft px-4 py-3 text-sm leading-relaxed text-amber-800">
          <strong>This record is unclaimed.</strong> Nobody has taken ownership
          of it yet, so it is being kept on the patient&apos;s behalf. Invite
          them to take control from the caregiver dashboard — once they do, they
          own it and can remove your access.
        </p>
      )}
      {/* Reported history that applies to every report in the timeline below,
          rather than to one check — demographics is the saved intake, which
          is where the medication answer lands. */}
      <section className="mb-4">
        <MedicationsBlock
          medications={
            (patient?.demographics as { medications?: ReportedMedications } | null)
              ?.medications
          }
          className="rounded-2xl border border-slate-200 bg-surface-raised p-5 shadow-card"
        />
      </section>
      <section className="rounded-2xl border border-slate-200 bg-surface-raised shadow-card p-5">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-semibold">Longitudinal report timeline</h3>
          {data.reports.length >= 2 && (
            <Link
              href={`/h/${data.hospital.slug}/patients/${data.enrollment.id}/compare`}
              className="text-sm font-semibold text-brand"
            >
              Compare checks →
            </Link>
          )}
        </div>
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
                        ? <LocalTime value={session.started_at} mode="date" />
                        : <LocalTime value={report.created_at} mode="date" />}
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
