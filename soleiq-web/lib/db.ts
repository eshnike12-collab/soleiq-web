"use client";

import { ensureAnonAuth, getSupabase } from "./supabase";
import { getDefaultOrgId } from "./orgs";
import type {
  AnalysisResult,
  CapturedImage,
  FootMesh,
  PatientProfile,
  ScanPath,
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

  // One patients row per account: if the caller doesn't know the row id
  // (fresh browser session), look it up by auth_uid before inserting.
  // Without this, every new session created a duplicate patients row and
  // visits scattered across them.
  if (!existingId) {
    const { data: mine } = await c.sb
      .from("patients")
      .select("id")
      .eq("auth_uid", c.uid)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (mine?.id) existingId = mine.id;
  }

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
  visit: Pick<Visit, "id" | "startedAt">,
  scanPath: ScanPath
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
      scan_path: scanPath,
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
  const blob = await fetch(img.dataUrl).then((response) => response.blob());
  const storagePath = `${c.uid}/${visitDbId}/${img.side}-${img.view}-${img.capturedAt}.jpg`;
  const { error: uploadError } = await c.sb.storage
    .from("foot-photos")
    .upload(storagePath, blob, { contentType: "image/jpeg", upsert: false });
  if (uploadError) {
    throw new Error(`Photo upload failed: ${uploadError.message}`);
  }
  const { error } = await c.sb.from("captured_images").insert({
    visit_id: visitDbId,
    side: img.side,
    view: img.view,
    data_url: null,
    storage_path: storagePath,
    quality: img.quality ?? null,
    captured_at: new Date(img.capturedAt).toISOString(),
  });
  if (error) {
    await c.sb.storage.from("foot-photos").remove([storagePath]);
    throw new Error(`Photo record save failed: ${error.message}`);
  }
}

export async function saveMeshRow(
  visitDbId: string,
  mesh: FootMesh
): Promise<void> {
  const c = await client();
  if (!c) return;
  const { error } = await c.sb.from("foot_meshes").insert({
    visit_id: visitDbId,
    side: mesh.side,
    coverage_pct: mesh.coveragePct,
    seed_signature: mesh.seedSignature,
    captured_at: new Date(mesh.capturedAt).toISOString(),
    heightmap: mesh.heightmap ?? null,
  });
  if (error) console.warn("[soleiq] saveMeshRow failed:", error.message);
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
    screening_level: r.screening?.overall.level ?? null,
    screening_result: r.screening ?? null,
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
  scanPath: ScanPath,
  existingPatientId?: string
): Promise<{ patientId: string | null; visitId: string | null }> {
  if (!getSupabase()) return { patientId: null, visitId: null };

  const patientId = await upsertPatient(profile, existingPatientId);
  const visitId = await createVisitRow(
    patientId,
    { id: visit.id, startedAt: visit.startedAt },
    scanPath
  );
  if (!visitId) return { patientId, visitId: null };

  await Promise.all(visit.images.map((img) => saveImageRow(visitId, img)));
  await Promise.all(visit.meshes.map((m) => saveMeshRow(visitId, m)));
  if (visit.result) await saveAnalysisRow(visitId, visit.result);
  if (visit.completedAt) await completeVisitRow(visitId, visit.completedAt);

  return { patientId, visitId };
}

// ---------- Reads (used by /dashboard and /admin) ------------------------

export interface PatientListRow {
  id: string;
  auth_uid: string;
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
  scan_path: string | null;
  patients: { full_name: string | null; organization_id: string | null } | null;
  analysis_results: { risk_level: string }[] | null;
}

