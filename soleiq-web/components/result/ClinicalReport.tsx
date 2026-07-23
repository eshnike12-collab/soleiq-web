"use client";

/**
 * Doctor-facing clinical report: the complete intake questionnaire plus the
 * AI screening output in full technical detail. Patients keep the simplified
 * ScreeningReport; this view is rendered only for doctor/admin roles (UI
 * gate — Postgres RLS is what actually scopes the data).
 *
 * Formatting rule: every intake field is shown, including "Not provided" for
 * anything skipped — clinicians need to see what wasn't answered.
 */

import { PRESSURE_POINTS } from "@/components/pain-map/pressurePoints";
import {
  FOOT_PROCEDURES,
  FOOT_REGION_LABEL,
  GLUCOSE_RANGES,
  type FootRegion,
  type PhotoScreeningFinding,
  type Visit,
} from "@/lib/types";
import type { PatientIntakeRow } from "@/lib/db";
import { cn } from "@/lib/utils";

const NOT_PROVIDED = "Not provided";

const fmtDate = (value: string | number | null | undefined) => {
  if (!value) return NOT_PROVIDED;
  const ts = typeof value === "number" ? value : Date.parse(value);
  return Number.isFinite(ts)
    ? new Date(ts).toLocaleDateString(undefined, { dateStyle: "medium" })
    : NOT_PROVIDED;
};

const titleCase = (value: string) =>
  value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-warmGray-100 bg-white p-4">
      <h2 className="mb-3 border-b border-warmGray-50 pb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-brand">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Field({ label, value }: { label: string; value?: React.ReactNode }) {
  const empty =
    value === null ||
    value === undefined ||
    (typeof value === "string" && value.trim().length === 0);
  return (
    <div className="flex items-baseline justify-between gap-3 py-1">
      <span className="shrink-0 text-xs text-warmGray-600">{label}</span>
      <span
        className={cn(
          "text-right text-sm",
          empty ? "italic text-warmGray-600/70" : "font-medium text-warmGray-800"
        )}
      >
        {empty ? NOT_PROVIDED : value}
      </span>
    </div>
  );
}

const CONCERN_BADGE: Record<PhotoScreeningFinding["concern"], string> = {
  low: "bg-amber-50 text-amber-800",
  medium: "bg-orange-100 text-orange-900",
  high: "bg-risk-high text-white",
};

