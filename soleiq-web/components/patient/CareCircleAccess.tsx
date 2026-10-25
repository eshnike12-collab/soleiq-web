"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { listMyCareCircle, revokeCareGrant, type CareGrant } from "@/lib/careCircle";

/**
 * Who is in the patient's care circle, on the Privacy & access page.
 *
 * This is where the person who created the record gets removed. It needs no
 * special path to do that: the creating caregiver holds an ordinary
 * 'caregiver' grant, and revoking it is the same UPDATE the RLS policy already
 * allows the record's owner to make. The only difference is the label, so the
 * patient can tell who that person was.
 */
export function CareCircleAccess() {
  const [grants, setGrants] = useState<CareGrant[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setGrants(await listMyCareCircle());
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const revoke = async (grant: CareGrant) => {
    setBusy(grant.id);
    setMessage(null);
    const ok = await revokeCareGrant(grant.id);
    setMessage(
      ok
        ? `${grant.email} can no longer see your records.`
        : "That could not be revoked. Please try again."
    );
    await reload();
    setBusy(null);
  };

  const active = (grants ?? []).filter((g) => g.status !== "revoked");
  const revoked = (grants ?? []).filter((g) => g.status === "revoked");

  return (
    <section className="rounded-2xl border border-slate-200 bg-surface-raised p-5 shadow-card">
      <h2 className="text-[15px] font-bold text-ink">My care circle</h2>
      <p className="mt-1 text-[13px] leading-relaxed text-ink-soft">
        People you have allowed to see your foot checks. Removing someone takes
        effect immediately — including the person who first set up your record.
      </p>

      {message && (
        <p className="mt-3 rounded-xl bg-secondary-soft px-3 py-2 text-[13px] text-secondary">
          {message}
        </p>
      )}

      {grants === null ? (
        <p className="mt-4 flex items-center gap-2 text-[13px] text-ink-soft">
          <Loader2 className="h-4 w-4 animate-spin text-primary" /> Loading…
        </p>
      ) : active.length === 0 ? (
        <p className="mt-4 text-[13px] text-ink-faint">
          Nobody else can see your records.
        </p>
      ) : (
        <div className="mt-3 divide-y divide-slate-100">
          {active.map((grant) => (
            <div
              key={grant.id}
              className="flex flex-wrap items-center justify-between gap-3 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-[14px] font-semibold text-ink">
                  {grant.email}
                </p>
                <p className="text-[12px] text-ink-soft">
                  {grant.role}
                  {grant.direction === "caregiver_created" && (
                    <> · set up your record</>
                  )}
                  {grant.status !== "active" && <> · {grant.status.replace(/_/g, " ")}</>}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void revoke(grant)}
                disabled={busy === grant.id}
                className="inline-flex min-h-[44px] shrink-0 items-center rounded-xl border border-slate-200 px-3.5 text-[13px] font-bold text-urgent transition-colors hover:border-urgent/40 disabled:opacity-50"
              >
                {busy === grant.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Remove"
                )}
              </button>
            </div>
          ))}
        </div>
      )}

      {revoked.length > 0 && (
        <p className="mt-3 border-t border-slate-100 pt-3 text-[12px] text-ink-faint">
          Removed: {revoked.map((g) => g.email).join(", ")}
        </p>
      )}
    </section>
  );
}
