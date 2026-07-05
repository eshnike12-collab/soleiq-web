/**
 * POST /api/analyze — same-origin server-side orchestrator.
 *
 * Phase 6 flow:
 *   1. Verify the browser's Supabase JWT and get the auth uid.
 *   2. Upload the image to Storage bucket `foot-scans` at path
 *      <auth_uid>/<visit_id>/<uuid>.<ext>.
 *   3. Forward the image to the AI service at AI_BASE_URL/predict
 *      (timeout + one retry on transient network errors).
 *   4. Insert a row into public.scans capturing metadata + AI JSON.
 *   5. Return the AI JSON to the browser, augmented with
 *      { scan_id, storage_path, storage_url }.
 *
 * The browser never sees the service-role key and never talks to the
 * AI or to Supabase Storage directly.
 *
 * Graceful degradation — everything is best-effort:
 *   - No AI configured → 502 to browser (nothing to fall back to).
 *   - No Supabase configured → skip persistence, just proxy the AI call.
 *   - No JWT / bad JWT → skip persistence, still proxy the AI call.
 *   - Storage upload fails → still proxy the AI call, log the failure.
 *   - scans insert fails → still return the AI result, log the failure.
 *
 * Env:
 *   AI_BASE_URL                    (server-only) default http://localhost:8000
 *   NEXT_PUBLIC_SUPABASE_URL       (public — same one the browser uses)
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY  (public)
 *   SUPABASE_SERVICE_ROLE_KEY      (server-only — NEVER expose)
 */

import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import {
  serverServiceRoleClient,
  uidFromJwt,
} from "@/lib/serverSupabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// ---- Tunables --------------------------------------------------------------

const AI_BASE_URL = (process.env.AI_BASE_URL || "http://localhost:8000").replace(
  /\/+$/,
  "",
);
const UPSTREAM_TIMEOUT_MS = 55_000;
const MAX_RETRIES = 1;
const RETRY_DELAY_MS = 400;

const ACCEPTED_MIME = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);
const MAX_BYTES = 12 * 1024 * 1024; // 12 MB

const BUCKET = "foot-scans";
const SIGNED_URL_TTL_S = 7 * 24 * 3600; // 7 days

// ---- Handler ---------------------------------------------------------------

