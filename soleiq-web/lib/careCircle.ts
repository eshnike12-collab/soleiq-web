"use client";

/**
 * Care-circle data layer (client side, always under the caller's RLS).
 *
 * The patient invites an email with a role; access is enforced by the
 * patient_access_grants table + has_care_circle_access() in Postgres —
 * revoking a grant cuts off reads immediately, no UI cooperation needed.
 * Clinician-role invitees see the clinical detail; family/caregivers see
 * the patient view only (the UI picks by grant role, and the clinical
 * summary is never fetched for non-clinician viewers).
 */

import { getSupabase } from "./supabase";
import { getCurrentPlan } from "./plans";

export type CareRole = "family" | "caregiver" | "clinician";
export type GrantStatus = "invited" | "active" | "revoked";

export interface CareGrant {
  id: string;
  email: string;
  role: CareRole;
  status: GrantStatus;
  createdAt: string;
  revokedAt: string | null;
}

export interface SharedPatient {
  grantId: string;
  patientId: string;
  patientName: string;
  /** The viewer's role in that patient's circle — decides which view renders. */
  role: CareRole;
}

async function myPatientId(): Promise<string | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data: u } = await sb.auth.getUser();
  if (!u.user) return null;
  const { data } = await sb
    .from("patients")
    .select("id")
    .eq("linked_user_id", u.user.id)
    .maybeSingle();
  return data?.id ?? null;
}

/** Grants the signed-in patient has issued (their circle), newest first. */
export async function listMyCareCircle(): Promise<CareGrant[]> {
  const sb = getSupabase();
  const patientId = await myPatientId();
  if (!sb || !patientId) return [];
  const { data } = await sb
    .from("patient_access_grants")
    .select("id, invitee_email, role, status, created_at, revoked_at")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false });
  return (data ?? []).map((g: any) => ({
    id: g.id,
    email: g.invitee_email,
    role: g.role,
    status: g.status,
    createdAt: g.created_at,
    revokedAt: g.revoked_at,
  }));
}

/** Family + caregiver slots in use (invited or active; clinicians are free). */
export function countCaregiverSlots(grants: CareGrant[]): number {
  return grants.filter(
    (g) => g.status !== "revoked" && g.role !== "clinician"
  ).length;
}

/** Best-effort invite email; access never depends on it. */
async function notifyInvitee(email: string, role: CareRole): Promise<boolean> {
  try {
    const response = await fetch("/api/care-circle/notify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, role }),
    });
    const payload = await response.json().catch(() => null);
    return Boolean(payload?.data?.emailSent);
  } catch {
    return false;
  }
}

