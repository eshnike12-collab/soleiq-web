"use client";

/**
 * Clinical-visit log (care_visits table). The patient records upcoming and
 * past visits with notes; their care circle can read them (RLS). Writes are
 * patient-only.
 */

import { getSupabase } from "./supabase";

export type VisitStatus = "scheduled" | "completed" | "cancelled";

export interface CareVisit {
  id: string;
  title: string;
  location: string | null;
  notes: string | null;
  scheduledAt: string;
  status: VisitStatus;
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

/** All visits, soonest upcoming first, then past ones newest first. */
export async function listMyVisits(patientId?: string): Promise<CareVisit[]> {
  const sb = getSupabase();
  const target = patientId ?? (await myPatientId());
  if (!sb || !target) return [];
  const { data } = await sb
    .from("care_visits")
    .select("id, title, location, notes, scheduled_at, status")
    .eq("patient_id", target)
    .order("scheduled_at", { ascending: false })
    .limit(100);
  return (data ?? []).map((v: any) => ({
    id: v.id,
    title: v.title,
    location: v.location,
    notes: v.notes,
    scheduledAt: v.scheduled_at,
    status: v.status,
  }));
}

export async function addVisit(input: {
  title: string;
  scheduledAt: string;
  location?: string;
  notes?: string;
}): Promise<{ ok: true } | { ok: false; reason: string }> {
  const sb = getSupabase();
  const patientId = await myPatientId();
  if (!sb || !patientId) {
    return { ok: false, reason: "Your account isn't linked to a patient record yet." };
  }
  const { data: u } = await sb.auth.getUser();
  const { error } = await sb.from("care_visits").insert({
    patient_id: patientId,
    created_by: u.user!.id,
    title: input.title.trim(),
    location: input.location?.trim() || null,
    notes: input.notes?.trim() || null,
    scheduled_at: input.scheduledAt,
  });
  return error ? { ok: false, reason: error.message } : { ok: true };
}

export async function setVisitStatus(
  visitId: string,
  status: VisitStatus
): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;
  const { error } = await sb
    .from("care_visits")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", visitId);
  return !error;
}

export async function deleteVisit(visitId: string): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;
  const { error } = await sb.from("care_visits").delete().eq("id", visitId);
  return !error;
}
