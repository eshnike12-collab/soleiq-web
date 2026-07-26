"use client";

import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";

/**
 * Patient sharing is intentionally hospital-scoped. The former global doctor
 * directory and patient-created care assignment have been removed.
 */
export function ShareWithDoctorDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  return (
    <Dialog open={open} onClose={onClose} title="Share with your care team">
      <div className="space-y-4">
        <div className="rounded-2xl bg-blue-50 p-4">
          <ShieldCheck className="h-5 w-5 text-brand" />
          <p className="mt-2 text-sm font-semibold text-slate-900">
            Choose access, not a global doctor.
          </p>
          <p className="mt-1 text-xs leading-relaxed text-slate-600">
            See hospital care-team assignments, review expiration dates, revoke
            consent, or create a single-use QR for an active doctor at your
            hospital.
          </p>
        </div>
        <Link
          href="/access"
          onClick={onClose}
          className="inline-flex w-full items-center justify-center rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white"
        >
          Open access management
        </Link>
      </div>
    </Dialog>
  );
}
