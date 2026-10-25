import { describe, expect, it } from "vitest";
import {
  AnthropicError,
  backoffMs,
  classifyUpstream,
} from "@/lib/anthropicErrors";

const creditPayload = {
  error: {
    type: "invalid_request_error",
    message:
      "Your credit balance is too low to access the Anthropic API. Please go to Plans & Billing to upgrade or purchase credits.",
  },
};

describe("every classified failure is a SERVICE failure", () => {
  // The whole point: none of these may ever read as the patient's photos
  // being wrong, because none of them are.
  const cases: [number, unknown][] = [
    [401, { error: { type: "authentication_error" } }],
    [403, { error: { type: "permission_error" } }],
    [400, creditPayload],
    [404, { error: { type: "not_found_error" } }],
    [429, { error: { type: "rate_limit_error" } }],
    [500, { error: { type: "api_error" } }],
    [529, { error: { type: "overloaded_error" } }],
  ];

  it.each(cases)("status %i never blames the photos", (status, payload) => {
    const { clientMessage } = classifyUpstream(status, payload);
    expect(clientMessage).not.toMatch(/retake|blurr?y|unclear|clear photos|try again with/i);
  });

  it.each(cases)("status %i is a 5xx to the client, not a 4xx", (status, payload) => {
    // 413 is the one genuine client-side cause and is tested separately.
    expect(classifyUpstream(status, payload).clientStatus).toBeGreaterThanOrEqual(500);
  });
});

describe("the credit-balance case — observed in production", () => {
  it("maps a 400 credit refusal to 503, not to a bad-request message", () => {
    const result = classifyUpstream(400, creditPayload);
    expect(result.clientStatus).toBe(503);
    expect(result.clientMessage).toBe(
      "Photo analysis is not configured correctly. This is on us, not your photos."
    );
    expect(result.errorType).toBe("invalid_request_error");
  });

  it("does NOT swallow a genuine malformed request as a billing problem", () => {
    // Same status and type, different message. This one really is our bug and
    // must stay a 502 so it is not mistaken for something billing can fix.
    const result = classifyUpstream(400, {
      error: { type: "invalid_request_error", message: "messages: field required" },
    });
    expect(result.clientStatus).toBe(502);
  });

  it("recognises the billing wording however it is phrased", () => {
    for (const message of [
      "Your credit balance is too low",
      "Please purchase credits to continue",
      "billing issue on this account",
    ]) {
      expect(
        classifyUpstream(400, { error: { type: "invalid_request_error", message } })
          .clientStatus
      ).toBe(503);
    }
  });
});

describe("the one failure that is about the upload", () => {
  it("passes 413 through as 413 and says what to do", () => {
    const result = classifyUpstream(413, { error: { type: "request_too_large" } });
    expect(result.clientStatus).toBe(413);
    expect(result.clientMessage).toMatch(/too large/i);
    // Retaking IN THE APP is the fix here — the app downscales, the library
    // picker does not — so this is the one place that may mention retaking.
    expect(result.clientMessage).toMatch(/retake them in the app/i);
  });
});

describe("distinct messages per cause", () => {
  it("tells a rate limit apart from an outage apart from a config problem", () => {
    const rate = classifyUpstream(429, { error: { type: "rate_limit_error" } });
    const busy = classifyUpstream(529, { error: { type: "overloaded_error" } });
    const config = classifyUpstream(401, { error: { type: "authentication_error" } });
    expect(new Set([rate.clientMessage, busy.clientMessage, config.clientMessage]).size).toBe(3);
    expect(rate.clientMessage).toMatch(/minute/i);
    expect(busy.clientMessage).toMatch(/busy/i);
    expect(config.clientMessage).toMatch(/on us/i);
  });

  it("falls back to 502 for a status it does not know", () => {
    expect(classifyUpstream(418, null).clientStatus).toBe(502);
  });

  it("survives a payload with no error object", () => {
    expect(() => classifyUpstream(500, null)).not.toThrow();
    expect(classifyUpstream(500, null).errorType).toBeNull();
  });
});

describe("backoff", () => {
  it("honours retry-after in seconds", () => {
    expect(backoffMs(0, "3")).toBe(3000);
  });

  it("caps a long retry-after so it cannot eat the route's budget", () => {
    expect(backoffMs(0, "600")).toBe(10_000);
  });

  it("grows between attempts and stays jittered within bounds", () => {
    // Full jitter: between 50% and 100% of the exponential base.
    for (const [attempt, base] of [[0, 1000], [1, 2000], [2, 4000]] as const) {
      for (let i = 0; i < 40; i += 1) {
        const value = backoffMs(attempt, null);
        expect(value).toBeGreaterThanOrEqual(base * 0.5);
        expect(value).toBeLessThanOrEqual(base);
      }
    }
  });

  it("ignores a nonsense retry-after and falls back to the curve", () => {
    const value = backoffMs(0, "soon");
    expect(value).toBeGreaterThanOrEqual(500);
    expect(value).toBeLessThanOrEqual(1000);
  });
});

describe("AnthropicError", () => {
  it("carries status, errorType and retryable for callers to branch on", () => {
    const err = new AnthropicError(
      classifyUpstream(429, { error: { type: "rate_limit_error" } })
    );
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("AnthropicError");
    expect(err.status).toBe(429);
    expect(err.errorType).toBe("rate_limit_error");
    expect(err.retryable).toBe(true);
  });

  it("marks settled 4xx as not retryable", () => {
    for (const status of [400, 401, 403, 404, 413]) {
      expect(
        new AnthropicError(classifyUpstream(status, { error: { type: "x" } }))
          .retryable
      ).toBe(false);
    }
  });

  it("marks 5xx and 529 as retryable", () => {
    for (const status of [500, 502, 503, 529]) {
      expect(
        new AnthropicError(classifyUpstream(status, { error: { type: "x" } }))
          .retryable
      ).toBe(true);
    }
  });

  it("never carries the upstream message anywhere reachable", () => {
    // The upstream text can echo the system prompt; nothing on this object
    // may contain it, because anything on a thrown error eventually gets
    // rendered or logged somewhere it should not be.
    const secret = "SYSTEM PROMPT LEAK marker-4821";
    const err = new AnthropicError(
      classifyUpstream(400, {
        error: { type: "invalid_request_error", message: secret },
      })
    );
    expect(JSON.stringify({ ...err, message: err.message })).not.toContain(secret);
    expect(err.clientMessage).not.toContain(secret);
    expect(err.message).not.toContain(secret);
  });
});
