/**
 * How an Anthropic API failure is classified, and how long to wait before
 * retrying it.
 *
 * Split out of server/anthropic.ts so it can be unit tested: that module
 * carries `import "server-only"`, which vitest cannot resolve, and these
 * rules decide what a patient is told when a check fails — exactly the thing
 * that should have a test around it.
 *
 * NOTHING HERE IS EVER THE PATIENT'S FAULT. Every failure classified below is
 * a service failure, and none of the messages sends anybody back to the
 * camera. The single exception is 413, which really is about the upload, and
 * says so.
 */

/**
 * A failed call, as a thrown value.
 *
 * Carries the three things a caller actually branches on — status, the
 * provider's stable error type, and whether trying again could help — so a
 * call site can tell a dead key from a rate limit without re-parsing a
 * payload or matching on message text.
 *
 * `clientMessage` is the only field safe to show a browser. The upstream
 * message is deliberately NOT on this object: it can echo the system prompt
 * back, and anything reachable from a catch block eventually gets rendered.
 */
export class AnthropicError extends Error {
  readonly status: number;
  readonly errorType: string | null;
  readonly retryable: boolean;
  readonly clientStatus: number;
  readonly clientMessage: string;

  constructor(failure: UpstreamFailure) {
    super(`Anthropic request failed (${failure.status} ${failure.errorType ?? "unknown"})`);
    this.name = "AnthropicError";
    this.status = failure.status;
    this.errorType = failure.errorType;
    this.retryable = isTransient(failure.status);
    this.clientStatus = failure.clientStatus;
    this.clientMessage = failure.clientMessage;
  }
}

export interface UpstreamFailure {
  /** Status to return to the browser. */
  clientStatus: number;
  /** Message safe to show a patient. Never the upstream text. */
  clientMessage: string;
  /** Upstream status, for logs. */
  status: number;
  /** Upstream error.type, for logs. */
  errorType: string | null;
}

export type AnthropicResult =
  | { ok: true; payload: any; attempts: number; latencyMs: number }
  | { ok: false; failure: UpstreamFailure; attempts: number; latencyMs: number };

/** Statuses worth trying again. Everything else is a settled answer. */
export function isTransient(status: number): boolean {
  return status === 429 || status === 529 || (status >= 500 && status < 600);
}

/**
 * A credit-balance refusal arrives as a 400 `invalid_request_error`, which is
 * otherwise the shape of a malformed request. The two need opposite
 * responses — one is "top up the account", the other is "the code is wrong" —
 * so the message is inspected. Matched on the stable words rather than the
 * whole sentence, which Anthropic is free to reword.
 */
function isCreditProblem(errorType: string | null, message: string): boolean {
  if (errorType !== "invalid_request_error") return false;
  return /credit balance|purchase credits|billing/i.test(message);
}

export function classifyUpstream(
  status: number,
  payload: unknown
): UpstreamFailure {
  const error = (payload as { error?: { type?: string; message?: string } } | null)
    ?.error;
  const errorType = error?.type ?? null;
  const message = error?.message ?? "";

  const service = (clientMessage: string, clientStatus = 503) => ({
    clientStatus,
    clientMessage,
    status,
    errorType,
  });

  // The key is missing, wrong, or revoked.
  if (status === 401 || status === 403) {
    return service(
      "Photo analysis is not configured correctly. This is on us, not your photos."
    );
  }
  // Out of credits reads as a 400; it is a billing state, not a bad request.
  if (status === 400 && isCreditProblem(errorType, message)) {
    return service(
      "Photo analysis is not configured correctly. This is on us, not your photos."
    );
  }
  // The model is not available to this account.
  if (status === 404) {
    return service(
      "Photo analysis is not configured correctly. This is on us, not your photos."
    );
  }
  if (status === 413) {
    return {
      clientStatus: 413,
      clientMessage:
        "These photos are too large. Retake them in the app rather than uploading from your library.",
      status,
      errorType,
    };
  }
  if (status === 429) {
    return service("Too many checks right now. Try again in a minute.");
  }
  if (status === 529 || (status >= 500 && status < 600)) {
    return service("The photo service is busy. Your photos are fine.");
  }
  // Genuinely unexpected — a malformed request on our side, most likely.
  return {
    clientStatus: 502,
    clientMessage: "The photo analysis service could not complete this check.",
    status,
    errorType,
  };
}

/** Milliseconds to wait before attempt `n`, honouring retry-after. */
export function backoffMs(attempt: number, retryAfter: string | null): number {
  const header = retryAfter ? Number(retryAfter) : Number.NaN;
  if (Number.isFinite(header) && header >= 0) {
    // Seconds per RFC 7231. Capped so a long server-side hint cannot eat the
    // route's whole budget.
    return Math.min(header * 1000, 10_000);
  }
  // Exponential with full jitter: 1s, 2s — spread so simultaneous retries do
  // not re-collide in a thundering herd.
  const base = Math.min(1000 * 2 ** attempt, 8000);
  return Math.round(base * (0.5 + Math.random() * 0.5));
}

