import Link from "next/link";
import { HospitalShell } from "@/components/hospital/HospitalShell";
import { Metric, PageHeader } from "@/components/hospital/Ui";
import { getAdminOverview } from "@/server/admin";
import { listPlatformFeedback } from "@/server/platform";
import { pageAccess } from "@/server/page-access";

export const dynamic = "force-dynamic";

export default async function HospitalAdminPage({
  params,
}: {
  params: Promise<{ hospitalSlug: string }>;
}) {
  const { hospitalSlug } = await params;
  const data = await pageAccess(() => getAdminOverview(hospitalSlug));
  // Platform-operator extra: feedback filed by patients and doctors. Plain
  // hospital admins aren't platform admins, so this resolves to null and the
  // section simply doesn't render for them (RLS blocks the rows either way).
  const feedback = await listPlatformFeedback().catch(() => null);
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

      {feedback !== null && (
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <h3 className="font-semibold text-slate-950">
                Patient &amp; doctor feedback ({feedback.length})
              </h3>
              <p className="mt-0.5 text-xs text-slate-500">
                Everything sent through the &ldquo;Send feedback&rdquo; button,
                newest first — full message included.
              </p>
            </div>
          </div>
          <div className="mt-3 divide-y divide-slate-100">
            {feedback.length === 0 ? (
              <p className="py-4 text-sm text-slate-500">No feedback yet.</p>
            ) : (
              feedback.map((item: any) => (
                <div key={item.id} className="py-3">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="rounded-full bg-blue-50 px-2 py-0.5 font-semibold capitalize text-brand">
                      {item.category}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold capitalize text-slate-700">
                      from a {item.role}
                    </span>
                    <span className="text-slate-500">
                      {new Date(item.created_at).toLocaleString()}
                    </span>
                    {item.contact_email && (
                      <a
                        href={`mailto:${item.contact_email}`}
                        className="font-semibold text-brand"
                      >
                        {item.contact_email}
                      </a>
                    )}
                  </div>
                  <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-slate-800">
                    {item.message}
                  </p>
                </div>
              ))
            )}
          </div>
        </section>
      )}
    </HospitalShell>
  );
}
