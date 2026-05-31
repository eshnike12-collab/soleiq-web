"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Printer, Stethoscope, AlertTriangle, ChevronLeft } from "lucide-react";
import {
  decodeSummaryFromUrl,
  type PatientSummary,
} from "@/lib/exportSummary";
import { Button } from "@/components/ui/button";

export default function ClinicalReviewPage() {
  const [summary, setSummary] = useState<PatientSummary | null | undefined>(
    undefined
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const data = params.get("data");
    if (!data) {
      setSummary(null);
      return;
    }
    setSummary(decodeSummaryFromUrl(data));
  }, []);

  if (summary === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-warmGray-600">
        Loading clinical view…
      </div>
    );
  }
  if (summary === null) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
        <AlertTriangle className="h-10 w-10 text-risk-medium" />
        <h1 className="mt-3 text-xl font-semibold text-warmGray-800">
          No clinical data in this link
        </h1>
        <p className="mt-2 text-sm text-warmGray-600">
          This URL is missing or contains invalid data. Ask the referring
          provider for a fresh share link.
        </p>
        <Link href="/" className="mt-4 text-sm font-medium text-brand">
          Back to home
        </Link>
      </div>
    );
  }

  return <ClinicalReview summary={summary} />;
}

function ClinicalReview({ summary: s }: { summary: PatientSummary }) {
  const generatedDate = useMemo(
    () => new Date(s.generatedAt).toLocaleString(),
    [s.generatedAt]
  );

  return (
    <div className="min-h-screen bg-warmGray-50/40 print:bg-white">
      <header className="border-b border-warmGray-100 bg-white print:hidden">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center text-xs text-warmGray-600 hover:text-brand"
            >
              <ChevronLeft className="h-3 w-3" /> Home
            </Link>
            <span className="text-warmGray-100">|</span>
            <h1 className="flex items-center gap-2 text-xl font-semibold text-warmGray-800">
              <Stethoscope className="h-5 w-5 text-brand" />
              Clinical review
            </h1>
          </div>
          <Button size="sm" onClick={() => window.print()}>
            <Printer className="mr-1.5 h-4 w-4" /> Print / Save PDF
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-6 py-8 print:px-0 print:py-4">
        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-3 text-[12px] leading-snug text-blue-900 print:border-0 print:bg-transparent">
          <p>
            <span className="font-semibold">Decision support, not a directive.</span>{" "}
            Findings below support your clinical judgment. They do not replace
            examination, mandate immediate action, or constitute a diagnosis.
          </p>
        </div>

        <section>
          <p className="text-xs text-warmGray-600">Generated {generatedDate}</p>
          <h1 className="mt-1 text-2xl font-semibold text-warmGray-800">
            {s.patient.fullName ?? "Anonymous patient"}
          </h1>
          <p className="mt-0.5 text-sm text-warmGray-600">
            {[
              s.patient.age ? `${s.patient.age} y/o` : null,
              s.patient.sex,
              [s.patient.city, s.patient.state].filter(Boolean).join(", "),
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
          {s.visit.riskLevel && (
            <RiskPill level={s.visit.riskLevel} />
          )}
        </section>

        {s.riskFactors.length > 0 && (
          <Card title="Top contributing factors">
            <ol className="list-decimal space-y-1 pl-5 text-sm text-warmGray-800">
              {s.riskFactors.map((f, i) => (
                <li key={i}>{f}</li>
              ))}
            </ol>
          </Card>
        )}

        {s.clinicalDetail && (
          <>
            <Card title="Risk axes">
              <div className="grid gap-2 sm:grid-cols-2">
                {s.clinicalDetail.riskAxes.map((axis) => (
                  <div
                    key={axis.id}
                    className="rounded-xl border border-warmGray-100 p-3 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-warmGray-800">
                        {axis.label}
                      </span>
                      <ScorePill score={axis.score} />
                    </div>
                    <ul className="mt-2 space-y-0.5 text-warmGray-600">
                      {axis.signals.map((s, i) => (
                        <li key={i}>· {s}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </Card>

            <Card title="Recommended follow-up">
              <p className="text-sm font-semibold text-brand">
                {s.clinicalDetail.followUp.cadence}
              </p>
              <p className="mt-1 text-xs text-warmGray-800">
                {s.clinicalDetail.followUp.rationale}
              </p>
            </Card>

            <Card title="Differential considerations">
              <ul className="space-y-1 text-sm text-warmGray-800">
                {s.clinicalDetail.differential.map((d) => (
                  <li key={d}>• {d}</li>
                ))}
              </ul>
            </Card>
          </>
        )}

        <Card title="Medical history">
          <Detail
            rows={[
              ["Conditions", s.medicalHistory.join(", ") || "—"],
              s.diabetes
                ? [
                    "Diabetes",
                    `${s.diabetes.type.replace("_", " ")} · diagnosed ${s.diabetes.yearDiagnosed} (${s.diabetes.yearsSinceDiagnosis} y)`,
                  ]
                : null,
              s.diabetes?.hba1c != null
                ? [
                    "HbA1c / eAG",
                    `${s.diabetes.hba1c.toFixed(1)}% (≈ ${s.diabetes.eAGmgdl} mg/dL)`,
                  ]
                : null,
              s.diabetes?.glucoseLabel
                ? ["Latest meter", s.diabetes.glucoseLabel]
                : null,
              s.pad ? ["PAD status", s.pad.status] : null,
              s.pad?.abi != null ? ["ABI", s.pad.abi.toFixed(2)] : null,
              s.pad?.claudication ? ["Claudication", "yes"] : null,
              s.pad?.restPain ? ["Rest pain", "yes"] : null,
              ["Numbness", s.numbness ?? "—"],
            ].filter(Boolean) as [string, string][]}
          />
        </Card>

        {s.priorEvents.length > 0 && (
          <Card title="Prior foot events">
            <ul className="space-y-1 text-sm text-warmGray-800">
              {s.priorEvents.map((e, i) => (
                <li key={i}>
                  {e.year} — {e.side} {e.region.replace("_", " ")} — {e.type}
                </li>
              ))}
            </ul>
          </Card>
        )}

        {s.recentSurgery.flag && s.recentSurgery.procedures.length > 0 && (
          <Card title="Recent foot surgery (≤ 12 months)">
            <ul className="space-y-1 text-sm text-warmGray-800">
              {s.recentSurgery.procedures.map((p) => (
                <li key={p}>• {p.replace(/_/g, " ")}</li>
              ))}
            </ul>
          </Card>
        )}

        {s.detections.length > 0 && (
          <Card title="Detected findings">
            <ul className="space-y-1 text-sm text-warmGray-800">
              {s.detections.map((d, i) => (
                <li key={i}>
                  <span className="font-semibold capitalize">{d.type}</span> ·{" "}
                  {d.side} {d.view} ·{" "}
                  {(d.confidence * 100).toFixed(0)}% confidence
                </li>
              ))}
            </ul>
          </Card>
        )}

        {s.volumetrics.length > 0 && (
          <Card title="Volumetric metrics">
            <table className="w-full text-xs">
              <thead className="text-[10px] uppercase tracking-wide text-warmGray-600">
                <tr>
                  <th className="px-1 py-1 text-left">Metric</th>
                  {s.volumetrics.map((v) => (
                    <th key={v.side} className="px-2 py-1 text-right capitalize">
                      {v.side}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="text-warmGray-800">
                <Row label="Foot length (mm)" cells={s.volumetrics.map((v) => v.footLengthMm)} />
                <Row label="Plantar area (cm²)" cells={s.volumetrics.map((v) => v.plantarAreaCm2)} />
                <Row label="Arch profile (mm)" cells={s.volumetrics.map((v) => v.archProfileMm)} />
                <Row
                  label="Bilateral asymmetry"
                  cells={s.volumetrics.map((v) => v.bilateralAsymmetryIndex.toFixed(2))}
                />
                <Row
                  label="Wound volume (mm³)"
                  cells={s.volumetrics.map((v) => v.woundVolumeMm3 ?? "—")}
                />
              </tbody>
            </table>
          </Card>
        )}

        {s.conditionDefinitions.length > 0 && (
          <Card title="Condition reference">
            <div className="space-y-3">
              {s.conditionDefinitions.map((c) => (
                <details
                  key={c.id}
                  className="rounded-xl border border-warmGray-100 bg-warmGray-50/50 p-3 print:break-inside-avoid"
                >
                  <summary className="cursor-pointer text-sm font-semibold text-warmGray-800">
                    {c.name}
                  </summary>
                  <div className="mt-2 space-y-2 text-xs text-warmGray-800">
                    <p>{c.patientSummary}</p>
                    {c.tables.map((t, i) => (
                      <div key={i}>
                        <p className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-warmGray-600">
                          {t.title}
                        </p>
                        <ul className="mt-1 space-y-0.5">
                          {t.rows.map((r, ri) => (
                            <li key={ri}>
                              <span className="font-medium">{r.category}</span>{" "}
                              — {r.range}
                              {r.meaning && (
                                <span className="text-warmGray-600">
                                  {" "}
                                  ({r.meaning})
                                </span>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                    {c.treatmentNotes && c.treatmentNotes.length > 0 && (
                      <div>
                        <p className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-warmGray-600">
                          Clinical notes
                        </p>
                        <ul className="mt-1 list-disc space-y-0.5 pl-4">
                          {c.treatmentNotes.map((n, ni) => (
                            <li key={ni}>{n}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {(c.ageNotes || c.sexNotes || c.ethnicityNotes) && (
                      <div className="space-y-1">
                        {c.ageNotes && (
                          <p>
                            <span className="font-semibold">By age: </span>
                            {c.ageNotes}
                          </p>
                        )}
                        {c.sexNotes && (
                          <p>
                            <span className="font-semibold">By sex: </span>
                            {c.sexNotes}
                          </p>
                        )}
                        {c.ethnicityNotes && (
                          <p>
                            <span className="font-semibold">
                              By race / ethnicity:{" "}
                            </span>
                            {c.ethnicityNotes}
                          </p>
                        )}
                      </div>
                    )}
                    <p className="rounded-lg bg-blue-50 p-2 text-blue-900">
                      <span className="font-semibold">DFU relevance: </span>
                      {c.dfuImplication}
                    </p>
                    {c.citations.length > 0 && (
                      <p className="text-[10px] italic text-warmGray-600">
                        Source: {c.citations.join("; ")}
                      </p>
                    )}
                  </div>
                </details>
              ))}
            </div>
          </Card>
        )}

        <Card title="Capture quality">
          <Detail
            rows={[
              [
                "2D images",
                `${s.captureCounts.images} · mean ${(s.captureCounts.meanImageConfidence * 100).toFixed(0)}% confidence`,
              ],
              [
                "3D meshes",
                `${s.captureCounts.meshes} · mean ${(s.captureCounts.meanMeshConfidence * 100).toFixed(0)}% confidence`,
              ],
            ]}
          />
        </Card>

        <p className="pt-2 text-[10px] italic text-warmGray-600">
          SoleIQ — decision support. Visit ID {s.visit.id}.
        </p>
      </main>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-warmGray-100 bg-white p-4 print:break-inside-avoid print:border-warmGray-100 print:shadow-none">
      <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-warmGray-600">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Detail({ rows }: { rows: [string, string][] }) {
  return (
    <dl className="grid grid-cols-1 gap-y-1 text-sm sm:grid-cols-2 sm:gap-x-6">
      {rows.map(([k, v]) => (
        <div key={k} className="flex justify-between sm:block">
          <dt className="text-warmGray-600 sm:text-[10px] sm:uppercase sm:tracking-wide">
            {k}
          </dt>
          <dd className="font-medium text-warmGray-800">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

function Row({
  label,
  cells,
}: {
  label: string;
  cells: (string | number)[];
}) {
  return (
    <tr className="border-t border-warmGray-100">
      <td className="px-1 py-1.5">{label}</td>
      {cells.map((c, i) => (
        <td key={i} className="px-2 py-1.5 text-right font-mono">
          {c}
        </td>
      ))}
    </tr>
  );
}

function RiskPill({ level }: { level: string }) {
  const styles: Record<string, string> = {
    low: "bg-risk-low text-white",
    medium: "bg-risk-medium text-white",
    high: "bg-risk-high text-white",
  };
  return (
    <span
      className={`mt-3 inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-semibold ${styles[level] ?? "bg-warmGray-100 text-warmGray-800"}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-white" /> {level.toUpperCase()} RISK
    </span>
  );
}

function ScorePill({ score }: { score: string }) {
  const styles: Record<string, string> = {
    low: "bg-teal-100 text-teal-900",
    medium: "bg-amber-100 text-amber-900",
    high: "bg-risk-high text-white",
  };
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${styles[score] ?? "bg-warmGray-100 text-warmGray-800"}`}
    >
      {score}
    </span>
  );
}
