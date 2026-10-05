import { describe, expect, it } from "vitest";
import {
  deviceTimeZone,
  formatInZone,
  isValidTimeZone,
  toDate,
} from "@/lib/localTime";

/**
 * The reported bug, pinned: a photo taken at 6pm in New York was displayed as
 * 10pm, because a server component formatted it with no timezone and the
 * server runs UTC.
 */
const SIX_PM_EDT = new Date("2026-09-19T22:00:00.000Z");

describe("the 6pm-shows-as-10pm bug", () => {
  it("renders the patient's clock time when given their zone", () => {
    const shown = formatInZone(
      SIX_PM_EDT,
      "datetime",
      "America/New_York",
      false,
      "en-US"
    );
    expect(shown).toContain("6:00");
    expect(shown).toContain("PM");
    expect(shown).toContain("Sep 19");
  });

  it("renders 10pm under UTC — the wrong answer, reproduced", () => {
    const shown = formatInZone(SIX_PM_EDT, "datetime", "UTC", false, "en-US");
    expect(shown).toContain("10:00");
    expect(shown).toContain("PM");
  });

  it("names the zone on the pre-hydration pass so a UTC time is never mistaken for local", () => {
    const shown = formatInZone(SIX_PM_EDT, "datetime", "UTC", true, "en-US");
    expect(shown).toMatch(/UTC/);
  });

  it("crosses the date line correctly for a late-evening capture", () => {
    // 9pm in Los Angeles on the 19th is already the 20th in UTC. A patient
    // must not see tomorrow's date on tonight's photo.
    const ninePmPdt = new Date("2026-09-20T04:00:00.000Z");
    const la = formatInZone(ninePmPdt, "date", "America/Los_Angeles", false, "en-US");
    const utc = formatInZone(ninePmPdt, "date", "UTC", false, "en-US");
    expect(la).toContain("Sep 19");
    expect(utc).toContain("Sep 20");
  });

  it("handles a zone with a half-hour offset", () => {
    const shown = formatInZone(
      SIX_PM_EDT,
      "time",
      "Asia/Kolkata",
      false,
      "en-US"
    );
    // 22:00Z + 5:30 = 03:30 next day.
    expect(shown).toContain("3:30");
  });

  it("respects a southern-hemisphere zone with inverted DST", () => {
    const shown = formatInZone(
      SIX_PM_EDT,
      "datetime",
      "Australia/Sydney",
      false,
      "en-US"
    );
    // 22:00Z on 19 Sep is 08:00 on 20 Sep in AEST (UTC+10).
    expect(shown).toContain("Sep 20");
    expect(shown).toContain("8:00");
  });
});

describe("formatInZone robustness", () => {
  it("falls back to the reader's zone rather than blanking on a bad zone name", () => {
    const shown = formatInZone(
      SIX_PM_EDT,
      "datetime",
      "Not/AZone",
      false,
      "en-US"
    );
    expect(shown.length).toBeGreaterThan(0);
    expect(shown).toContain("2026");
  });

  it("supports date-only and time-only modes", () => {
    expect(
      formatInZone(SIX_PM_EDT, "date", "America/New_York", false, "en-US")
    ).toBe("Sep 19, 2026");
    expect(
      formatInZone(SIX_PM_EDT, "time", "America/New_York", false, "en-US")
    ).toContain("6:00");
  });

  it("never asks for a zone name in date-only mode", () => {
    const shown = formatInZone(SIX_PM_EDT, "date", "UTC", true, "en-US");
    expect(shown).not.toMatch(/UTC/);
  });
});

describe("toDate", () => {
  it("accepts ISO strings, epoch millis, and Dates", () => {
    expect(toDate("2026-09-19T22:00:00.000Z")?.getTime()).toBe(
      SIX_PM_EDT.getTime()
    );
    expect(toDate(SIX_PM_EDT.getTime())?.getTime()).toBe(SIX_PM_EDT.getTime());
    expect(toDate(SIX_PM_EDT)?.getTime()).toBe(SIX_PM_EDT.getTime());
  });

  it("returns null for anything unusable", () => {
    expect(toDate(null)).toBeNull();
    expect(toDate(undefined)).toBeNull();
    expect(toDate("not a date")).toBeNull();
    expect(toDate("")).toBeNull();
  });
});

describe("timezone helpers", () => {
  it("validates IANA names", () => {
    expect(isValidTimeZone("America/New_York")).toBe(true);
    expect(isValidTimeZone("UTC")).toBe(true);
    expect(isValidTimeZone("Not/AZone")).toBe(false);
    expect(isValidTimeZone("")).toBe(false);
    expect(isValidTimeZone(null)).toBe(false);
    expect(isValidTimeZone(undefined)).toBe(false);
  });

  it("reports a usable device zone", () => {
    const zone = deviceTimeZone();
    expect(zone).toBeTruthy();
    expect(isValidTimeZone(zone)).toBe(true);
  });
});
