import "server-only";

import {
  AnthropicError,
  backoffMs,
  classifyUpstream,
  isTransient,
  type AnthropicResult,
  type UpstreamFailure,
} from "@/lib/anthropicErrors";

// Re-exported so callers keep importing the client and its vocabulary from
// one place; the rules themselves live in lib/ so they can be tested.
export {
  AnthropicError,
  backoffMs,
  classifyUpstream,
  type AnthropicResult,
  type UpstreamFailure,
};

/**
 * `callAnthropic`, but a failure throws `AnthropicError` instead of being
 * returned.
 *
 * Both shapes exist on purpose. A route that must turn every outcome into an
 * HTTP response reads better with the result object; a function buried inside
 * other work reads better throwing, because the failure then travels up
 * through the existing catch blocks rather than needing a branch at each
 * level.
 */
export async function callAnthropicOrThrow(
  body: unknown,
  options: CallOptions
): Promise<any> {
  const result = await callAnthropic(body, options);
  if (!result.ok) throw new AnthropicError(result.failure);
  return result.payload;
}

/**
 * The one place this app talks to the Anthropic API.
 *
 * It exists because two completely different callers — the four-photo vision
 * analysis and the patient assistant — were failing together, and neither
 * could say why. Both logged the HTTP status and nothing else, so a billing
 * problem, a revoked key and a rate limit were indistinguishable in the logs
 * and identical to the patient on screen.
 *
 * Three jobs:
 *
 *   1. LOG THE TRUTH, server-side. The upstream error type, message, and the
 *      request-id / retry-after / rate-limit headers.
 *   2. CLASSIFY. Map an upstream status onto an honest client message, which
 *      is never the upstream message — that text can echo the prompt back to
 *      the browser.
 *   3. RETRY what is actually transient (429, 5xx, 529) and nothing else.
 *
 * NOTHING HERE IS EVER THE PATIENT'S FAULT. Every failure this module
 * produces is a service failure, and no classification sends anybody back to
 * the camera.
 */

export interface CallOptions {
  /** Named in logs so a failure can be traced to a caller. */
  event: string;
  /** Request id from the surrounding route, for correlation. */
  requestId?: string;
  /** Wall-clock ceiling across all attempts. Route maxDuration is 60s. */
  budgetMs?: number;
  maxRetries?: number;
}

