import { afterEach, describe, expect, it } from "vitest";
import { scanServiceStatus, videoFilenameFor } from "@/lib/scan3d/scanClient";

/**
 * Guards the misconfiguration that made every production scan fail.
 *
 * `NEXT_PUBLIC_FOOT_AI_URL` was set nowhere, and the client fell back to
 * `http://127.0.0.1:8000` unconditionally — so a patient's browser POSTed
 * their scan video to their own phone. These assert that an unset variable is
 * now a loud, named misconfiguration in production, while a developer's
 * machine still needs no configuration at all.
 */

const ORIGINAL_ENV = process.env.NEXT_PUBLIC_FOOT_AI_URL;
const ORIGINAL_NODE_ENV = process.env.NODE_ENV;

function setEnv(nodeEnv: string, url?: string) {
  // NODE_ENV is read-only in the vitest types but writable at runtime.
  (process.env as Record<string, string | undefined>).NODE_ENV = nodeEnv;
  if (url === undefined) delete process.env.NEXT_PUBLIC_FOOT_AI_URL;
  else process.env.NEXT_PUBLIC_FOOT_AI_URL = url;
}

/** Pretend to be a page served over the given protocol. */
function withWindow(protocol: string, run: () => void) {
  const g = globalThis as unknown as { window?: unknown };
  const had = "window" in g;
  const prev = g.window;
  g.window = { location: { protocol } };
  try {
    run();
  } finally {
    if (had) g.window = prev;
    else delete g.window;
  }
}

afterEach(() => {
  setEnv(ORIGINAL_NODE_ENV ?? "test", ORIGINAL_ENV);
});

describe("scan service configuration", () => {
  it("falls back to loopback OUTSIDE production so local dev needs no setup", () => {
    setEnv("development");
    const status = scanServiceStatus();
    expect(status.ok).toBe(true);
    if (status.ok) expect(status.baseUrl).toBe("http://127.0.0.1:8000");
  });

  it("refuses in production when the variable is unset", () => {
    setEnv("production");
    const status = scanServiceStatus();
    expect(status.ok).toBe(false);
    if (!status.ok) {
      expect(status.reason).toBe("not_configured");
      // The message must name the variable — that is the whole point.
      expect(status.detail).toContain("NEXT_PUBLIC_FOOT_AI_URL");
    }
  });

  it("never returns a loopback address in production", () => {
    setEnv("production");
    const status = scanServiceStatus();
    expect(JSON.stringify(status)).not.toContain("127.0.0.1");
  });

  it("accepts a configured https service in production", () => {
    setEnv("production", "https://scan.soleiqhealth.com");
    const status = scanServiceStatus();
    expect(status.ok).toBe(true);
    if (status.ok) expect(status.baseUrl).toBe("https://scan.soleiqhealth.com");
  });

  it("strips trailing slashes so URLs never double up", () => {
    setEnv("production", "https://scan.soleiqhealth.com///");
    const status = scanServiceStatus();
    if (status.ok) expect(status.baseUrl).toBe("https://scan.soleiqhealth.com");
  });

  it("rejects an http service on an https page (browser blocks mixed content)", () => {
    setEnv("production", "http://scan.soleiqhealth.com");
    withWindow("https:", () => {
      const status = scanServiceStatus();
      expect(status.ok).toBe(false);
      if (!status.ok) expect(status.reason).toBe("insecure_origin");
    });
  });

  it("still allows http loopback on an https page — browsers treat it as secure", () => {
    setEnv("development", "http://127.0.0.1:8000");
    withWindow("https:", () => {
      expect(scanServiceStatus().ok).toBe(true);
    });
  });
});

/**
 * Safari on iOS records MP4, not WebM. The upload filename used to be the
 * constant "video.webm", and the service picks its storage suffix from that
 * name — so an iPhone's MP4 landed on disk as video.webm.
 */
describe("upload filename follows the recorded container", () => {
  it("names an MP4 recording .mp4 (the iPhone case)", () => {
    expect(videoFilenameFor(new Blob([], { type: "video/mp4" }))).toBe("video.mp4");
    expect(videoFilenameFor(new Blob([], { type: "video/mp4;codecs=h264" }))).toBe(
      "video.mp4"
    );
  });

  it("names a WebM recording .webm", () => {
    expect(videoFilenameFor(new Blob([], { type: "video/webm;codecs=vp9" }))).toBe(
      "video.webm"
    );
  });

  it("handles QuickTime and Matroska, which the service also accepts", () => {
    expect(videoFilenameFor(new Blob([], { type: "video/quicktime" }))).toBe("video.mov");
    expect(videoFilenameFor(new Blob([], { type: "video/x-matroska" }))).toBe("video.mkv");
  });

  it("falls back to .webm for an unknown or empty type", () => {
    // A bare MediaRecorder on an old browser can report no type at all.
    expect(videoFilenameFor(new Blob([], { type: "" }))).toBe("video.webm");
    expect(videoFilenameFor(new Blob([], { type: "video/ogg" }))).toBe("video.webm");
  });
});
