import Link from "next/link";
import { HospitalShell } from "@/components/hospital/HospitalShell";
import { PageHeader } from "@/components/hospital/Ui";
import {
  ComparisonView,
  type ComparableCheck,
} from "@/components/compare/ComparisonView";
import { getPatientComparisonData } from "@/server/patients";
import { pageAccess } from "@/server/page-access";

export const dynamic = "force-dynamic";

export default async function PatientComparePage({
  params,
}: {
  params: Promise<{ hospitalSlug: string; organizationPatientId: string }>;
}) {
  const { hospitalSlug, organizationPatientId } = await params;
  const data = await pageAccess(() =>
    getPatientComparisonData(
      hospitalSlug,
      organizationPatientId,
      crypto.randomUUID()
    )
  );
  const patient = Array.isArray((data.enrollment as any).patients)
    ? (data.enrollment as any).patients[0]
    : (data.enrollment as any).patients;
  return (
    <HospitalShell
      slug={data.hospital.slug}
      hospitalName={data.hospital.displayName}
      role="doctor"
    >
      <PageHeader
        eyebrow="Assessment comparison"
        title={patient?.full_name || "Patient"}
        description="Side-by-side changes between any two checks: risk level, findings, and photos. Reads the exact stored report versions."
        action={
          <Link
            href={`/h/${data.hospital.slug}/patients/${data.enrollment.id}`}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-brand"
          >
            Back to timeline
          </Link>
        }
      />
      <div className="max-w-3xl">
        <ComparisonView checks={data.checks as ComparableCheck[]} />
      </div>
    </HospitalShell>
  );
}
