"use client";

/**
 * SINGLE client-side entry point that both live camera capture and the
 * image-upload path use to get an AI reading for one foot image.
 *
 * Under the hood it POSTs the image to the app's own /api/analyze route
 * (added in Phase 5) which is a same-origin server-side proxy that:
 *   1. forwards the image to the AI service at process.env.AI_BASE_URL
 *   2. persists the image + result to Supabase (image → Storage, row → scans)
 *   3. returns the AI JSON to the browser
 *
 * The browser NEVER talks to the AI directly, so there's no CORS problem
 * and the AI URL / service-role key stay server-side.
 *
 * Phase 3 note: /api/analyze doesn't exist yet — this function will 404
 * until Phase 5 lands. Callers MUST catch the error and log/surface it
 * without blocking the capture UX (fire-and-forget from finalizeCapture).
 */

import type {
  CaptureView,
  ClinicianReading,
  FootSide,
  PatientReading,
  ReadingFlags,
} from "./types";
import { ensureAnonAuth, getSupabase } from "./supabase";

export type { ClinicianReading, PatientReading, ReadingFlags };

// ---------------------------------------------------------------------------
// Contract — mirrors the FastAPI PredictResponse shape, plus server-added
// fields that /api/analyze tags on (scan_id, storage_url) in Phase 6.
// ---------------------------------------------------------------------------

export interface AnalyzeFootPrediction {
  label: string;
  probability: number;
  uncertain: boolean;
}

export interface AnalyzeFootQuality {
  ok: boolean;
  blur_var: number;
  luma_mean: number;
  skin_fraction: number;
  reasons: string[];
}

export interface AnalyzeFootSimilarCase {
  id: string;
  label: string;
  distance: number;
}

export interface AnalyzeFootSecondOpinion {
  available: boolean;
  error?: string | null;
  model?: string | null;
  /**
   * Claude Opus verdict enum:
   *   ulcer_likely | ulcer_possible | no_ulcer | uncertain | non_diagnostic
   */
  assessment?: string | null;
  summary?: string | null;
  visible_findings?: string[];
  suspected_differential?: string[];
  recommended_workup?: string[];
  urgent_flags?: string[];
  confidence?: "low" | "medium" | "high" | null;
  agrees_with_classifier?: boolean | null;
  latency_ms?: number | null;
}

export interface AnalyzeFootResult {
  quality_ok: boolean;
  quality: AnalyzeFootQuality;
  prediction: AnalyzeFootPrediction | null;
  similar_cases: AnalyzeFootSimilarCase[];
  similarity: {
    most_consistent_with: string | null;
    mean_distance: number | null;
    support: Record<string, number>;
  };
  heatmap_url: string | null;
  second_opinion: AnalyzeFootSecondOpinion;
  /**
   * Dual-view reading — the contract the results UI renders. The AI
   * service always populates these (Claude when available, else a
   * deterministic classifier-only fallback), but they're optional here
   * so an older service version degrades to the second_opinion shape.
   */
  patient?: PatientReading | null;
  clinician?: ClinicianReading | null;
  flags?: ReadingFlags | null;
  model_version: string;
  reference_bank_version: string;
  disclaimer: string;
  /** Server-added in Phase 6 when the row + Storage upload succeed. */
  scan_id?: string;
  storage_path?: string;
  storage_url?: string;
}

