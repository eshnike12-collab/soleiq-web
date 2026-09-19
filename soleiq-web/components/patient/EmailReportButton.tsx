"use client";

import { useState } from "react";
import { Check, Mail, Loader2 } from "lucide-react";

/**
 * "Email me my report" — a manual trigger for the same send that fires
 * automatically when a report is released.
 *
 * It calls POST /api/reports/[reportId]/email, which reuses
 * sendReportSummaryForReport — the identical template, sender and Resend
 * client. There is no second code path here; this button only decides *when*.
 *
 * The address is not asked for and cannot be chosen. It always goes to the
 * signed-in patient's own account email, resolved server-side under RLS.
 * Letting a caller type a destination would turn a results page into a way to
 * forward someone else's medical summary to an arbitrary inbox.
 */

type State =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "sent" }
  | { kind: "error"; message: string };

/** Every failure the route can report, in words a patient can act on. */
function messageFor(reason: string | null, status: number): string {
  if (status === 429) {
    return "You've asked for this a few times just now — give it a minute and try again.";
  }
  switch (reason) {
    case "not_configured":
      return "Email isn't set up on this server yet. Your report is still here whenever you need it.";
    case "no_recipient":
      return "There's no email address on your account yet, so there's nowhere to send it. Add one in your profile and try again.";
    case "send_failed":
      return "That didn't send. Please try again in a moment.";
    default:
      return "That didn't send. Please try again in a moment.";
  }
}

export function EmailReportButton({ reportId }: { reportId: string }) {
  const [state, setState] = useState<State>({ kind: "idle" });

  const send = async () => {
    setState({ kind: "sending" });
    try {
      const response = await fetch(`/api/reports/${reportId}/email`, {
        method: "POST",
      });
      // apiHandler wraps everything as { ok, data } / { ok, error }.
      const body = await response.json().catch(() => null);

      if (!response.ok || !body?.ok) {
        setState({
          kind: "error",
          message: messageFor(null, response.status),
        });
        return;
      }
      if (!body.data?.sent) {
        setState({
          kind: "error",
          message: messageFor(body.data?.reason ?? null, response.status),
        });
        return;
      }
      setState({ kind: "sent" });
    } catch {
      setState({
        kind: "error",
        message: "Couldn't reach the server. Check your connection and try again.",
      });
    }
  };

  if (state.kind === "sent") {
    return (
      <div className="mt-6 flex items-start gap-2 rounded-2xl bg-secondary-soft px-4 py-3">
        <Check className="mt-0.5 h-4 w-4 shrink-0 text-secondary" strokeWidth={3} />
        <div>
          <p className="text-sm font-bold text-ink">Sent to your email</p>
          <p className="mt-0.5 text-[13px] leading-snug text-ink-soft">
            It may take a minute to arrive. Check your spam folder if you don&apos;t
            see it.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <button
        type="button"
        onClick={() => void send()}
        disabled={state.kind === "sending"}
        className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-bold text-white shadow-button transition-transform duration-150 active:scale-[0.98] disabled:opacity-60"
      >
        {state.kind === "sending" ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Sending…
          </>
        ) : (
          <>
            <Mail className="h-4 w-4" aria-hidden="true" />
            Email me my report
          </>
        )}
      </button>
      <p className="mt-2 text-xs leading-snug text-ink-faint">
        Sends a summary and a link to this page, to the email address on your
        account.
      </p>
      {state.kind === "error" && (
        // role=alert so a screen reader announces it — the button label itself
        // does not change, so nothing else would signal the failure.
        <p role="alert" className="mt-2 text-[13px] font-semibold leading-snug text-urgent">
          {state.message}
        </p>
      )}
    </div>
  );
}
