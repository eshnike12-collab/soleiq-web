import { describe, expect, it } from "vitest";
import {
  renderRescanReminderHtml,
  renderRescanReminderText,
  rescanReminderSubject,
  type RescanReminderEmailData,
} from "@/server/email/templates/rescanReminder";

function data(
  overrides: Partial<RescanReminderEmailData> = {}
): RescanReminderEmailData {
  return {
    patientName: "Alex",
    daysOverdue: 0,
    streakCount: 0,
    longestStreak: 0,
    firstCheck: false,
    checkUrl: "https://app.soleiqhealth.com/?utm_source=rescan_reminder",
    settingsUrl: "https://app.soleiqhealth.com/home",
    ...overrides,
  };
}

describe("rescanReminderSubject", () => {
  it("leads with the streak when there is one to protect", () => {
    expect(rescanReminderSubject(data({ streakCount: 5 }))).toBe(
      "Keep your 5-week streak — foot check due"
    );
  });

  it("names the baseline for a first check", () => {
    expect(rescanReminderSubject(data({ firstCheck: true }))).toMatch(/first/i);
  });

  it("softens rather than escalates when very late", () => {
    const subject = rescanReminderSubject(data({ daysOverdue: 9 }));
    expect(subject).toBe("Your foot check is waiting");
    expect(subject).not.toMatch(/urgent|overdue|missed|failed/i);
  });
});

describe("reminder email content", () => {
  it("carries no clinical content at all", () => {
    const html = renderRescanReminderHtml(
      data({ streakCount: 4, longestStreak: 9, daysOverdue: 3 })
    );
    const text = renderRescanReminderText(data({ streakCount: 4 }));
    // A reminder lands in an inbox the recipient has not authenticated to.
    // It must not disclose findings, risk, or history.
    //
    // The fixed wellness disclaimer is removed before asserting: it contains
    // the word "diagnosis" by design and says nothing about this patient.
    // What is being tested is that no clinical fact ABOUT THEM appears.
    const DISCLAIMER =
      /SoleIQ is a wellness monitoring tool and is not a substitute for professional medical diagnosis\./g;
    for (const body of [html, text]) {
      expect(body).toMatch(DISCLAIMER);
      expect(body.replace(DISCLAIMER, "")).not.toMatch(
        /ulcer|wound|risk level|urgent|callus|redness|lesion|diagnos/i
      );
    }
  });

  it("links to the check and to reminder settings", () => {
    const html = renderRescanReminderHtml(data());
    expect(html).toContain("https://app.soleiqhealth.com/?utm_source=rescan_reminder");
    expect(html).toContain("https://app.soleiqhealth.com/home");
    // An unsubscribe route is not optional for recurring mail.
    expect(html).toMatch(/turn off these reminders/i);
  });

  it("shows the streak chip only once there is a run worth keeping", () => {
    expect(renderRescanReminderHtml(data({ streakCount: 1 }))).not.toMatch(
      /streak/i
    );
    expect(renderRescanReminderHtml(data({ streakCount: 3 }))).toMatch(
      /3-week streak/
    );
  });

  it("mentions the personal best only when it beats the current run", () => {
    expect(
      renderRescanReminderHtml(data({ streakCount: 3, longestStreak: 3 }))
    ).not.toMatch(/best/i);
    expect(
      renderRescanReminderHtml(data({ streakCount: 3, longestStreak: 8 }))
    ).toMatch(/best 8/);
  });

  it("never shows a streak on a first check", () => {
    const html = renderRescanReminderHtml(
      data({ firstCheck: true, streakCount: 4 })
    );
    expect(html).not.toMatch(/streak/i);
  });

  it("escapes a name that contains markup", () => {
    const html = renderRescanReminderHtml(
      data({ patientName: '<script>alert(1)</script>' })
    );
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("keeps the wellness disclaimer in both parts", () => {
    expect(renderRescanReminderHtml(data())).toMatch(
      /not a substitute for professional medical diagnosis/i
    );
    expect(renderRescanReminderText(data())).toMatch(
      /not a substitute for professional medical diagnosis/i
    );
  });

  it("explains what a baseline is on the first check", () => {
    const text = renderRescanReminderText(data({ firstCheck: true }));
    expect(text).toMatch(/baseline/i);
  });

  it("produces a plain-text part, not stripped HTML", () => {
    const text = renderRescanReminderText(data());
    expect(text).not.toMatch(/<[a-z]/i);
    expect(text.length).toBeGreaterThan(80);
  });
});
