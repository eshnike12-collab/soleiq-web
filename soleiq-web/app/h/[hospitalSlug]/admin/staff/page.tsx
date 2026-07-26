import { HospitalShell } from "@/components/hospital/HospitalShell";
import { InviteStaffForm, VerifyMembershipButton } from "@/components/hospital/AdminForms";
import { PageHeader, EmptyState } from "@/components/hospital/Ui";
import { getAdminOverview } from "@/server/admin";
import { pageAccess } from "@/server/page-access";

export const dynamic = "force-dynamic";

export default async function StaffPage({
  params,
}: {
  params: Promise<{ hospitalSlug: string }>;
}) {
  const { hospitalSlug } = await params;
  const data = await pageAccess(() => getAdminOverview(hospitalSlug));
  return (
    <HospitalShell slug={data.hospital.slug} hospitalName={data.hospital.displayName} role="admin">
      <PageHeader
        eyebrow="Hospital administration"
        title="Staff & invitations"
        description="Staff cannot self-select a role. Doctor memberships stay inactive until an administrator verifies them."
      />
      <InviteStaffForm hospitalSlug={data.hospital.slug} />
      <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-5 py-4">
          <h3 className="font-semibold">Hospital memberships</h3>
        </div>
        {data.staff.length === 0 ? (
          <EmptyState>No staff memberships yet.</EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-5 py-3">Person</th>
                  <th className="px-5 py-3">Role</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Permissions</th>
                  <th className="px-5 py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {data.staff.map((row: any) => {
                  const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
                  return (
                    <tr key={row.id} className="border-t border-slate-100">
                      <td className="px-5 py-3">
                        <p className="font-medium">{profile?.full_name || "Pending user"}</p>
                        <p className="text-xs text-slate-500">{profile?.email || "Invitation not accepted"}</p>
                      </td>
                      <td className="px-5 py-3 capitalize">{row.role}</td>
                      <td className="px-5 py-3 capitalize">{row.status}</td>
                      <td className="px-5 py-3 text-xs text-slate-500">
                        {Object.entries(row.permissions ?? {})
                          .filter(([, enabled]) => enabled)
                          .map(([name]) => name.replaceAll("_", " "))
                          .join(", ") || "Standard"}
                      </td>
                      <td className="px-5 py-3">
                        {row.role === "doctor" && row.status === "invited" ? (
                          <VerifyMembershipButton hospitalSlug={data.hospital.slug} membershipId={row.id} />
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </HospitalShell>
  );
}
