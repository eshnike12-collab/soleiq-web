import { describe, expect, it } from "vitest";
import { describeScanFailure } from "@/lib/scan3d/failureMessages";
import { ScanClientError } from "@/lib/scan3d/scanClient";

/**
 * A CSP or CORS refusal, a dead service and a DNS failure all surface as the
 * same `TypeError: Failed to fetch`, and all used to produce "Please try
 * again." That invited a patient to repeat a 25-second capture that could not
 * possibly succeed. These lock the distinction in.
 */
describe("scan failure messages", () => {
  it("says the service is unreachable, never 'try again'", () => {
    const msg = describeScanFailure(
      new ScanClientError("Could not reach the scan service.", "unreachable")
    );
    expect(msg.toLowerCase()).toContain("could not reach");
    expect(msg.toLowerCase()).not.toContain("try again in a moment");
  });

  it("tells an expired session to sign in, not to rescan blindly", () => {
    const msg = describeScanFailure(new ScanClientError("401", "unauthorized"));
    expect(msg.toLowerCase()).toContain("sign in");
  });

  it("only suggests retrying when retrying can actually help", () => {
    const msg = describeScanFailure(new ScanClientError("500", "server"));
    expect(msg.toLowerCase()).toContain("again");
  });

  it("repeats the service's own reason verbatim when it gave one", () => {
    const reason =
      "Kept 5 new viewpoints from this scan. 15 more needed before a model can be built.";
    expect(describeScanFailure(new ScanClientError(reason, "refused"))).toBe(reason);
  });

  it("degrades safely for a non-ScanClientError", () => {
    expect(describeScanFailure(new TypeError("Failed to fetch"))).toContain(
      "Something went wrong"
    );
  });
});
