import Link from "next/link";
import { getPatientReleasedReport } from "@/server/patients";
import { pageAccess } from "@/server/page-access";

export const dynamic = "force-dynamic";

export default async function PatientReportPage({
  params,
}: {
  params: Promise<{ reportId: string }>;
}) {
  const { reportId } = await params;
  const report = await pageAccess(() =>
    getPatientReleasedReport(reportId, crypto.randomUUID())
  );
  const summary = report.patient_summary as any;
  return (
    <div className="min-h-screen bg-[#f4f6f8] px-5 py-8">
      <main className="mx-auto max-w-3xl">
        <Link href="/home" className="text-sm font-semibold text-brand">← My results</Link>
        <article className="mt-4 rounded-3xl border border-slate-200 bg-white p-7">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">
            {report.status === "released" ? "Released patient report" : "Patient report"} · version {report.version}
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-950">
            {report.hospital_name_snapshot}
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            {report.status === "released" ? "Released" : "Completed"}{" "}
            {new Date(report.finalized_at || report.created_at).toLocaleString()}
          </p>
          {report.status !== "released" && (
            <p className="mt-3 rounded-2xl bg-slate-100 px-4 py-3 text-xs leading-relaxed text-slate-600">
              <span className="font-semibold">Pending clinician review.</span>{" "}
              These results are available to you and your care team right away,
              but a clinician hasn&apos;t reviewed them yet — guidance may be
              updated after review.
            </p>
          )}
          <div className="mt-6 rounded-2xl bg-blue-50 p-5">
            <p className="text-xs font-semibold uppercase text-brand">
              {report.risk_level.replaceAll("_", " ")}
            </p>
            <p className="mt-2 text-lg font-semibold text-slate-950">
              {summary?.overall?.headline || "Your care team released this screening summary."}
            </p>
          </div>
          {((report as any).photos ?? []).length > 0 && (
            <section className="mt-6">
              <h2 className="font-semibold">Your photos from this check</h2>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {((report as any).photos ?? []).map((photo: any) => (
                  <a
                    key={photo.assetId}
                    href={photo.url}
                    target="_blank"
                    rel="noreferrer"
                    className="relative block overflow-hidden rounded-2xl bg-slate-100"
                  >
                    <div className="aspect-square">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photo.url}
                        alt={`${photo.side} foot ${photo.view}`}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <span className="absolute inset-x-0 bottom-0 bg-black/50 px-1.5 py-1 text-center text-[10px] font-semibold uppercase text-white">
                      {photo.side} · {photo.view}
                    </span>
                  </a>
                ))}
              </div>
              <p className="mt-2 text-xs text-slate-500">Tap a photo to view it full-size.</p>
            </section>
          )}
          {(summary?.findings ?? []).map((finding: any, index: number) => (
            <section key={index} className="mt-4 rounded-2xl border border-slate-100 p-5">
              <h2 className="font-semibold">{finding.what_we_saw}</h2>
              <p className="mt-1 text-xs text-slate-500">{finding.location_plain}</p>
              <p className="mt-2 text-sm leading-relaxed text-slate-700">{finding.why_it_matters}</p>
            </section>
          ))}
          <section className="mt-6">
            <h2 className="font-semibold">What to do next</h2>
            <ul className="mt-2 list-disc space-y-2 pl-5 text-sm text-slate-700">
              {(summary?.what_to_do ?? []).map((item: string) => <li key={item}>{item}</li>)}
            </ul>
          </section>
          <p className="mt-6 text-xs leading-relaxed text-slate-500">
            {summary?.limits || "Photos cannot show problems beneath the skin."} This is screening support, not a diagnosis.
          </p>
        </article>
      </main>
    </div>
  );
}
