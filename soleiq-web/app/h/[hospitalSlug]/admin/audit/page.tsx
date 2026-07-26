import { HospitalShell } from "@/components/hospital/HospitalShell";
import { EmptyState, PageHeader } from "@/components/hospital/Ui";
import { getAdminOverview } from "@/server/admin";
import { pageAccess } from "@/server/page-access";

export const dynamic = "force-dynamic";

export default async function AuditPage({
  params,
}: {
  params: Promise<{ hospitalSlug: string }>;
}) {
  const { hospitalSlug } = await params;
  const data = await pageAccess(() => getAdminOverview(hospitalSlug));
  return (
    <HospitalShell slug={data.hospital.slug} hospitalName={data.hospital.displayName} role="admin">
      <PageHeader
        eyebrow="Security"
        title="Audit events"
        description="Append-only access and security events. Request IDs support incident investigation without logging clinical payloads."
      />
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {data.audit.length === 0 ? (
          <EmptyState>No audit events are visible yet.</EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-5 py-3">Time</th>
                  <th className="px-5 py-3">Action</th>
                  <th className="px-5 py-3">Resource</th>
                  <th className="px-5 py-3">Purpose</th>
                  <th className="px-5 py-3">Request</th>
                </tr>
              </thead>
              <tbody>
                {data.audit.map((row: any) => (
                  <tr key={row.id} className="border-t border-slate-100">
                    <td className="px-5 py-3 text-xs">{new Date(row.occurred_at).toLocaleString()}</td>
                    <td className="px-5 py-3 font-medium">{row.action}</td>
                    <td className="px-5 py-3">{row.resource_type}</td>
                    <td className="px-5 py-3">{row.purpose || "—"}</td>
                    <td className="px-5 py-3 font-mono text-xs text-slate-500">{row.request_id.slice(0, 12)}…</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </HospitalShell>
  );
}
