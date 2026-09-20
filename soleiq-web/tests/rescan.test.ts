import { describe, expect, it } from "vitest";
import {
  DAY_MS,
  EMAIL_MIN_GAP_DAYS,
  MAX_EMAILS_PER_CYCLE,
  RESCAN_INTERVAL_DAYS,
  applyScan,
  daysUntilDue,
  duePhrase,
  nextDueAt,
  rescanUrgency,
  shouldSendReminderEmail,
  shouldShowReminder,
  streakAfterScan,
  type RescanSchedule,
} from "@/lib/rescan";

const NOW = Date.UTC(2026, 0, 15, 12, 0, 0);

function schedule(overrides: Partial<RescanSchedule> = {}): RescanSchedule {
  return {
    intervalDays: RESCAN_INTERVAL_DAYS,
    dueAt: NOW + 7 * DAY_MS,
    lastScanAt: NOW,
    snoozedUntil: null,
    paused: false,
    streakCount: 1,
    longestStreak: 1,
    lastEmailAt: null,
    emailsThisCycle: 0,
    ...overrides,
  };
}

describe("nextDueAt", () => {
  it("is seven days after the check by default", () => {
    expect(nextDueAt(NOW)).toBe(NOW + 7 * DAY_MS);
  });

  it("honours a tightened per-patient interval", () => {
    expect(nextDueAt(NOW, 3)).toBe(NOW + 3 * DAY_MS);
  });
});

describe("daysUntilDue", () => {
  it("counts down whole days and goes negative when late", () => {
    expect(daysUntilDue(NOW + 3 * DAY_MS, NOW)).toBe(3);
    expect(daysUntilDue(NOW, NOW)).toBe(0);
    expect(daysUntilDue(NOW - 2 * DAY_MS, NOW)).toBe(-2);
  });
});

describe("rescanUrgency", () => {
  it("is on_track well before the due date", () => {
    expect(rescanUrgency(schedule({ dueAt: NOW + 6 * DAY_MS }), NOW)).toBe(
      "on_track"
    );
  });

  it("warns two days out", () => {
    expect(rescanUrgency(schedule({ dueAt: NOW + 2 * DAY_MS }), NOW)).toBe(
      "due_soon"
    );
    expect(rescanUrgency(schedule({ dueAt: NOW + 1 * DAY_MS }), NOW)).toBe(
      "due_soon"
    );
  });

  it("is due on the day and for the next three days", () => {
    expect(rescanUrgency(schedule({ dueAt: NOW }), NOW)).toBe("due");
    expect(rescanUrgency(schedule({ dueAt: NOW - 3 * DAY_MS }), NOW)).toBe("due");
  });

  it("escalates past three days late", () => {
    expect(rescanUrgency(schedule({ dueAt: NOW - 4 * DAY_MS }), NOW)).toBe(
      "overdue"
    );
  });

  it("respects pause and snooze over everything else", () => {
    expect(
      rescanUrgency(schedule({ dueAt: NOW - 30 * DAY_MS, paused: true }), NOW)
    ).toBe("paused");
    expect(
      rescanUrgency(
        schedule({ dueAt: NOW - 30 * DAY_MS, snoozedUntil: NOW + DAY_MS }),
        NOW
      )
    ).toBe("snoozed");
  });

  it("lets an expired snooze fall through to the real urgency", () => {
    expect(
      rescanUrgency(
        schedule({ dueAt: NOW - DAY_MS, snoozedUntil: NOW - DAY_MS }),
        NOW
      )
    ).toBe("due");
  });
});

describe("shouldShowReminder", () => {
  it("shows from due_soon onward and stays quiet before that", () => {
    expect(shouldShowReminder(schedule({ dueAt: NOW + 5 * DAY_MS }), NOW)).toBe(
      false
    );
    expect(shouldShowReminder(schedule({ dueAt: NOW + DAY_MS }), NOW)).toBe(true);
    expect(shouldShowReminder(schedule({ dueAt: NOW - 9 * DAY_MS }), NOW)).toBe(
      true
    );
  });

  it("stays hidden while paused or snoozed", () => {
    expect(
      shouldShowReminder(schedule({ dueAt: NOW, paused: true }), NOW)
    ).toBe(false);
    expect(
      shouldShowReminder(
        schedule({ dueAt: NOW, snoozedUntil: NOW + 2 * DAY_MS }),
        NOW
      )
    ).toBe(false);
  });
});

describe("streakAfterScan", () => {
  it("starts at one for a first-ever check", () => {
    expect(
      streakAfterScan({
        previousStreak: 0,
        lastScanAt: null,
        dueAt: NOW,
        scanAt: NOW,
      })
    ).toBe(1);
  });

  it("continues when the check lands on time", () => {
    expect(
      streakAfterScan({
        previousStreak: 3,
        lastScanAt: NOW - 7 * DAY_MS,
        dueAt: NOW,
        scanAt: NOW - DAY_MS,
      })
    ).toBe(4);
  });

  it("survives a late check inside the grace week", () => {
    expect(
      streakAfterScan({
        previousStreak: 3,
        lastScanAt: NOW - 7 * DAY_MS,
        dueAt: NOW,
        scanAt: NOW + 6 * DAY_MS,
      })
    ).toBe(4);
  });

  it("restarts at one past the grace week", () => {
    expect(
      streakAfterScan({
        previousStreak: 9,
        lastScanAt: NOW - 7 * DAY_MS,
        dueAt: NOW,
        scanAt: NOW + 8 * DAY_MS,
      })
    ).toBe(1);
  });

  it("restarts at one rather than zero — the check just taken counts", () => {
    const value = streakAfterScan({
      previousStreak: 5,
      lastScanAt: NOW - 40 * DAY_MS,
      dueAt: NOW - 33 * DAY_MS,
      scanAt: NOW,
    });
    expect(value).toBe(1);
  });
});

