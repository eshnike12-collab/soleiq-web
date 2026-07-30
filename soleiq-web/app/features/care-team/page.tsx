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
  invited: "bg-amber-50 text-amber-700",
  active: "bg-teal-50 text-teal-700",
  revoked: "bg-slate-100 text-slate-500",
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
        `Invitation added for ${email.trim().toLowerCase()}. Access starts the first time they sign in to SoleIQ with that email.`
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
    <div className="min-h-screen bg-[#f4f6f8] px-5 py-8 pb-24">
      <main className="mx-auto max-w-3xl">
        <Link href="/features" className="text-sm font-semibold text-brand">
          ← Features
        </Link>
        <h1 className="mt-3 text-3xl font-semibold text-slate-950">Care Team</h1>
        <p className="mt-1 text-sm text-slate-500">
          Choose who can see your foot-check results. Access is enforced by the
          database itself — revoking someone cuts them off immediately.
        </p>

        {(error || notice) && (
          <div
            className={`mt-4 rounded-2xl border p-4 text-sm ${
              error
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-teal-200 bg-teal-50 text-teal-800"
            }`}
          >
            {error ?? notice}
          </div>
        )}

        {/* Invite */}
        <section className="mt-5 rounded-3xl border border-slate-200 bg-white p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">
            Invite someone
          </p>
          <form onSubmit={invite} className="mt-3 space-y-3">
            <label className="block">
              <span className="text-xs font-medium text-slate-600">Their email</span>
              <div className="mt-1 flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2.5">
                <Mail className="h-4 w-4 shrink-0 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                />
              </div>
            </label>
            <div>
              <span className="text-xs font-medium text-slate-600">Their role</span>
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
                      className={`rounded-2xl border p-3 text-left transition ${
                        selected
                          ? "border-brand bg-blue-50"
                          : "border-slate-200 bg-white"
                      }`}
                    >
                      <Icon
                        className={`h-4 w-4 ${selected ? "text-brand" : "text-slate-400"}`}
                      />
                      <span className="mt-1 block text-sm font-semibold text-slate-900">
                        {meta.label}
                      </span>
                      <span className="mt-0.5 block text-[11px] leading-snug text-slate-500">
                        {meta.blurb}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {role !== "clinician" && slotsFull && (
              <p className="rounded-2xl bg-amber-50 p-3 text-xs text-amber-800">
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
              className="w-full rounded-2xl bg-brand px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
            >
              {busy ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Adding…
                </span>
              ) : (
                "Send invite"
              )}
            </button>
            <p className="text-[11px] text-slate-500">
              Caregiver slots used: {Math.min(slotsUsed, plan.maxCaregivers)} of{" "}
              {plan.maxCaregivers} (doctors don&apos;t use a slot). The invited person
              simply signs in to SoleIQ with this email — access connects
              automatically.
            </p>
          </form>
        </section>

        {/* My circle */}
        <section className="mt-5 rounded-3xl border border-slate-200 bg-white p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">
            People with access
          </p>
          {grants === null ? (
            <p className="mt-3 flex items-center gap-2 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </p>
          ) : activeGrants.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">
              Nobody has access yet. Only you (and the hospital care team that runs
              your screening program) can see your results.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {activeGrants.map((grant) => (
                <li
                  key={grant.id}
                  className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-100 p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {grant.email}
                    </p>
                    <p className="text-xs text-slate-500">
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
                    className="rounded-xl border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600"
                  >
                    Revoke
                  </button>
                </li>
              ))}
            </ul>
          )}
          {revokedGrants.length > 0 && (
            <details className="mt-3">
              <summary className="cursor-pointer text-xs font-medium text-slate-500">
                Revoked ({revokedGrants.length})
              </summary>
              <ul className="mt-2 space-y-1">
                {revokedGrants.map((grant) => (
                  <li key={grant.id} className="text-xs text-slate-500">
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
          <section className="mt-5 rounded-3xl border border-slate-200 bg-white p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">
              Shared with me
            </p>
            <p className="mt-1 text-xs text-slate-500">
              These people added you to their care circle.
            </p>
            <ul className="mt-3 space-y-2">
              {sharedWithMe.map((share) => (
                <li key={share.grantId}>
                  <Link
                    href={`/shared/${share.patientId}?role=${share.role}`}
                    className="flex items-center gap-3 rounded-2xl border border-slate-100 p-3"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-brand">
                      <ShieldCheck className="h-4 w-4" />
                    </span>
                    <span className="flex-1">
                      <span className="block text-sm font-semibold text-slate-900">
                        {share.patientName}
                      </span>
                      <span className="block text-xs text-slate-500">
                        You have {ROLE_META[share.role].label.toLowerCase()} access
                      </span>
                    </span>
                    <span className="text-sm font-semibold text-brand">View →</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <p className="mt-5 text-[11px] leading-relaxed text-slate-500">
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