export async function inviteToCareCircle(
  email: string,
  role: CareRole
): Promise<{ ok: true; emailSent: boolean } | { ok: false; reason: string }> {
  const sb = getSupabase();
  const patientId = await myPatientId();
  if (!sb || !patientId) {
    return { ok: false, reason: "Your account isn't linked to a patient record yet — complete a check first." };
  }
  const normalized = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    return { ok: false, reason: "Enter a valid email address." };
  }
  const { data: u } = await sb.auth.getUser();
  if (normalized === u.user?.email?.toLowerCase()) {
    return { ok: false, reason: "That's your own email — you already see everything." };
  }

  // Plan limit: family/caregiver slots are capped by the current plan.
  const existing = await listMyCareCircle();
  const plan = getCurrentPlan();
  if (role !== "clinician" && countCaregiverSlots(existing) >= plan.maxCaregivers) {
    return {
      ok: false,
      reason: `Your ${plan.name} plan includes ${plan.maxCaregivers} caregiver${plan.maxCaregivers === 1 ? "" : "s"}. Remove one or upgrade to add more.`,
    };
  }

  // Re-inviting a revoked email reactivates that grant instead of violating
  // the one-grant-per-email uniqueness.
  const previous = existing.find((g) => g.email.toLowerCase() === normalized);
  if (previous) {
    if (previous.status !== "revoked") {
      return { ok: false, reason: "That person is already in your care circle." };
    }
    const { error } = await sb
      .from("patient_access_grants")
      .update({
        role,
        status: "invited",
        revoked_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", previous.id);
    if (error) return { ok: false, reason: error.message };
    return { ok: true, emailSent: await notifyInvitee(normalized, role) };
  }

  const { error } = await sb.from("patient_access_grants").insert({
    patient_id: patientId,
    granted_by: u.user!.id,
    invitee_email: normalized,
    role,
  });
  if (error) return { ok: false, reason: error.message };
  return { ok: true, emailSent: await notifyInvitee(normalized, role) };
}

export async function revokeCareGrant(grantId: string): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;
  const { error } = await sb
    .from("patient_access_grants")
    .update({
      status: "revoked",
      revoked_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", grantId);
  return !error;
}

/**
 * Link any pending invites addressed to my login email (flips them to
 * active and stamps my user id). Safe to call on every visit; returns the
 * number claimed. Errors (e.g. migration not applied yet) count as zero.
 */
export async function claimCareCircleInvites(): Promise<number> {
  const sb = getSupabase();
  if (!sb) return 0;
  try {
    const { data } = await sb.rpc("claim_care_circle_invites");
    return typeof data === "number" ? data : 0;
  } catch {
    return 0;
  }
}

/** Patients who have shared their records WITH the signed-in user. */
export async function listSharedWithMe(): Promise<SharedPatient[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data: u } = await sb.auth.getUser();
  if (!u.user) return [];
  await claimCareCircleInvites();
  const { data } = await sb
    .from("patient_access_grants")
    .select("id, patient_id, role, status, patients(full_name)")
    .eq("status", "active")
    .eq("invitee_user_id", u.user.id);
  return (data ?? []).map((g: any) => {
    const patient = Array.isArray(g.patients) ? g.patients[0] : g.patients;
    return {
      grantId: g.id,
      patientId: g.patient_id,
      patientName: patient?.full_name ?? "Shared patient",
      role: g.role,
    };
  });
}

// ---------------------------------------------------------------------------
// Shared-view reads (viewer side). RLS is the gate: these queries return
// rows only while an active grant exists.
// ---------------------------------------------------------------------------

export interface SharedCheckSummary {
  reportId: string;
  date: number;
  riskLevel: string;
  status: string;
  headline: string | null;
  hospitalName: string | null;
}

export interface SharedReportDetail extends SharedCheckSummary {
  /** patient_summary always; clinical_summary only for clinician grants. */
  patientSummary: any;
  clinicalSummary: any | null;
  photos: { assetId: string; side: string; view: string; url: string }[];
  recommendation: {
    products: any[];
    signals: { patient?: string[]; clinician?: string[] };
    created_at?: string;
  } | null;
}

export async function listSharedChecks(patientId: string): Promise<SharedCheckSummary[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data: enrollments } = await sb
    .from("organization_patients")
    .select("id")
    .eq("patient_id", patientId);
  const ids = (enrollments ?? []).map((e: any) => e.id);
  if (ids.length === 0) return [];
  const { data: reports } = await sb
    .from("reports")
    .select(
      "id, status, risk_level, patient_summary, hospital_name_snapshot, created_at, screening_sessions(started_at)"
    )
    .in("organization_patient_id", ids)
    .neq("status", "superseded")
    .order("created_at", { ascending: false })
    .limit(50);
  return (reports ?? []).map((r: any) => {
    const session = Array.isArray(r.screening_sessions)
      ? r.screening_sessions[0]
      : r.screening_sessions;
    return {
      reportId: r.id,
      date: session?.started_at
        ? Date.parse(session.started_at)
        : Date.parse(r.created_at),
      riskLevel: r.risk_level,
      status: r.status,
      headline: (r.patient_summary as any)?.overall?.headline ?? null,
      hospitalName: r.hospital_name_snapshot ?? null,
    };
  });
}

export async function getSharedReport(
  reportId: string,
  viewerRole: CareRole
): Promise<SharedReportDetail | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const wantClinical = viewerRole === "clinician";
  const { data: r } = await sb
    .from("reports")
    .select(
      `id, screening_session_id, status, risk_level, patient_summary, ${
        wantClinical ? "clinical_summary, " : ""
      }hospital_name_snapshot, created_at, screening_sessions(started_at)`
    )
    .eq("id", reportId)
    .neq("status", "superseded")
    .maybeSingle();
  if (!r) return null;

  const { data: assets } = await sb
    .from("media_assets")
    .select("id, side, view, storage_bucket, storage_path")
    .eq("screening_session_id", (r as any).screening_session_id)
    .eq("asset_type", "photo");
  const photos: SharedReportDetail["photos"] = [];
  for (const asset of assets ?? []) {
    const { data: signed } = await sb.storage
      .from(asset.storage_bucket)
      .createSignedUrl(asset.storage_path, 3600);
    if (signed?.signedUrl) {
      photos.push({
        assetId: asset.id,
        side: asset.side,
        view: asset.view,
        url: signed.signedUrl,
      });
    }
  }

  let recommendation: SharedReportDetail["recommendation"] = null;
  try {
    const { data: rec } = await sb
      .from("report_recommendations")
      .select("products, signals, created_at")
      .eq("report_id", reportId)
      .maybeSingle();
    if (rec && Array.isArray(rec.products) && rec.products.length > 0) {
      recommendation = rec as any;
    }
  } catch {
    // Older environments without the table simply show no recommendation.
  }

  const session = Array.isArray((r as any).screening_sessions)
    ? (r as any).screening_sessions[0]
    : (r as any).screening_sessions;
  return {
    reportId: (r as any).id,
    date: session?.started_at
      ? Date.parse(session.started_at)
      : Date.parse((r as any).created_at),
    riskLevel: (r as any).risk_level,
    status: (r as any).status,
    headline: ((r as any).patient_summary as any)?.overall?.headline ?? null,
    hospitalName: (r as any).hospital_name_snapshot ?? null,
    patientSummary: (r as any).patient_summary ?? {},
    clinicalSummary: wantClinical ? (r as any).clinical_summary ?? null : null,
    photos,
    recommendation,
  };
}
