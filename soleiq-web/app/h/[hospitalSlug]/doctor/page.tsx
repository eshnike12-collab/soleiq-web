import Link from "next/link";
import { AlertTriangle, ChevronRight } from "lucide-react";
import { HospitalShell } from "@/components/hospital/HospitalShell";
import { EmptyState, PageHeader } from "@/components/hospital/Ui";
import { getDoctorWorklist } from "@/server/reports";
import { pageAccess } from "@/server/page-access";

export const dynamic = "force-dynamic";

const riskStyle: Record<string, string> = {
  clear: "bg-emerald-50 text-emerald-800",
  watch: "bg-amber-50 text-amber-900",
  see_someone_soon: "bg-orange-100 text-orange-900",
  urgent: "bg-red-100 text-red-900",
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
      <form className="mb-5 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-[1fr_190px_auto_auto]">
        <input
          name="search"
          defaultValue={resolvedSearchParams.search}
          placeholder="Search patient or hospital ID"
          className="h-10 rounded-xl border border-slate-200 px-3 text-sm"
        />
        <select
          name="risk"
          defaultValue={resolvedSearchParams.risk}
          className="h-10 rounded-xl border border-slate-200 px-3 text-sm"
        >
          <option value="">All screening levels</option>
          <option value="urgent">Urgent</option>
          <option value="see_someone_soon">See someone soon</option>
          <option value="watch">Watch</option>
          <option value="clear">Clear</option>
        </select>
        <label className="flex h-10 items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            name="unreviewed"
            value="true"
            defaultChecked={resolvedSearchParams.unreviewed === "true"}
          />
          Unreviewed
        </label>
        <button className="h-10 rounded-xl bg-brand px-4 text-sm font-semibold text-white">
          Apply
        </button>
      </form>
      {data.rows.length === 0 ? (
        <EmptyState>
          No authorized patients match these filters. An empty worklist does not
          grant access to the hospital roster.
        </EmptyState>
      ) : (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Patient</th>
                  <th className="px-4 py-3">Facility</th>
                  <th className="px-4 py-3">Relationship</th>
                  <th className="px-4 py-3">Latest check</th>
                  <th className="px-4 py-3">Level</th>
                  <th className="px-4 py-3">Change</th>
                  <th className="px-4 py-3">Review</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {data.rows.map((row: any) => (
                  <tr key={row.organization_patient_id} className="border-t border-slate-100">
                    <td className="px-4 py-3">
                      <p className="flex items-center gap-2 font-semibold">
                        {row.urgent && <AlertTriangle className="h-4 w-4 text-red-600" />}
                        {row.patient_name}
                      </p>
                      <p className="font-mono text-xs text-slate-500">{row.mrn_display}</p>
                    </td>
                    <td className="px-4 py-3">{row.facility_name || "—"}</td>
                    <td className="px-4 py-3 capitalize">{row.relationship}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {row.latest_screening_at ? new Date(row.latest_screening_at).toLocaleDateString() : "No report"}
                    </td>
                    <td className="px-4 py-3">
                      {row.latest_risk_level ? (
                        <span className={`rounded-full px-2 py-1 text-xs font-semibold ${riskStyle[row.latest_risk_level]}`}>
                          {String(row.latest_risk_level).replaceAll("_", " ")}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {row.previous_risk_level
                        ? `${String(row.previous_risk_level).replaceAll("_", " ")} → ${String(row.latest_risk_level).replaceAll("_", " ")}`
                        : "First check"}
                    </td>
                    <td className="px-4 py-3">
                      {row.unreviewed ? (
                        <span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-semibold text-brand">New</span>
                      ) : (
                        <span className="text-xs text-slate-500">
                          {row.last_reviewed_at ? new Date(row.last_reviewed_at).toLocaleDateString() : "—"}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {row.latest_report_id ? (
                        <Link
                          href={`/h/${data.hospital.slug}/patients/${row.organization_patient_id}/reports/${row.latest_report_id}`}
                          className="inline-flex items-center text-xs font-semibold text-brand"
                        >
                          Exact report <ChevronRight className="h-4 w-4" />
                        </Link>
                      ) : (
                        <Link
                          href={`/h/${data.hospital.slug}/patients/${row.organization_patient_id}`}
                          className="text-xs font-semibold text-brand"
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
    </HospitalShell>
  );
}
