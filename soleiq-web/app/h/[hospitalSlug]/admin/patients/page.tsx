import { EnrollPatientForm } from "@/components/hospital/AdminForms";
import { HospitalShell } from "@/components/hospital/HospitalShell";
import { EmptyState, PageHeader } from "@/components/hospital/Ui";
import { getAdminOverview } from "@/server/admin";
import { pageAccess } from "@/server/page-access";

export const dynamic = "force-dynamic";

export default async function AdminPatientsPage({
  params,
  searchParams,
}: {
  params: Promise<{ hospitalSlug: string }>;
  searchParams: Promise<{ search?: string }>;
}) {
  const { hospitalSlug } = await params;
  const resolvedSearchParams = await searchParams;
  const data = await pageAccess(() =>
    getAdminOverview(hospitalSlug, { search: resolvedSearchParams.search })
  );
  const phiAccess = Boolean(data.hospital.membership.permissions.phi_access);
  return (
    <HospitalShell slug={data.hospital.slug} hospitalName={data.hospital.displayName} role="admin">
      <PageHeader
        eyebrow="Hospital administration"
        title="Patient enrollment"
        description="Each row is a hospital-specific enrollment. MRNs never appear in routes and are masked when the administrator lacks PHI permission."
        action={
          <form>
            <input
              name="search"
              defaultValue={resolvedSearchParams.search}
              placeholder="Search authorized roster"
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm"
            />
          </form>
        }
      />
      <EnrollPatientForm
        hospitalSlug={data.hospital.slug}
        facilities={data.facilities.map((facility: any) => ({ id: facility.id, name: facility.name }))}
        phiAccess={phiAccess}
      />
      <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {data.patients.length === 0 ? (
          <EmptyState>No matching patient enrollments.</EmptyState>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-5 py-3">Patient</th>
                <th className="px-5 py-3">Hospital ID</th>
                <th className="px-5 py-3">Facility</th>
                <th className="px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.patients.map((row: any) => (
                <tr key={row.organization_patient_id} className="border-t border-slate-100">
                  <td className="px-5 py-3 font-medium">{row.patient_display}</td>
                  <td className="px-5 py-3 font-mono text-xs">{row.mrn_display}</td>
                  <td className="px-5 py-3">{row.facility_name || "—"}</td>
                  <td className="px-5 py-3 capitalize">{row.enrollment_status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </HospitalShell>
  );
}