export async function listPatients(): Promise<PatientListRow[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb
    .from("patients")
    .select("id, auth_uid, full_name, city, state, age, organization_id, created_at")
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
      "id, patient_id, started_at, completed_at, scan_path, patients(full_name, organization_id), analysis_results(risk_level)"
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

const VISIT_SELECT =
  "id, auth_uid, started_at, completed_at, captured_images(side, view, data_url, storage_path, quality, captured_at), foot_meshes(side, coverage_pct, seed_signature, captured_at), analysis_results(visit_id, scored_at, risk_level, risk_factors, detections, volumetrics, trend, screening_result)";

/**
 * Patient-side: fetch the current user's prior visits including the analysis
 * result and captured images, in chronological order. RLS limits results to
 * rows where auth_uid = auth.uid().
 */
export async function listMyPriorVisits(): Promise<Visit[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data: u } = await sb.auth.getUser();
  if (!u.user) return [];
  const { data, error } = await sb
    .from("visits")
    .select(VISIT_SELECT)
    .eq("auth_uid", u.user.id)
    .not("completed_at", "is", null)
    .order("started_at", { ascending: true });
  if (error) {
    console.warn("[soleiq] listMyPriorVisits failed:", error.message);
    return [];
  }
  return mapVisitRows(sb, data ?? []);
}

/**
 * "Open Results": the most recent saved analysis for a user. With no
 * argument, the current user's own; doctors/admins pass a patient's
 * auth uid (RLS decides whether they may actually read it — patients get
 * only their own rows, doctors their assigned patients', admins anyone's).
 * Returns null when the user has no saved analysis yet.
 */
export async function getLatestVisitWithResult(
  targetAuthUid?: string | null
): Promise<Visit | null> {
  const sb = getSupabase();
  if (!sb) return null;
  let authUid = targetAuthUid ?? null;
  if (!authUid) {
    const { data: u } = await sb.auth.getUser();
    authUid = u.user?.id ?? null;
  }
  if (!authUid) return null;
  const { data, error } = await sb
    .from("visits")
    .select(VISIT_SELECT)
    .eq("auth_uid", authUid)
    .not("completed_at", "is", null)
    .order("started_at", { ascending: false })
    .limit(5);
  if (error) {
    console.warn("[soleiq] getLatestVisitWithResult failed:", error.message);
    return null;
  }
  const visits = await mapVisitRows(sb, data ?? []);
  return visits.find((visit) => visit.result?.screening) ?? visits[0] ?? null;
}

/**
 * Doctor/admin view: every completed visit for one patient (their auth uid),
 * oldest first — the photo timeline. RLS returns rows only if the viewer is
 * the patient, an assigned doctor, or an admin.
 */
export async function listVisitsForUser(authUid: string): Promise<Visit[]> {
  const sb = getSupabase();
  if (!sb || !authUid) return [];
  const { data, error } = await sb
    .from("visits")
    .select(VISIT_SELECT)
    .eq("auth_uid", authUid)
    .not("completed_at", "is", null)
    .order("started_at", { ascending: true });
  if (error) {
    console.warn("[soleiq] listVisitsForUser failed:", error.message);
    return [];
  }
  return mapVisitRows(sb, data ?? []);
}

export interface PatientRecord {
  id: string;
  auth_uid: string;
  full_name: string | null;
  age: number | null;
  sex: string | null;
  city: string | null;
  state: string | null;
  conditions: string[] | null;
  numbness: string | null;
  pain_present: boolean | null;
  created_at: string;
}

/** Latest patients row for one auth uid (RLS-scoped). */
export async function getPatientByAuthUid(
  authUid: string
): Promise<PatientRecord | null> {
  const sb = getSupabase();
  if (!sb || !authUid) return null;
  const { data, error } = await sb
    .from("patients")
    .select(
      "id, auth_uid, full_name, age, sex, city, state, conditions, numbness, pain_present, created_at"
    )
    .eq("auth_uid", authUid)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    console.warn("[soleiq] getPatientByAuthUid failed:", error.message);
    return null;
  }
  return (data as PatientRecord) ?? null;
}

/**
 * Full intake row for the clinical report. RLS decides access: the patient
 * themself, an assigned doctor, or an admin. Column names mirror the
 * patients table.
 */
