import "server-only";

import { notFound } from "./errors";
import { requireAuth } from "./auth";
import { resolveHospital } from "./tenancy";
import { writeAudit } from "./audit";
import {
  derivePhotoLabels,
  labelsFor,
  photoTimestamp,
  type PhotoLabels,
} from "@/lib/photoTimeline";

export interface ReportPhoto {
  assetId: string;
  side: string;
  view: string;
  url: string;
  /** First photo ever taken of this foot and view. See lib/photoTimeline.ts. */
  baseline: boolean;
  /** Most recent photo of this foot and view. */
  latest: boolean;
}

/**
 * BASELINE / LATEST badges for one patient's whole photo history.
 *
 * Labels cannot be worked out from a single check — a photo has no way of
 * knowing it is the first of its kind by looking only at its own session — so
 * this reads the metadata (no signing, no image bytes) for every photo the
 * patient has, and derives both ends from it.
 *
 * Bounded from BOTH ends deliberately. A single `limit` would have to choose:
 * ordered oldest-first it truncates the newest photos and the LATEST badge
 * vanishes from the check the patient just took; ordered newest-first it
 * truncates the oldest and BASELINE lands on the wrong photo — a badge that is
 * confidently wrong, which is worse than one that is missing. Taking a
 * thousand from each end and merging keeps both ends exact; only the middle,
 * where nothing is labelled anyway, can ever be dropped.
 */
export async function patientPhotoLabels(
  supabase: Awaited<ReturnType<typeof requireAuth>>["supabase"],
  organizationPatientIds: string[]
): Promise<Map<string, PhotoLabels>> {
  const enrollmentIds = organizationPatientIds.filter(Boolean);
  if (enrollmentIds.length === 0) return new Map();
  try {
    const { data: sessions } = await supabase
      .from("screening_sessions")
      .select("id")
      .in("organization_patient_id", enrollmentIds);
    const sessionIds = (sessions ?? []).map((row: any) => row.id).filter(Boolean);
    if (sessionIds.length === 0) return new Map();

    const columns = "id, side, view, captured_at, created_at";
    const [oldest, newest] = await Promise.all([
      supabase
        .from("media_assets")
        .select(columns)
        .in("screening_session_id", sessionIds)
        .eq("asset_type", "photo")
        .order("captured_at", { ascending: true, nullsFirst: false })
        .limit(1000),
      supabase
        .from("media_assets")
        .select(columns)
        .in("screening_session_id", sessionIds)
        .eq("asset_type", "photo")
        .order("captured_at", { ascending: false, nullsFirst: false })
        .limit(1000),
    ]);

    const byId = new Map<string, any>();
    for (const row of [...(oldest.data ?? []), ...(newest.data ?? [])]) {
      byId.set(row.id, row);
    }
    return derivePhotoLabels(
      Array.from(byId.values()).map((row) => ({
        assetId: row.id,
        side: row.side,
        view: row.view,
        capturedAt: photoTimestamp(row),
      }))
    );
  } catch {
    // Badges are an enhancement. A patient must still see their photos.
    return new Map();
  }
}

/**
 * Resolve the photo assets for a set of screening sessions into short-lived
 * signed URLs, keyed by session id. Runs under the caller's RLS: patients
 * only get media for released reports, so this never leaks in-review photos.
 */
async function signSessionPhotos(
  supabase: Awaited<ReturnType<typeof requireAuth>>["supabase"],
  sessionIds: string[],
  ttlSeconds = 3600,
  labels: Map<string, PhotoLabels> = new Map()
): Promise<Map<string, ReportPhoto[]>> {
  const bySession = new Map<string, ReportPhoto[]>();
  const ids = sessionIds.filter(Boolean);
  if (ids.length === 0) return bySession;
  const { data: assets } = await supabase
    .from("media_assets")
    .select("id, screening_session_id, side, view, storage_bucket, storage_path")
    .in("screening_session_id", ids)
    .eq("asset_type", "photo");
  if (!assets || assets.length === 0) return bySession;

  const urlByPath = new Map<string, string>();
  const buckets = new Map<string, string[]>();
  for (const asset of assets) {
    const list = buckets.get(asset.storage_bucket) ?? [];
    list.push(asset.storage_path);
    buckets.set(asset.storage_bucket, list);
  }
  for (const [bucket, paths] of Array.from(buckets)) {
    const { data: signed } = await supabase.storage
      .from(bucket)
      .createSignedUrls(paths, ttlSeconds);
    signed?.forEach((item, index) => {
      if (item.signedUrl) urlByPath.set(paths[index], item.signedUrl);
    });
  }
  for (const asset of assets) {
    const url = urlByPath.get(asset.storage_path);
    if (!url) continue;
    const list = bySession.get(asset.screening_session_id) ?? [];
    const { baseline, latest } = labelsFor(labels, asset.id);
    list.push({
      assetId: asset.id,
      side: asset.side,
      view: asset.view,
      url,
      baseline,
      latest,
    });
    bySession.set(asset.screening_session_id, list);
  }
  return bySession;
}

