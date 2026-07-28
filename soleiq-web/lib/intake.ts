"use client";

/**
 * Saved intake answers for returning patients.
 *
 * Every completed assessment writes the full questionnaire into
 * patients.demographics (server/screenings.ts). This loads it back so the
 * next assessment starts prefilled and the patient only reviews what
 * changed. RLS scopes the read to the caller's own patient row.
 */

import { getSupabase } from "./supabase";
import type { PatientProfile } from "./types";

const PROFILE_KEYS: (keyof PatientProfile)[] = [
  "fullName",
  "city",
  "state",
  "age",
  "sex",
  "ethnicity",
  "conditions",
  "diabetes",
  "pad",
  "priorEvents",
  "recentSurgery",
  "numbness",
  "alcohol",
  "smoking",
  "shoeSizeUS",
  "footLengthMm",
  "painPresent",
  "painPoints",
];

export async function loadSavedIntake(): Promise<Partial<PatientProfile> | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) return null;
  const { data: patient, error } = await sb
    .from("patients")
    .select("demographics")
    .eq("linked_user_id", auth.user.id)
    .maybeSingle();
  if (error || !patient?.demographics || typeof patient.demographics !== "object") {
    return null;
  }
  // Only known profile keys — demographics is jsonb and could carry stale
  // extras from older app versions.
  const saved: Partial<PatientProfile> = {};
  const raw = patient.demographics as Record<string, unknown>;
  for (const key of PROFILE_KEYS) {
    if (raw[key] !== undefined && raw[key] !== null) {
      (saved as Record<string, unknown>)[key] = raw[key];
    }
  }
  // An intake with no substantive answers isn't worth a review screen.
  const substantive =
    saved.age != null ||
    (saved.conditions?.length ?? 0) > 0 ||
    !!saved.fullName;
  return substantive ? saved : null;
}
