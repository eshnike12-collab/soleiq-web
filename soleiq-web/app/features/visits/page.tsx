"use client";

/**
 * Visits — the patient's clinical-visit log. Upcoming scheduled visits first
 * (soonest first), everything else below (newest first), with an inline
 * add-a-visit form and quick status actions.
 */

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronDown, Loader2, Plus, Trash2 } from "lucide-react";
import { AuthGate } from "@/components/auth/AuthGate";
import { PatientNav } from "@/components/patient/PatientNav";
import {
  addVisit,
  deleteVisit,
  listMyVisits,
  setVisitStatus,
  type CareVisit,
  type VisitStatus,
} from "@/lib/careVisits";

const statusChip: Record<VisitStatus, string> = {
  scheduled: "bg-blue-50 text-blue-800",
  completed: "bg-emerald-50 text-emerald-800",
  cancelled: "bg-slate-100 text-slate-500",
};

function VisitCard({
  visit,
  onStatus,
  onDelete,
  busy,
}: {
  visit: CareVisit;
  onStatus: (id: string, status: VisitStatus) => void;
  onDelete: (id: string) => void;
  busy: boolean;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-slate-950">{visit.title}</p>
          <p className="mt-0.5 text-xs text-slate-500">
            {new Date(visit.scheduledAt).toLocaleString()}
            {visit.location ? ` · ${visit.location}` : ""}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ${statusChip[visit.status]}`}
        >
          {visit.status}
        </span>
      </div>
      {visit.notes && (
        <p className="mt-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-relaxed text-slate-700">
          {visit.notes}
        </p>
      )}
      <div className="mt-4 flex items-center gap-2">
        {visit.status === "scheduled" && (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={() => onStatus(visit.id, "completed")}
              className="rounded-full bg-brand px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
            >
              Mark completed
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => onStatus(visit.id, "cancelled")}
              className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 disabled:opacity-50"
            >
              Cancel
            </button>
          </>
        )}
        <button
          type="button"
          disabled={busy}
          onClick={() => onDelete(visit.id)}
          className="ml-auto inline-flex items-center gap-1 rounded-full px-2 py-1.5 text-xs font-semibold text-slate-400 hover:text-red-600 disabled:opacity-50"
          aria-label="Delete visit"
        >
          <Trash2 className="h-3.5 w-3.5" /> Delete
        </button>
      </div>
    </div>
  );
}

function VisitsContent() {
  const [visits, setVisits] = useState<CareVisit[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [when, setWhen] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    try {
      const rows = await listMyVisits();
      setVisits(rows);
      setLoadFailed(false);
    } catch {
      setVisits([]);
      setLoadFailed(true);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const now = Date.now();
  const upcoming = (visits ?? [])
    .filter(
      (visit) =>
        visit.status === "scheduled" && Date.parse(visit.scheduledAt) >= now
    )
    .sort((a, b) => Date.parse(a.scheduledAt) - Date.parse(b.scheduledAt));
  const past = (visits ?? [])
    .filter(
      (visit) =>
        !(visit.status === "scheduled" && Date.parse(visit.scheduledAt) >= now)
    )
    .sort((a, b) => Date.parse(b.scheduledAt) - Date.parse(a.scheduledAt));

  async function handleAdd(event: FormEvent) {
    event.preventDefault();
    if (!title.trim() || !when) return;
    setSaving(true);
    setFormError(null);
    try {
      const result = await addVisit({
        title,
        scheduledAt: new Date(when).toISOString(),
        location: location || undefined,
        notes: notes || undefined,
      });
      if (!result.ok) {
        setFormError(result.reason);
        return;
      }
      setTitle("");
      setWhen("");
      setLocation("");
      setNotes("");
      setFormOpen(false);
      await reload();
    } catch {
      setFormError("The visit could not be saved. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleStatus(id: string, status: VisitStatus) {
    setBusy(true);
    try {
      await setVisitStatus(id, status);
      await reload();
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Delete this visit? This cannot be undone.")) return;
    setBusy(true);
    try {
      await deleteVisit(id);
      await reload();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f4f6f8] px-5 py-8 pb-24">
      <main className="mx-auto max-w-3xl">
        <Link
          href="/features"
          className="inline-flex items-center gap-1 text-sm font-semibold text-brand"
        >
          <ArrowLeft className="h-4 w-4" /> Features
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-slate-950">Visits</h1>

        <div className="mt-4 rounded-3xl border border-slate-200 bg-white p-6">
          <button
            type="button"
            onClick={() => setFormOpen((open) => !open)}
            className="flex w-full items-center justify-between text-left"
          >
            <span className="inline-flex items-center gap-2 font-semibold text-slate-950">
              <Plus className="h-4 w-4 text-brand" /> Add a visit
            </span>
            <ChevronDown
              className={`h-4 w-4 text-slate-400 transition-transform ${formOpen ? "rotate-180" : ""}`}
            />
          </button>
          {formOpen && (
            <form onSubmit={handleAdd} className="mt-4 space-y-3">
              <label className="block text-xs font-semibold text-slate-500">
                Title <span className="text-red-500">*</span>
                <input
                  required
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="e.g. Podiatrist follow-up"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-normal text-slate-900 focus:border-brand focus:outline-none"
                />
              </label>
              <label className="block text-xs font-semibold text-slate-500">
                Date &amp; time <span className="text-red-500">*</span>
                <input
                  required
                  type="datetime-local"
                  value={when}
                  onChange={(event) => setWhen(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-normal text-slate-900 focus:border-brand focus:outline-none"
                />
              </label>
              <label className="block text-xs font-semibold text-slate-500">
                Location
                <input
                  value={location}
                  onChange={(event) => setLocation(event.target.value)}
                  placeholder="Clinic or hospital name"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-normal text-slate-900 focus:border-brand focus:outline-none"
                />
              </label>
              <label className="block text-xs font-semibold text-slate-500">
                Notes
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={3}
                  placeholder="Anything to remember for this visit"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-normal text-slate-900 focus:border-brand focus:outline-none"
                />
              </label>
              {formError && (
                <p className="rounded-2xl bg-red-50 px-4 py-3 text-xs leading-relaxed text-red-800">
                  {formError}
                </p>
              )}
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Save visit
              </button>
            </form>
          )}
        </div>

        {visits === null ? (
          <div className="mt-4 space-y-3">
            <div className="h-28 animate-pulse rounded-3xl border border-slate-200 bg-white" />
            <div className="h-28 animate-pulse rounded-3xl border border-slate-200 bg-white" />
          </div>
        ) : loadFailed ? (
          <p className="mt-4 rounded-3xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
            Visits will appear here once your database is up to date.
          </p>
        ) : (
          <>
            <section className="mt-6">
              <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">
                Upcoming
              </h2>
              {upcoming.length === 0 ? (
                <p className="mt-2 rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
                  No upcoming visits scheduled.
                </p>
              ) : (
                <div className="mt-2 space-y-3">
                  {upcoming.map((visit) => (
                    <VisitCard
                      key={visit.id}
                      visit={visit}
                      onStatus={handleStatus}
                      onDelete={handleDelete}
                      busy={busy}
                    />
                  ))}
                </div>
              )}
            </section>
            <section className="mt-6">
              <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">
                Past &amp; other
              </h2>
              {past.length === 0 ? (
                <p className="mt-2 rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
                  Past and cancelled visits will appear here.
                </p>
              ) : (
                <div className="mt-2 space-y-3">
                  {past.map((visit) => (
                    <VisitCard
                      key={visit.id}
                      visit={visit}
                      onStatus={handleStatus}
                      onDelete={handleDelete}
                      busy={busy}
                    />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>
      <PatientNav active="features" />
    </div>
  );
}

export default function VisitsPage() {
  return (
    <AuthGate>
      <VisitsContent />
    </AuthGate>
  );
}