export function ClinicalReport({
  intake,
  visits,
  patientEmail,
}: {
  intake: PatientIntakeRow | null;
  visits: Visit[];
  patientEmail?: string | null;
}) {
  const latest = visits.find((visit) => visit.result?.screening) ?? visits[0] ?? null;
  const screening = latest?.result?.screening ?? null;
  const diabetes = intake?.diabetes ?? null;
  const pad = intake?.pad ?? null;
  const glucoseLabel = diabetes?.glucoseCategory
    ? GLUCOSE_RANGES.find((r) => r.value === diabetes.glucoseCategory)?.label ??
      titleCase(String(diabetes.glucoseCategory))
    : null;
  const painLabels = (intake?.pain_points ?? []).map((id) => {
    const point = PRESSURE_POINTS.find((p) => p.id === id);
    return point ? `${point.side === "left" ? "L" : "R"} ${point.label}` : id;
  });
  const procedureLabel = (value: string) =>
    FOOT_PROCEDURES.find((p) => p.value === value)?.label ?? titleCase(value);

  return (
    <div className="space-y-3">
      <header className="rounded-2xl border border-warmGray-100 bg-white p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand">
          Clinical report — full record
        </p>
        <h1 className="mt-1 text-xl font-semibold text-warmGray-800">
          {intake?.full_name || patientEmail || "Patient"}
        </h1>
        <p className="mt-0.5 text-xs text-warmGray-600">
          {visits.length} saved check{visits.length === 1 ? "" : "s"}
          {latest ? ` · latest ${fmtDate(latest.startedAt)}` : ""} · intake updated{" "}
          {fmtDate(intake?.updated_at ?? null)}
        </p>
        <p className="mt-2 text-[11px] leading-snug text-warmGray-600">
          Photo-based screening data — surface findings only; not a diagnosis and
          not a substitute for in-person examination.
        </p>
      </header>

      {/* ---- Intake ---------------------------------------------------- */}
      <Section title="Demographics">
        <Field label="Name" value={intake?.full_name} />
        <Field label="Email" value={patientEmail} />
        <Field label="Age" value={intake?.age} />
        <Field label="Sex" value={intake?.sex ? titleCase(intake.sex) : null} />
        <Field label="Ethnicity" value={intake?.ethnicity ? titleCase(intake.ethnicity) : null} />
        <Field
          label="Location"
          value={intake?.city ? `${intake.city}${intake.state ? `, ${intake.state}` : ""}` : null}
        />
      </Section>

      <Section title="Medical history">
        <Field
          label="Reported conditions"
          value={
            intake?.conditions && intake.conditions.length > 0
              ? intake.conditions.map(titleCase).join(", ")
              : null
          }
        />
        <Field
          label="Numbness in feet"
          value={
            intake?.numbness
              ? intake.numbness === "neither"
                ? "None reported"
                : titleCase(intake.numbness)
              : null
          }
        />
        <Field
          label="Recent foot surgery"
          value={
            intake?.recent_surgery == null
              ? null
              : intake.recent_surgery.flag
                ? (intake.recent_surgery.procedures ?? []).map(procedureLabel).join(", ") || "Yes"
                : "No"
          }
        />
      </Section>

      <Section title="Diabetes details">
        <Field label="Type" value={diabetes?.type ? titleCase(diabetes.type) : null} />
        <Field
          label="Year diagnosed"
          value={
            diabetes?.yearDiagnosed
              ? `${diabetes.yearDiagnosed} (~${Math.max(0, new Date().getFullYear() - diabetes.yearDiagnosed)} yrs)`
              : null
          }
        />
      </Section>

      <Section title="Glucose markers">
        <Field label="Most recent HbA1c" value={diabetes?.hba1c ? `${diabetes.hba1c}%` : null} />
        <Field label="Recent glucose category" value={glucoseLabel} />
        <Field
          label="10-day glucose readings"
          value={
            diabetes?.glucose10d && diabetes.glucose10d.length > 0
              ? `${diabetes.glucose10d.join(", ")} mg/dL`
              : null
          }
        />
      </Section>

      <Section title="Vascular / PAD">
        <Field label="PAD status" value={pad?.status ? titleCase(pad.status) : null} />
        <Field
          label="Claudication (pain when walking)"
          value={pad == null ? null : pad.claudication ? "Yes" : "No"}
        />
        <Field label="Rest pain" value={pad == null ? null : pad.restPain ? "Yes" : "No"} />
        <Field label="ABI" value={pad?.abi ?? null} />
        <Field
          label="Vascular signs"
          value={pad?.signs && pad.signs.length > 0 ? pad.signs.map(titleCase).join(", ") : null}
        />
      </Section>

      <Section title="Foot history">
        {intake?.prior_events && intake.prior_events.length > 0 ? (
          <ul className="list-disc space-y-1 pl-4 text-sm text-warmGray-800">
            {intake.prior_events.map((event, i) => (
              <li key={i}>
                {titleCase(event.type ?? "event")} — {titleCase(event.side ?? "?")} foot,{" "}
                {FOOT_REGION_LABEL[event.region as FootRegion] ?? titleCase(event.region ?? "unspecified region")}
                {event.year ? ` (${event.year})` : ""}
              </li>
            ))}
          </ul>
        ) : (
          <Field label="Prior ulcers / amputations" value={intake ? "None reported" : null} />
        )}
      </Section>

      <Section title="Health & lifestyle">
        <Field label="Smoking" value={intake == null ? null : intake.smoking ? "Yes" : "No"} />
        <Field label="Alcohol" value={intake == null ? null : intake.alcohol ? "Yes" : "No"} />
      </Section>

      <Section title="Pain assessment">
        <Field
          label="Pain present"
          value={intake?.pain_present == null ? null : intake.pain_present ? "Yes" : "No"}
        />
        {painLabels.length > 0 ? (
          <div className="pt-1">
            <p className="text-xs text-warmGray-600">Pain map locations</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-4 text-sm text-warmGray-800">
              {painLabels.map((label) => (
                <li key={label}>{label}</li>
              ))}
            </ul>
          </div>
        ) : (
          <Field label="Pain map locations" value={intake?.pain_present ? null : "None marked"} />
        )}
      </Section>

      <Section title="Shoe & foot measurements">
        <Field label="Shoe size (US)" value={intake?.shoe_size_us ?? null} />
        <Field
          label="Foot length"
          value={intake?.foot_length_mm ? `${intake.foot_length_mm} mm` : null}
        />
      </Section>

      {/* ---- AI screening, full detail --------------------------------- */}
      <Section title="AI photo screening — latest check">
        {!screening || !latest ? (
          <p className="text-sm italic text-warmGray-600/70">
            No saved photo screening on record.
          </p>
        ) : (
          <div className="space-y-3">
            <Field label="Check date" value={fmtDate(latest.startedAt)} />
            <Field label="Overall level" value={titleCase(screening.overall.level)} />
            <Field
              label="Risk mapping"
              value={latest.result?.riskLevel ? titleCase(latest.result.riskLevel) : null}
            />
            <p className="rounded-xl bg-warmGray-50 p-2.5 text-sm text-warmGray-800">
              {screening.overall.headline}
            </p>

            <div>
              <p className="mb-1 text-xs font-semibold text-warmGray-600">
                Capture quality
              </p>
              <Field
                label="Images usable"
                value={screening.capture_quality.usable ? "Yes" : "No"}
              />
              {screening.capture_quality.retake.length > 0 && (
                <ul className="mt-1 list-disc pl-4 text-xs text-warmGray-800">
                  {screening.capture_quality.retake.map((item, i) => (
                    <li key={i}>
                      {item.image}: {item.reason}
                    </li>
                  ))}
                </ul>
              )}
              {latest.images.length > 0 && (
                <ul className="mt-1 space-y-0.5 text-xs text-warmGray-600">
                  {latest.images.map((image, i) => (
                    <li key={i}>
                      {titleCase(image.side)} {titleCase(image.view)}:{" "}
                      {image.quality
                        ? `${image.quality.passed ? "passed" : "failed"} (brightness ${Math.round(image.quality.brightness)}, sharpness ${Math.round(image.quality.sharpness)})`
                        : "no quality data"}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <p className="mb-1 text-xs font-semibold text-warmGray-600">
                Findings ({screening.findings.length})
              </p>
              {screening.findings.length === 0 ? (
                <p className="text-sm text-warmGray-800">
                  No visible surface concerns flagged.
                </p>
              ) : (
                <div className="space-y-2">
                  {screening.findings.map((finding, i) => (
                    <div key={i} className="rounded-xl border border-warmGray-100 p-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-warmGray-800">
                          {titleCase(finding.foot)} foot — {titleCase(finding.surface)}
                        </p>
                        <span className="flex shrink-0 items-center gap-1">
                          {finding.lighting_artifact_possible && (
                            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                              lighting artifact?
                            </span>
                          )}
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                              CONCERN_BADGE[finding.concern]
                            )}
                          >
                            {finding.concern} concern
                          </span>
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-warmGray-800">{finding.what_we_saw}</p>
                      <p className="text-xs text-warmGray-600">
                        Location: {finding.location_plain}
                        {finding.region
                          ? ` · marked region x ${finding.region.x.toFixed(2)}, y ${finding.region.y.toFixed(2)}, ${(finding.region.w * 100).toFixed(0)}×${(finding.region.h * 100).toFixed(0)}% of frame`
                          : " · no region marked"}
                      </p>
                      <p className="mt-1 text-xs text-warmGray-800">{finding.why_it_matters}</p>
                      {finding.deeper_explanation && (
                        <p className="mt-1 text-xs text-warmGray-600">
                          {finding.deeper_explanation}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {(screening.looks_good?.length ?? 0) > 0 && (
              <div>
                <p className="mb-1 text-xs font-semibold text-warmGray-600">
                  Negative findings (looked healthy)
                </p>
                <ul className="list-disc space-y-0.5 pl-4 text-sm text-warmGray-800">
                  {screening.looks_good.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {(screening.personal_notes?.length ?? 0) > 0 && (
              <div>
                <p className="mb-1 text-xs font-semibold text-warmGray-600">
                  Risk-context notes (from intake correlation)
                </p>
                <ul className="list-disc space-y-0.5 pl-4 text-sm text-warmGray-800">
                  {screening.personal_notes.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            <div>
              <p className="mb-1 text-xs font-semibold text-warmGray-600">
                Guidance issued to patient
              </p>
              <ul className="list-disc space-y-0.5 pl-4 text-xs text-warmGray-800">
                {screening.what_to_do.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <p className="mt-1 text-xs text-warmGray-600">
                Escalation triggers: {screening.when_to_get_help.join(" · ")}
              </p>
            </div>

            <p className="text-[11px] text-warmGray-600">
              Stated limits: {screening.limits}
            </p>

            {latest.images.length > 0 && (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {latest.images.map((image, i) => (
                  <figure key={i}>
                    <div className="aspect-square overflow-hidden rounded-xl bg-warmGray-50">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={image.dataUrl}
                        alt={`${image.side} ${image.view}`}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <figcaption className="mt-0.5 text-center text-[10px] text-warmGray-600">
                      {titleCase(image.side)} {titleCase(image.view)}
                    </figcaption>
                  </figure>
                ))}
              </div>
            )}
          </div>
        )}
      </Section>

      <Section title="Visit history">
        {visits.length === 0 ? (
          <p className="text-sm italic text-warmGray-600/70">No saved visits.</p>
        ) : (
          <div className="divide-y divide-warmGray-50">
            {visits.map((visit) => {
              const s = visit.result?.screening;
              return (
                <div key={visit.id} className="flex items-center justify-between gap-2 py-1.5">
                  <span className="text-sm text-warmGray-800">{fmtDate(visit.startedAt)}</span>
                  <span className="text-xs text-warmGray-600">
                    {visit.images.length} photos
                    {s
                      ? ` · ${titleCase(s.overall.level)} · ${s.findings.length} finding${s.findings.length === 1 ? "" : "s"}`
                      : " · no analysis"}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </Section>
    </div>
  );
}
