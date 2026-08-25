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

/**
 * Where the reconstruction service lives.
 *
 * Defaults to the loopback address the local service binds to, so a developer
 * running `uvicorn` gets a working scan tab with no configuration. Override
 * with NEXT_PUBLIC_FOOT_AI_URL to point at a deployed service.
 *
 * NEXT_PUBLIC_ because the browser calls it directly: the capture is a video
 * blob held in the tab, and proxying it through a Next route would mean
 * uploading it twice.
 */
export const FOOT_AI_BASE_URL = (
  process.env.NEXT_PUBLIC_FOOT_AI_URL ?? "http://127.0.0.1:8000"
).replace(/\/+$/, "");

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

export class ScanClientError extends Error {}

/** Upload one scan video. Returns the scanId; processing continues server-side. */
export async function uploadScanVideo(args: {
  video: Blob;
  side: FootSide;
  footLengthMm?: number;
  /** Pools this scan's usable frames with previous attempts for the same foot. */
  bankId?: string;
}): Promise<string> {
  const body = new FormData();
  body.append("video", args.video, "video.webm");
  body.append("side", args.side);
  if (args.bankId) body.append("bank_id", args.bankId);
  if (args.footLengthMm != null) {
    body.append("foot_length_mm", String(args.footLengthMm));
  }
  const res = await fetch(`${FOOT_AI_BASE_URL}/scans`, { method: "POST", body });
  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const j = await res.json();
      if (typeof j?.detail === "string") detail = j.detail;
    } catch {
      /* keep the status code */
    }
    throw new ScanClientError(`Could not save the scan: ${detail}`);
  }
  const json = (await res.json()) as { scan_id?: string };
  if (!json.scan_id) throw new ScanClientError("Service returned no scan id.");
  return json.scan_id;
}

export async function fetchScan(scanId: string): Promise<ScanSummary> {
  const res = await fetch(`${FOOT_AI_BASE_URL}/scans/${scanId}`);
  if (!res.ok) throw new ScanClientError(`Could not read scan ${scanId}.`);
  return (await res.json()) as ScanSummary;
}

/** Poll until the scan finishes. Throws with the server's own reason on failure. */
export async function awaitScan(
  scanId: string,
  onProgress?: (s: ScanSummary) => void
): Promise<ScanSummary> {
  const deadline = Date.now() + 10 * 60 * 1000;
  for (;;) {
    if (Date.now() > deadline) {
      throw new ScanClientError("The scan is taking much longer than expected.");
    }
    const s = await fetchScan(scanId);
    onProgress?.(s);
    // "banked" is terminal for this attempt: the frames are saved and the
    // caller decides whether to scan again. Not an error.
    if (s.status === "done" || s.status === "banked") return s;
    if (s.status === "failed") {
      throw new ScanClientError(
        s.failure_reason ?? "The scan could not be processed."
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
export async function deleteBank(bankId: string): Promise<void> {
  const res = await fetch(`${FOOT_AI_BASE_URL}/banks/${bankId}`, { method: "DELETE" });
  if (!res.ok && res.status !== 404) {
    throw new ScanClientError(`Could not delete bank ${bankId}.`);
  }
}
