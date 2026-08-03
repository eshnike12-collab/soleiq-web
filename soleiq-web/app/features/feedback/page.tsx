"use client";

/**
 * Feedback — pick what kind of note it is (broken / idea / question), then
 * write it. Submissions go through the existing /api/feedback route (saved
 * to the feedback table, shown on the admin dashboard, and emailed when
 * configured).
 */

import { FormEvent, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Heart,
  HelpCircle,
  Lightbulb,
  Loader2,
  MessageSquare,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { AuthGate } from "@/components/auth/AuthGate";

type Category = "bug" | "suggestion" | "question";

const OPTIONS: {
  value: Category;
  label: string;
  blurb: string;
  icon: LucideIcon;
  tile: string;
  iconColor: string;
}[] = [
  {
    value: "bug",
    label: "Something's broken",
    blurb: "A screen or button isn't working right.",
    icon: Wrench,
    tile: "bg-urgent-soft",
    iconColor: "text-urgent",
  },
  {
    value: "suggestion",
    label: "I have an idea",
    blurb: "Something SoleIQ should add or do better.",
    icon: Lightbulb,
    tile: "bg-warn-soft",
    iconColor: "text-warn",
  },
  {
    value: "question",
    label: "I have a question",
    blurb: "Ask us anything about the app.",
    icon: HelpCircle,
    tile: "bg-primary-soft",
    iconColor: "text-primary",
  },
];

function FeedbackContent() {
  const [category, setCategory] = useState<Category | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const chosen = OPTIONS.find((option) => option.value === category);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy || !category || message.trim().length < 3) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ category, message: message.trim() }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.ok) {
        throw new Error(
          payload?.error?.message ?? "Your feedback couldn't be sent right now."
        );
      }
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong — try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface px-5 py-8 pb-24">
      <main className="mx-auto max-w-3xl">
        <Link href="/features" className="text-sm font-bold text-primary">
          ← Features
        </Link>
        <h1 className="mt-3 text-3xl font-bold text-ink">Feedback</h1>

        {/* The note that sets the tone */}
        <div className="mt-4 flex items-start gap-3 rounded-3xl border border-teal-200 bg-secondary-soft p-5">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-surface-raised text-secondary shadow-card">
            <Heart className="h-5 w-5" />
          </span>
          <p className="text-[15px] leading-relaxed text-teal-800">
            <span className="font-bold">Your input means everything to us.</span>{" "}
            SoleIQ is built around what patients and doctors tell us — every note
            here is read by the team and shapes what we improve next.
          </p>
        </div>

        {sent ? (
          <div className="mt-5 flex flex-col items-center rounded-3xl border border-slate-200 bg-surface-raised p-8 text-center shadow-card">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-success-soft">
              <CheckCircle2 className="h-8 w-8 text-success" />
            </span>
            <h2 className="mt-3 text-xl font-bold text-ink">Thank you!</h2>
            <p className="mt-1 max-w-sm text-[15px] leading-relaxed text-ink-soft">
              Your note went straight to the SoleIQ team.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setSent(false);
                  setCategory(null);
                  setMessage("");
                }}
                className="min-h-[44px] rounded-2xl border border-slate-200 bg-surface-raised px-5 text-sm font-bold text-ink transition-colors hover:bg-slate-50"
              >
                Send another
              </button>
              <Link
                href="/features"
                className="inline-flex min-h-[44px] items-center rounded-2xl bg-primary px-5 text-sm font-bold text-white shadow-button"
              >
                Back to Features
              </Link>
            </div>
          </div>
        ) : (
          <form
            onSubmit={submit}
            className="mt-5 rounded-3xl border border-slate-200 bg-surface-raised p-6 shadow-card"
          >
            <p className="field-label">What kind of note is it?</p>
            <div className="grid gap-2 sm:grid-cols-3">
              {OPTIONS.map((option) => {
                const Icon = option.icon;
                const selected = category === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setCategory(option.value)}
                    className={`rounded-2xl border p-3.5 text-left transition-colors duration-150 active:scale-[0.99] ${
                      selected
                        ? "border-primary bg-primary-soft"
                        : "border-slate-200 bg-surface-raised hover:border-slate-300"
                    }`}
                  >
                    <span
                      className={`flex h-10 w-10 items-center justify-center rounded-xl ${option.tile}`}
                    >
                      <Icon className={`h-5 w-5 ${option.iconColor}`} />
                    </span>
                    <span className="mt-2 block text-[15px] font-bold text-ink">
                      {option.label}
                    </span>
                    <span className="mt-0.5 block text-[12px] leading-snug text-ink-soft">
                      {option.blurb}
                    </span>
                  </button>
                );
              })}
            </div>

            {category && (
              <label className="mt-4 block">
                <span className="field-label">
                  {category === "bug"
                    ? "What's broken? Tell us what you tapped and what happened."
                    : category === "suggestion"
                      ? "What's your idea?"
                      : "What would you like to know?"}
                </span>
                <textarea
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  required
                  minLength={3}
                  maxLength={4000}
                  rows={5}
                  autoFocus
                  placeholder="Write it in your own words…"
                  className="w-full rounded-2xl border border-slate-200 bg-surface-raised p-4 text-[15px] leading-relaxed text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-primary focus:ring-4 focus:ring-primary-soft"
                />
              </label>
            )}

            <button
              type="submit"
              disabled={busy || !category || message.trim().length < 3}
              className="mt-4 inline-flex min-h-[48px] w-full items-center justify-center rounded-2xl bg-primary px-5 text-base font-bold text-white shadow-button transition-all hover:bg-primary-deep active:scale-[0.98] disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none"
            >
              {busy ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Sending…
                </span>
              ) : (
                <span className="inline-flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" /> Send feedback
                </span>
              )}
            </button>
            {error && (
              <p className="mt-3 rounded-2xl bg-urgent-soft p-3 text-sm text-urgent">
                {error}
              </p>
            )}
            <p className="mt-3 text-xs leading-relaxed text-ink-faint">
              Sent privately to the SoleIQ team along with your account email so
              we can follow up.
            </p>
          </form>
        )}
      </main>
    </div>
  );
}

export default function FeedbackPage() {
  return (
    <AuthGate>
      <FeedbackContent />
    </AuthGate>
  );
}
