"use client";

/**
 * "Share with doctor" — links the signed-in patient to a doctor account by
 * writing a doctor_patient_assignments row in Supabase. That row is the
 * persistent grant: RLS then lets the chosen doctor see this patient's
 * visits, results, and photos on their dashboard. Used from the patient
 * dashboard and from the post-check share dialog.
 */

import { useEffect, useState } from "react";
import { Check, Loader2, Stethoscope, X } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  listDoctors,
  listMyDoctorLinks,
  shareWithDoctor,
  unshareDoctor,
  type AssignmentRow,
  type DoctorRow,
} from "@/lib/db";
import { cn } from "@/lib/utils";

export function ShareWithDoctorDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [doctors, setDoctors] = useState<DoctorRow[] | null>(null);
  const [links, setLinks] = useState<AssignmentRow[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justShared, setJustShared] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setJustShared(null);
    setSelected(null);
    void Promise.all([listDoctors(), listMyDoctorLinks()]).then(
      ([doctorRows, linkRows]) => {
        setDoctors(doctorRows);
        setLinks(linkRows);
      }
    );
  }, [open]);

  const linkedIds = new Set(links.map((link) => link.doctor_id));
  const doctorLabel = (doctor: DoctorRow) =>
    doctor.full_name || doctor.email || "Doctor";

  const share = async () => {
    if (!selected) return;
    setBusy(true);
    setError(null);
    try {
      await shareWithDoctor(selected);
      setLinks(await listMyDoctorLinks());
      const doctor = doctors?.find((d) => d.id === selected);
      setJustShared(doctor ? doctorLabel(doctor) : "your doctor");
      setSelected(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sharing failed.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (assignmentId: string) => {
    setBusy(true);
    setError(null);
    try {
      await unshareDoctor(assignmentId);
      setLinks((rows) => rows.filter((row) => row.id !== assignmentId));
      setJustShared(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't remove access.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title="Share with your doctor">
      {justShared && (
        <div className="mb-3 flex items-start gap-2 rounded-2xl bg-teal-50 p-3 text-sm text-teal-800">
          <Check className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            <span className="font-semibold">{justShared}</span> can now see your
            saved checks on their dashboard — including future ones, until you
            remove access here.
          </p>
        </div>
      )}

      {doctors === null ? (
        <div className="flex items-center gap-2 py-6 text-sm text-warmGray-600">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading doctors…
        </div>
      ) : doctors.length === 0 ? (
        <p className="py-4 text-sm text-warmGray-600">
          No doctors are registered in SoleIQ yet. Ask your clinic to create a
          doctor account, or use the email option instead.
        </p>
      ) : (
        <>
          <p className="mb-2 text-xs text-warmGray-600">
            Pick your doctor. They&apos;ll see your saved checks in their SoleIQ
            dashboard.
          </p>
          <div className="max-h-56 space-y-1.5 overflow-y-auto">
            {doctors.map((doctor) => {
              const linked = linkedIds.has(doctor.id);
              const link = links.find((row) => row.doctor_id === doctor.id);
              return (
                <div
                  key={doctor.id}
                  className={cn(
                    "flex items-center gap-2.5 rounded-2xl border p-3",
                    linked
                      ? "border-teal-100 bg-teal-50"
                      : selected === doctor.id
                        ? "border-brand bg-blue-50"
                        : "border-warmGray-100 bg-white"
                  )}
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-brand">
                    <Stethoscope className="h-4 w-4" />
                  </span>
                  <button
                    type="button"
                    disabled={linked || busy}
                    onClick={() => setSelected(doctor.id)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <span className="block truncate text-sm font-semibold text-warmGray-800">
                      {doctorLabel(doctor)}
                    </span>
                    {doctor.full_name && doctor.email && (
                      <span className="block truncate text-[11px] text-warmGray-600">
                        {doctor.email}
                      </span>
                    )}
                  </button>
                  {linked ? (
                    <span className="flex items-center gap-1.5">
                      <span className="text-[11px] font-semibold text-teal-800">Sharing</span>
                      {link && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void remove(link.id)}
                          aria-label={`Stop sharing with ${doctorLabel(doctor)}`}
                          className="rounded-full p-1 text-warmGray-600 hover:text-risk-high"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </span>
                  ) : (
                    <span
                      className={cn(
                        "h-4 w-4 shrink-0 rounded-full border-2",
                        selected === doctor.id
                          ? "border-brand bg-brand"
                          : "border-warmGray-100"
                      )}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {error && <p className="mt-2 text-xs text-risk-medium">{error}</p>}

          <Button
            fullWidth
            className="mt-3"
            disabled={!selected || busy}
            onClick={() => void share()}
          >
            {busy ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sharing…
              </>
            ) : (
              "Share my results"
            )}
          </Button>
        </>
      )}

      <p className="mt-3 text-[10px] italic text-warmGray-600">
        Sharing gives this doctor ongoing access to your saved foot checks. You
        can stop sharing at any time from this screen.
      </p>
    </Dialog>
  );
}
