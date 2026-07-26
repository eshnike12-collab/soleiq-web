"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

async function apiMutation(url: string, method: string, body: unknown) {
  const response = await fetch(url, {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.ok) {
    throw new Error(payload?.error?.message ?? "The change could not be saved.");
  }
  return payload.data;
}

const inputClass =
  "h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-brand";

export function InviteStaffForm({ hospitalSlug }: { hospitalSlug: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "doctor" | "patient">("doctor");
  const [phiAccess, setPhiAccess] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <form
      className="rounded-2xl border border-slate-200 bg-white p-5"
      onSubmit={async (event) => {
        event.preventDefault();
        setBusy(true);
        setMessage(null);
        try {
          const result = await apiMutation(
            `/api/h/${hospitalSlug}/admin/invitations`,
            "POST",
            {
              email,
              role,
              permissions:
                role === "admin"
                  ? { hospital_admin: true, phi_access: phiAccess }
                  : {},
              expiresInHours: 72,
            }
          );
          const path = `/invite/${result.invitation_token}`;
          setInviteUrl(`${window.location.origin}${path}`);
          setEmail("");
          setMessage(
            role === "doctor"
              ? "Invitation created. The doctor remains inactive until you verify them."
              : "Invitation created."
          );
          router.refresh();
        } catch (error) {
          setMessage(error instanceof Error ? error.message : "Invitation failed.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <h3 className="font-semibold text-slate-950">Create hospital invitation</h3>
      <p className="mt-1 text-xs text-slate-500">
        The link expires in 72 hours and can be used once. The selected role is
        supplied by this invitation, never by browser signup.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_150px_auto]">
        <input
          className={inputClass}
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="staff@hospital.org"
          required
        />
        <select
          className={inputClass}
          value={role}
          onChange={(event) => setRole(event.target.value as typeof role)}
        >
          <option value="doctor">Doctor</option>
          <option value="admin">Administrator</option>
          <option value="patient">Patient</option>
        </select>
        <button
          className="h-10 rounded-xl bg-brand px-4 text-sm font-semibold text-white disabled:opacity-50"
          disabled={busy}
        >
          {busy ? "Creating…" : "Create invite"}
        </button>
      </div>
      {role === "admin" && (
        <label className="mt-3 flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={phiAccess}
            onChange={(event) => setPhiAccess(event.target.checked)}
          />
          Explicit clinical-data (PHI) access
        </label>
      )}
      {message && <p className="mt-3 text-xs text-slate-600">{message}</p>}
      {inviteUrl && (
        <div className="mt-3 rounded-xl bg-blue-50 p-3">
          <p className="text-xs font-semibold text-brand">Copy this link now</p>
          <p className="mt-1 break-all font-mono text-xs text-slate-700">
            {inviteUrl}
          </p>
        </div>
      )}
    </form>
  );
}

export function VerifyMembershipButton({
  hospitalSlug,
  membershipId,
}: {
  hospitalSlug: string;
  membershipId: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await apiMutation(
            `/api/h/${hospitalSlug}/admin/memberships/${membershipId}`,
            "PATCH",
            { status: "active", permissions: { doctor_verified: true } }
          );
          router.refresh();
        } finally {
          setBusy(false);
        }
      }}
      className="text-xs font-semibold text-brand disabled:opacity-50"
    >
      {busy ? "Activating…" : "Verify & activate"}
    </button>
  );
}

export function EnrollPatientForm({
  hospitalSlug,
  facilities,
  phiAccess,
}: {
  hospitalSlug: string;
  facilities: { id: string; name: string }[];
  phiAccess: boolean;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  if (!phiAccess) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        Patient enrollment handles direct identifiers and requires the explicit
        PHI access permission. Your hospital-administration access remains
        available without clinical access.
      </div>
    );
  }
  return (
    <form
      className="rounded-2xl border border-slate-200 bg-white p-5"
      onSubmit={async (event) => {
        event.preventDefault();
        setBusy(true);
        setMessage(null);
        // React nulls event.currentTarget after the await; keep the element.
        const formElement = event.currentTarget;
        const form = new FormData(formElement);
        try {
          await apiMutation(`/api/h/${hospitalSlug}/admin/enrollments`, "POST", {
            fullName: form.get("fullName"),
            dateOfBirth: form.get("dateOfBirth") || null,
            sex: form.get("sex") || null,
            mrn: form.get("mrn"),
            facilityId: form.get("facilityId") || null,
          });
          formElement.reset();
          setMessage("Patient enrolled. Send a patient invitation to link an account.");
          router.refresh();
        } catch (error) {
          setMessage(error instanceof Error ? error.message : "Enrollment failed.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <h3 className="font-semibold text-slate-950">Enroll patient</h3>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <input className={inputClass} name="fullName" placeholder="Full name" required />
        <input className={inputClass} name="dateOfBirth" type="date" />
        <input className={inputClass} name="sex" placeholder="Sex" />
        <input className={inputClass} name="mrn" placeholder="Hospital ID / MRN" required />
        <select className={inputClass} name="facilityId">
          <option value="">No facility</option>
          {facilities.map((facility) => (
            <option key={facility.id} value={facility.id}>
              {facility.name}
            </option>
          ))}
        </select>
      </div>
      <button
        disabled={busy}
        className="mt-3 h-10 rounded-xl bg-brand px-4 text-sm font-semibold text-white disabled:opacity-50"
      >
        {busy ? "Enrolling…" : "Enroll patient"}
      </button>
      {message && <p className="mt-2 text-xs text-slate-600">{message}</p>}
    </form>
  );
}

export function AssignmentForm({
  hospitalSlug,
  patients,
  doctors,
}: {
  hospitalSlug: string;
  patients: { id: string; label: string }[];
  doctors: { id: string; label: string }[];
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  return (
    <form
      className="rounded-2xl border border-slate-200 bg-white p-5"
      onSubmit={async (event) => {
        event.preventDefault();
        // React nulls event.currentTarget after the await; keep the element.
        const formElement = event.currentTarget;
        const form = new FormData(formElement);
        try {
          await apiMutation(`/api/h/${hospitalSlug}/admin/assignments`, "POST", {
            organizationPatientId: form.get("patient"),
            clinicianMembershipId: form.get("doctor"),
            relationship: form.get("relationship"),
            reason: form.get("reason"),
          });
          formElement.reset();
          setMessage("Care-team assignment created.");
          router.refresh();
        } catch (error) {
          setMessage(error instanceof Error ? error.message : "Assignment failed.");
        }
      }}
    >
      <h3 className="font-semibold text-slate-950">Create assignment</h3>
      <div className="mt-4 grid gap-3 md:grid-cols-4">
        <select className={inputClass} name="doctor" required>
          <option value="">Select doctor</option>
          {doctors.map((doctor) => (
            <option key={doctor.id} value={doctor.id}>{doctor.label}</option>
          ))}
        </select>
        <select className={inputClass} name="patient" required>
          <option value="">Select patient</option>
          {patients.map((patient) => (
            <option key={patient.id} value={patient.id}>{patient.label}</option>
          ))}
        </select>
        <select className={inputClass} name="relationship" defaultValue="primary">
          <option value="primary">Primary</option>
          <option value="consulting">Consulting</option>
          <option value="covering">Covering</option>
          <option value="referred">Referred</option>
        </select>
        <input className={inputClass} name="reason" placeholder="Reason" />
      </div>
      <button className="mt-3 h-10 rounded-xl bg-brand px-4 text-sm font-semibold text-white">
        Assign doctor
      </button>
      {message && <p className="mt-2 text-xs text-slate-600">{message}</p>}
    </form>
  );
}

