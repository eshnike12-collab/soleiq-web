"use client";

import { ensureAnonAuth, getSupabase } from "./supabase";
import { getDefaultOrgId } from "./orgs";
import type {
  AnalysisResult,
  CapturedImage,
  PatientProfile,
  Visit,
} from "./types";

/**
 * Thin write-only DB layer. Every helper:
 *  - no-ops if Supabase isn't configured
 *  - swallows errors and logs them (we never want a network failure to break
 *    the demo flow)
 */

async function client() {
  const sb = getSupabase();
  if (!sb) return null;
  const uid = await ensureAnonAuth();
  if (!uid) return null;
  return { sb, uid };
}

/** Upsert the in-progress patient profile. Returns the row id, or null. */
export async function upsertPatient(
  profile: Partial<PatientProfile>,
  existingId?: string
): Promise<string | null> {
  const c = await client();
  if (!c) return null;

  const orgId = await getDefaultOrgId();

  const row = {
    auth_uid: c.uid,
    organization_id: orgId,
    full_name: profile.fullName ?? null,
    city: profile.city ?? null,
    state: profile.state ?? null,
    age: profile.age ?? null,
    sex: profile.sex ?? null,
    ethnicity: profile.ethnicity ?? null,
    conditions: profile.conditions ?? [],
    diabetes: profile.diabetes ?? null,
    prior_events: profile.priorEvents ?? [],
    recent_surgery: profile.recentSurgery ?? null,
    numbness: profile.numbness ?? null,
    alcohol: profile.alcohol ?? null,
    smoking: profile.smoking ?? null,
    shoe_size_us: profile.shoeSizeUS ?? null,
    foot_length_mm: profile.footLengthMm ?? null,
    pain_present: profile.painPresent ?? null,
    pain_points: profile.painPoints ?? [],
    pad: profile.pad ?? null,
  };

  if (existingId) {
    const { error } = await c.sb.from("patients").update(row).eq("id", existingId);
    if (error) {
      console.warn("[soleiq] upsertPatient (update) failed:", error.message);
      return null;
    }
    return existingId;
  }

  const { data, error } = await c.sb
    .from("patients")
    .insert(row)
    .select("id")
    .single();
  if (error) {
    console.warn("[soleiq] upsertPatient (insert) failed:", error.message);
    return null;
  }
  return data.id;
}

export async function createVisitRow(
  patientId: string | null,
  visit: Pick<Visit, "id" | "startedAt">
): Promise<string | null> {
  const c = await client();
  if (!c) return null;
  const { data, error } = await c.sb
    .from("visits")
    .insert({
      id: visit.id.startsWith("visit_") ? undefined : visit.id,
      patient_id: patientId,
      auth_uid: c.uid,
      started_at: new Date(visit.startedAt).toISOString(),
    })
    .select("id")
    .single();
  if (error) {
    console.warn("[soleiq] createVisitRow failed:", error.message);
    return null;
  }
  return data.id;
}

export async function saveImageRow(
  visitDbId: string,
  img: CapturedImage
): Promise<void> {
  const c = await client();
  if (!c) return;
  const { error } = await c.sb.from("captured_images").insert({
    visit_id: visitDbId,
    side: img.side,
    view: img.view,
    data_url: img.dataUrl,
    captured_at: new Date(img.capturedAt).toISOString(),
  });
  if (error) console.warn("[soleiq] saveImageRow failed:", error.message);
}

export async function saveAnalysisRow(
  visitDbId: string,
  r: AnalysisResult
): Promise<void> {
  const c = await client();
  if (!c) return;
  const { error } = await c.sb.from("analysis_results").insert({
    visit_id: visitDbId,
    scored_at: new Date(r.scoredAt).toISOString(),
    risk_level: r.riskLevel,
    risk_factors: r.riskFactors,
    detections: r.detections,
    volumetrics: r.volumetrics,
    trend: r.trend,
  });
  if (error) console.warn("[soleiq] saveAnalysisRow failed:", error.message);
}

export async function completeVisitRow(
  visitDbId: string,
  completedAt: number
): Promise<void> {
  const c = await client();
  if (!c) return;
  const { error } = await c.sb
    .from("visits")
    .update({ completed_at: new Date(completedAt).toISOString() })
    .eq("id", visitDbId);
  if (error) console.warn("[soleiq] completeVisitRow failed:", error.message);
}

