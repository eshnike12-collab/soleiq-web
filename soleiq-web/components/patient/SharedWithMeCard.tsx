"use client";

/**
 * "Shared with you" — patients who added this signed-in user to their care
 * circle. Claims any pending invites for this login first, so a fresh
 * invite lights up the moment the invitee opens their dashboard (patient
 * home AND doctor portal both render this). Renders nothing when the user
 * has no shares.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { SharedPatient, listSharedWithMe } from "@/lib/careCircle";

export function SharedWithMeCard() {
  const [shares, setShares] = useState<SharedPatient[]>([]);

  useEffect(() => {
    // listSharedWithMe() claims pending invites for this email first.
    listSharedWithMe().then(setShares).catch(() => {});
  }, []);

  if (shares.length === 0) return null;

  return (
    <section className="rounded-3xl border border-teal-200 bg-secondary-soft p-5">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-teal-800">
        Shared with you
      </p>
      <p className="mt-1 text-[13px] leading-relaxed text-teal-800/80">
        These people invited you to see their foot-check results.
      </p>
      <ul className="mt-3 space-y-2">
        {shares.map((share) => (
          <li key={share.grantId}>
            <Link
              href={`/shared/${share.patientId}`}
              className="flex min-h-[56px] items-center gap-3 rounded-2xl border border-teal-200/60 bg-surface-raised p-3 shadow-card transition duration-150 hover:shadow-lifted active:scale-[0.99]"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary-soft text-secondary">
                <ShieldCheck className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-bold text-ink">
                  {share.patientName}
                </span>
                <span className="block text-xs text-ink-soft">
                  {share.role === "clinician"
                    ? "Clinical view shared with you"
                    : "Shared as " + share.role}
                </span>
              </span>
              <span className="text-sm font-bold text-primary">View →</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