export async function getPatientClinicalRecord(
  hospitalSlug: string,
  organizationPatientId: string,
  requestId: string
) {
  const hospital = await resolveHospital(hospitalSlug, ["doctor", "admin"]);
  const { supabase } = await requireAuth();
  const { data: enrollment, error } = await supabase
    .from("organization_patients")
    .select(
      "id, organization_id, patient_id, mrn, enrollment_status, created_at, patients(full_name, date_of_birth, sex, demographics, status), facilities!organization_patients_facility_id_organization_id_fkey(name)"
    )
    .eq("id", organizationPatientId)
    .eq("organization_id", hospital.id)
    .maybeSingle();
  if (error || !enrollment) throw notFound("Patient not found.");
  const { data: reports, error: reportsError } = await supabase
    .from("reports")
    .select(
      "id, version, status, risk_level, hospital_name_snapshot, finalized_at, created_at, screening_sessions(started_at, completed_at)"
    )
    .eq("organization_patient_id", organizationPatientId)
    .eq("organization_id", hospital.id)
    .neq("status", "superseded")
    .order("created_at", { ascending: false })
    .limit(100);
  if (reportsError) throw new Error(reportsError.message);
  await writeAudit(supabase, {
    organizationId: hospital.id,
    action: "patient_record.viewed",
    resourceType: "organization_patient",
    resourceId: enrollment.id,
    patientId: enrollment.patient_id,
    purpose: "treatment",
    requestId,
  });
  return { hospital, enrollment, reports: reports ?? [] };
}

/**
 * Doctor comparison view: every non-superseded report for one enrollment
 * with its clinical summary and signed photos, oldest first — the data the
 * shared ComparisonView diffs. Access identical to the clinical record
 * (doctor/admin membership + RLS), and the view is audited.
 */
export async function getPatientComparisonData(
  hospitalSlug: string,
  organizationPatientId: string,
  requestId: string
) {
  const hospital = await resolveHospital(hospitalSlug, ["doctor", "admin"]);
  const { supabase } = await requireAuth();
  const { data: enrollment, error } = await supabase
    .from("organization_patients")
    .select("id, organization_id, patient_id, mrn, patients(full_name)")
    .eq("id", organizationPatientId)
    .eq("organization_id", hospital.id)
    .maybeSingle();
  if (error || !enrollment) throw notFound("Patient not found.");

  const { data: reports, error: reportsError } = await supabase
    .from("reports")
    .select(
      "id, screening_session_id, version, status, risk_level, clinical_summary, created_at, screening_sessions(started_at)"
    )
    .eq("organization_patient_id", organizationPatientId)
    .eq("organization_id", hospital.id)
    .neq("status", "superseded")
    .order("created_at", { ascending: true })
    .limit(24);
  if (reportsError) throw new Error(reportsError.message);

  const photosBySession = await signSessionPhotos(
    supabase,
    (reports ?? []).slice(-12).map((report: any) => report.screening_session_id),
    3600,
    await patientPhotoLabels(supabase, [organizationPatientId])
  );

  await writeAudit(supabase, {
    organizationId: hospital.id,
    action: "patient_record.compared",
    resourceType: "organization_patient",
    resourceId: enrollment.id,
    patientId: enrollment.patient_id,
    purpose: "treatment",
    requestId,
  });

  const checks = (reports ?? []).map((report: any) => {
    const session = Array.isArray(report.screening_sessions)
      ? report.screening_sessions[0]
      : report.screening_sessions;
    const summary = (report.clinical_summary as any) ?? {};
    return {
      id: report.id as string,
      date: session?.started_at
        ? Date.parse(session.started_at)
        : Date.parse(report.created_at),
      riskLevel: report.risk_level as string,
      status: report.status as string,
      headline: summary?.overall?.headline ?? null,
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
      photos: (photosBySession.get(report.screening_session_id) ?? []).map(
        (photo) => ({ side: photo.side, view: photo.view, url: photo.url })
      ),
    };
  });

  return { hospital, enrollment, checks };
}

