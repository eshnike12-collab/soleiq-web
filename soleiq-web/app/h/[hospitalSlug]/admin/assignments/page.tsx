import { AssignmentForm } from "@/components/hospital/AdminForms";
import { HospitalShell } from "@/components/hospital/HospitalShell";
import { EmptyState, PageHeader } from "@/components/hospital/Ui";
import { getAdminOverview } from "@/server/admin";
import { pageAccess } from "@/server/page-access";

export const dynamic = "force-dynamic";

export default async function AssignmentsPage({
  params,
}: {
  params: Promise<{ hospitalSlug: string }>;
}) {
  const { hospitalSlug } = await params;
  const data = await pageAccess(() => getAdminOverview(hospitalSlug));
  const doctors = data.staff
    .filter((row: any) => row.role === "doctor" && row.status === "active")
    .map((row: any) => {
      const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
      return { id: row.id, label: profile?.full_name || profile?.email || "Doctor" };
    });
  const patients = data.patients.map((row: any) => ({
    id: row.organization_patient_id,
    label: `${row.patient_display} · ${row.mrn_display}`,
  }));
  return (
    <HospitalShell slug={data.hospital.slug} hospitalName={data.hospital.displayName} role="admin">
      <PageHeader
        eyebrow="Hospital administration"
        title="Care-team assignments"
        description="Assignments are hospital-scoped, time-bounded clinical relationships. Ending an assignment removes future access immediately."
      />
      <AssignmentForm hospitalSlug={data.hospital.slug} doctors={doctors} patients={patients} />
      <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {data.assignments.length === 0 ? (
          <EmptyState>No assignment history yet.</EmptyState>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-5 py-3">Relationship</th>
                <th className="px-5 py-3">Patient enrollment</th>
                <th className="px-5 py-3">Doctor membership</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Validity</th>
              </tr>
            </thead>
            <tbody>
              {data.assignments.map((row: any) => (
                <tr key={row.id} className="border-t border-slate-100">
                  <td className="px-5 py-3 capitalize">{row.relationship}</td>
                  <td className="px-5 py-3 font-mono text-xs">{row.organization_patient_id.slice(0, 8)}…</td>
                  <td className="px-5 py-3 font-mono text-xs">{row.clinician_membership_id.slice(0, 8)}…</td>
                  <td className="px-5 py-3 capitalize">{row.status}</td>
                  <td className="px-5 py-3 text-xs text-slate-500">
                    {new Date(row.starts_at).toLocaleDateString()} – {row.ends_at ? new Date(row.ends_at).toLocaleDateString() : "ongoing"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </HospitalShell>
  );
}
