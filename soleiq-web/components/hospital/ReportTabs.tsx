"use client";

/**
 * Doctor's report body, split into two tabs:
 *   Overview         — concise: risk + headline, photos, finding titles.
 *   Enhanced metrics — everything: full findings with regions/explanations,
 *                      screening detail lists, capture quality, the complete
 *                      intake sheet (every field, "Not provided" when
 *                      skipped), identifiers, and review history.
 * All props are serializable JSON handed down from the server component.
 */

import { Tabs } from "@/components/ui/tabs";
import { ReportPhotos } from "@/components/hospital/ReportPhotos";

const NOT_PROVIDED = "Not provided";

function Row({ label, value }: { label: string; value?: unknown }) {
  const empty =
    value === null ||
    value === undefined ||
    (typeof value === "string" && value.trim().length === 0) ||
    (Array.isArray(value) && value.length === 0);
  return (
    <div className="flex items-baseline justify-between gap-3 py-1">
      <span className="shrink-0 text-xs text-slate-500">{label}</span>
      <span
        className={
          empty
            ? "text-right text-sm italic text-slate-400"
            : "text-right text-sm font-medium text-slate-900"
        }
      >
        {empty ? NOT_PROVIDED : Array.isArray(value) ? value.join(", ") : String(value)}
      </span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <h3 className="mb-2 font-semibold text-slate-950">{title}</h3>
      {children}
    </section>
  );
}