export async function getPatientReleasedReport(
  reportId: string,
  requestId: string
) {
  const { supabase, user } = await requireAuth();
  const { data: patient } = await supabase
    .from("patients")
    .select("id")
    .eq("linked_user_id", user.id)
    .maybeSingle();
  if (!patient) throw notFound("Report not found.");
  const { data: report, error } = await supabase
    .from("reports")
    .select(
      "id, organization_id, organization_patient_id, screening_session_id, version, status, risk_level, patient_summary, hospital_name_snapshot, finalized_at, created_at, screening_sessions(started_at, completed_at)"
    )
    .eq("id", reportId)
    // Patients see their reports as soon as analysis completes; the UI
    // labels anything not yet released as "Pending review".
    .neq("status", "superseded")
    .maybeSingle();
  if (error || !report) throw notFound("Report not found.");
  const { data: enrollment } = await supabase
    .from("organization_patients")
    .select("id, patient_id")
    .eq("id", report.organization_patient_id)
    .eq("patient_id", patient.id)
    .maybeSingle();
  if (!enrollment) throw notFound("Report not found.");
  await writeAudit(supabase, {
    organizationId: report.organization_id,
    action: "report.viewed",
    resourceType: "report",
    resourceId: report.id,
    patientId: patient.id,
    purpose: "patient_request",
    requestId,
  });
  // Every enrollment this patient has: the baseline photo may well live in a
  // different hospital's record than the report being opened.
  const { data: allEnrollments } = await supabase
    .from("organization_patients")
    .select("id")
    .eq("patient_id", patient.id);
  const photosBySession = await signSessionPhotos(
    supabase,
    [(report as any).screening_session_id],
    3600,
    await patientPhotoLabels(
      supabase,
      (allEnrollments ?? []).map((row: any) => row.id)
    )
  );
  return {
    ...report,
    photos: photosBySession.get((report as any).screening_session_id) ?? [],
    recommendation: await getStoredRecommendation(supabase, report.id),
  };
}

/**
 * The product recommendation frozen with a report at analysis time. RLS
 * mirrors report access exactly. Returns null when none was stored (older
 * checks) or the table hasn't been migrated yet — callers render nothing.
 */
export async function getStoredRecommendation(
  supabase: Awaited<ReturnType<typeof requireAuth>>["supabase"],
  reportId: string
): Promise<{
  products: any[];
  signals: { patient?: string[]; clinician?: string[] };
  created_at?: string;
} | null> {
  try {
    const { data } = await supabase
      .from("report_recommendations")
      .select("products, signals, created_at")
      .eq("report_id", reportId)
      .maybeSingle();
    if (!data || !Array.isArray(data.products) || data.products.length === 0) {
      return null;
    }
    return data as any;
  } catch {
    return null;
  }
}

export async function getPatientDashboard() {
  const { supabase, user } = await requireAuth();
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", user.id)
    .maybeSingle();
  if (profileError) throw new Error(profileError.message);
  const { data: patient, error: patientError } = await supabase
    .from("patients")
    .select("id, full_name")
    .eq("linked_user_id", user.id)
    .maybeSingle();
  if (
    patientError?.code === "42703" ||
    patientError?.code === "PGRST204" ||
    patientError?.code === "42P01" ||
    patientError?.code === "PGRST205"
  ) {
    return {
      profile,
      patient: null,
      enrollments: [],
      reports: [],
      configurationError:
        "This SoleIQ environment has not applied the hospital-membership database upgrade.",
    };
  }
  if (patientError) throw new Error(patientError.message);
  if (!patient) {
    return {
      profile,
      patient: null,
      enrollments: [],
      reports: [],
      configurationError: null,
    };
  }
  const { data: enrollments, error: enrollmentError } = await supabase
    .from("organization_patients")
    .select(
      "id, organization_id, enrollment_status, facilities!organization_patients_facility_id_organization_id_fkey(name), organizations(display_name, slug, branding)"
    )
    .eq("patient_id", patient.id)
    .order("created_at", { ascending: false });
  if (enrollmentError) throw new Error(enrollmentError.message);
  const enrollmentIds = (enrollments ?? []).map((row) => row.id);
  const { data: reports, error: reportError } = enrollmentIds.length
    ? await supabase
        .from("reports")
        .select(
          "id, organization_patient_id, screening_session_id, version, status, risk_level, patient_summary, hospital_name_snapshot, finalized_at, created_at, screening_sessions(started_at)"
        )
        .in("organization_patient_id", enrollmentIds)
        .neq("status", "superseded")
        .order("created_at", { ascending: false })
        .limit(100)
    : { data: [], error: null };
  if (reportError) throw new Error(reportError.message);
  // Thumbnails for the most recent checks (bounded so a long history
  // doesn't fan out into hundreds of signing calls).
  const photosBySession = await signSessionPhotos(
    supabase,
    (reports ?? [])
      .slice(0, 12)
      .map((report: any) => report.screening_session_id),
    3600,
    await patientPhotoLabels(supabase, enrollmentIds)
  );
  const reportsWithPhotos = (reports ?? []).map((report: any) => ({
    ...report,
    photos: photosBySession.get(report.screening_session_id) ?? [],
  }));
  return {
    profile,
    patient,
    enrollments: enrollments ?? [],
    reports: reportsWithPhotos,
    configurationError: null,
  };
}