export async function callAnthropic(
  body: unknown,
  options: CallOptions
): Promise<AnthropicResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const startedAt = Date.now();
  const budgetMs = options.budgetMs ?? 50_000;
  const maxRetries = options.maxRetries ?? 2;

  if (!apiKey) {
    const failure: UpstreamFailure = {
      clientStatus: 503,
      clientMessage:
        "Photo analysis is not configured correctly. This is on us, not your photos.",
      status: 0,
      errorType: "no_api_key",
    };
    console.error(
      JSON.stringify({
        level: "error",
        event: options.event,
        requestId: options.requestId,
        reason: "ANTHROPIC_API_KEY is not set",
      })
    );
    return { ok: false, failure, attempts: 0, latencyMs: 0 };
  }

  let attempts = 0;
  let lastFailure: UpstreamFailure | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    attempts += 1;
    const remaining = budgetMs - (Date.now() - startedAt);
    if (remaining <= 0) break;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), remaining);

    let upstream: Response;
    try {
      upstream = await fetch(messagesUrl(), {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (cause) {
      clearTimeout(timer);
      // A dropped connection or our own timeout. Transient by nature.
      lastFailure = {
        clientStatus: 503,
        clientMessage: "The photo service is busy. Your photos are fine.",
        status: 0,
        errorType: cause instanceof Error ? cause.name : "fetch_failed",
      };
      console.error(
        JSON.stringify({
          level: "error",
          event: options.event,
          requestId: options.requestId,
          attempt: attempts,
          upstreamStatus: 0,
          errorType: lastFailure.errorType,
        })
      );
      if (attempt < maxRetries) {
        await sleep(backoffMs(attempt, null));
        continue;
      }
      break;
    }
    clearTimeout(timer);

    const payload = await upstream.json().catch(() => null);

    if (upstream.ok) {
      return {
        ok: true,
        payload,
        attempts,
        latencyMs: Date.now() - startedAt,
      };
    }

    const failure = classifyUpstream(upstream.status, payload);
    lastFailure = failure;

    // Everything needed to tell a billing problem from a rate limit from a
    // revoked key — server-side only. The upstream message is logged here and
    // never returned to the browser.
    console.error(
      JSON.stringify({
        level: "error",
        event: options.event,
        requestId: options.requestId,
        attempt: attempts,
        upstreamStatus: upstream.status,
        errorType: failure.errorType,
        errorMessage: (
          (payload as { error?: { message?: string } } | null)?.error?.message ?? ""
        ).slice(0, 300),
        anthropicRequestId: upstream.headers.get("request-id"),
        retryAfter: upstream.headers.get("retry-after"),
        rateLimitRemaining: upstream.headers.get(
          "anthropic-ratelimit-requests-remaining"
        ),
      })
    );

    if (!isTransient(upstream.status) || attempt >= maxRetries) break;
    const wait = backoffMs(attempt, upstream.headers.get("retry-after"));
    if (Date.now() - startedAt + wait >= budgetMs) break;
    await sleep(wait);
  }

  return {
    ok: false,
    failure: lastFailure ?? {
      clientStatus: 502,
      clientMessage: "The photo analysis service could not complete this check.",
      status: 0,
      errorType: null,
    },
    attempts,
    latencyMs: Date.now() - startedAt,
  };
}

/**
 * The Messages endpoint.
 *
 * Overridable by env purely so the retry loop can be exercised against a
 * local stub — there is no way to make the real API return 429 on demand, and
 * a retry path that has never run is a retry path that does not work. Defaults
 * to the real host; the override is deployment-controlled, exactly like the
 * API key beside it.
 */
function messagesUrl(): string {
  const base = process.env.ANTHROPIC_BASE_URL?.trim().replace(/\/+$/, "");
  return `${base || "https://api.anthropic.com"}/v1/messages`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}


/**
 * Server-sent-events stream from the Messages API.
 *
 * Yields text deltas as they arrive. Failures BEFORE the first token throw
 * `AnthropicError`, exactly like the buffered path, so a caller's existing
 * error handling is unchanged — the stream only becomes a different shape
 * once the model has actually started answering.
 *
 * NOT RETRIED, deliberately. A retry can only happen before the first token,
 * and by then the caller has already committed to a streaming response; the
 * honest options there are to fail or to continue, not to silently restart.
 * Pre-flight failures (a dead key, an empty balance) surface on the first
 * read and are classified identically to the buffered path.
 */
export async function* streamAnthropic(
  body: unknown,
  options: CallOptions
): AsyncGenerator<string, void, unknown> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new AnthropicError({
      clientStatus: 503,
      clientMessage: "The assistant is not set up correctly right now.",
      status: 0,
      errorType: "no_api_key",
    });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.budgetMs ?? 50_000);

  try {
    const upstream = await fetch(messagesUrl(), {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ...(body as object), stream: true }),
      signal: controller.signal,
    });

    if (!upstream.ok || !upstream.body) {
      const payload = await upstream.json().catch(() => null);
      const failure = classifyUpstream(upstream.status, payload);
      console.error(
        JSON.stringify({
          level: "error",
          event: options.event,
          requestId: options.requestId,
          upstreamStatus: upstream.status,
          errorType: failure.errorType,
          errorMessage: (
            (payload as { error?: { message?: string } } | null)?.error?.message ?? ""
          ).slice(0, 300),
          anthropicRequestId: upstream.headers.get("request-id"),
          retryAfter: upstream.headers.get("retry-after"),
          rateLimitRemaining: upstream.headers.get(
            "anthropic-ratelimit-requests-remaining"
          ),
        })
      );
      throw new AnthropicError(failure);
    }

    const reader = upstream.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // SSE frames are separated by a blank line; a chunk can split one, so
      // the trailing partial frame stays in the buffer.
      const frames = buffer.split("\n\n");
      buffer = frames.pop() ?? "";

      for (const frame of frames) {
        for (const line of frame.split("\n")) {
          if (!line.startsWith("data:")) continue;
          const raw = line.slice(5).trim();
          if (!raw || raw === "[DONE]") continue;
          let event: any;
          try {
            event = JSON.parse(raw);
          } catch {
            continue;
          }
          // An error can arrive mid-stream, after headers said 200.
          if (event.type === "error") {
            throw new AnthropicError(
              classifyUpstream(500, { error: event.error })
            );
          }
          if (
            event.type === "content_block_delta" &&
            event.delta?.type === "text_delta" &&
            typeof event.delta.text === "string"
          ) {
            yield event.delta.text;
          }
        }
      }
    }
  } finally {
    clearTimeout(timer);
  }
}