const titleCase = (value: unknown) =>
  String(value ?? "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

export function ReportTabs({
  clinical,
  riskLevel,
  assets,
  intake,
  patient,
  mrn,
  facilityName,
  reviews,
  hospitalSlug,
  analysisRunId,
  reportVersion,
}: {
  clinical: any;
  riskLevel: string;
  assets: { id: string; side: string | null; view: string | null; captured_at: string | null }[];
  intake: any;
  patient: { full_name?: string | null; date_of_birth?: string | null; sex?: string | null } | null;
  mrn: string | null;
  facilityName: string | null;
  reviews: { action: string; clinical_note: string | null; created_at: string }[];
  hospitalSlug: string;
  analysisRunId: string | null;
  reportVersion: number;
}) {
  const findings: any[] = Array.isArray(clinical?.findings) ? clinical.findings : [];
  const diabetes = intake?.diabetes ?? null;
  const pad = intake?.pad ?? null;

  const overview = (
    <div className="space-y-5">
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-semibold">Clinical screening summary</h3>
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold capitalize text-brand">
            {riskLevel.replaceAll("_", " ")}
          </span>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-slate-700">
          {clinical?.overall?.headline || clinical?.summary || "Structured clinical result recorded."}
        </p>
        <p className="mt-3 text-xs text-slate-500">
          Photo-based screening support only. It does not establish a diagnosis
          or replace an in-person examination.
        </p>
      </section>
      <ReportPhotos assets={assets} />
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="font-semibold">Headline findings ({findings.length})</h3>
        <div className="mt-3 space-y-2">
          {findings.length === 0 ? (
            <p className="text-sm text-slate-500">No visible findings were recorded.</p>
          ) : (
            findings.map((finding: any, index: number) => (
              <div key={index} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 px-4 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900">{finding.what_we_saw || "Finding"}</p>
                  <p className="text-xs text-slate-500">
                    {finding.foot} foot · {finding.surface}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold capitalize text-slate-700">
                  {finding.concern ?? "noted"}
                </span>
              </div>
            ))
          )}
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Full detail — regions, explanations, capture quality, and the complete
          intake sheet — is under <span className="font-semibold">Enhanced metrics</span>.
        </p>
      </section>
    </div>
  );

  const enhanced = (
    <div className="space-y-5">
      <Section title={`Full findings (${findings.length})`}>
        <div className="space-y-3">
          {findings.length === 0 ? (
            <p className="text-sm text-slate-500">No visible findings were recorded.</p>
          ) : (
            findings.map((finding: any, index: number) => (
              <article key={index} className="rounded-xl border border-slate-100 p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">{finding.what_we_saw || "Finding"}</p>
                  <span className="flex shrink-0 items-center gap-1.5">
                    {finding.lighting_artifact_possible && (
                      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-900">
                        lighting artifact?
                      </span>
                    )}
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold capitalize text-slate-700">
                      {finding.concern ?? "noted"}
                    </span>
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {finding.foot} foot · {finding.surface} · {finding.location_plain}
                  {finding.region
                    ? ` · region x ${Number(finding.region.x).toFixed(2)}, y ${Number(finding.region.y).toFixed(2)}, ${(Number(finding.region.w) * 100).toFixed(0)}×${(Number(finding.region.h) * 100).toFixed(0)}%`
                    : " · no region marked"}
                </p>
                <p className="mt-2 text-sm text-slate-700">{finding.why_it_matters}</p>
                {finding.deeper_explanation && (
                  <p className="mt-1 text-xs leading-relaxed text-slate-500">{finding.deeper_explanation}</p>
                )}
              </article>
            ))
          )}
        </div>
      </Section>

      <Section title="Screening detail">
        {(clinical?.looks_good?.length ?? 0) > 0 && (
          <>
            <p className="text-xs font-semibold text-slate-500">Negative findings (looked healthy)</p>
            <ul className="mb-3 mt-1 list-disc space-y-0.5 pl-5 text-sm text-slate-700">
              {clinical.looks_good.map((item: string) => <li key={item}>{item}</li>)}
            </ul>
          </>
        )}
        {(clinical?.personal_notes?.length ?? 0) > 0 && (
          <>
            <p className="text-xs font-semibold text-slate-500">Risk-context notes (intake correlation)</p>
            <ul className="mb-3 mt-1 list-disc space-y-0.5 pl-5 text-sm text-slate-700">
              {clinical.personal_notes.map((item: string) => <li key={item}>{item}</li>)}
            </ul>
          </>
        )}
        <p className="text-xs font-semibold text-slate-500">Guidance issued to patient</p>
        <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-slate-700">
          {(clinical?.what_to_do ?? []).map((item: string) => <li key={item}>{item}</li>)}
        </ul>
        <p className="mt-3 text-xs text-slate-500">
          Escalation triggers: {(clinical?.when_to_get_help ?? []).join(" · ") || NOT_PROVIDED}
        </p>
        <p className="mt-2 text-xs text-slate-500">Stated limits: {clinical?.limits || NOT_PROVIDED}</p>
      </Section>

      <Section title="Capture quality">
        <Row label="Images usable" value={clinical?.capture_quality?.usable === false ? "No" : "Yes"} />
        {(clinical?.capture_quality?.retake ?? []).map((item: any, index: number) => (
          <p key={index} className="text-xs text-slate-700">
            Retake requested — {item.image}: {item.reason}
          </p>
        ))}
        <div className="mt-1 space-y-0.5">
          {assets.map((asset) => (
            <p key={asset.id} className="text-xs text-slate-500">
              {titleCase(asset.side)} {titleCase(asset.view)} · captured{" "}
              {asset.captured_at ? new Date(asset.captured_at).toLocaleString() : "time unknown"}
            </p>
          ))}
        </div>
      </Section>

      <Section title="Patient identifiers">
        <Row label="Name" value={patient?.full_name} />
        <Row label="Date of birth" value={patient?.date_of_birth} />
        <Row label="Sex" value={patient?.sex ? titleCase(patient.sex) : null} />
        <Row label="MRN" value={mrn} />
        <Row label="Facility" value={facilityName} />
      </Section>

      <Section title="Intake — medical history">
        <Row label="Reported conditions" value={(intake?.conditions ?? []).map(titleCase)} />
        <Row
          label="Numbness in feet"
          value={intake?.numbness ? (intake.numbness === "neither" ? "None reported" : titleCase(intake.numbness)) : null}
        />
        <Row
          label="Recent foot surgery"
          value={
            intake?.recentSurgery == null
              ? null
              : intake.recentSurgery.flag
                ? (intake.recentSurgery.procedures ?? []).map(titleCase).join(", ") || "Yes"
                : "No"
          }
        />
        <Row
          label="Prior foot events"
          value={(intake?.priorEvents ?? []).map(
            (event: any) =>
              `${titleCase(event.type)} — ${titleCase(event.side)} foot (${titleCase(event.region)}${event.year ? `, ${event.year}` : ""})`
          )}
        />
      </Section>

      <Section title="Intake — diabetes & glucose">
        <Row label="Type" value={diabetes?.type ? titleCase(diabetes.type) : null} />
        <Row label="Year diagnosed" value={diabetes?.yearDiagnosed} />
        <Row label="Most recent HbA1c" value={diabetes?.hba1c ? `${diabetes.hba1c}%` : null} />
        <Row label="Glucose category" value={diabetes?.glucoseCategory ? titleCase(diabetes.glucoseCategory) : null} />
        <Row
          label="10-day glucose readings"
          value={
            diabetes?.glucose10d && diabetes.glucose10d.length > 0
              ? `${diabetes.glucose10d.join(", ")} mg/dL`
              : null
          }
        />
      </Section>

      <Section title="Intake — vascular / PAD">
        <Row label="PAD status" value={pad?.status ? titleCase(pad.status) : null} />
        <Row label="Claudication" value={pad == null ? null : pad.claudication ? "Yes" : "No"} />
        <Row label="Rest pain" value={pad == null ? null : pad.restPain ? "Yes" : "No"} />
        <Row label="ABI" value={pad?.abi} />
        <Row label="Vascular signs" value={(pad?.signs ?? []).map(titleCase)} />
      </Section>

      <Section title="Intake — lifestyle, pain & measurements">
        <Row label="Smoking" value={intake == null ? null : intake.smoking ? "Yes" : "No"} />
        <Row label="Alcohol" value={intake == null ? null : intake.alcohol ? "Yes" : "No"} />
        <Row label="Pain present" value={intake?.painPresent == null ? null : intake.painPresent ? "Yes" : "No"} />
        <Row label="Pain map points" value={(intake?.painPoints ?? []).map(titleCase)} />
        <Row label="Shoe size (US)" value={intake?.shoeSizeUS} />
        <Row label="Foot length" value={intake?.footLengthMm ? `${intake.footLengthMm} mm` : null} />
        <Row label="Age" value={intake?.age} />
        <Row label="Location" value={intake?.city ? `${intake.city}${intake.state ? `, ${intake.state}` : ""}` : null} />
      </Section>

      <Section title="Review history">
        {reviews.length === 0 ? (
          <p className="text-sm italic text-slate-400">No review actions recorded yet.</p>
        ) : (
          <div className="space-y-2">
            {reviews.map((review, index) => (
              <div key={index} className="rounded-xl border border-slate-100 px-4 py-2.5">
                <p className="text-sm font-medium capitalize text-slate-900">{review.action}</p>
                <p className="text-xs text-slate-500">{new Date(review.created_at).toLocaleString()}</p>
                {review.clinical_note && (
                  <p className="mt-1 text-sm text-slate-700">{review.clinical_note}</p>
                )}
              </div>
            ))}
          </div>
        )}
        <p className="mt-3 text-[11px] text-slate-400">
          Report version {reportVersion} · analysis run {analysisRunId ?? "n/a"} · hospital {hospitalSlug}
        </p>
      </Section>
    </div>
  );

  return (
    <div className="space-y-4">
      <Tabs<"overview" | "enhanced">
        tabs={[
          { id: "overview", label: "Overview" },
          { id: "enhanced", label: "Enhanced metrics" },
        ]}
        initial="overview"
        render={(tab) => (tab === "overview" ? overview : enhanced)}
      />
    </div>
  );
}
