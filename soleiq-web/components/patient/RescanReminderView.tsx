"use client";

import Link from "next/link";
import { BellOff, CalendarCheck, Camera, Flame } from "lucide-react";

/**
 * The reminder card's appearance, with no data fetching in it.
 *
 * Split from the container so every state — first check, on track, due,
 * overdue, paused, mid-streak — can be rendered from fixtures and looked at,
 * on a phone and on a desktop, without a signed-in patient and a database
 * full of the right history. The states that are hardest to reach in real
 * life are exactly the ones most likely to ship broken.
 */

export interface RescanStatus {
  available: boolean;
  urgency?: "paused" | "snoozed" | "on_track" | "due_soon" | "due" | "overdue";
  show?: boolean;
  dueAt?: string;
  daysUntilDue?: number;
  duePhrase?: string;
  firstCheck?: boolean;
  streakCount?: number;
  longestStreak?: number;
  paused?: boolean;
}

/** Tone per urgency, from the app's own palette. */
const TONE: Record<string, { wrap: string; eyebrow: string; icon: string }> = {
  due_soon: {
    wrap: "border-slate-200 bg-surface-raised",
    eyebrow: "text-primary",
    icon: "bg-primary-soft text-primary",
  },
  due: {
    wrap: "border-amber-200 bg-warn-soft",
    eyebrow: "text-amber-800",
    icon: "bg-amber-100 text-amber-800",
  },
  overdue: {
    wrap: "border-orange-200 bg-orange-50",
    eyebrow: "text-orange-800",
    icon: "bg-orange-100 text-orange-800",
  },
};

export function StreakFlame({ count, best }: { count: number; best: number }) {
  // One check is not a streak. Calling it one cheapens the number at exactly
  // the moment it needs to mean something.
  if (count < 2) return null;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-warn-soft px-3 py-1 text-xs font-bold text-amber-800">
      <Flame className="h-3.5 w-3.5" aria-hidden="true" />
      {count} weeks in a row
      {best > count && (
        <span className="font-semibold text-amber-700/80">· best {best}</span>
      )}
    </span>
  );
}

export function RescanReminderView({
  status,
  busy = false,
  onAct,
}: {
  status: RescanStatus;
  busy?: boolean;
  onAct: (action: "snooze" | "pause" | "resume", days?: number) => void;
}) {
  if (!status.available) return null;

  const streak = status.streakCount ?? 0;
  const best = status.longestStreak ?? 0;

  // Reminders switched off: one quiet line to switch them back on, so the
  // setting is not a one-way door hidden in a menu that does not exist yet.
  if (status.paused) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-surface px-5 py-3">
        <p className="flex items-center gap-2 text-sm text-ink-soft">
          <BellOff className="h-4 w-4 shrink-0 text-ink-faint" aria-hidden="true" />
          Weekly check reminders are off.
        </p>
        <button
          type="button"
          onClick={() => onAct("resume")}
          disabled={busy}
          className="min-h-[44px] rounded-xl px-3 py-2 text-sm font-bold text-primary transition-colors hover:text-primary-deep disabled:opacity-50"
        >
          Turn back on
        </button>
      </div>
    );
  }

  // Not due yet. A compact strip — the streak is the reason to come back, so
  // it stays visible between checks rather than only when nagging.
  if (!status.show) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-surface-raised px-5 py-3 shadow-card">
        <p className="flex items-center gap-2 text-sm text-ink-soft">
          <CalendarCheck className="h-4 w-4 shrink-0 text-secondary" aria-hidden="true" />
          {status.firstCheck ? (
            <>Your first check sets your baseline.</>
          ) : (
            <>
              Next foot check{" "}
              <span className="font-semibold text-ink">{status.duePhrase}</span>.
            </>
          )}
        </p>
        <StreakFlame count={streak} best={best} />
      </div>
    );
  }

  const tone = TONE[status.urgency ?? "due"] ?? TONE.due;
  const eyebrow =
    status.urgency === "overdue"
      ? "Checking in"
      : status.urgency === "due_soon"
        ? "Coming up"
        : "Due now";

  const heading = status.firstCheck
    ? "Take your first foot check"
    : status.urgency === "overdue"
      ? "It has been a little while"
      : "Time for your weekly foot check";

  const body = status.firstCheck
    ? "Your first set of photos becomes your baseline — every later check is compared against it."
    : "A weekly photo is how small changes get caught while they are still small. It takes about two minutes.";

  return (
    <section
      aria-labelledby="rescan-heading"
      className={`rounded-3xl border p-6 shadow-card ${tone.wrap}`}
    >
      <div className="flex items-start gap-4">
        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${tone.icon}`}
        >
          <Camera className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className={`text-xs font-bold uppercase tracking-[0.16em] ${tone.eyebrow}`}>
            {eyebrow}
            {!status.firstCheck && status.duePhrase ? ` · ${status.duePhrase}` : ""}
          </p>
          <h2 id="rescan-heading" className="mt-1 text-xl font-bold text-ink">
            {heading}
          </h2>
          <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">{body}</p>

          {streak >= 2 && (
            <p className="mt-3">
              <StreakFlame count={streak} best={best} />
            </p>
          )}

          {/* Stacks on a phone, sits inline from `sm` up, so none of the three
              actions ever needs a sideways scroll to reach. */}
          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <Link
              href="/"
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-bold text-white shadow-button transition-transform duration-150 active:scale-[0.98]"
            >
              <Camera className="h-4 w-4" aria-hidden="true" />
              {status.firstCheck ? "Start my first check" : "Start my check"}
            </Link>
            <button
              type="button"
              onClick={() => onAct("snooze", 2)}
              disabled={busy}
              className="inline-flex min-h-[44px] items-center justify-center rounded-2xl px-4 py-3 text-sm font-bold text-ink-soft transition-colors hover:text-ink disabled:opacity-50"
            >
              Remind me in 2 days
            </button>
            <button
              type="button"
              onClick={() => onAct("pause")}
              disabled={busy}
              className="inline-flex min-h-[44px] items-center justify-center rounded-2xl px-4 py-3 text-sm font-semibold text-ink-faint transition-colors hover:text-ink-soft disabled:opacity-50"
            >
              Turn off
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
