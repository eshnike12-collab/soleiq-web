import { ScanClientError } from "./scanClient";

/**
 * One message per failure class, because they need different actions.
 *
 * The old catch-all — "Could not build the 3D model. Please try again." —
 * invited a patient to repeat a 25-second capture in cases where retrying
 * could not possibly work, and hid the service's own explanation in the ones
 * where it could.
 */
export function describeScanFailure(error: unknown): string {
  if (!(error instanceof ScanClientError)) {
    return "Something went wrong building the 3D model. Please try again.";
  }
  switch (error.kind) {
    case "unreachable":
      // Never "try again": the request did not leave the browser, so a repeat
      // capture fails identically.
      return (
        "Could not reach the scan service, so your scan could not be sent. " +
        "Your frames were not lost — try again once you are back online."
      );
    case "unauthorized":
      return "Your session expired while scanning. Sign in again, then rescan.";
    case "server":
      return (
        "The scan service had a problem processing this scan. " +
        "It is worth trying again in a moment."
      );
    case "refused":
      // The service explained itself; repeating it beats paraphrasing it.
      return error.message;
    default:
      return error.message;
  }
}

