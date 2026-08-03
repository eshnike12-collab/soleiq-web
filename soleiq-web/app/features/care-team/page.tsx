"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Loader2,
  Mail,
  ShieldCheck,
  Stethoscope,
  UserRound,
  Users,
} from "lucide-react";
import { AuthGate } from "@/components/auth/AuthGate";
import {
  CareGrant,
  CareRole,
  SharedPatient,
  countCaregiverSlots,
  inviteToCareCircle,
  listMyCareCircle,
  listSharedWithMe,
  revokeCareGrant,
} from "@/lib/careCircle";
import { getCurrentPlan } from "@/lib/plans";

const ROLE_META: Record<CareRole, { label: string; blurb: string; icon: typeof UserRound }> = {
  family: {
    label: "Family",
    blurb: "Sees your results the way you see them.",
    icon: UserRound,
  },
  caregiver: {
    label: "Caregiver",
    blurb: "Sees your results the way you see them.",
    icon: Users,
  },
  clinician: {
    label: "Doctor / clinician",
    blurb: "Sees the clinical detail version of your reports.",
    icon: Stethoscope,
  },
};

const STATUS_CHIP: Record<string, string> = {
  invited: "bg-warn-soft text-warn",
  active: "bg-secondary-soft text-teal-800",
  revoked: "bg-slate-100 text-slate-600",
};