export interface PatientIntakeRow {
  id: string;
  auth_uid: string;
  full_name: string | null;
  city: string | null;
  state: string | null;
  age: number | null;
  sex: string | null;
  ethnicity: string | null;
  conditions: string[] | null;
  diabetes: {
    type?: string;
    yearDiagnosed?: number;
    hba1c?: number;
    glucose10d?: number[];
    glucoseCategory?: string;
  } | null;
  prior_events:
    | { type?: string; side?: string; region?: string; year?: number }[]
    | null;
  recent_surgery: { flag?: boolean; procedures?: string[] } | null;
  numbness: string | null;
  alcohol: boolean | null;
  smoking: boolean | null;
  shoe_size_us: number | null;
  foot_length_mm: number | null;
  pain_present: boolean | null;
  pain_points: string[] | null;
  pad: {
    status?: string;
    claudication?: boolean;
    restPain?: boolean;
    signs?: string[];
    abi?: number;
  } | null;
  created_at: string;
  updated_at: string;
}

export async function getPatientIntake(
  targetAuthUid?: string | null
): Promise<PatientIntakeRow | null> {
  const c = await client();
  if (!c) return null;
  const authUid = targetAuthUid ?? c.uid;
  const { data, error } = await c.sb
    .from("patients")
    .select("*")
    .eq("auth_uid", authUid)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    console.warn("[soleiq] getPatientIntake failed:", error.message);
    return null;
  }
  return (data as PatientIntakeRow) ?? null;
}

