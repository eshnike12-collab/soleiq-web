import { describe, expect, it } from "vitest";
import {
  RISK_ORDER,
  changeLabel,
  currentMonthWindow,
  dayLabel,
  emptyStats,
  monthLabel,
  previousDayWindow,
  previousMonthWindow,
  rangeWindow,
} from "@/lib/platformReport";
import {
  platformReportSubject,
  renderPlatformReportHtml,
  renderPlatformReportText,
  type PlatformReportEmailData,
} from "@/server/email/templates/platformReport";

function data(
  overrides: Partial<PlatformReportEmailData["stats"]> = {}
): PlatformReportEmailData {
  return {
    periodLabel: "Saturday 4 October 2026",
    dashboardUrl: "https://app.soleiqhealth.com/platform",
    stats: {
      ...emptyStats(),
      newSignups: 23,
      totalUsers: 418,
      checksStarted: 96,
      reportsReleased: 91,
      newEnrollments: 17,
      byRiskLevel: { clear: 60, watch: 22, see_someone_soon: 7, urgent: 2 },
      feedbackCount: 5,
      feedbackByCategory: { bug: 2, suggestion: 3 },
      ...overrides,
    },
  };
}

describe("report window", () => {
  it("reports the month that has closed, not the one in progress", () => {
    // A run on 1 October must report September.
    const w = previousMonthWindow(new Date("2026-10-01T07:00:00.000Z"));
    expect(w.label).toBe("September 2026");
    expect(w.start.toISOString()).toBe("2026-09-01T00:00:00.000Z");
    expect(w.end.toISOString()).toBe("2026-10-01T00:00:00.000Z");
  });

  it("rolls back across a year boundary", () => {
    const w = previousMonthWindow(new Date("2027-01-01T07:00:00.000Z"));
    expect(w.label).toBe("December 2026");
    expect(w.start.toISOString()).toBe("2026-12-01T00:00:00.000Z");
    expect(w.end.toISOString()).toBe("2027-01-01T00:00:00.000Z");
  });

  it("covers February in a leap year without losing a day", () => {
    const w = previousMonthWindow(new Date("2028-03-05T00:00:00.000Z"));
    expect(w.label).toBe("February 2028");
    expect(w.end.toISOString()).toBe("2028-03-01T00:00:00.000Z");
    // 29 days in Feb 2028.
    const days = (w.end.getTime() - w.start.getTime()) / 86_400_000;
    expect(days).toBe(29);
  });

  it("gives a half-open window so a month boundary is counted exactly once", () => {
    const sep = previousMonthWindow(new Date("2026-10-10T00:00:00.000Z"));
    const oct = currentMonthWindow(new Date("2026-10-10T00:00:00.000Z"));
    // September's exclusive end is October's inclusive start: midnight on
    // 1 October belongs to October and to nothing else.
    expect(sep.end.toISOString()).toBe(oct.start.toISOString());
  });

  it("labels a month in UTC regardless of the runtime's zone", () => {
    expect(monthLabel(new Date("2026-09-01T00:00:00.000Z"))).toBe("September 2026");
  });
});

describe("daily window", () => {
  it("reports the day that has closed, not the one in progress", () => {
    // A run at 07:00 on 5 October must report the 4th.
    const w = previousDayWindow(new Date("2026-10-05T07:00:00.000Z"));
    expect(w.start.toISOString()).toBe("2026-10-04T00:00:00.000Z");
    expect(w.end.toISOString()).toBe("2026-10-05T00:00:00.000Z");
    expect(w.label).toBe("Sunday, 4 October 2026");
  });

  it("rolls back across a month boundary", () => {
    const w = previousDayWindow(new Date("2026-11-01T07:00:00.000Z"));
    expect(w.start.toISOString()).toBe("2026-10-31T00:00:00.000Z");
    expect(w.label).toBe("Saturday, 31 October 2026");
  });

  it("rolls back across a year boundary", () => {
    const w = previousDayWindow(new Date("2027-01-01T07:00:00.000Z"));
    expect(w.start.toISOString()).toBe("2026-12-31T00:00:00.000Z");
  });

  it("covers exactly 24 hours", () => {
    const w = previousDayWindow(new Date("2026-10-05T23:59:59.000Z"));
    expect(w.end.getTime() - w.start.getTime()).toBe(86_400_000);
  });

  it("labels in UTC regardless of the runtime zone", () => {
    expect(dayLabel(new Date("2026-10-04T00:00:00.000Z"))).toBe(
      "Sunday, 4 October 2026"
    );
  });
});

