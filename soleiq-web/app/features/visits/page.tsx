"use client";

/**
 * Visits — the patient's clinical-visit log. Upcoming scheduled visits first
 * (soonest first), everything else below (newest first), with an inline
 * add-a-visit form and quick status actions.
 */

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  ChevronDown,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
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
  scheduled: "bg-primary-soft text-primary",
  completed: "bg-secondary-soft text-teal-800",
  cancelled: "bg-slate-100 text-slate-600",
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
    <div className="rounded-3xl border border-slate-200 bg-surface-raised p-6 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-bold text-ink">{visit.title}</p>
          <p className="mt-0.5 text-xs text-ink-faint">
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
        <p className="mt-3 rounded-2xl bg-surface-sunken px-4 py-3 text-[15px] leading-relaxed text-ink">
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
              className="min-h-[44px] rounded-full bg-primary px-4 py-2.5 text-xs font-bold text-white shadow-button transition-transform duration-150 active:scale-[0.98] disabled:opacity-50"
            >
              Mark completed
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => onStatus(visit.id, "cancelled")}
              className="min-h-[44px] rounded-full border border-slate-200 bg-surface-raised px-4 py-2.5 text-xs font-semibold text-ink-soft transition-colors hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>
          </>
        )}
        <button
          type="button"
          disabled={busy}
          onClick={() => onDelete(visit.id)}
          className="ml-auto inline-flex min-h-[44px] items-center gap-1 rounded-full px-3 py-2.5 text-xs font-semibold text-ink-faint transition-colors hover:text-urgent disabled:opacity-50"
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
    <div className="min-h-screen px-5 py-8 pb-24">
      <main className="mx-auto max-w-3xl">
        <Link
          href="/features"
          className="inline-flex min-h-[44px] items-center gap-1 py-2 text-sm font-semibold text-primary transition-colors hover:text-primary-deep"
        >
          <ArrowLeft className="h-4 w-4" /> Features
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-ink">Visits</h1>

        <div className="mt-4 rounded-3xl border border-slate-200 bg-surface-raised p-6 shadow-card">
          <button
            type="button"
            onClick={() => setFormOpen((open) => !open)}
            className="flex min-h-[44px] w-full items-center justify-between text-left"
          >
            <span className="inline-flex items-center gap-2 font-bold text-ink">
              <Plus className="h-4 w-4 text-primary" /> Add a visit
            </span>
            <ChevronDown
              className={`h-4 w-4 text-ink-faint transition-transform ${formOpen ? "rotate-180" : ""}`}
            />
          </button>
          {formOpen && (
            <form onSubmit={handleAdd} className="mt-4 space-y-3">
              <label className="block text-xs font-semibold text-ink-soft">
                Title <span className="text-urgent">*</span>
                <input
                  required
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="e.g. Podiatrist follow-up"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-surface-raised px-3 py-2.5 text-sm font-normal text-ink placeholder:text-ink-faint focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary-soft"
                />
              </label>
              <label className="block text-xs font-semibold text-ink-soft">
                Date &amp; time <span className="text-urgent">*</span>
                <input
                  required
                  type="datetime-local"
                  value={when}
                  onChange={(event) => setWhen(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-surface-raised px-3 py-2.5 text-sm font-normal text-ink placeholder:text-ink-faint focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary-soft"
                />
              </label>
              <label className="block text-xs font-semibold text-ink-soft">
                Location
                <input
                  value={location}
                  onChange={(event) => setLocation(event.target.value)}
                  placeholder="Clinic or hospital name"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-surface-raised px-3 py-2.5 text-sm font-normal text-ink placeholder:text-ink-faint focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary-soft"
                />
              </label>
              <label className="block text-xs font-semibold text-ink-soft">
                Notes
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={3}
                  placeholder="Anything to remember for this visit"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-surface-raised px-3 py-2.5 text-sm font-normal text-ink placeholder:text-ink-faint focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary-soft"
                />
              </label>
              {formError && (
                <p className="rounded-2xl bg-urgent-soft px-4 py-3 text-[13px] leading-relaxed text-red-800">
                  {formError}
                </p>
              )}
              <button
                type="submit"
                disabled={saving}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-bold text-white shadow-button transition-transform duration-150 active:scale-[0.98] disabled:opacity-50"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Save visit
              </button>
            </form>
          )}
        </div>

        {visits === null ? (
          <div className="mt-4 space-y-3">
            <div className="h-28 animate-pulse rounded-3xl border border-slate-200 bg-surface-raised" />
            <div className="h-28 animate-pulse rounded-3xl border border-slate-200 bg-surface-raised" />
          </div>
        ) : loadFailed ? (
          <p className="mt-4 rounded-3xl border border-slate-200 bg-surface-raised p-6 text-center text-[15px] text-ink-soft shadow-card">
            Visits will appear here once your database is up to date.
          </p>
        ) : (
          <>
            <section className="mt-6">
              <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-primary">
                Upcoming
              </h2>
              {upcoming.length === 0 ? (
                <div className="mt-2 flex flex-col items-center rounded-3xl border border-slate-200 bg-surface-raised p-6 text-center shadow-card">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-soft">
                    <CalendarDays className="h-6 w-6 text-primary" />
                  </span>
                  <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">
                    No visits yet — appointments you add will show up here.
                  </p>
                </div>
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
              <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-primary">
                Past &amp; other
              </h2>
              {past.length === 0 ? (
                <p className="mt-2 rounded-3xl border border-slate-200 bg-surface-raised p-6 text-[15px] text-ink-soft shadow-card">
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