export interface AnalyzeFootInput {
  /** data URL: "data:image/jpeg;base64,…" produced by the capture canvas. */
  dataUrl: string;
  side: FootSide;
  view: CaptureView;
  source: "live" | "upload";
  visitId?: string | null;
  patientId?: string | null;
  capturedAt?: number;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

const DEFAULT_TIMEOUT_MS = 45_000;

/**
 * Send one foot image to the AI + persistence pipeline.
 *
 * Both the live capture path and the upload path call this — it's the
 * only place in the client code that talks to /api/analyze. If you find
 * yourself writing a second fetch to /api/analyze, refactor to use this.
 */
export async function analyzeFootImage(
  input: AnalyzeFootInput,
  opts: { timeoutMs?: number; signal?: AbortSignal } = {},
): Promise<AnalyzeFootResult> {
  const blob = await dataUrlToBlob(input.dataUrl);
  validateBlob(blob);

  const form = new FormData();
  form.append(
    "image",
    blob,
    `${input.side}_${input.view}_${input.source}_${input.capturedAt ?? Date.now()}.jpg`,
  );
  form.append("side", input.side);
  form.append("view", input.view);
  form.append("source", input.source);
  if (input.visitId) form.append("visit_id", input.visitId);
  if (input.patientId) form.append("patient_id", input.patientId);
  if (input.capturedAt) form.append("captured_at", String(input.capturedAt));

  const timeout = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort("timeout"), timeout);
  // Merge caller-provided abort signal with the timeout controller.
  if (opts.signal) {
    if (opts.signal.aborted) controller.abort(opts.signal.reason);
    else opts.signal.addEventListener("abort", () => controller.abort(opts.signal!.reason));
  }

  // Attach the current anon-auth JWT so the server route can attribute
  // the scans row to the right user (and enforce RLS on future reads).
  // Best effort — missing token means the row is still inserted but
  // without a user_id, which the server route already handles.
  const headers: Record<string, string> = {};
  try {
    await ensureAnonAuth();
    const sb = getSupabase();
    const { data } = (await sb?.auth.getSession()) ?? { data: null };
    const token = (data as any)?.session?.access_token as string | undefined;
    if (token) headers.Authorization = `Bearer ${token}`;
  } catch {
    /* Supabase not configured — server route still returns the AI result */
  }

  let res: Response;
  try {
    res = await fetch("/api/analyze", {
      method: "POST",
      body: form,
      headers,
      signal: controller.signal,
    });
  } catch (err: any) {
    clearTimeout(timer);
    const reason = err?.name === "AbortError" ? "timeout / aborted" : (err?.message ?? "network error");
    throw new AnalyzeFootError(`analyze failed: ${reason}`, "network");
  }
  clearTimeout(timer);

  if (!res.ok) {
    let detail = "";
    try {
      detail = await res.text();
    } catch {
      /* body already consumed / unreadable */
    }
    const kind = res.status === 404 ? "not_wired" : "server";
    throw new AnalyzeFootError(
      `analyze failed (${res.status}${res.statusText ? ` ${res.statusText}` : ""})${detail ? `: ${detail}` : ""}`,
      kind,
    );
  }

  return (await res.json()) as AnalyzeFootResult;
}

export class AnalyzeFootError extends Error {
  constructor(
    message: string,
    /** "not_wired" means /api/analyze isn't deployed yet (Phase 5). */
    public kind: "network" | "server" | "not_wired" = "server",
  ) {
    super(message);
    this.name = "AnalyzeFootError";
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MAX_BYTES = 12 * 1024 * 1024; // 12 MB — the capture canvas produces <200 KB;
                                    // uploads may be larger before the client resize.
const ACCEPTED_MIME = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

function validateBlob(blob: Blob): void {
  if (blob.size === 0) {
    throw new AnalyzeFootError("empty image", "server");
  }
  if (blob.size > MAX_BYTES) {
    throw new AnalyzeFootError(
      `image too large (${(blob.size / 1024 / 1024).toFixed(1)} MB) — max ${MAX_BYTES / 1024 / 1024} MB`,
      "server",
    );
  }
  // Some capture data URLs report their type via the URL prefix; fall through
  // if the Blob's type is missing (the server route will re-validate).
  if (blob.type && !ACCEPTED_MIME.has(blob.type.toLowerCase())) {
    throw new AnalyzeFootError(
      `unsupported image type '${blob.type}' — allowed: JPEG, PNG, WEBP, HEIC`,
      "server",
    );
  }
}

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  // fetch() on a data URL decodes base64 into a real Blob in every modern browser.
  const res = await fetch(dataUrl);
  return res.blob();
}