export async function POST(req: NextRequest): Promise<NextResponse> {
  const t0 = Date.now();

  // ---- Parse + validate multipart ----------------------------------------
  let form: FormData;
  try {
    form = await req.formData();
  } catch (err: unknown) {
    return jsonError("bad multipart body", 400, err);
  }

  const image = form.get("image");
  if (!image || !(image instanceof Blob)) {
    return jsonError("missing 'image' field", 400);
  }
  if (image.size === 0) return jsonError("empty image", 400);
  if (image.size > MAX_BYTES) {
    return jsonError(
      `image too large (${(image.size / 1024 / 1024).toFixed(1)} MB, max ${MAX_BYTES / 1024 / 1024} MB)`,
      413,
    );
  }
  if (image.type && !ACCEPTED_MIME.has(image.type.toLowerCase())) {
    return jsonError(
      `unsupported image type '${image.type}' — allowed: JPEG, PNG, WEBP, HEIC`,
      415,
    );
  }

  const side = String(form.get("side") ?? "");
  const view = String(form.get("view") ?? "");
  const source = String(form.get("source") ?? "");
  const visitId = String(form.get("visit_id") ?? "");
  const patientId = String(form.get("patient_id") ?? "") || null;
  const capturedAtRaw = form.get("captured_at");
  const capturedAt = capturedAtRaw ? Number(capturedAtRaw) : Date.now();
  let capture_quality: unknown = null;
  const cq = form.get("capture_quality");
  if (typeof cq === "string" && cq.length > 0) {
    try {
      capture_quality = JSON.parse(cq);
    } catch {
      /* ignore — quality is optional debug metadata */
    }
  }

  // ---- Auth: verify the browser's Supabase JWT ---------------------------
  // Header name mirrors what the Supabase SDK sends; we accept either the
  // full "Bearer <jwt>" header OR just the JWT for convenience.
  const authHeader =
    req.headers.get("x-supabase-auth") ||
    req.headers.get("authorization") ||
    "";
  const jwt = authHeader.replace(/^Bearer\s+/i, "").trim() || null;
  const userId = await uidFromJwt(jwt);

  const bytes = new Uint8Array(await image.arrayBuffer());
  const bytesForAI = new Blob([bytes], {
    type: image.type || "image/jpeg",
  });

  console.info(
    "[analyze]",
    "side=" + (side || "?"),
    "view=" + (view || "?"),
    "src=" + (source || "?"),
    "visit=" + (visitId ? visitId.slice(0, 20) : "?"),
    "uid=" + (userId ? userId.slice(0, 8) + "…" : "anon"),
    "bytes=" + image.size,
    "mime=" + (image.type || "?"),
  );

  // ---- 1. Storage upload (best effort) -----------------------------------
  const ext = mimeToExt(image.type);
  const scanUuid = randomUUID();
  const objectPath =
    (userId ?? "unauthenticated") +
    "/" +
    (visitId || "no-visit") +
    "/" +
    scanUuid +
    "." +
    ext;

  let storagePath: string | null = null;
  let storageUrl: string | null = null;
  const sb = serverServiceRoleClient();
  if (sb) {
    const bytesForStorage = new Uint8Array(bytes);
    const { error: upErr } = await sb.storage
      .from(BUCKET)
      .upload(objectPath, bytesForStorage, {
        contentType: image.type || "image/jpeg",
        cacheControl: "3600",
        upsert: true,
      });
    if (upErr) {
      console.warn("[analyze] storage upload failed:", upErr.message);
    } else {
      storagePath = objectPath;
      // Bucket is private (patient photos are PHI) — mint a signed URL for
      // immediate display. storage_path is the canonical reference; readers
      // needing a fresh URL re-sign from the path.
      const { data: signed } = await sb.storage
        .from(BUCKET)
        .createSignedUrl(objectPath, SIGNED_URL_TTL_S);
      storageUrl = signed?.signedUrl ?? null;
    }
  } else {
    console.info("[analyze] supabase not configured — skipping persistence");
  }

  // ---- 2. Forward to AI with timeout + one retry -------------------------
  const upstreamForm = new FormData();
  const filename = [side || "?", view || "?", source || "?", capturedAt]
    .join("_") + "." + ext;
  upstreamForm.append("image", bytesForAI, filename);

  let aiJson: any = null;
  let lastErr: unknown = null;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(new Error("upstream timeout")),
      UPSTREAM_TIMEOUT_MS,
    );
    try {
      const upstream = await fetch(AI_BASE_URL + "/predict", {
        method: "POST",
        body: upstreamForm,
        signal: controller.signal,
        cache: "no-store",
      });
      clearTimeout(timer);
      if (!upstream.ok) {
        const body = await upstream.text().catch(() => "");
        console.warn(
          "[analyze] upstream returned",
          upstream.status,
          upstream.statusText,
          body.slice(0, 200),
        );
        return jsonError(
          `AI upstream ${upstream.status}: ${upstream.statusText}`,
          502,
          body,
        );
      }
      aiJson = await upstream.json();
      lastErr = null;
      break;
    } catch (err: unknown) {
      clearTimeout(timer);
      lastErr = err;
      const msg = err instanceof Error ? err.message : String(err);
      const retryable =
        msg.includes("fetch failed") ||
        msg.includes("ECONNREFUSED") ||
        msg.includes("ETIMEDOUT") ||
        msg.includes("timeout");
      if (attempt < MAX_RETRIES && retryable) {
        console.warn("[analyze] transient upstream error, retrying:", msg);
        await sleep(RETRY_DELAY_MS);
        continue;
      }
    }
  }
  if (!aiJson) {
    const detail = lastErr instanceof Error ? lastErr.message : String(lastErr);
    console.error("[analyze] upstream unreachable:", detail);
    return jsonError(
      `AI service unreachable at ${AI_BASE_URL}: ${detail}`,
      502,
    );
  }

  // ---- 3. Insert scans row (best effort) ---------------------------------
  let scanId: string | null = null;
  if (sb && userId && storagePath) {
    const row = {
      id: scanUuid,
      user_id: userId,
      visit_id: visitId || null,
      patient_id: patientId,
      side: side || null,
      view: view || null,
      storage_bucket: BUCKET,
      storage_path: storagePath,
      storage_url: storageUrl,
      capture_source: source || null,
      capture_quality,
      ai_result: aiJson,
      ai_model_version: aiJson?.model_version ?? null,
      ai_reference_bank_version: aiJson?.reference_bank_version ?? null,
      patient_summary: aiJson?.patient ?? null,
      clinician_data: aiJson?.clinician ?? null,
      flags: aiJson?.flags ?? null,
    };
    const { error: dbErr } = await sb.from("scans").insert(row);
    if (dbErr) {
      console.warn("[analyze] scans insert failed:", dbErr.message);
    } else {
      scanId = scanUuid;
    }
  } else if (!sb) {
    // no-op — already logged above
  } else if (!userId) {
    console.info(
      "[analyze] no auth JWT — skipping scans insert (image still in storage if configured)",
    );
  } else if (!storagePath) {
    console.info(
      "[analyze] no storage_path — skipping scans insert",
    );
  }

  console.info(
    "[analyze] ok in",
    Date.now() - t0,
    "ms",
    "→",
    aiJson?.second_opinion?.assessment ?? aiJson?.prediction?.label ?? "?",
    "scan_id=" + (scanId ?? "none"),
    "storage=" + (storagePath ?? "none"),
  );

  // ---- 4. Reply ----------------------------------------------------------
  return NextResponse.json(
    {
      ...aiJson,
      scan_id: scanId,
      storage_path: storagePath,
      storage_url: storageUrl,
    },
    { status: 200 },
  );
}

// ---- helpers ---------------------------------------------------------------

function jsonError(
  message: string,
  status: number,
  detail?: unknown,
): NextResponse {
  return NextResponse.json({ error: message, detail }, { status });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function mimeToExt(mime: string | undefined): string {
  switch ((mime || "").toLowerCase()) {
    case "image/jpeg":
    case "image/jpg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/heic":
    case "image/heif":
      return "heic";
    default:
      return "jpg";
  }
}
