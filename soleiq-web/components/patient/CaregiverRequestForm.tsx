"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Send, UserPlus } from "lucide-react";
import {
  listMyRequests,
  requestPatientAccess,
  type MyRequest,
} from "@/lib/careCircle";
import { LocalTime } from "@/components/ui/LocalTime";

/**
 * A caregiver asks a patient for access.
 *
 * THE RESPONSE IS DELIBERATELY UNINFORMATIVE, and that is the feature.
 *
 * Submitting shows the same confirmation whether or not the address belongs
 * to a SoleIQ patient. It has to: a different message, a different colour, or
 * a spinner that lasts longer for real addresses would all turn this form
 * into a way of asking "does this person use SoleIQ?" — which is a question
 * about someone's health that nobody has consented to answer.
 *
 * The list below shows the caller's own requests by STATUS and date only. It
 * never names the patient, because a row appearing at all would confirm the
 * address was real.
 */

const STATUS_COPY: Record<string, { label: string; tone: string }> = {
  pending_patient_approval: {
    label: "Waiting for their decision",
    tone: "bg-warn-soft text-warn",
  },
  active: { label: "Approved", tone: "bg-secondary-soft text-secondary" },
  declined: { label: "Not approved", tone: "bg-slate-100 text-ink-soft" },
  revoked: { label: "Access withdrawn", tone: "bg-slate-100 text-ink-soft" },
  invited: { label: "Invitation sent to you", tone: "bg-primary-soft text-primary" },
};

export function CaregiverRequestForm() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [requests, setRequests] = useState<MyRequest[] | null>(null);

  const load = useCallback(() => {
    void listMyRequests()
      .then(setRequests)
      .catch(() => setRequests([]));
  }, []);

  useEffect(load, [load]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const address = email.trim();
    if (!address || busy) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const result = await requestPatientAccess(address);
      // One message, always. See the note above.
      setNotice(result.message);
      setEmail("");
      load();
    } catch (reason) {
      // Only errors about the CALLER's own account reach here — an
      // unconfirmed email, or a missing profile. Nothing about the address.
      setError(
        reason instanceof Error
          ? reason.message
          : "The request could not be sent."
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-surface-raised p-5 shadow-card sm:p-6">
      <h2 className="flex items-center gap-2 text-[17px] font-bold text-ink">
        <UserPlus className="h-5 w-5 text-primary" aria-hidden="true" />
        Request access to a patient
      </h2>
      <p className="mt-1 text-[15px] leading-relaxed text-ink-soft">
        Enter the email address they use for SoleIQ. They decide whether to
        approve — you will see nothing about them unless they do.
      </p>

      <form onSubmit={submit} className="mt-4 flex flex-col gap-2 sm:flex-row">
        <label htmlFor="patient-email" className="sr-only">
          Patient email address
        </label>
        <input
          id="patient-email"
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="their@email.com"
          className="min-h-[44px] flex-1 rounded-xl border border-slate-200 bg-surface-raised px-3 text-[15px] text-ink outline-none transition-shadow placeholder:text-ink-faint focus:border-primary focus:ring-4 focus:ring-primary-soft"
        />
        <button
          type="submit"
          disabled={busy || !email.trim()}
          className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-primary px-5 text-[15px] font-bold text-white shadow-button transition-colors hover:bg-primary-deep disabled:opacity-50"
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Send className="h-4 w-4" aria-hidden="true" />
          )}
          Send request
        </button>
      </form>

      {notice && (
        <p
          role="status"
          className="mt-3 rounded-xl bg-primary-soft px-4 py-3 text-[14px] leading-relaxed text-ink-soft"
        >
          {notice}
        </p>
      )}
      {error && (
        <p
          role="status"
          className="mt-3 rounded-xl bg-warn-soft px-4 py-3 text-[14px] leading-relaxed text-warn"
        >
          {error}
        </p>
      )}

      {requests && requests.length > 0 && (
        <div className="mt-6">
          <p className="mc-section-title">Your requests</p>
          <ul className="mt-2 divide-y divide-slate-100">
            {requests.map((request) => {
              const copy =
                STATUS_COPY[request.status] ?? {
                  label: request.status,
                  tone: "bg-slate-100 text-ink-soft",
                };
              return (
                <li
                  key={request.id}
                  className="flex items-center justify-between gap-3 py-3"
                >
                  {/* Date only. Naming the patient would confirm the address
                      was real, which is the one thing this must not do. */}
                  <span className="text-[14px] text-ink-soft">
                    Sent <LocalTime value={request.createdAt} mode="date" />
                  </span>
                  <span
                    className={`shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-[12px] font-semibold ${copy.tone}`}
                  >
                    {copy.label}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}
