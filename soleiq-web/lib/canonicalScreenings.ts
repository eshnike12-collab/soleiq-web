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
  /** preliminary | clinician_reviewed | released — anything not released is
   *  shown as "Pending review". */
  status: string;
  /** Structured findings from the stored patient summary — used by the
   *  Comparison tab to diff checks without re-reading full reports. */
  findings: {
    foot: string;
    surface: string;
    what_we_saw: string;
    location_plain?: string;
    concern?: "low" | "medium" | "high";
  }[];
  looksGood: string[];
  notes: string[];
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

  // Newest 50, flipped back to oldest-first below. Ordering ascending before
  // LIMIT selected the OLDEST 50 rows, so once a patient passed 50 checks
  // every new one fell outside the window and history silently stopped
  // updating — the save had worked, the report existed, and it was simply
  // never fetched.
  const { data: newestFirst, error } = await sb
    .from("reports")
    .select(
      "id, screening_session_id, status, risk_level, patient_summary, hospital_name_snapshot, finalized_at, created_at, screening_sessions(started_at)"
    )
    .neq("status", "superseded")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error || !newestFirst || newestFirst.length === 0) return [];
  // Callers (history, timeline, compare) all rely on oldest-first ordering.
  const reports = [...newestFirst].reverse();

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
    const summary = (report.patient_summary as any) ?? {};
    return {
      reportId: report.id,
      startedAt: session?.started_at
        ? Date.parse(session.started_at)
        : Date.parse(report.created_at),
      riskLevel: report.risk_level as ScreeningLevel,
      headline: summary?.overall?.headline ?? null,
      hospitalName: report.hospital_name_snapshot ?? null,
      status: report.status ?? "preliminary",
      findings: Array.isArray(summary?.findings)
        ? summary.findings.map((finding: any) => ({
            foot: finding.foot,
            surface: finding.surface,
            what_we_saw: finding.what_we_saw ?? "",
            location_plain: finding.location_plain,
            concern: finding.concern,
          }))
        : [],
      looksGood: Array.isArray(summary?.looks_good) ? summary.looks_good : [],
      notes: Array.isArray(summary?.personal_notes) ? summary.personal_notes : [],
      photos,
    };
  });
}

export interface MyRecommendation {
  reportId: string;
  createdAt: number;
  riskLevel: string | null;
  hospitalName: string | null;
  products: {
    id: string;
    name: string;
    helpsWith: string;
    howItHelps: string;
    url: string;
    caution?: string;
    reason: string;
  }[];
  patientSignals: string[];
}

/**
 * Running list of every product recommendation the app has generated for
 * the signed-in patient, newest first, each linked to the report it was
 * frozen with. RLS mirrors report access. Empty on environments where the
 * report_recommendations migration hasn't been applied.
 */
export async function listMyRecommendations(): Promise<MyRecommendation[]> {
  const sb = getSupabase();
  if (!sb) return [];
  try {
    const { data, error } = await sb
      .from("report_recommendations")
      .select(
        "report_id, products, signals, created_at, reports(risk_level, hospital_name_snapshot, status)"
      )
      .order("created_at", { ascending: false })
      .limit(50);
    if (error || !data) return [];
    return data
      .filter((row: any) => {
        const report = Array.isArray(row.reports) ? row.reports[0] : row.reports;
        return report && report.status !== "superseded";
      })
      .map((row: any) => {
        const report = Array.isArray(row.reports) ? row.reports[0] : row.reports;
        return {
          reportId: row.report_id,
          createdAt: Date.parse(row.created_at),
          riskLevel: report?.risk_level ?? null,
          hospitalName: report?.hospital_name_snapshot ?? null,
          products: Array.isArray(row.products) ? row.products : [],
          patientSignals: Array.isArray(row.signals?.patient) ? row.signals.patient : [],
        };
      });
  } catch {
    return [];
  }
}

/** Longer than the route's own analysis budget, so the server gets to answer
 *  for itself before the browser gives up on it. */
const SAVE_REQUEST_TIMEOUT_MS = 75_000;

/**
 * Did this check land in the database despite the request not coming back?
 *
 * The upload and the queued analysis are committed well before the reading
 * finishes, so a gateway timeout or a dropped connection says nothing about
 * whether the patient's photos were saved. Reading the session back (RLS
 * scopes this to the caller's own checks) is what separates "still being
 * analyzed" from a genuine failure — the difference between telling someone
 * their check is safe and telling them to do it again.
 */
async function findPersistedSession(
  idempotencyKey: string
): Promise<{ id: string; status: string; reportId: string | null } | null> {
  const sb = getSupabase();
  if (!sb) return null;
  try {
    const { data: session } = await sb
      .from("screening_sessions")
      .select("id, status")
      .eq("idempotency_key", idempotencyKey)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!session) return null;
    const { data: report } = await sb
      .from("reports")
      .select("id")
      .eq("screening_session_id", session.id)
      .neq("status", "superseded")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return {
      id: session.id,
      status: session.status,
      reportId: report?.id ?? null,
    };
  } catch {
    return null;
  }
}

export async function saveCanonicalScreening(
  profile: Partial<PatientProfile>,
  visit: Visit
): Promise<
  | { saved: true; sessionId: string; status: string; reportId: string | null }
  | { saved: false; localOnly: true; reason: string }
> {
  const request = {
    method: "POST",
    headers: { "content-type": "application/json" },
    signal: AbortSignal.timeout(SAVE_REQUEST_TIMEOUT_MS),
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
  } satisfies RequestInit;

  let response: Response;
  try {
    response = await fetch("/api/screenings", request);
  } catch {
    // Timed out or the connection dropped mid-request.
    const persisted = await findPersistedSession(visit.id);
    if (persisted) {
      return {
        saved: true,
        sessionId: persisted.id,
        status: persisted.status,
        reportId: persisted.reportId,
      };
    }
    throw new Error(
      "The screening could not be sent. Check your connection and try again."
    );
  }

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
  // 502/504 come from the platform, not the route: the upload and the queued
  // analysis may well have committed before the invocation was cut off.
  if (response.status === 502 || response.status === 504) {
    const persisted = await findPersistedSession(visit.id);
    if (persisted) {
      return {
        saved: true,
        sessionId: persisted.id,
        status: persisted.status,
        reportId: persisted.reportId,
      };
    }
  }
  if (!response.ok || !payload?.ok) {
    throw new Error(payload?.error?.message ?? "The screening could not be saved.");
  }
  return {
    saved: true,
    sessionId: payload.data.sessionId,
    status: payload.data.status,
    reportId: payload.data.reportId ?? null,
  };
}

