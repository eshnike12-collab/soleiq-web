/**
 * Client for the 3D scan service. Ported from the mobile app.
 *
 * Uploads the raw sweep video to the FastAPI service, which persists it to
 * local disk, extracts and scores frames, records everything in SQLite, and
 * only then runs reconstruction on the frames that passed.
 *
 * Sends the video rather than the frames the sweep already grabbed, on
 * purpose: the whole point is that the original capture is kept so a failed
 * scan can be replayed with different thresholds. The live frames still drive
 * the on-screen coverage bar; they are just no longer the only copy.
 */

import type { FootSide } from "@/lib/types";
import { getSupabase } from "@/lib/supabase";

/**
 * Where the reconstruction service lives.
 *
 * NEXT_PUBLIC_ because the browser calls it directly: the capture is a video
 * blob held in the tab, and proxying it through a Next route would mean
 * uploading it twice.
 *
 * THE LOOPBACK FALLBACK IS DEVELOPMENT-ONLY, AND THAT IS THE WHOLE POINT.
 *
 * This used to read `?? "http://127.0.0.1:8000"` unconditionally. In
 * production that is not a fallback, it is a bug with a friendly face: the
 * variable is set nowhere, so every patient's browser POSTed their scan video
 * to 127.0.0.1 — *their own phone* — where nothing is listening. Two failures
 * stack there. The connection is refused, and an https:// page is not allowed
 * to fetch http:// at all, so the request may never even leave the tab.
 *
 * Silently pointing a clinical capture at a dead address is exactly the class
 * of failure this codebase refuses elsewhere (see the no-placeholder-geometry
 * rule in Foot3DViewer). So in production an unset variable is a hard,
 * visible misconfiguration rather than a doomed request: `scanServiceStatus()`
 * reports it, the UI refuses to start a capture, and nobody spends 25 seconds
 * filming a foot for nothing.
 */
export type ScanServiceStatus =
  | { ok: true; baseUrl: string }
  | { ok: false; reason: "not_configured" | "insecure_origin"; detail: string };

function configuredBaseUrl(): string | null {
  const raw = process.env.NEXT_PUBLIC_FOOT_AI_URL?.trim();
  if (raw) return raw.replace(/\/+$/, "");
  // Loopback only when this is a developer's machine.
  if (process.env.NODE_ENV !== "production") return "http://127.0.0.1:8000";
  return null;
}

/**
 * Whether a scan can even be attempted, and if not, why — in words that name
 * the missing configuration rather than surfacing as a network error later.
 */
export function scanServiceStatus(): ScanServiceStatus {
  const baseUrl = configuredBaseUrl();
  if (!baseUrl) {
    return {
      ok: false,
      reason: "not_configured",
      detail:
        "3D scanning is not configured on this deployment. " +
        "NEXT_PUBLIC_FOOT_AI_URL must point at the reconstruction service.",
    };
  }

  // Mixed content: a browser on an https:// page silently blocks http://
  // requests. Caught here so it reads as a configuration problem, which it is,
  // instead of an unexplained failure after the user has filmed their foot.
  // Loopback is exempt — browsers treat it as a secure context.
  if (typeof window !== "undefined") {
    const isLoopback = /^https?:\/\/(127\.0\.0\.1|localhost|\[::1\])(:|$|\/)/.test(baseUrl);
    if (
      window.location.protocol === "https:" &&
      baseUrl.startsWith("http://") &&
      !isLoopback
    ) {
      return {
        ok: false,
        reason: "insecure_origin",
        detail:
          "The reconstruction service is configured over http:// but this page " +
          "is https://, so the browser will block the upload. Serve the service " +
          "over https://.",
      };
    }
  }

  return { ok: true, baseUrl };
}

/**
 * Base URL for building artifact links.
 *
 * Empty string when unconfigured — callers must check `scanServiceStatus()`
 * before starting a capture, and the upload helpers below refuse outright.
 */
export const FOOT_AI_BASE_URL = configuredBaseUrl() ?? "";

/**
 * What the bank holds, pooled across every attempt sharing a bank id.
 *
 * `accepted_frames` counts frames actually SAVED — ones that showed an angle
 * the bank did not already have. A frame can be sharp and well lit and still
 * not be here, because twenty photographs of one angle reconstruct no better
 * than one.
 */
export interface BankStatus {
  bank_id: string;
  scans: number;
  sampled_frames: number;
  accepted_frames: number;
  required_frames: number;
  required_viewpoints: number;
  short_by: number;
}

export interface ScanSummary {
  scan_id: string;
  status:
    | "created" | "uploaded" | "extracting" | "scoring"
    // "banked" is not a failure: usable frames were saved, more are needed.
    | "banked" | "reconstructing" | "done" | "failed";
  bank?: BankStatus | null;
  total_frames: number;
  accepted_frames: number;
  rejected_frames: number;
  failure_reason: string | null;
  failure_stage: string | null;
  reject_summary?: Record<string, number>;
  artifacts?: { glb: string; cameras: string; quality: string } | null;
}

