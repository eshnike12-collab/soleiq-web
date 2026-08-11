"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BadgeCheck, CheckCircle2, Loader2, Sparkles, Users } from "lucide-react";
import { AuthGate } from "@/components/auth/AuthGate";
import { countCaregiverSlots, listMyCareCircle } from "@/lib/careCircle";
import { COMING_SOON_BENEFITS, getCurrentPlan } from "@/lib/plans";

function MembershipContent() {
  const plan = getCurrentPlan();
  const [slotsUsed, setSlotsUsed] = useState<number | null>(null);

  useEffect(() => {
    listMyCareCircle().then((grants) => setSlotsUsed(countCaregiverSlots(grants)));
  }, []);

  const used = slotsUsed ?? 0;
  const slotsFull = slotsUsed !== null && used >= plan.maxCaregivers;

  return (
    <div className="min-h-screen px-5 py-8 pb-24">
      <main className="mx-auto max-w-3xl">
        <Link href="/features" className="inline-flex min-h-[44px] items-center py-2 text-sm font-semibold text-primary transition-colors hover:text-primary-deep">
          ← Features
        </Link>
        <h1 className="mt-3 text-3xl font-bold text-ink">Membership</h1>
        <p className="mt-1 text-[15px] leading-relaxed text-ink-soft">
          Your current plan and what it includes.
        </p>

        {/* Current plan */}
        <section className="mt-5 rounded-3xl border border-slate-200 bg-surface-raised p-6 shadow-card">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-soft text-primary">
              <BadgeCheck className="h-6 w-6" />
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">
                Current plan
              </p>
              <h2 className="text-xl font-bold text-ink">
                {plan.name}{" "}
                <span className="text-sm font-medium text-ink-faint">
                  · {plan.priceLabel}
                </span>
              </h2>
            </div>
          </div>
          <ul className="mt-4 space-y-2">
            {plan.highlights.map((highlight) => (
              <li key={highlight} className="flex items-start gap-2 text-[15px] text-ink">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-secondary" />
                {highlight}
              </li>
            ))}
          </ul>
        </section>

        {/* Caregiver slots */}
        <section className="mt-5 rounded-3xl border border-slate-200 bg-surface-raised p-6 shadow-card">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">
            Caregiver slots
          </p>
          {slotsUsed === null ? (
            <p className="mt-3 flex items-center gap-2 text-sm text-ink-soft">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </p>
          ) : (
            <>
              <div className="mt-3 flex items-center gap-3">
                <Users className="h-5 w-5 text-ink-faint" />
                <div className="flex-1">
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm font-bold text-ink">
                      {Math.min(used, plan.maxCaregivers)} of {plan.maxCaregivers} used
                    </span>
                    <span className="text-xs text-ink-faint">
                      family &amp; caregivers (doctors are unlimited)
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-sunken">
                    <div
                      className={`h-full rounded-full ${slotsFull ? "bg-amber-500" : "bg-primary"}`}
                      style={{
                        width: `${Math.min(100, (used / plan.maxCaregivers) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
              {slotsFull ? (
                <p className="mt-3 rounded-2xl bg-warn-soft p-3 text-xs leading-relaxed text-amber-800">
                  All {plan.maxCaregivers} caregiver slots on your {plan.name} plan are
                  in use, so a third caregiver can&apos;t be added. Remove someone in{" "}
                  <Link href="/features/care-team" className="font-semibold underline">
                    Care Team
                  </Link>
                  , or upgrade when larger plans launch (see below).
                </p>
              ) : (
                <p className="mt-3 text-xs text-ink-faint">
                  Add family members or caregivers in{" "}
                  <Link href="/features/care-team" className="font-bold text-primary">
                    Care Team
                  </Link>
                  .
                </p>
              )}
            </>
          )}
        </section>

        {/* Coming soon */}
        <section className="mt-5 rounded-3xl border border-dashed border-slate-300 bg-surface-raised/60 p-6">
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.16em] text-ink-faint">
            <Sparkles className="h-3.5 w-3.5" /> Coming soon
          </p>
          <p className="mt-1 text-xs text-ink-faint">
            Future plans will add these benefits:
          </p>
          <ul className="mt-3 space-y-3">
            {COMING_SOON_BENEFITS.map((benefit) => (
              <li key={benefit.title} className="rounded-2xl border border-slate-100 bg-surface-raised p-4">
                <p className="text-sm font-bold text-ink">{benefit.title}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-ink-soft">
                  {benefit.detail}
                </p>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}

export default function MembershipPage() {
  return (
    <AuthGate>
      <MembershipContent />
    </AuthGate>
  );
}
