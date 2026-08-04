"use client";

/**
 * "Send feedback" entry point + dialog, used on the patient dashboard and
 * the hospital shells. Posts to /api/feedback, which stores the row (never
 * lost) and emails the care team when configured.
 */

import { useState } from "react";
import { Loader2, MessageSquarePlus } from "lucide-react";

type Category = "bug" | "question" | "suggestion";

export function FeedbackButton({
  prefillEmail,
  compact = false,
}: {
  prefillEmail?: string | null;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<Category>("suggestion");
  const [message, setMessage] = useState("");
  const [contactEmail, setContactEmail] = useState(prefillEmail ?? "");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ category, message, contactEmail }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error?.message ?? "Feedback could not be sent.");
      }
      setDone("Thanks — your feedback was sent to the care team.");
      setMessage("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Feedback could not be sent.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          setDone(null);
          setError(null);
        }}
        className={
          compact
            ? "inline-flex min-h-[44px] items-center gap-1.5 py-2 text-xs font-semibold text-ink-soft transition-colors hover:text-primary"
            : "inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-slate-200 bg-surface-raised px-3.5 py-2.5 text-xs font-semibold text-ink-soft transition-colors hover:border-primary/40 hover:text-primary"
        }
      >
        <MessageSquarePlus className="h-4 w-4" /> Send feedback
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-label="Send feedback"
          onClick={() => setOpen(false)}
        >
          <div
            className="max-h-full w-full max-w-md overflow-y-auto rounded-3xl bg-surface-raised p-6 shadow-lifted"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold text-ink">Send feedback</h2>
            <p className="mt-0.5 text-[13px] text-ink-soft">
              Goes straight to the SoleIQ care team.
            </p>

            {done ? (
              <div className="mt-4">
                <p className="rounded-2xl bg-secondary-soft p-3 text-sm text-teal-800">{done}</p>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="mt-3 min-h-[44px] w-full rounded-xl bg-primary py-2.5 text-sm font-bold text-white shadow-button transition-transform duration-150 active:scale-[0.98]"
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={submit} className="mt-4 space-y-3">
                <div>
                  <label className="text-xs font-semibold text-ink-soft">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as Category)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-surface-raised px-3 py-2.5 text-sm text-ink focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary-soft"
                  >
                    <option value="bug">Something is broken</option>
                    <option value="question">I have a question</option>
                    <option value="suggestion">Suggestion / idea</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-ink-soft">Message</label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    required
                    minLength={3}
                    maxLength={4000}
                    rows={4}
                    placeholder="What happened, or what would make SoleIQ better?"
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-surface-raised px-3 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary-soft"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-ink-soft">
                    Contact email (optional)
                  </label>
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-surface-raised px-3 py-2.5 text-sm text-ink focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary-soft"
                  />
                </div>
                {error && <p className="text-[13px] font-medium text-urgent">{error}</p>}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="min-h-[44px] flex-1 rounded-xl border border-slate-200 bg-surface-raised py-2.5 text-sm font-semibold text-ink-soft transition-colors hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={busy}
                    className="min-h-[44px] flex-1 rounded-xl bg-primary py-2.5 text-sm font-bold text-white shadow-button transition-transform duration-150 active:scale-[0.98] disabled:opacity-60"
                  >
                    {busy ? (
                      <span className="inline-flex items-center gap-1.5">
                        <Loader2 className="h-4 w-4 animate-spin" /> Sending…
                      </span>
                    ) : (
                      "Send"
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
