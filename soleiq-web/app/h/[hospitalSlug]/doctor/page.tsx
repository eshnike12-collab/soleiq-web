import Link from "next/link";
import { AlertTriangle, ChevronRight } from "lucide-react";
import { HospitalShell } from "@/components/hospital/HospitalShell";
import { EmptyState, PageHeader } from "@/components/hospital/Ui";
import { SharedWithMeCard } from "@/components/patient/SharedWithMeCard";
import { getDoctorWorklist } from "@/server/reports";
import { pageAccess } from "@/server/page-access";
import { LocalTime } from "@/components/ui/LocalTime";

export const dynamic = "force-dynamic";

// Tints only. The LABEL is the stored value with underscores swapped and is
// clinical content, not presentation — it is rendered unchanged below.
// Matched to the patient app's chips so one risk level looks the same to the
// patient and to their clinician.
const riskStyle: Record<string, string> = {
  clear: "bg-secondary-soft text-secondary",
  watch: "bg-warn-soft text-warn",
  see_someone_soon: "bg-orange-100 text-orange-700",
  urgent: "bg-urgent-soft text-urgent",
};

export default async function DoctorWorklistPage({
  params,
  searchParams,
}: {
  params: Promise<{ hospitalSlug: string }>;
  searchParams: Promise<{ search?: string; risk?: string; unreviewed?: string; cursor?: string }>;
}) {
  const { hospitalSlug } = await params;
  const resolvedSearchParams = await searchParams;
  const data = await pageAccess(() =>
    getDoctorWorklist(hospitalSlug, resolvedSearchParams)
  );
  return (
    <HospitalShell slug={data.hospital.slug} hospitalName={data.hospital.displayName} role="doctor">
      <PageHeader
        eyebrow="Clinical worklist"
        title="Authorized patients"
        description="Only active care-team assignments or valid patient consent appear here. Each result link opens that exact report."
      />
      <form className="mb-5 grid gap-3 rounded-2xl border border-slate-200 bg-surface-raised shadow-card p-4 sm:grid-cols-[1fr_190px_auto_auto]">
        <input
          name="search"
          defaultValue={resolvedSearchParams.search}
          placeholder="Search patient or hospital ID"
          /* The placeholder was the only name this field had, and a
             placeholder disappears the moment you type into it. */
          aria-label="Search patient or hospital ID"
          className="h-11 rounded-xl border border-slate-200 bg-surface-raised px-3 text-[15px] text-ink outline-none transition-shadow placeholder:text-ink-faint focus:border-primary focus:ring-4 focus:ring-primary-soft"
        />
        <select
          name="risk"
          defaultValue={resolvedSearchParams.risk}
          aria-label="Filter by screening level"
          className="h-11 rounded-xl border border-slate-200 bg-surface-raised px-3 text-[15px] text-ink outline-none transition-shadow focus:border-primary focus:ring-4 focus:ring-primary-soft"
        >
          <option value="">All screening levels</option>
          <option value="urgent">Urgent</option>
          <option value="see_someone_soon">See someone soon</option>
          <option value="watch">Watch</option>
          <option value="clear">Clear</option>
        </select>
        <label className="flex h-11 cursor-pointer items-center gap-2 px-1 text-[15px] font-medium text-ink-soft">
          <input
            type="checkbox"
            name="unreviewed"
            value="true"
            defaultChecked={resolvedSearchParams.unreviewed === "true"}
            className="h-[18px] w-[18px] rounded border-slate-300 text-primary focus:ring-4 focus:ring-primary-soft"
          />
          Unreviewed
        </label>
        <button className="h-11 rounded-xl bg-primary px-5 text-[15px] font-bold text-white shadow-button transition-colors hover:bg-primary-deep">
          Apply
        </button>
      </form>
      {data.rows.length === 0 ? (
        <EmptyState>
          No authorized patients match these filters. An empty worklist does not
          grant access to the hospital roster.
        </EmptyState>
      ) : (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-surface-raised shadow-card">
          <div className="overflow-x-auto">
            {/* min-width lowered from 1050px, and Facility hidden below xl.
                The real fix is the sticky last column below: at 1050px the
                "Exact report" link sat off the right edge, so reaching the
                one action on the row meant scrolling the table sideways
                first. */}
            <table className="w-full min-w-[820px] text-left text-[15px]">
              <thead className="bg-slate-50 text-[12px] font-bold uppercase tracking-[0.05em] text-ink-faint">
                <tr>
                  <th className="px-4 py-3">Patient</th>
                  <th className="hidden px-4 py-3 xl:table-cell">Facility</th>
                  <th className="px-4 py-3">Relationship</th>
                  <th className="px-4 py-3">Latest check</th>
                  <th className="px-4 py-3">Level</th>
                  <th className="px-4 py-3">Change</th>
                  <th className="px-4 py-3">Review</th>
                  {/* Pinned to the right edge so the row's action is reachable
                      at any scroll position. The left border keeps it legible
                      as content slides underneath it. */}
                  <th className="sticky right-0 z-10 border-l border-slate-200 bg-slate-50 px-4 py-3"><span className="sr-only">Open record</span></th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((row: any) => (
                  <tr
                    key={`${row.organization_patient_id}-${row.latest_report_id ?? "none"}`}
                    className="border-t border-slate-100"
                  >
                    <td className="px-4 py-3">
                      <p className="flex items-center gap-2 font-semibold">
                        {row.urgent && <AlertTriangle className="h-4 w-4 shrink-0 text-urgent" aria-label="Urgent" />}
                        {row.patient_name}
                      </p>
                      <p className="font-mono text-[13px] text-ink-faint">{row.mrn_display}</p>
                    </td>
                    <td className="hidden px-4 py-3 xl:table-cell">{row.facility_name || "—"}</td>
                    <td className="px-4 py-3 capitalize">{row.relationship}</td>
                    <td className="px-4 py-3 text-[14px] text-ink-soft">
                      {row.latest_screening_at ? <LocalTime value={row.latest_screening_at} mode="date" /> : "No report"}
                    </td>
                    <td className="px-4 py-3">
                      {row.latest_risk_level ? (
                        <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-[12px] font-semibold capitalize ${riskStyle[row.latest_risk_level] ?? "bg-slate-100 text-ink-soft"}`}>
                          {String(row.latest_risk_level).replaceAll("_", " ")}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3 text-[14px] text-ink-soft">
                      {row.previous_risk_level
                        ? `${String(row.previous_risk_level).replaceAll("_", " ")} → ${String(row.latest_risk_level).replaceAll("_", " ")}`
                        : "First check"}
                    </td>
                    <td className="px-4 py-3">
                      {row.unreviewed ? (
                        <span className="rounded-full bg-primary-soft px-2.5 py-1 text-[12px] font-semibold text-primary">New</span>
                      ) : (
                        <span className="text-[14px] text-ink-faint">
                          {row.last_reviewed_at ? <LocalTime value={row.last_reviewed_at} mode="date" /> : "—"}
                        </span>
                      )}
                    </td>
                    <td className="sticky right-0 z-10 border-l border-slate-200 bg-surface-raised px-4 py-3 text-right">
                      {row.latest_report_id ? (
                        <Link
                          href={`/h/${data.hospital.slug}/patients/${row.organization_patient_id}/reports/${row.latest_report_id}`}
                          className="inline-flex min-h-[44px] items-center gap-0.5 text-[14px] font-bold text-primary transition-colors hover:text-primary-deep"
                        >
                          Exact report <ChevronRight className="h-4 w-4" />
                        </Link>
                      ) : (
                        <Link
                          href={`/h/${data.hospital.slug}/patients/${row.organization_patient_id}`}
                          className="inline-flex min-h-[44px] items-center text-[14px] font-bold text-primary transition-colors hover:text-primary-deep"
                        >
                          Record
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
      {/* Patients who shared their results directly with this signed-in
          user via their care circle (separate from hospital assignments). */}
      <div className="mt-6">
        <SharedWithMeCard />
      </div>
    </HospitalShell>
  );
}