/**
 * Why a scan call failed, in the categories that need DIFFERENT ACTIONS from
 * the patient. A single "please try again" invites someone to repeat a
 * 25-second capture that cannot possibly succeed.
 */
export type ScanFailureKind =
  /** The request never left the browser: service down, DNS, CORS, or CSP. */
  | "unreachable"
  /** Signed out, or the session expired mid-capture. */
  | "unauthorized"
  /** The service is up but broke. Retrying may genuinely help. */
  | "server"
  /** The service understood and refused, with a reason worth showing. */
  | "refused"
  | "unknown";

export class ScanClientError extends Error {
  readonly kind: ScanFailureKind;
  constructor(message: string, kind: ScanFailureKind = "unknown") {
    super(message);
    this.kind = kind;
  }
}

/**
 * `fetch` rejects with `TypeError: Failed to fetch` for every reason the
 * request never left the tab — server down, DNS failure, CORS preflight
 * refusal, CSP `connect-src` violation. The browser deliberately does not
 * distinguish them, so neither can we; what we CAN do is stop calling it a
 * transient error and telling the patient to try again.
 */
function asUnreachable(cause: unknown): ScanClientError {
  return new ScanClientError(
    "Could not reach the scan service. It may be offline, or this device may " +
      "be blocked from connecting to it.",
    "unreachable"
  );
}

function kindForStatus(status: number): ScanFailureKind {
  if (status === 401 || status === 403) return "unauthorized";
  if (status >= 500) return "server";
  return "refused";
}

/**
 * Cheap liveness check, run BEFORE the countdown.
 *
 * Discovering the service is down after someone has held a phone around their
 * own foot for 25 seconds is the worst moment to discover it.
 */
