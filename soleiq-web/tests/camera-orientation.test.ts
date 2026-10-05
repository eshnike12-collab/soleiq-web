import { describe, expect, it } from "vitest";
import {
  detectHandheld,
  resolveOrientation,
  resolveOrientationLegacy,
} from "@/lib/cameraOrientation";

const PHONE = { handheld: true, viewportPortrait: true };
const PHONE_TURNED = { handheld: true, viewportPortrait: false };
const DESKTOP = { handheld: false, viewportPortrait: false };

describe("the stuck-in-landscape bug", () => {
  it("is what the OLD rule did — a stored choice beat the device", () => {
    expect(
      resolveOrientationLegacy({ ...PHONE, stored: "landscape" })
    ).toBe("landscape");
  });

  it("cannot happen now: a handheld is portrait whatever is stored", () => {
    expect(resolveOrientation({ ...PHONE, stored: "landscape" })).toBe(
      "portrait"
    );
  });

  it("stays portrait even with the phone physically turned sideways", () => {
    // Reaching across a foot rotates the phone. The frame the patient lined
    // the shot up in should not reshape underneath them.
    expect(resolveOrientation({ ...PHONE_TURNED, stored: "landscape" })).toBe(
      "portrait"
    );
    expect(resolveOrientation({ ...PHONE_TURNED, stored: null })).toBe(
      "portrait"
    );
  });

  it("is portrait on a clean phone", () => {
    expect(resolveOrientation({ ...PHONE, stored: null })).toBe("portrait");
  });

  it("ignores a stored value that is neither option", () => {
    expect(resolveOrientation({ ...PHONE, stored: "sideways" })).toBe(
      "portrait"
    );
    expect(resolveOrientation({ ...DESKTOP, stored: "sideways" })).toBe(
      "landscape"
    );
  });
});

describe("desktop keeps its choice", () => {
  it("defaults to the viewport shape", () => {
    expect(resolveOrientation({ ...DESKTOP, stored: null })).toBe("landscape");
    expect(
      resolveOrientation({ handheld: false, viewportPortrait: true, stored: null })
    ).toBe("portrait");
  });

  it("honours an explicit choice in both directions", () => {
    expect(resolveOrientation({ ...DESKTOP, stored: "portrait" })).toBe(
      "portrait"
    );
    expect(
      resolveOrientation({
        handheld: false,
        viewportPortrait: true,
        stored: "landscape",
      })
    ).toBe("landscape");
  });
});

describe("detectHandheld", () => {
  const fakeWindow = (matches: Record<string, boolean>) =>
    ({
      matchMedia: (query: string) => ({ matches: Boolean(matches[query]) }),
    }) as unknown as Window;

  it("treats a coarse pointer as handheld", () => {
    expect(
      detectHandheld(fakeWindow({ "(pointer: coarse)": true }))
    ).toBe(true);
  });

  it("treats a narrow viewport as handheld even with a fine pointer", () => {
    expect(
      detectHandheld(fakeWindow({ "(max-width: 820px)": true }))
    ).toBe(true);
  });

  it("is false for a wide, fine-pointer screen", () => {
    expect(detectHandheld(fakeWindow({}))).toBe(false);
  });

  it("assumes handheld when it cannot tell", () => {
    // Server render, or a browser without matchMedia. Portrait is the safe
    // default: a letterboxed strip on a phone is far worse than a tall frame
    // on a laptop.
    expect(detectHandheld(undefined)).toBe(true);
    expect(detectHandheld({} as unknown as Window)).toBe(true);
  });
});