async function mapVisitRows(
  sb: NonNullable<ReturnType<typeof getSupabase>>,
  data: any[]
): Promise<Visit[]> {
  const paths = (data ?? []).flatMap((row: any) =>
    (row.captured_images ?? [])
      .map((image: any) => image.storage_path)
      .filter(Boolean)
  );
  const signedByPath = new Map<string, string>();
  if (paths.length > 0) {
    const { data: signed } = await sb.storage
      .from("foot-photos")
      .createSignedUrls(paths, 60 * 60);
    signed?.forEach((item, index) => {
      if (item.signedUrl) signedByPath.set(paths[index], item.signedUrl);
    });
  }

  return (data ?? []).map((row: any): Visit => ({
    id: row.id,
    startedAt: row.started_at ? Date.parse(row.started_at) : Date.now(),
    completedAt: row.completed_at ? Date.parse(row.completed_at) : undefined,
    images: (row.captured_images ?? []).map((i: any) => ({
      side: i.side,
      view: i.view,
      dataUrl:
        (i.storage_path && signedByPath.get(i.storage_path)) ||
        i.data_url ||
        "/sample-foot.svg",
      storagePath: i.storage_path ?? undefined,
      quality: i.quality ?? undefined,
      capturedAt: i.captured_at ? Date.parse(i.captured_at) : 0,
    })),
    meshes: (row.foot_meshes ?? []).map((m: any) => ({
      side: m.side,
      coveragePct: Number(m.coverage_pct),
      seedSignature: m.seed_signature,
      capturedAt: m.captured_at ? Date.parse(m.captured_at) : 0,
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
          screening: row.analysis_results[0].screening_result ?? undefined,
        }
      : undefined,
  }));
}

export async function deleteMyVisit(visitId: string): Promise<void> {
  const c = await client();
  if (!c) return;
  const { data: images, error: imageError } = await c.sb
    .from("captured_images")
    .select("storage_path")
    .eq("visit_id", visitId);
  if (imageError) throw new Error(imageError.message);
  const paths = (images ?? [])
    .map((image: any) => image.storage_path)
    .filter(Boolean);
  if (paths.length > 0) {
    const { error: storageError } = await c.sb.storage
      .from("foot-photos")
      .remove(paths);
    if (storageError) throw new Error(storageError.message);
  }
  const { error } = await c.sb.from("visits").delete().eq("id", visitId);
  if (error) throw new Error(error.message);
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

// ---------- RBAC management (admin console) --------------------------------
// All of these are RLS-enforced: only an admin's session can actually change
// roles or assignments; these helpers just surface the errors.

export async function updateProfileRole(
  profileId: string,
  role: "admin" | "doctor" | "patient"
): Promise<void> {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase not configured");
  const { error } = await sb.from("profiles").update({ role }).eq("id", profileId);
  if (error) throw new Error(error.message);
}

export interface AssignmentRow {
  id: string;
  doctor_id: string;
  patient_id: string;
  created_at: string;
}

export async function listAssignments(): Promise<AssignmentRow[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb
    .from("doctor_patient_assignments")
    .select("id, doctor_id, patient_id, created_at")
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) {
    console.warn("[soleiq] listAssignments failed:", error.message);
    return [];
  }
  return (data ?? []) as AssignmentRow[];
}

export async function createAssignment(
  doctorId: string,
  patientId: string
): Promise<void> {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase not configured");
  const { error } = await sb
    .from("doctor_patient_assignments")
    .insert({ doctor_id: doctorId, patient_id: patientId });
  if (error) throw new Error(error.message);
}

export async function deleteAssignment(assignmentId: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase not configured");
  const { error } = await sb
    .from("doctor_patient_assignments")
    .delete()
    .eq("id", assignmentId);
  if (error) throw new Error(error.message);
}

// ---------- Patient-initiated sharing --------------------------------------
// Backed by the dpa_patient_share / profiles_doctor_directory policies in
// 2026-07-patient-share.sql. The assignment row is the persistent link: once
// it exists, RLS lets that doctor read this patient's visits and results.

export interface DoctorRow {
  id: string;
  email: string | null;
  full_name: string | null;
}

/** Doctor directory — visible to any signed-in user so a patient can pick. */
export async function listDoctors(): Promise<DoctorRow[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb
    .from("profiles")
    .select("id, email, full_name")
    .eq("role", "doctor")
    .order("email", { ascending: true })
    .limit(200);
  if (error) {
    console.warn("[soleiq] listDoctors failed:", error.message);
    return [];
  }
  return (data ?? []) as DoctorRow[];
}

/** The current patient's doctor links (assignment id + doctor id). */
export async function listMyDoctorLinks(): Promise<AssignmentRow[]> {
  const c = await client();
  if (!c) return [];
  const { data, error } = await c.sb
    .from("doctor_patient_assignments")
    .select("id, doctor_id, patient_id, created_at")
    .eq("patient_id", c.uid)
    .order("created_at", { ascending: false });
  if (error) {
    console.warn("[soleiq] listMyDoctorLinks failed:", error.message);
    return [];
  }
  return (data ?? []) as AssignmentRow[];
}

/** Link the current patient to a doctor. Idempotent (duplicate = no-op). */
export async function shareWithDoctor(doctorId: string): Promise<void> {
  const c = await client();
  if (!c) throw new Error("You need to be signed in to share.");
  const { error } = await c.sb
    .from("doctor_patient_assignments")
    .upsert(
      { doctor_id: doctorId, patient_id: c.uid },
      { onConflict: "doctor_id,patient_id", ignoreDuplicates: true }
    );
  if (error) throw new Error(error.message);
}

/** Remove one of the current patient's doctor links. */
export async function unshareDoctor(assignmentId: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase not configured");
  const { error } = await sb
    .from("doctor_patient_assignments")
    .delete()
    .eq("id", assignmentId);
  if (error) throw new Error(error.message);
}

/**
 * Doctor side: the patients who shared with (or were assigned to) the
 * signed-in doctor, with their profile info. Two queries because the
 * assignments table has no PostgREST relationship alias to profiles.
 */
export async function listMyAssignedPatients(): Promise<
  { assignmentId: string; profile: DoctorRow; since: string }[]
> {
  const c = await client();
  if (!c) return [];
  const { data: links, error } = await c.sb
    .from("doctor_patient_assignments")
    .select("id, patient_id, created_at")
    .eq("doctor_id", c.uid)
    .order("created_at", { ascending: false });
  if (error) {
    console.warn("[soleiq] listMyAssignedPatients failed:", error.message);
    return [];
  }
  const ids = (links ?? []).map((l: any) => l.patient_id);
  if (ids.length === 0) return [];
  const { data: profiles } = await c.sb
    .from("profiles")
    .select("id, email, full_name")
    .in("id", ids);
  const byId = new Map((profiles ?? []).map((p: any) => [p.id, p]));
  return (links ?? []).map((l: any) => ({
    assignmentId: l.id,
    since: l.created_at,
    profile:
      (byId.get(l.patient_id) as DoctorRow | undefined) ?? {
        id: l.patient_id,
        email: null,
        full_name: null,
      },
  }));
}
