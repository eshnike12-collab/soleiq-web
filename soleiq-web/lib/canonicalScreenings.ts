"use client";

import { getSupabase } from "./supabase";
import type { PatientProfile, ScreeningLevel, Visit } from "./types";

export interface CanonicalCheckPhoto {
  assetId: string;
  side: "left" | "right";
  view: string;
  url: string;
}

export interface CanonicalCheck {
  reportId: string;
  startedAt: number;
  riskLevel: ScreeningLevel;
  headline: string | null;
  hospitalName: string | null;
  photos: CanonicalCheckPhoto[];
}

/**
 * The signed-in patient's released checks with photo thumbnails, oldest
 * first. Reports come via RLS (a patient only sees their own released
 * reports); photos are media_assets resolved to short-lived signed URLs
 * from the private clinical-media bucket. Callers re-invoke on mount, so
 * URL expiry (1h) never outlives a screen.
 */
export async function listMyCanonicalChecks(): Promise<CanonicalCheck[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data: u } = await sb.auth.getUser();
  if (!u.user) return [];

  const { data: reports, error } = await sb
    .from("reports")
    .select(
      "id, screening_session_id, risk_level, patient_summary, hospital_name_snapshot, finalized_at, created_at, screening_sessions(started_at)"
    )
    .eq("status", "released")
    .order("created_at", { ascending: true })
    .limit(50);
  if (error || !reports || reports.length === 0) return [];

  const sessionIds = reports
    .map((report: any) => report.screening_session_id)
    .filter(Boolean);
  const { data: assets } = sessionIds.length
    ? await sb
        .from("media_assets")
        .select("id, screening_session_id, side, view, storage_bucket, storage_path")
        .in("screening_session_id", sessionIds)
        .eq("asset_type", "photo")
    : { data: [] as any[] };

  // Batch-sign per bucket (normally all clinical-media).
  const urlByPath = new Map<string, string>();
  const buckets = new Map<string, string[]>();
  for (const asset of assets ?? []) {
    const list = buckets.get(asset.storage_bucket) ?? [];
    list.push(asset.storage_path);
    buckets.set(asset.storage_bucket, list);
  }
  for (const [bucket, paths] of Array.from(buckets)) {
    const { data: signed } = await sb.storage.from(bucket).createSignedUrls(paths, 3600);
    signed?.forEach((item, index) => {
      if (item.signedUrl) urlByPath.set(paths[index], item.signedUrl);
    });
  }

  return reports.map((report: any): CanonicalCheck => {
    const session = Array.isArray(report.screening_sessions)
      ? report.screening_sessions[0]
      : report.screening_sessions;
    const photos = (assets ?? [])
      .filter((asset: any) => asset.screening_session_id === report.screening_session_id)
      .map((asset: any) => ({
        assetId: asset.id,
        side: asset.side,
        view: asset.view,
        url: urlByPath.get(asset.storage_path) ?? "",
      }))
      .filter((photo: CanonicalCheckPhoto) => photo.url);
    return {
      reportId: report.id,
      startedAt: session?.started_at
        ? Date.parse(session.started_at)
        : Date.parse(report.created_at),
      riskLevel: report.risk_level as ScreeningLevel,
      headline: (report.patient_summary as any)?.overall?.headline ?? null,
      hospitalName: report.hospital_name_snapshot ?? null,
      photos,
    };
  });
}

export async function saveCanonicalScreening(
  profile: Partial<PatientProfile>,
  visit: Visit
): Promise<
  | { saved: true; sessionId: string; status: string }
  | { saved: false; localOnly: true; reason: string }
> {
  const response = await fetch("/api/screenings", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      idempotencyKey: visit.id,
      startedAt: visit.startedAt,
      images: visit.images
        .filter((image) => image.view === "top" || image.view === "sole")
        .map((image) => ({
          side: image.side,
          view: image.view,
          dataUrl: image.dataUrl,
          capturedAt: image.capturedAt,
          quality: image.quality ?? null,
        })),
      patientContext: profile,
    }),
  });
  const payload = await response.json().catch(() => null);
  if (response.status === 409) {
    return {
      saved: false,
      localOnly: true,
      reason:
        payload?.error?.message ??
        "This check is available locally but is not linked to a hospital record.",
    };
  }
  if (!response.ok || !payload?.ok) {
    throw new Error(payload?.error?.message ?? "The screening could not be saved.");
  }
  return {
    saved: true,
    sessionId: payload.data.sessionId,
    status: payload.data.status,
  };
}