export async function pingScanService(auth?: ScanAuth): Promise<boolean> {
  const status = scanServiceStatus();
  if (!status.ok) return false;
  try {
    const res = await fetch(`${status.baseUrl}/health`, {
      method: "GET",
      headers: authHeaders(auth),
      // Never let a hung service hold the UI: this is a liveness probe.
      signal: AbortSignal.timeout(5000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * The caller's Supabase session token, forwarded to the scan service.
 *
 * The service verifies this signature against Supabase's JWKS and derives the
 * frame bank from the token's own subject — so the browser proves who it is
 * and never states who it is. An earlier draft minted a separate HMAC token
 * through a Next route; that was a second credential to keep in sync for no
 * gain, since the session token is already signed by an authority both sides
 * trust.
 *
 * `token: null` is the local-development case: with nothing configured the
 * service admits loopback callers unauthenticated. It is NOT a production
 * fallback — there, a null token fails at the first call, loudly.
 */
export interface ScanAuth {
  token: string | null;
  reason?: string;
}

export async function requestScanAuth(): Promise<ScanAuth> {
  try {
    const supabase = getSupabase();
    if (!supabase) return { token: null, reason: "supabase_unconfigured" };
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token ?? null;
    return token ? { token } : { token: null, reason: "no_session" };
  } catch {
    return { token: null, reason: "session_unavailable" };
  }
}

/** Authorization header, or nothing when running against a loopback service. */
function authHeaders(auth?: ScanAuth): Record<string, string> {
  return auth?.token ? { Authorization: `Bearer ${auth.token}` } : {};
}

/**
 * A filename whose extension matches what the browser actually recorded.
 *
 * This used to be the constant "video.webm". Safari on iOS does not support
 * WebM in MediaRecorder — it records MP4/H.264 — so an MP4 was uploaded under
 * a .webm name. The service picks its storage suffix from that filename
 * (save_video in scan_service.py), so the file landed on disk as video.webm
 * and OpenCV was handed a container that did not match its extension.
 *
 * Derived from the blob's own type rather than from a guess about the
 * platform: MediaRecorder reports what it chose, and that is the only
 * trustworthy answer.
 */
export function videoFilenameFor(blob: Blob): string {
  const type = (blob.type || "").toLowerCase();
  if (type.includes("mp4")) return "video.mp4";
  if (type.includes("quicktime") || type.includes("mov")) return "video.mov";
  if (type.includes("matroska")) return "video.mkv";
  // WebM is both the common case and a safe default: the service falls back
  // to .webm for anything it does not recognise.
  return "video.webm";
}

/** Upload one scan video. Returns the scanId; processing continues server-side. */
export async function uploadScanVideo(args: {
  video: Blob;
  side: FootSide;
  footLengthMm?: number;
  /** Pools this scan's usable frames with previous attempts for the same foot. */
  bankId?: string;
  /**
   * Full-resolution stills captured at the moments the quality gate accepted.
   * Optional: an older browser that could not produce them still uploads a
   * usable scan, just a less precise one.
   */
  stills?: Blob[];
  auth?: ScanAuth;
}): Promise<string> {
  const body = new FormData();
  body.append("video", args.video, videoFilenameFor(args.video));
  body.append("side", args.side);
  // Sent ONLY when unauthenticated (local loopback development). With a token
  // the service derives the bank from the verified subject and ignores this,
  // so posting it would just log a mismatch on every upload.
  if (args.bankId && !args.auth?.token) body.append("bank_id", args.bankId);
  // Repeated field name, one entry per still: FastAPI collects these into a
  // list, and the service prefers them over frames extracted from the
  // compressed video when both are present.
  for (const [i, still] of (args.stills ?? []).entries()) {
    body.append("stills", still, `still-${String(i).padStart(3, "0")}.jpg`);
  }
  if (args.footLengthMm != null) {
    body.append("foot_length_mm", String(args.footLengthMm));
  }
  const status = scanServiceStatus();
  if (!status.ok) throw new ScanClientError(status.detail);

  let res: Response;
  try {
    res = await fetch(`${status.baseUrl}/scans`, {
      method: "POST",
      body,
      headers: authHeaders(args.auth),
    });
  } catch (cause) {
    throw asUnreachable(cause);
  }
  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const j = await res.json();
      // The service's own reason is more useful than anything invented here.
      if (typeof j?.detail === "string") detail = j.detail;
    } catch {
      /* keep the status code */
    }
    throw new ScanClientError(
      `Could not save the scan: ${detail}`,
      kindForStatus(res.status)
    );
  }
  const json = (await res.json()) as { scan_id?: string };
  if (!json.scan_id) throw new ScanClientError("Service returned no scan id.");
  return json.scan_id;
}

export async function fetchScan(
  scanId: string,
  auth?: ScanAuth
): Promise<ScanSummary> {
  let res: Response;
  try {
    res = await fetch(`${FOOT_AI_BASE_URL}/scans/${scanId}`, {
      headers: authHeaders(auth),
    });
  } catch (cause) {
    throw asUnreachable(cause);
  }
  if (!res.ok) {
    throw new ScanClientError(
      `Could not read scan ${scanId}.`,
      kindForStatus(res.status)
    );
  }
  return (await res.json()) as ScanSummary;
}

/** Poll until the scan finishes. Throws with the server's own reason on failure. */
export async function awaitScan(
  scanId: string,
  onProgress?: (s: ScanSummary) => void,
  auth?: ScanAuth
): Promise<ScanSummary> {
  const deadline = Date.now() + 10 * 60 * 1000;
  for (;;) {
    if (Date.now() > deadline) {
      throw new ScanClientError(
        "The scan is taking much longer than expected.",
        "server"
      );
    }
    const s = await fetchScan(scanId, auth);
    onProgress?.(s);
    // "banked" is terminal for this attempt: the frames are saved and the
    // caller decides whether to scan again. Not an error.
    if (s.status === "done" || s.status === "banked") return s;
    if (s.status === "failed") {
      throw new ScanClientError(
        s.failure_reason ?? "The scan could not be processed.",
        "refused"
      );
    }
    await new Promise((r) => setTimeout(r, 1500));
  }
}

/** Where the debug UI for this scan lives, for logging / a dev link. */
export function debugUrl(scanId: string): string {
  return `${FOOT_AI_BASE_URL}/debug#${scanId}`;
}

/**
 * A stable bank id for one patient's one foot.
 *
 * Constrained to the character set the service accepts, so an id derived from
 * a visit id containing anything unusual cannot be rejected at upload — the
 * point of failure would be after a 25-second capture.
 */
export function bankKeyFor(visitId: string, side: FootSide): string {
  return `${visitId}-${side}`.replace(/[^A-Za-z0-9._-]/g, "-").slice(0, 64);
}

export async function fetchBank(bankId: string): Promise<BankStatus> {
  const res = await fetch(`${FOOT_AI_BASE_URL}/banks/${bankId}`);
  if (!res.ok) throw new ScanClientError(`Could not read bank ${bankId}.`);
  return (await res.json()) as BankStatus;
}

/** Delete every frame and video in the bank. Patient photos are PHI. */
export async function deleteBank(bankId: string, auth?: ScanAuth): Promise<void> {
  const res = await fetch(`${FOOT_AI_BASE_URL}/banks/${bankId}`, {
    method: "DELETE",
    headers: authHeaders(auth),
  });
  if (!res.ok && res.status !== 404) {
    throw new ScanClientError(`Could not delete bank ${bankId}.`);
  }
}
