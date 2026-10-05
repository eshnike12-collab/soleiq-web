import Link from "next/link";
import {
  ArrowRight,
  Building2,
  ClipboardList,
  ShieldCheck,
  Stethoscope,
  Users,
} from "lucide-react";
import { HospitalShell } from "@/components/hospital/HospitalShell";
import { Metric, PageHeader } from "@/components/hospital/Ui";
import { getAdminOverview } from "@/server/admin";
import { getPlatformMonthlyStats, listPlatformFeedback } from "@/server/platform";
import { PlatformMonthlyPanel } from "@/components/hospital/PlatformMonthlyPanel";
import { platformReportRecipient } from "@/server/monthlyReport";
import { pageAccess } from "@/server/page-access";
import { LocalTime } from "@/components/ui/LocalTime";

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
  // Same gate as the feedback block above: getPlatformMonthlyStats throws for
  // anyone who is not a platform administrator, so this resolves to null and
  // the panel does not render for an ordinary hospital admin.
  const monthly = await getPlatformMonthlyStats().catch(() => null);
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
        <Metric label="Facilities" value={data.facilities.length} icon={Building2} />
        <Metric label="Active doctors" value={activeDoctors} icon={Stethoscope} />
        <Metric label="Patient enrollments" value={data.patients.length} icon={ClipboardList} />
        <Metric
          label="Active assignments"
          value={data.assignments.filter((row: any) => row.status === "active").length}
          icon={Users}
        />
      </section>
      <section className="mt-6 grid gap-4 md:grid-cols-2">
        {([
          ["Staff & invitations", "Invite staff and verify doctors before activation.", "staff", Users],
          ["Patient enrollment", "Create hospital-specific patient records and link accounts safely.", "patients", ClipboardList],
          ["Care assignments", "Control which doctors are authorized to treat each patient.", "assignments", Building2],
          ["Audit events", "Review access and security-relevant actions.", "audit", ShieldCheck],
        ] as const).map(([title, description, route, Icon]) => (
          <Link
            key={route}
            href={`/h/${data.hospital.slug}/admin/${route}`}
            className="flex gap-4 rounded-2xl border border-slate-200 bg-surface-raised p-5 shadow-card transition duration-150 hover:border-blue-200 hover:shadow-lifted"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
              <Icon className="h-[20px] w-[20px]" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block text-[17px] font-bold text-ink">{title}</span>
              <span className="mt-1 block text-[15px] leading-relaxed text-ink-soft">
                {description}
              </span>
              <span className="mt-3 inline-flex items-center gap-1 text-[14px] font-bold text-primary">
                Open <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </span>
            </span>
          </Link>
        ))}
      </section>

      {monthly !== null && (
        <div className="mt-6">
          <PlatformMonthlyPanel
            current={monthly.current}
            currentStats={monthly.currentStats}
            previous={monthly.previous}
            previousStats={monthly.previousStats}
            reportRecipient={platformReportRecipient()}
          />
        </div>
      )}

      {feedback !== null && (
        <section className="mt-6 rounded-2xl border border-slate-200 bg-surface-raised shadow-card p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <h3 className="text-[17px] font-bold text-ink">
                Patient &amp; doctor feedback ({feedback.length})
              </h3>
              <p className="mt-1 text-[14px] text-ink-soft">
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
                      <LocalTime value={item.created_at} />
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