describe("applyScan", () => {
  it("moves the due date, grows the streak, and clears the cycle's email state", () => {
    const before = schedule({
      dueAt: NOW,
      lastScanAt: NOW - 7 * DAY_MS,
      streakCount: 2,
      longestStreak: 4,
      snoozedUntil: NOW + DAY_MS,
      lastEmailAt: NOW - DAY_MS,
      emailsThisCycle: 2,
    });
    const after = applyScan(before, NOW);
    expect(after.lastScanAt).toBe(NOW);
    expect(after.dueAt).toBe(NOW + 7 * DAY_MS);
    expect(after.streakCount).toBe(3);
    expect(after.snoozedUntil).toBeNull();
    expect(after.lastEmailAt).toBeNull();
    expect(after.emailsThisCycle).toBe(0);
  });

  it("keeps the best streak when the current one restarts", () => {
    const before = schedule({
      dueAt: NOW - 30 * DAY_MS,
      lastScanAt: NOW - 37 * DAY_MS,
      streakCount: 6,
      longestStreak: 6,
    });
    const after = applyScan(before, NOW);
    expect(after.streakCount).toBe(1);
    expect(after.longestStreak).toBe(6);
  });

  it("raises the best streak when the current one passes it", () => {
    const before = schedule({
      dueAt: NOW,
      lastScanAt: NOW - 7 * DAY_MS,
      streakCount: 6,
      longestStreak: 6,
    });
    expect(applyScan(before, NOW).longestStreak).toBe(7);
  });
});

describe("shouldSendReminderEmail", () => {
  it("does not send before the due date", () => {
    expect(
      shouldSendReminderEmail(schedule({ dueAt: NOW + DAY_MS }), NOW)
    ).toBe(false);
  });

  it("sends once the check is due", () => {
    expect(shouldSendReminderEmail(schedule({ dueAt: NOW }), NOW)).toBe(true);
  });

  it("waits out the minimum gap between emails", () => {
    const recent = schedule({
      dueAt: NOW - 5 * DAY_MS,
      lastEmailAt: NOW - (EMAIL_MIN_GAP_DAYS - 1) * DAY_MS,
      emailsThisCycle: 1,
    });
    expect(shouldSendReminderEmail(recent, NOW)).toBe(false);

    const elapsed = schedule({
      dueAt: NOW - 5 * DAY_MS,
      lastEmailAt: NOW - EMAIL_MIN_GAP_DAYS * DAY_MS,
      emailsThisCycle: 1,
    });
    expect(shouldSendReminderEmail(elapsed, NOW)).toBe(true);
  });

  it("falls silent after the per-cycle cap rather than nagging forever", () => {
    const capped = schedule({
      dueAt: NOW - 60 * DAY_MS,
      lastEmailAt: NOW - 30 * DAY_MS,
      emailsThisCycle: MAX_EMAILS_PER_CYCLE,
    });
    expect(shouldSendReminderEmail(capped, NOW)).toBe(false);
    // ...but the banner is still there for them.
    expect(shouldShowReminder(capped, NOW)).toBe(true);
  });

  it("never emails a paused or snoozed patient", () => {
    expect(
      shouldSendReminderEmail(schedule({ dueAt: NOW, paused: true }), NOW)
    ).toBe(false);
    expect(
      shouldSendReminderEmail(
        schedule({ dueAt: NOW, snoozedUntil: NOW + DAY_MS }),
        NOW
      )
    ).toBe(false);
  });

  it("resumes the cycle after a completed check", () => {
    const exhausted = schedule({
      dueAt: NOW - 20 * DAY_MS,
      lastScanAt: NOW - 27 * DAY_MS,
      emailsThisCycle: MAX_EMAILS_PER_CYCLE,
      lastEmailAt: NOW - DAY_MS,
    });
    const after = applyScan(exhausted, NOW);
    // Not due yet, so still no email — but the cap is cleared for next time.
    expect(after.emailsThisCycle).toBe(0);
    expect(shouldSendReminderEmail(after, NOW + 8 * DAY_MS)).toBe(true);
  });
});

describe("duePhrase", () => {
  it("reads naturally either side of the due date", () => {
    expect(duePhrase(schedule({ dueAt: NOW + 3 * DAY_MS }), NOW)).toBe(
      "due in 3 days"
    );
    expect(duePhrase(schedule({ dueAt: NOW + DAY_MS }), NOW)).toBe(
      "due tomorrow"
    );
    expect(duePhrase(schedule({ dueAt: NOW }), NOW)).toBe("due today");
    expect(duePhrase(schedule({ dueAt: NOW - DAY_MS }), NOW)).toBe(
      "1 day overdue"
    );
    expect(duePhrase(schedule({ dueAt: NOW - 5 * DAY_MS }), NOW)).toBe(
      "5 days overdue"
    );
  });
});
