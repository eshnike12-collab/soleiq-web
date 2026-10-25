/**
 * The medication question: a small local drug table, and the rules for
 * reading an answer.
 *
 * There is no lookup service here on purpose. Medication names are sensitive
 * health data, so nothing a patient types while searching leaves the device —
 * matching happens against the table below, in memory. The table is a
 * convenience for spelling and categorising, never a gate: `categorize`
 * returns undefined for anything it does not know and the name is kept
 * exactly as typed.
 */

import type { MedicationCategory, PatientProfile } from "./types";

export interface MedicationEntry {
  /** Canonical name offered as a suggestion. */
  name: string;
  /** Brand names and common spellings that should find this entry. */
  aliases?: string[];
  category: MedicationCategory;
}

/**
 * Deliberately short. These are the drugs whose presence changes how a foot
 * photograph should be read, plus the few so commonly taken that offering
 * them saves most people from typing.
 */
export const COMMON_MEDICATIONS: MedicationEntry[] = [
  { name: "Warfarin", aliases: ["coumadin", "jantoven"], category: "anticoagulant" },
  { name: "Apixaban", aliases: ["eliquis"], category: "anticoagulant" },
  { name: "Rivaroxaban", aliases: ["xarelto"], category: "anticoagulant" },
  { name: "Clopidogrel", aliases: ["plavix"], category: "antiplatelet" },
  { name: "Aspirin", aliases: ["asa", "acetylsalicylic acid", "disprin"], category: "antiplatelet" },
  { name: "Prednisone", aliases: ["prednisolone", "deltasone"], category: "corticosteroid" },
  { name: "Methotrexate", aliases: ["trexall", "otrexup"], category: "immunosuppressant" },
  { name: "Ciclosporin", aliases: ["cyclosporine", "neoral", "sandimmune"], category: "immunosuppressant" },
  { name: "Metformin", aliases: ["glucophage"], category: "oral_diabetes" },
  { name: "Insulin", aliases: ["lantus", "humalog", "novolog", "levemir", "tresiba"], category: "insulin" },
  { name: "Atorvastatin", aliases: ["lipitor"], category: "statin" },
  { name: "Lisinopril", aliases: ["zestril", "prinivil"], category: "antihypertensive" },
  { name: "Amlodipine", aliases: ["norvasc"], category: "antihypertensive" },
];

const normalize = (value: string) => value.trim().toLowerCase();

/**
 * Suggestions for a partial name.
 *
 * Prefix matches first, because someone typing "war" means warfarin rather
 * than a drug with "war" in the middle. Matching an alias returns the
 * canonical entry, so typing "eliquis" offers Apixaban.
 */
export function suggestMedications(query: string, limit = 6): MedicationEntry[] {
  const q = normalize(query);
  if (q.length < 2) return [];
  const prefix: MedicationEntry[] = [];
  const contains: MedicationEntry[] = [];
  for (const entry of COMMON_MEDICATIONS) {
    const names = [entry.name, ...(entry.aliases ?? [])].map(normalize);
    if (names.some((n) => n.startsWith(q))) prefix.push(entry);
    else if (names.some((n) => n.includes(q))) contains.push(entry);
  }
  return [...prefix, ...contains].slice(0, limit);
}

/**
 * Best-effort category for a free-text name, or undefined.
 *
 * Undefined is a normal outcome and must stay cheap: the caller records the
 * name regardless. Only exact name/alias equality counts — guessing from a
 * substring would mis-categorise, and a wrong category is worse than none
 * because it feeds a reading hint to the analysis.
 */
export function categorizeMedication(name: string): MedicationCategory | undefined {
  const n = normalize(name);
  if (!n) return undefined;
  for (const entry of COMMON_MEDICATIONS) {
    if (normalize(entry.name) === n) return entry.category;
    if ((entry.aliases ?? []).some((alias) => normalize(alias) === n)) return entry.category;
  }
  return undefined;
}

/** The answered shape, from a name the patient typed or picked. */
export function toMedicationItem(name: string): { name: string; category?: MedicationCategory } {
  const trimmed = name.trim();
  const category = categorizeMedication(trimmed);
  return category ? { name: trimmed, category } : { name: trimmed };
}

/**
 * Has this patient ever been asked the medication question?
 *
 * Anyone whose intake was saved before this question shipped has no
 * `medications` key at all, so the screen is mandatory for them even in the
 * returning-patient flow, where every other section can be skipped.
 */
export function medicationsNeedAnswer(profile: Partial<PatientProfile>): boolean {
  return profile.medications === undefined;
}

/** Answered, and the patient named at least one medicine. */
export function hasNamedMedications(profile: Partial<PatientProfile>): boolean {
  return (profile.medications?.items?.length ?? 0) > 0;
}

/**
 * The distinct categories present, in the fixed order below rather than the
 * order typed, so the same set of drugs always produces the same string.
 */
const CATEGORY_ORDER: MedicationCategory[] = [
  "anticoagulant",
  "antiplatelet",
  "corticosteroid",
  "immunosuppressant",
  "chemotherapy",
  "insulin",
  "oral_diabetes",
  "statin",
  "antihypertensive",
  "antibiotic",
  "other",
];

export function medicationCategories(
  profile: Partial<PatientProfile>
): MedicationCategory[] {
  const present = new Set<MedicationCategory>();
  for (const item of profile.medications?.items ?? []) {
    if (item.category) present.add(item.category);
  }
  return CATEGORY_ORDER.filter((category) => present.has(category));
}