describe("dashboard ranges", () => {
  const NOW = new Date("2026-10-05T12:00:00.000Z");

  it("spans the advertised length", () => {
    const day = 86_400_000;
    expect(rangeWindow("1d", NOW).end.getTime() - rangeWindow("1d", NOW).start.getTime()).toBe(day);
    expect(rangeWindow("7d", NOW).end.getTime() - rangeWindow("7d", NOW).start.getTime()).toBe(7 * day);
    expect(rangeWindow("30d", NOW).end.getTime() - rangeWindow("30d", NOW).start.getTime()).toBe(30 * day);
    expect(rangeWindow("365d", NOW).end.getTime() - rangeWindow("365d", NOW).start.getTime()).toBe(365 * day);
  });

  it("starts all-time at the earliest record it was given", () => {
    const earliest = new Date("2025-02-11T09:30:00.000Z");
    const w = rangeWindow("all", NOW, earliest);
    expect(w.start.toISOString()).toBe(earliest.toISOString());
  });

  it("falls back to a year when all-time has no earliest record", () => {
    const w = rangeWindow("all", NOW, null);
    expect(w.end.getTime() - w.start.getTime()).toBe(365 * 86_400_000);
  });
});

describe("changeLabel", () => {
  it("describes a rise and a fall", () => {
    expect(changeLabel(120, 100)).toBe("+20 (+20%)");
    expect(changeLabel(80, 100)).toBe("-20 (-20%)");
  });

  it("says nothing rather than something meaningless", () => {
    // No baseline, or a baseline of zero, where a percentage is arithmetic
    // rather than information.
    expect(changeLabel(10, null)).toBeNull();
    expect(changeLabel(10, 0)).toBeNull();
  });

  it("reports a flat month honestly", () => {
    expect(changeLabel(100, 100)).toBe("no change");
  });
});

describe("report email", () => {
  it("carries no patient-identifying or clinical content", () => {
    const html = renderPlatformReportHtml(data());
    const text = renderPlatformReportText(data());
    for (const body of [html, text]) {
      // Counts are fine; a person, an address, or a finding is not.
      expect(body).not.toMatch(/@(?!soleiqhealth)[\w.-]+\.[a-z]{2,}/i);
      expect(body).not.toMatch(/\bMRN\b|date of birth|diagnos|ulcer|wound|photograph/i);
    }
  });

  it("states that it is aggregate-only, in both parts", () => {
    expect(renderPlatformReportHtml(data())).toMatch(
      /no patient-identifying or\s+clinical information/i
    );
    expect(renderPlatformReportText(data())).toMatch(
      /no patient-identifying or clinical information/i
    );
  });

  it("names the day in the subject", () => {
    expect(platformReportSubject(data())).toBe(
      "SoleIQ daily report — Saturday 4 October 2026"
    );
  });

  it("includes every headline figure", () => {
    const text = renderPlatformReportText(data());
    expect(text).toContain("New sign-ups: 23");
    expect(text).toContain("Total accounts: 418");
    expect(text).toContain("Foot checks started: 96");
    expect(text).toContain("Reports released: 91");
  });

  it("lists risk levels in clinical order, never reordered by count", () => {
    const text = renderPlatformReportText(data());
    const positions = RISK_ORDER.map((level) =>
      text.indexOf(level === "see_someone_soon" ? "See someone soon" : level[0].toUpperCase() + level.slice(1))
    );
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });

  it("flags a partial run instead of passing zeros off as real counts", () => {
    const partial = data({ partial: true, unavailable: ["feedback", "risk breakdown"] });
    expect(renderPlatformReportHtml(partial)).toMatch(/Incomplete report/i);
    expect(renderPlatformReportHtml(partial)).toContain("feedback, risk breakdown");
    expect(renderPlatformReportText(partial)).toMatch(/Incomplete:/);
    // ...and says nothing of the sort on a clean run.
    expect(renderPlatformReportHtml(data())).not.toMatch(/Incomplete/i);
  });

  it("omits the feedback section when there was none", () => {
    const none = data({ feedbackCount: 0, feedbackByCategory: {} });
    expect(renderPlatformReportHtml(none)).not.toMatch(/Feedback by category/);
  });

  it("links to the dashboard showing the same figures", () => {
    expect(renderPlatformReportHtml(data())).toContain(
      "https://app.soleiqhealth.com/platform"
    );
  });

  it("produces a plain-text part, not stripped HTML", () => {
    const text = renderPlatformReportText(data());
    expect(text).not.toMatch(/<[a-z]/i);
    expect(text.length).toBeGreaterThan(120);
  });
});