/**
 * One-shot: persist the full visit + everything attached. Used at "Save to
 * timeline." Patient row is upserted first so the visit FK is valid.
 */
export async function syncCompleteVisit(
  profile: Partial<PatientProfile>,
  visit: Visit,
  existingPatientId?: string
): Promise<{ patientId: string | null; visitId: string | null }> {
  if (!getSupabase()) return { patientId: null, visitId: null };

  const patientId = await upsertPatient(profile, existingPatientId);
  const visitId = await createVisitRow(patientId, {
    id: visit.id,
    startedAt: visit.startedAt,
  });
  if (!visitId) return { patientId, visitId: null };

  await Promise.all(visit.images.map((img) => saveImageRow(visitId, img)));
  if (visit.result) await saveAnalysisRow(visitId, visit.result);
  if (visit.completedAt) await completeVisitRow(visitId, visit.completedAt);

  return { patientId, visitId };
}

// ---------- Reads (used by /dashboard and /admin) ------------------------

export interface PatientListRow {
  id: string;
  full_name: string | null;
  city: string | null;
  state: string | null;
  age: number | null;
  organization_id: string | null;
  created_at: string;
}

export interface VisitListRow {
  id: string;
  patient_id: string | null;
  started_at: string;
  completed_at: string | null;
  patients: { full_name: string | null; organization_id: string | null } | null;
  analysis_results: { risk_level: string }[] | null;
}

export async function listPatients(): Promise<PatientListRow[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb
    .from("patients")
    .select("id, full_name, city, state, age, organization_id, created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) {
    console.warn("[soleiq] listPatients failed:", error.message);
    return [];
  }
  return (data ?? []) as PatientListRow[];
}

export async function listVisits(): Promise<VisitListRow[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb
    .from("visits")
    .select(
      "id, patient_id, started_at, completed_at, patients(full_name, organization_id), analysis_results(risk_level)"
    )
    .order("started_at", { ascending: false })
    .limit(200);
  if (error) {
    console.warn("[soleiq] listVisits failed:", error.message);
    return [];
  }
  return (data ?? []) as unknown as VisitListRow[];
}

export async function listOrganizations() {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb
    .from("organizations")
    .select("id, slug, name, created_at")
    .order("created_at", { ascending: true });
  if (error) {
    console.warn("[soleiq] listOrganizations failed:", error.message);
    return [];
  }
  return data ?? [];
}

/**
 * Patient-side: fetch the current (anonymous) user's prior visits including
 * the analysis result and the sole-view captured images, in chronological
 * order. RLS limits results to rows where auth_uid = auth.uid().
 */
export async function listMyPriorVisits(): Promise<Visit[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data: u } = await sb.auth.getUser();
  if (!u.user) return [];
  const { data, error } = await sb
    .from("visits")
    .select(
      "id, started_at, completed_at, captured_images(side, view, data_url, captured_at), analysis_results(visit_id, scored_at, risk_level, risk_factors, detections, volumetrics, trend)"
    )
    .eq("auth_uid", u.user.id)
    .not("completed_at", "is", null)
    .order("started_at", { ascending: true });
  if (error) {
    console.warn("[soleiq] listMyPriorVisits failed:", error.message);
    return [];
  }
  return (data ?? []).map((row: any): Visit => ({
    id: row.id,
    startedAt: row.started_at ? Date.parse(row.started_at) : Date.now(),
    completedAt: row.completed_at ? Date.parse(row.completed_at) : undefined,
    images: (row.captured_images ?? []).map((i: any) => ({
      side: i.side,
      view: i.view,
      dataUrl: i.data_url,
      capturedAt: i.captured_at ? Date.parse(i.captured_at) : 0,
    })),
    result: row.analysis_results?.[0]
      ? {
          visitId: row.analysis_results[0].visit_id,
          scoredAt: row.analysis_results[0].scored_at
            ? Date.parse(row.analysis_results[0].scored_at)
            : 0,
          riskLevel: row.analysis_results[0].risk_level,
          riskFactors: row.analysis_results[0].risk_factors,
          detections: row.analysis_results[0].detections,
          volumetrics: row.analysis_results[0].volumetrics,
          trend: row.analysis_results[0].trend,
        }
      : undefined,
  }));
}

export async function listProfiles() {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb
    .from("profiles")
    .select("id, role, organization_id, email, full_name, created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) {
    console.warn("[soleiq] listProfiles failed:", error.message);
    return [];
  }
  return data ?? [];
}
