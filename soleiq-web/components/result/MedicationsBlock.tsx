/**
 * The reported-medications block, for clinician-facing surfaces.
 *
 * No hooks and no store, so it renders in a server component (the caregiver
 * patient record) as well as a client one (the in-flow clinical detail).
 *
 * The labels here are the clinical terms rather than the patient-facing ones
 * the questionnaire uses. A patient is asked about a "blood thinner" because
 * that is what they will recognise; a clinician reading the same record wants
 * "Anticoagulant". Same stored category, different audience.
 */

import type { MedicationCategory } from "@/lib/types";

const CLINICAL_LABEL: Record<MedicationCategory, string> = {
  anticoagulant: "Anticoagulant",
  antiplatelet: "Antiplatelet",
  corticosteroid: "Corticosteroid",
  immunosuppressant: "Immunosuppressant",
  chemotherapy: "Chemotherapy",
  insulin: "Insulin",
  oral_diabetes: "Oral hypoglycaemic",
  statin: "Statin",
  antihypertensive: "Antihypertensive",
  antibiotic: "Antibiotic",
  other: "Uncategorised",
};

/**
 * Categories that change how a photograph should be read, so they are worth
 * calling out above the list rather than leaving to be inferred from names.
 */
const READING_NOTE: Partial<Record<MedicationCategory, string>> = {
  anticoagulant:
    "Bruising and subcallus haemorrhage may overstate the underlying injury; bleeding wounds warrant a lower flagging threshold.",
  antiplatelet:
    "Bruising and subcallus haemorrhage may overstate the underlying injury; bleeding wounds warrant a lower flagging threshold.",
  corticosteroid:
    "Skin is more fragile and infection signs are blunted — expect less erythema and swelling than the process would otherwise produce.",
  immunosuppressant:
    "Skin is more fragile and infection signs are blunted — expect less erythema and swelling than the process would otherwise produce.",
  chemotherapy:
    "Raised infection risk and slower healing; any skin break warrants earlier review.",
};

export interface ReportedMedications {
  takesMajorMedication: boolean | null;
  items: { name: string; category?: MedicationCategory }[];
  notes?: string;
}

/**
 * `undefined` means the question was never put to this patient — their intake
 * predates it. That is different from "none reported" and is shown as such,
 * so nobody reads a blank as an answer.
 */
export function MedicationsBlock({
  medications,
  className,
}: {
  medications: ReportedMedications | undefined;
  className?: string;
}) {
  const wrapper =
    className ??
    "rounded-2xl border border-slate-100 bg-surface-raised p-4 shadow-card";

  const heading = (
    <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink-faint">
      Reported medications
    </p>
  );

  if (!medications) {
    return (
      <div className={wrapper}>
        {heading}
        <p className="mt-2 text-sm text-ink-faint">
          Not asked — this record predates the medication question. The patient
          is asked at their next check.
        </p>
      </div>
    );
  }

  if (medications.takesMajorMedication === null) {
    return (
      <div className={wrapper}>
        {heading}
        <p className="mt-2 text-sm text-ink">Patient preferred not to say.</p>
      </div>
    );
  }

  if (!medications.takesMajorMedication) {
    return (
      <div className={wrapper}>
        {heading}
        <p className="mt-2 text-sm text-ink">No major medications reported.</p>
      </div>
    );
  }

  // Distinct categories present, so one note is shown per category rather
  // than once per drug sharing it.
  const categories = Array.from(
    new Set(
      medications.items
        .map((item) => item.category)
        .filter((category): category is MedicationCategory => !!category)
    )
  );
  const notes = Array.from(
    new Set(categories.map((category) => READING_NOTE[category]).filter(Boolean))
  ) as string[];

  return (
    <div className={wrapper}>
      {heading}
      {medications.items.length === 0 ? (
        <p className="mt-2 text-sm text-ink">
          Patient reports taking medication but did not give names.
        </p>
      ) : (
        <ul className="mt-2 space-y-1">
          {medications.items.map((item) => (
            <li
              key={item.name}
              className="flex items-baseline justify-between gap-3 text-sm"
            >
              <span className="text-ink">{item.name}</span>
              <span className="shrink-0 text-xs text-ink-faint">
                {item.category ? CLINICAL_LABEL[item.category] : CLINICAL_LABEL.other}
              </span>
            </li>
          ))}
        </ul>
      )}

      {medications.notes && (
        <p className="mt-2 border-t border-slate-100 pt-2 text-sm text-ink-soft">
          <span className="font-semibold text-ink">Patient notes: </span>
          {medications.notes}
        </p>
      )}

      {notes.length > 0 && (
        <div className="mt-3 space-y-1.5">
          {notes.map((note) => (
            <p
              key={note}
              className="rounded-xl border border-indigo-100 bg-indigo-50 px-3 py-2 text-xs leading-relaxed text-indigo-700"
            >
              {note}
            </p>
          ))}
        </div>
      )}

      <p className="mt-3 text-[10px] leading-relaxed text-ink-faint">
        Self-reported and not reconciled against a prescription record. SoleIQ
        does not assess drug interactions and gives no medication advice —
        medication questions go to the prescriber.
      </p>
    </div>
  );
}
