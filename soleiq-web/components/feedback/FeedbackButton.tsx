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
            ? "inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-brand"
            : "inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:text-brand"
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
            className="w-full max-w-md rounded-3xl bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-slate-950">Send feedback</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Goes straight to the SoleIQ care team.
            </p>

            {done ? (
              <div className="mt-4">
                <p className="rounded-2xl bg-emerald-50 p-3 text-sm text-emerald-800">{done}</p>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="mt-3 w-full rounded-xl bg-brand py-2.5 text-sm font-semibold text-white"
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={submit} className="mt-4 space-y-3">
                <div>
                  <label className="text-xs font-medium text-slate-600">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as Category)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  >
                    <option value="bug">Something is broken</option>
                    <option value="question">I have a question</option>
                    <option value="suggestion">Suggestion / idea</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600">Message</label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    required
                    minLength={3}
                    maxLength={4000}
                    rows={4}
                    placeholder="What happened, or what would make SoleIQ better?"
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600">
                    Contact email (optional)
                  </label>
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  />
                </div>
                {error && <p className="text-xs text-red-700">{error}</p>}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={busy}
                    className="flex-1 rounded-xl bg-brand py-2.5 text-sm font-semibold text-white disabled:opacity-60"
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
