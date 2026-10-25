import { apiHandler } from "@/server/http";
import { requirePlatformAdminContext } from "@/server/platform";
import { classifyUpstream } from "@/server/anthropic";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Is it the key, or is it the code?
 *
 * Sends a one-token "ping" to the Messages API and reports exactly what came
 * back. It exists because a billing problem, a revoked key, a rate limit and a
 * genuinely malformed request all surfaced to the patient as one message and
 * to the logs as a bare HTTP status — so answering that question meant reading
 * source instead of clicking once.
 *
 * PLATFORM ADMIN ONLY. The probe reveals whether a key is configured and what
 * the provider thinks of it, which is operational detail, not patient-facing.
 * `requirePlatformAdminContext` throws for everyone else.
 *
 * It deliberately does NOT retry: the question is what the provider says right
 * now, and a retry would mask a rate limit as success.
 *
 * It never returns the upstream message — only the error TYPE, which is a
 * stable enum and carries no prompt text.
 */
export async function GET(request: Request) {
  return apiHandler(request, async () => {
    await requirePlatformAdminContext();

    const model =
      process.env.ANTHROPIC_VISION_MODEL ?? "claude-sonnet-4-6";
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      return {
        ok: false,
        status: 0,
        errorType: "no_api_key",
        model,
        latencyMs: 0,
        hint: "ANTHROPIC_API_KEY is not set on this deployment.",
      };
    }

    const startedAt = Date.now();
    try {
      const upstream = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          max_tokens: 1,
          messages: [{ role: "user", content: "ping" }],
        }),
        signal: AbortSignal.timeout(15_000),
      });
      const latencyMs = Date.now() - startedAt;
      const payload = await upstream.json().catch(() => null);

      if (upstream.ok) {
        return { ok: true, status: upstream.status, errorType: null, model, latencyMs };
      }

      const failure = classifyUpstream(upstream.status, payload);
      // The full upstream message goes to the server log, never the response.
      console.error(
        JSON.stringify({
          level: "error",
          event: "diagnostics.anthropic_probe_failed",
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

      return {
        ok: false,
        status: upstream.status,
        errorType: failure.errorType,
        model,
        latencyMs,
        // A short, non-sensitive pointer at the likely fix.
        hint: hintFor(upstream.status, failure.errorType),
      };
    } catch (cause) {
      return {
        ok: false,
        status: 0,
        errorType: cause instanceof Error ? cause.name : "fetch_failed",
        model,
        latencyMs: Date.now() - startedAt,
        hint: "Could not reach the provider at all — network or DNS.",
      };
    }
  });
}

function hintFor(status: number, errorType: string | null): string {
  if (status === 401 || status === 403) return "Key is missing, wrong, or revoked.";
  if (status === 404) return "This model is not available to this account.";
  if (status === 429) return "Rate limited.";
  if (status >= 500) return "Provider-side outage.";
  if (errorType === "invalid_request_error") {
    return "Check the account's credit balance first — an empty balance is reported as a 400 invalid_request_error.";
  }
  return "Unexpected — see the server log for the upstream message.";
}
