import Link from "next/link";
import { HospitalShell } from "@/components/hospital/HospitalShell";
import { Metric, PageHeader } from "@/components/hospital/Ui";
import { getAdminOverview } from "@/server/admin";
import { pageAccess } from "@/server/page-access";

export const dynamic = "force-dynamic";

export default async function HospitalAdminPage({
  params,
}: {
  params: Promise<{ hospitalSlug: string }>;
}) {
  const { hospitalSlug } = await params;
  const data = await pageAccess(() => getAdminOverview(hospitalSlug));
  const activeDoctors = data.staff.filter(
    (row: any) => row.role === "doctor" && row.status === "active"
  ).length;
  return (
    <HospitalShell
      slug={data.hospital.slug}
      hospitalName={data.hospital.displayName}
      role="admin"
    >
      <PageHeader
        eyebrow="Hospital administration"
        title="Operations overview"
        description="Manage the hospital boundary, staff verification, patient enrollment, assignments, and access activity. Clinical data remains unavailable unless your membership explicitly includes PHI access."
      />
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Facilities" value={data.facilities.length} />
        <Metric label="Active doctors" value={activeDoctors} />
        <Metric label="Patient enrollments" value={data.patients.length} />
        <Metric label="Active assignments" value={data.assignments.filter((row: any) => row.status === "active").length} />
      </section>
      <section className="mt-6 grid gap-4 md:grid-cols-2">
        {[
          ["Staff & invitations", "Invite staff and verify doctors before activation.", "staff"],
          ["Patient enrollment", "Create hospital-specific patient records and link accounts safely.", "patients"],
          ["Care assignments", "Control which doctors are authorized to treat each patient.", "assignments"],
          ["Audit events", "Review access and security-relevant actions.", "audit"],
        ].map(([title, description, route]) => (
          <Link
            key={route}
            href={`/h/${data.hospital.slug}/admin/${route}`}
            className="rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-blue-300"
          >
            <h3 className="font-semibold text-slate-950">{title}</h3>
            <p className="mt-1 text-sm text-slate-600">{description}</p>
            <p className="mt-4 text-xs font-semibold text-brand">Open →</p>
          </Link>
        ))}
      </section>
    </HospitalShell>
  );
}
