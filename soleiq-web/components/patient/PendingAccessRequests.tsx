"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, ShieldQuestion, X } from "lucide-react";
import {
  decidePendingRequest,
  listPendingRequests,
  type PendingRequest,
} from "@/lib/careCircle";
import { LocalTime } from "@/components/ui/LocalTime";

/**
 * Requests waiting on this patient's decision.
 *
 * NOTHING IS SHARED UNTIL A DECISION IS MADE. A pending row grants no access
 * at all — `has_care_circle_access()` matches `status = 'active'` and nothing
 * else — so this screen is the gate, not a notification about something that
 * has already happened. The copy says so, because a patient who believes it
 * has already happened will approve out of resignation.
 *
 * The requester's details are their own claims. They are labelled that way:
 * the product cannot verify that someone is a district nurse, and showing an
 * unverified claim as a fact is how a patient is talked into approving a
 * stranger.
 */
export function PendingAccessRequests() {
  const [requests, setRequests] = useState<PendingRequest[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    void listPendingRequests()
      .then(setRequests)
      .catch(() => setRequests([]));
  }, []);

  useEffect(load, [load]);

  const decide = async (id: string, approve: boolean) => {
    setBusyId(id);
    setError(null);
    try {
      await decidePendingRequest(id, approve);
      setRequests((previous) =>
        (previous ?? []).filter((request) => request.id !== id)
      );
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "That could not be saved."
      );
    } finally {
      setBusyId(null);
    }
  };

  // Nothing pending is the normal state; an empty panel would be noise.
  if (!requests || requests.length === 0) return null;

  return (
    <section className="rounded-2xl border border-amber-200 bg-warn-soft p-5 shadow-card">
      <h2 className="flex items-center gap-2 text-[17px] font-bold text-ink">
        <ShieldQuestion className="h-5 w-5 text-warn" aria-hidden="true" />
        {requests.length === 1
          ? "Someone has asked to see your checks"
          : `${requests.length} people have asked to see your checks`}
      </h2>
      <p className="mt-1 text-[14px] leading-relaxed text-ink-soft">
        They cannot see anything unless you approve.
      </p>

      <ul className="mt-4 space-y-3">
        {requests.map((request) => (
          <li
            key={request.id}
            className="rounded-xl border border-slate-200 bg-surface-raised p-4"
          >
            <p className="text-[16px] font-bold text-ink">
              {request.requesterName ?? "Someone"}
            </p>
            <dl className="mt-2 space-y-1 text-[14px] text-ink-soft">
              <div className="flex gap-2">
                <dt className="shrink-0">They say they are:</dt>
                <dd className="font-medium text-ink">
                  {request.relationship ?? "not stated"}
                </dd>
              </div>
              {request.organization && (
                <div className="flex gap-2">
                  <dt className="shrink-0">Organization:</dt>
                  <dd className="font-medium text-ink">{request.organization}</dd>
                </div>
              )}
              <div className="flex gap-2">
                <dt className="shrink-0">Email:</dt>
                <dd className="break-all font-medium text-ink">{request.email}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="shrink-0">Asked:</dt>
                <dd>
                  <LocalTime value={request.createdAt} mode="date" />
                </dd>
              </div>
            </dl>

            <p className="mt-2 text-[13px] leading-snug text-ink-faint">
              These are their own words. We have not verified them. If you were
              not expecting this, decline.
            </p>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => void decide(request.id, true)}
                disabled={busyId === request.id}
                className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-[15px] font-bold text-white shadow-button transition-colors hover:bg-primary-deep disabled:opacity-50"
              >
                <Check className="h-4 w-4" aria-hidden="true" /> Approve
              </button>
              <button
                type="button"
                onClick={() => void decide(request.id, false)}
                disabled={busyId === request.id}
                className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-surface-raised px-4 text-[15px] font-bold text-ink-soft transition-colors hover:text-ink disabled:opacity-50"
              >
                <X className="h-4 w-4" aria-hidden="true" /> Decline
              </button>
            </div>
          </li>
        ))}
      </ul>

      {error && (
        <p role="status" className="mt-3 text-[14px] font-semibold text-urgent">
          {error}
        </p>
      )}
    </section>
  );
}
