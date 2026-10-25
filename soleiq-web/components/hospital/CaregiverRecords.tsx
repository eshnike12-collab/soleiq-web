"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { Loader2, Plus, Send, UserPlus, X } from "lucide-react";
import type { CaregiverRecord } from "@/server/patientClaim";

/**
 * Records this caregiver created or was granted, with the handover controls.
 *
 * "Unclaimed" is stated on every row that is one, in words rather than as a
 * colour, because it changes what the record IS: nobody has yet agreed that
 * this is their medical history. The create form sits above the list so the
 * action and its result are in the same place.
 */
export function CaregiverRecords({
  slug,
  initial,
  caregiverName,
}: {
  slug: string;
  initial: CaregiverRecord[];
  caregiverName: string;
}) {
  const [records, setRecords] = useState(initial);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const refresh = async () => {
    // The list is server-rendered; a full reload is the honest way to pick up
    // a change rather than patching local state and hoping it matches.
    window.location.reload();
  };

  const createRecord = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy("create");
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(`/api/h/${slug}/caregiver-records`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          fullName: String(form.get("fullName") ?? ""),
          dateOfBirth: String(form.get("dateOfBirth") ?? "") || null,
          contactEmail: String(form.get("contactEmail") ?? "") || null,
        }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        setError(body?.error ?? "The record could not be created.");
        return;
      }
      setNotice("Record created. It is unclaimed until the patient takes control.");
      await refresh();
    } finally {
      setBusy(null);
    }
  };

  const invite = async (record: CaregiverRecord, email: string) => {
    setBusy(record.patientId);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(`/api/h/${slug}/caregiver-records/invite`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          patientId: record.patientId,
          email,
          caregiverName,
        }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        setError(body?.error ?? "The invitation could not be sent.");
        return;
      }
      setNotice(
        body?.emailSent
          ? `Invitation sent to ${email}.`
          : `Invitation created, but the email did not go out (${body?.emailFailure ?? "unknown"}). You can resend it.`
      );
      await refresh();
    } finally {
      setBusy(null);
    }
  };

  const cancel = async (record: CaregiverRecord) => {
    if (!record.invitation) return;
    setBusy(record.patientId);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(`/api/h/${slug}/caregiver-records/cancel`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ invitationId: record.invitation.id }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setError(body?.error ?? "The invitation could not be cancelled.");
        return;
      }
      setNotice("Invitation cancelled. That link no longer works.");
      await refresh();
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="mb-5 rounded-2xl border border-slate-200 bg-surface-raised p-5 shadow-card">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold">Records I look after</h3>
          <p className="mt-0.5 text-xs text-slate-500">
            Records you created or were given access to. You can run checks on an
            unclaimed record and invite the patient to take it over.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-xl bg-primary px-3.5 text-sm font-bold text-white transition-transform duration-150 active:scale-[0.97]"
        >
          <Plus className="h-4 w-4" /> Create a patient record
        </button>
      </div>

      {open && (
        <form
          onSubmit={createRecord}
          className="mt-4 grid gap-3 rounded-xl border border-slate-200 bg-surface-sunken p-4 sm:grid-cols-[1fr_160px_1fr_auto]"
        >
          <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
            Full name
            <input
              name="fullName"
              required
              maxLength={160}
              className="h-11 rounded-xl border border-slate-200 bg-surface-raised px-3 text-[15px] text-ink outline-none focus:border-primary focus:ring-4 focus:ring-primary-soft"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
            Date of birth
            <input
              name="dateOfBirth"
              type="date"
              className="h-11 rounded-xl border border-slate-200 bg-surface-raised px-3 text-[15px] text-ink outline-none focus:border-primary focus:ring-4 focus:ring-primary-soft"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
            Their email (optional)
            <input
              name="contactEmail"
              type="email"
              maxLength={254}
              placeholder="So you can invite them later"
              className="h-11 rounded-xl border border-slate-200 bg-surface-raised px-3 text-[15px] text-ink outline-none placeholder:text-ink-faint focus:border-primary focus:ring-4 focus:ring-primary-soft"
            />
          </label>
          <button
            type="submit"
            disabled={busy === "create"}
            className="h-11 self-end rounded-xl bg-primary px-4 text-sm font-bold text-white disabled:opacity-50"
          >
            {busy === "create" ? (
              <Loader2 className="mx-auto h-4 w-4 animate-spin" />
            ) : (
              "Create"
            )}
          </button>
        </form>
      )}

      {error && (
        <p className="mt-3 rounded-xl bg-urgent-soft px-3 py-2 text-sm text-urgent">
          {error}
        </p>
      )}
      {notice && (
        <p className="mt-3 rounded-xl bg-secondary-soft px-3 py-2 text-sm text-secondary">
          {notice}
        </p>
      )}

      {records.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">
          No records yet. Create one to start a check on someone&apos;s behalf.
        </p>
      ) : (
        <div className="mt-4 divide-y divide-slate-100">
          {records.map((record) => (
            <RecordRow
              key={record.patientId}
              slug={slug}
              record={record}
              busy={busy === record.patientId}
              onInvite={(email) => void invite(record, email)}
              onCancel={() => void cancel(record)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function RecordRow({
  slug,
  record,
  busy,
  onInvite,
  onCancel,
}: {
  slug: string;
  record: CaregiverRecord;
  busy: boolean;
  onInvite: (email: string) => void;
  onCancel: () => void;
}) {
  const [email, setEmail] = useState(record.contactEmail ?? "");
  const [showInvite, setShowInvite] = useState(false);

  return (
    <div className="py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium text-ink">{record.fullName || "Unnamed record"}</p>
            {/* Stated in words. A record nobody has claimed is a different
                kind of thing from one its patient owns, and a tint alone does
                not say that. */}
            {record.unclaimed ? (
              <span className="rounded-full bg-warn-soft px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-warn">
                Unclaimed
              </span>
            ) : (
              <span className="rounded-full bg-secondary-soft px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-secondary">
                Patient owns this
              </span>
            )}
            {record.createdByMe && (
              <span className="text-[11px] text-slate-500">created by you</span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-slate-500">
            {record.dateOfBirth ? `Born ${record.dateOfBirth} · ` : ""}
            {record.reportCount === 1 ? "1 check" : `${record.reportCount} checks`}
            {record.invitation
              ? record.invitation.expired
                ? ` · invitation to ${record.invitation.invitedEmail} has expired`
                : ` · invitation sent to ${record.invitation.invitedEmail}`
              : ""}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {record.organizationPatientId && (
            <Link
              href={`/h/${slug}/patients/${record.organizationPatientId}`}
              className="inline-flex min-h-[40px] items-center rounded-xl border border-slate-200 px-3 text-sm font-semibold text-brand"
            >
              Open record
            </Link>
          )}
          {/* Only an unclaimed record can be handed over. Once the patient
              owns it there is nothing to invite them to. */}
          {record.unclaimed && (
            <>
              <button
                type="button"
                onClick={() => setShowInvite((value) => !value)}
                disabled={busy}
                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-primary px-3 text-sm font-bold text-white disabled:opacity-50"
              >
                {record.invitation ? (
                  <>
                    <Send className="h-3.5 w-3.5" /> Resend invitation
                  </>
                ) : (
                  <>
                    <UserPlus className="h-3.5 w-3.5" /> Invite to take control
                  </>
                )}
              </button>
              {record.invitation && (
                <button
                  type="button"
                  onClick={onCancel}
                  disabled={busy}
                  className="inline-flex min-h-[40px] items-center gap-1 rounded-xl border border-slate-200 px-3 text-sm font-semibold text-ink-soft disabled:opacity-50"
                >
                  <X className="h-3.5 w-3.5" /> Cancel
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {showInvite && record.unclaimed && (
        <form
          className="mt-3 flex flex-wrap items-end gap-2 rounded-xl border border-slate-200 bg-surface-sunken p-3"
          onSubmit={(event) => {
            event.preventDefault();
            onInvite(email.trim());
            setShowInvite(false);
          }}
        >
          <label className="flex min-w-[240px] flex-1 flex-col gap-1 text-xs font-semibold text-slate-600">
            Their email address
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="h-11 rounded-xl border border-slate-200 bg-surface-raised px-3 text-[15px] text-ink outline-none focus:border-primary focus:ring-4 focus:ring-primary-soft"
            />
          </label>
          <button
            type="submit"
            disabled={busy}
            className="h-11 rounded-xl bg-primary px-4 text-sm font-bold text-white disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send invitation"}
          </button>
          <p className="w-full text-[11px] leading-snug text-slate-500">
            {/* Said here because it is the moment the caregiver gives something
                up, and they should know that before they click. */}
            They will be able to see everything in this record and to remove your
            access once it is theirs. Resending replaces any earlier link.
          </p>
        </form>
      )}
    </div>
  );
}
