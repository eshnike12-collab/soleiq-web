"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import {
  listPatients,
  listVisits,
  type PatientListRow,
  type VisitListRow,
} from "@/lib/db";
import { SignOutButton } from "@/components/auth/SignOutButton";

const fmt = (ts: string | null) =>
  ts ? new Date(ts).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "—";

const RISK_COLOR: Record<string, string> = {
  low: "bg-risk-low",
  medium: "bg-risk-medium",
  high: "bg-risk-high",
};

export default function DashboardPage() {
  const { profile } = useAuth();
  const [patients, setPatients] = useState<PatientListRow[]>([]);
  const [visits, setVisits] = useState<VisitListRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([listPatients(), listVisits()]).then(([p, v]) => {
      setPatients(p);
      setVisits(v);
      setLoading(false);
    });
  }, []);

  return (
    <div className="min-h-screen bg-warmGray-50/40">
      <header className="border-b border-warmGray-100 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <Link href="/" className="text-xs text-warmGray-600 hover:text-brand">
              ← Patient app
            </Link>
            <h1 className="mt-0.5 text-xl font-semibold text-warmGray-800">
              Clinic dashboard
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-warmGray-600">
              {profile?.email} · {profile?.role}
            </span>
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-8 px-6 py-8">
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-warmGray-600">
            Recent visits
          </h2>
          {loading ? (
            <p className="text-sm text-warmGray-600">Loading…</p>
          ) : visits.length === 0 ? (
            <p className="text-sm text-warmGray-600">No visits yet.</p>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-warmGray-100 bg-white">
              <table className="w-full text-sm">
                <thead className="bg-warmGray-50/60 text-xs uppercase tracking-wide text-warmGray-600">
                  <tr>
                    <th className="px-4 py-3 text-left">Patient</th>
                    <th className="px-4 py-3 text-left">Started</th>
                    <th className="px-4 py-3 text-left">Completed</th>
                    <th className="px-4 py-3 text-left">Risk</th>
                  </tr>
                </thead>
                <tbody>
                  {visits.map((v) => {
                    const risk = v.analysis_results?.[0]?.risk_level;
                    return (
                      <tr key={v.id} className="border-t border-warmGray-100">
                        <td className="px-4 py-3 text-warmGray-800">
                          {v.patients?.full_name ?? "Anonymous"}
                        </td>
                        <td className="px-4 py-3 text-warmGray-600">{fmt(v.started_at)}</td>
                        <td className="px-4 py-3 text-warmGray-600">{fmt(v.completed_at)}</td>
                        <td className="px-4 py-3">
                          {risk ? (
                            <span
                              className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold text-white ${
                                RISK_COLOR[risk] ?? "bg-warmGray-600"
                              }`}
                            >
                              {risk}
                            </span>
                          ) : (
                            <span className="text-xs text-warmGray-600">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-warmGray-600">
            Patients ({patients.length})
          </h2>
          {patients.length === 0 ? (
            <p className="text-sm text-warmGray-600">No patient records yet.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {patients.map((p) => (
                <div
                  key={p.id}
                  className="rounded-2xl border border-warmGray-100 bg-white p-4"
                >
                  <p className="text-sm font-semibold text-warmGray-800">
                    {p.full_name ?? "Anonymous patient"}
                  </p>
                  <p className="mt-0.5 text-xs text-warmGray-600">
                    {p.city ? `${p.city}, ${p.state ?? ""}` : "—"}
                  </p>
                  <p className="mt-2 text-xs text-warmGray-600">
                    Age {p.age ?? "—"} · created {fmt(p.created_at)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