function CareTeamContent() {
  const plan = getCurrentPlan();
  const [grants, setGrants] = useState<CareGrant[] | null>(null);
  const [sharedWithMe, setSharedWithMe] = useState<SharedPatient[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<CareRole>("family");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const [mine, shared] = await Promise.all([listMyCareCircle(), listSharedWithMe()]);
    setGrants(mine);
    setSharedWithMe(shared);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const activeGrants = (grants ?? []).filter((g) => g.status !== "revoked");
  const revokedGrants = (grants ?? []).filter((g) => g.status === "revoked");
  const slotsUsed = countCaregiverSlots(grants ?? []);
  const slotsFull = slotsUsed >= plan.maxCaregivers;

  const invite = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    const result = await inviteToCareCircle(email, role);
    if (result.ok) {
      setNotice(
        result.emailSent
          ? `Invitation email sent to ${email.trim().toLowerCase()}. Their access connects the moment they sign in to SoleIQ with that email — it will appear right on their dashboard.`
          : `Invitation added for ${email.trim().toLowerCase()}. When they sign in to SoleIQ with that email, their access connects automatically and appears on their dashboard.`
      );
      setEmail("");
      await reload();
    } else {
      setError(result.reason);
    }
    setBusy(false);
  };

  const revoke = async (grant: CareGrant) => {
    if (
      !window.confirm(
        `Remove ${grant.email}'s access? They immediately lose the ability to see your results.`
      )
    ) {
      return;
    }
    const ok = await revokeCareGrant(grant.id);
    if (ok) {
      setNotice(`Access for ${grant.email} was revoked.`);
      await reload();
    } else {
      setError("Couldn't revoke that access right now — try again.");
    }
  };

  return (
    <div className="min-h-screen bg-surface px-5 py-8 pb-24">
      <main className="mx-auto max-w-3xl">
        <Link href="/features" className="inline-flex min-h-[44px] items-center py-2 text-sm font-semibold text-primary transition-colors hover:text-primary-deep">
          ← Features
        </Link>
        <h1 className="mt-3 text-3xl font-bold text-ink">Care Team</h1>
        <p className="mt-1 text-[15px] leading-relaxed text-ink-soft">
          Choose who can see your foot-check results. Access is enforced by the
          database itself — revoking someone cuts them off immediately.
        </p>

        {(error || notice) && (
          <div
            className={`mt-4 rounded-2xl border p-4 text-sm ${
              error
                ? "border-red-200 bg-urgent-soft text-red-800"
                : "border-teal-200 bg-secondary-soft text-teal-800"
            }`}
          >
            {error ?? notice}
          </div>
        )}

        {/* Invite */}
        <section className="mt-5 rounded-3xl border border-slate-200 bg-surface-raised p-6 shadow-card">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">
            Invite someone
          </p>
          <form onSubmit={invite} className="mt-3 space-y-3">
            <label className="block">
              <span className="text-xs font-semibold text-ink-soft">Their email</span>
              <div className="mt-1 flex min-h-[44px] items-center gap-2 rounded-2xl border border-slate-200 bg-surface-raised px-3 py-2.5 transition-colors focus-within:border-primary focus-within:ring-4 focus-within:ring-primary-soft">
                <Mail className="h-4 w-4 shrink-0 text-ink-faint" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-faint"
                />
              </div>
            </label>
            <div>
              <span className="text-xs font-semibold text-ink-soft">Their role</span>
              <div className="mt-1 grid gap-2 sm:grid-cols-3">
                {(Object.keys(ROLE_META) as CareRole[]).map((key) => {
                  const meta = ROLE_META[key];
                  const Icon = meta.icon;
                  const selected = role === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setRole(key)}
                      className={`min-h-[44px] rounded-2xl border p-3 text-left transition duration-150 active:scale-[0.99] ${
                        selected
                          ? "border-primary bg-primary-soft shadow-card"
                          : "border-slate-200 bg-surface-raised hover:border-primary/40"
                      }`}
                    >
                      <Icon
                        className={`h-4 w-4 ${selected ? "text-primary" : "text-ink-faint"}`}
                      />
                      <span className="mt-1 block text-sm font-bold text-ink">
                        {meta.label}
                      </span>
                      <span className="mt-0.5 block text-[11px] leading-snug text-ink-soft">
                        {meta.blurb}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {role !== "clinician" && slotsFull && (
              <p className="rounded-2xl bg-warn-soft p-3 text-xs leading-relaxed text-amber-800">
                Your {plan.name} plan includes {plan.maxCaregivers} caregiver slots and
                both are in use. Remove someone below, or see{" "}
                <Link href="/features/membership" className="font-semibold underline">
                  Membership
                </Link>{" "}
                for upgrade options.
              </p>
            )}

            <button
              type="submit"
              disabled={busy || (role !== "clinician" && slotsFull)}
              className="min-h-[44px] w-full rounded-2xl bg-primary px-4 py-3 text-sm font-bold text-white shadow-button transition-transform duration-150 active:scale-[0.98] disabled:opacity-50"
            >
              {busy ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Adding…
                </span>
              ) : (
                "Send invite"
              )}
            </button>
            <p className="text-xs leading-relaxed text-ink-faint">
              Caregiver slots used: {Math.min(slotsUsed, plan.maxCaregivers)} of{" "}
              {plan.maxCaregivers} (doctors don&apos;t use a slot). The invited person
              simply signs in to SoleIQ with this email — access connects
              automatically.
            </p>
          </form>
        </section>

        {/* My circle */}
        <section className="mt-5 rounded-3xl border border-slate-200 bg-surface-raised p-6 shadow-card">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">
            People with access
          </p>
          {grants === null ? (
            <p className="mt-3 flex items-center gap-2 text-sm text-ink-soft">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </p>
          ) : activeGrants.length === 0 ? (
            <div className="mt-3 flex flex-col items-center py-3 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary-soft">
                <Users className="h-6 w-6 text-secondary" />
              </span>
              <p className="mt-3 max-w-md text-[15px] leading-relaxed text-ink-soft">
                Nobody has access yet. Only you (and the hospital care team that
                runs your screening program) can see your results.
              </p>
            </div>
          ) : (
            <ul className="mt-3 space-y-2">
              {activeGrants.map((grant) => (
                <li
                  key={grant.id}
                  className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-100 bg-surface-raised p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-ink">
                      {grant.email}
                    </p>
                    <p className="text-xs text-ink-faint">
                      {ROLE_META[grant.role].label} · added{" "}
                      {new Date(grant.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${STATUS_CHIP[grant.status]}`}
                  >
                    {grant.status === "invited" ? "Invited — not signed in yet" : grant.status}
                  </span>
                  <button
                    type="button"
                    onClick={() => revoke(grant)}
                    className="min-h-[44px] rounded-xl border border-red-200 px-4 py-2.5 text-xs font-bold text-urgent transition-colors hover:bg-urgent-soft"
                  >
                    Revoke
                  </button>
                </li>
              ))}
            </ul>
          )}
          {revokedGrants.length > 0 && (
            <details className="mt-3">
              <summary className="cursor-pointer text-xs font-semibold text-ink-soft">
                Revoked ({revokedGrants.length})
              </summary>
              <ul className="mt-2 space-y-1">
                {revokedGrants.map((grant) => (
                  <li key={grant.id} className="text-xs text-ink-faint">
                    {grant.email} — revoked{" "}
                    {grant.revokedAt
                      ? new Date(grant.revokedAt).toLocaleDateString()
                      : ""}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </section>

        {/* Shared with me */}
        {sharedWithMe.length > 0 && (
          <section className="mt-5 rounded-3xl border border-slate-200 bg-surface-raised p-6 shadow-card">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">
              Shared with me
            </p>
            <p className="mt-1 text-xs text-ink-faint">
              These people added you to their care circle.
            </p>
            <ul className="mt-3 space-y-2">
              {sharedWithMe.map((share) => (
                <li key={share.grantId}>
                  <Link
                    href={`/shared/${share.patientId}?role=${share.role}`}
                    className="flex min-h-[44px] items-center gap-3 rounded-2xl border border-slate-100 bg-surface-raised p-3 transition duration-150 hover:border-primary/40 hover:shadow-card"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-soft text-primary">
                      <ShieldCheck className="h-4 w-4" />
                    </span>
                    <span className="flex-1">
                      <span className="block text-sm font-bold text-ink">
                        {share.patientName}
                      </span>
                      <span className="block text-xs text-ink-faint">
                        You have {ROLE_META[share.role].label.toLowerCase()} access
                      </span>
                    </span>
                    <span className="text-sm font-bold text-primary">View →</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <p className="mt-5 text-xs leading-relaxed text-ink-faint">
          Privacy note: sharing is patient-controlled and recorded. Family and
          caregivers see the same plain-language reports you do; doctors you invite
          see the clinical version. Nothing is ever shared without an invitation
          from you.
        </p>
      </main>
    </div>
  );
}

export default function CareTeamPage() {
  return (
    <AuthGate>
      <CareTeamContent />
    </AuthGate>
  );
}
