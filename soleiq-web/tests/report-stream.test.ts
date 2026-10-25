import { describe, expect, it } from "vitest";
import {
  BACKOFF_AFTER_MS,
  FAST_POLL_MS,
  SLOW_POLL_MS,
  isRelevantChange,
  isSettled,
  pollIntervalFor,
  shouldKeepPolling,
} from "@/lib/reportStream";
import {
  TERMINAL_SESSION_STATUSES,
  resumeDecisionFor,
  wouldDuplicate,
} from "@/lib/screeningResume";

const row = (status: string | null, id = "r1") => ({ id, status });

describe("settling", () => {
  it("treats released as the end state", () => {
    // The product rule in force: results are visible as soon as analysis
    // finishes, without waiting for clinician review.
    expect(isSettled(row("released"))).toBe(true);
  });

  it("treats superseded as settled — a newer version owns it now", () => {
    expect(isSettled(row("superseded"))).toBe(true);
  });

  it("does NOT treat preliminary as settled", () => {
    // This is the whole point of the stream: preliminary still becomes
    // released, and the page must keep listening for it.
    expect(isSettled(row("preliminary"))).toBe(false);
  });
});

describe("polling cadence", () => {
  it("polls fast for the first minute, then backs off", () => {
    expect(pollIntervalFor(0)).toBe(FAST_POLL_MS);
    expect(pollIntervalFor(BACKOFF_AFTER_MS - 1)).toBe(FAST_POLL_MS);
    expect(pollIntervalFor(BACKOFF_AFTER_MS)).toBe(SLOW_POLL_MS);
    expect(pollIntervalFor(10 * 60_000)).toBe(SLOW_POLL_MS);
  });

  it("stops once the watched report is released", () => {
    expect(shouldKeepPolling(row("released"), "r1")).toBe(false);
    expect(shouldKeepPolling(row("preliminary"), "r1")).toBe(true);
  });

  it("keeps running for a dashboard, which has no single report to settle on", () => {
    expect(shouldKeepPolling(null, undefined)).toBe(true);
    expect(shouldKeepPolling(row("released"), undefined)).toBe(true);
  });

  it("keeps polling while the watched report has not been seen yet", () => {
    expect(shouldKeepPolling(null, "r1")).toBe(true);
  });
});

describe("relevance filtering does not duplicate RLS", () => {
  it("passes any readable status through when following everything", () => {
    for (const status of ["preliminary", "clinician_reviewed", "released"]) {
      expect(isRelevantChange(row(status))).toBe(true);
    }
  });

  it("ignores a superseded row on a dashboard", () => {
    // Not an access decision — a superseded version is simply not the one a
    // dashboard lists.
    expect(isRelevantChange(row("superseded"))).toBe(false);
  });

  it("ignores other reports when watching one", () => {
    expect(isRelevantChange(row("released", "other"), "r1")).toBe(false);
    expect(isRelevantChange(row("released", "r1"), "r1")).toBe(true);
  });

  it("accepts a watched report whatever its status, including superseded", () => {
    // A watched page must react to its own report being superseded; silently
    // dropping that would leave the reader on a version that no longer leads.
    expect(isRelevantChange(row("superseded", "r1"), "r1")).toBe(true);
  });
});

describe("idempotency: a repeat submit must not create a second report", () => {
  it.each([...TERMINAL_SESSION_STATUSES])(
    "returns the existing session for status %s",
    (status) => {
      expect(resumeDecisionFor({ status })).toBe("return_existing");
      expect(wouldDuplicate({ status })).toBe(true);
    }
  );

  it("resumes an analysis that died mid-flight rather than starting over", () => {
    expect(resumeDecisionFor({ status: "analyzing" })).toBe("resume_analysis");
  });

  it("reuses the session for a partial or failed upload", () => {
    for (const status of ["draft", "uploading", "failed", "cancelled"]) {
      expect(resumeDecisionFor({ status })).toBe("reuse_session");
    }
  });

  it("creates a new session only when the key has never been seen", () => {
    expect(resumeDecisionFor(null)).toBe("create_new");
    expect(resumeDecisionFor(undefined)).toBe("create_new");
  });

  it("never reports a non-terminal session as a duplicate", () => {
    for (const status of ["draft", "uploading", "analyzing", "failed"]) {
      expect(wouldDuplicate({ status })).toBe(false);
    }
  });

  it("treats a missing status as new work, not as finished", () => {
    // Failing the other way would hand back a session with no report and
    // call the check done.
    expect(resumeDecisionFor({ status: null })).toBe("reuse_session");
  });
});
