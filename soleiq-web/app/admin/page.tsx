"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth, type AppRole } from "@/lib/auth";
import {
  createAssignment,
  deleteAssignment,
  listAssignments,
  listOrganizations,
  listProfiles,
  listPatients,
  listVisits,
  updateProfileRole,
  type AssignmentRow,
} from "@/lib/db";
import { SignOutButton } from "@/components/auth/SignOutButton";

const ROLES: AppRole[] = ["admin", "doctor", "patient"];

interface OrgRow {
  id: string;
  slug: string;
  name: string;
  created_at: string;
}
interface ProfileRow {
  id: string;
  role: string;
  organization_id: string | null;
  email: string | null;
  full_name: string | null;
}

const fmt = (ts: string | null) =>
  ts ? new Date(ts).toLocaleDateString() : "—";

export default function AdminPage() {
  const { profile, userId } = useAuth();
  const [orgs, setOrgs] = useState<OrgRow[]>([]);
  const [users, setUsers] = useState<ProfileRow[]>([]);
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [stats, setStats] = useState({ patients: 0, visits: 0 });
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const [assignDoctor, setAssignDoctor] = useState("");
  const [assignPatient, setAssignPatient] = useState("");

  useEffect(() => {
    Promise.all([
      listOrganizations(),
      listProfiles(),
      listPatients(),
      listVisits(),
      listAssignments(),
    ]).then(([o, u, p, v, a]) => {
      setOrgs(o as OrgRow[]);
      setUsers(u as ProfileRow[]);
      setAssignments(a);
      setStats({ patients: p.length, visits: v.length });
      setLoading(false);
    });
  }, []);

  const userLabel = (id: string) =>
    users.find((u) => u.id === id)?.email ?? `${id.slice(0, 8)}…`;

  const changeRole = async (target: ProfileRow, role: AppRole) => {
    setActionError(null);
    const previous = target.role;
    setUsers((rows) =>
      rows.map((row) => (row.id === target.id ? { ...row, role } : row))
    );
    try {
      await updateProfileRole(target.id, role);
    } catch (err) {
      setUsers((rows) =>
        rows.map((row) => (row.id === target.id ? { ...row, role: previous } : row))
      );
      setActionError(err instanceof Error ? err.message : "Role update failed.");
    }
  };

  const addAssignment = async () => {
    if (!assignDoctor || !assignPatient) return;
    setActionError(null);
    try {
      await createAssignment(assignDoctor, assignPatient);
      setAssignments(await listAssignments());
      setAssignDoctor("");
      setAssignPatient("");
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Assignment failed.");
    }
  };

  const removeAssignment = async (id: string) => {
    setActionError(null);
    try {
      await deleteAssignment(id);
      setAssignments((rows) => rows.filter((row) => row.id !== id));
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Removal failed.");
    }
  };

  return (
    <div className="min-h-screen bg-warmGray-50/40">
      <header className="border-b border-warmGray-100 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-xs text-warmGray-600 hover:text-brand">
              ← Patient app
            </Link>
            <Link
              href="/dashboard"
              className="text-xs text-warmGray-600 hover:text-brand"
            >
              Dashboard
            </Link>
            <span className="text-warmGray-100">|</span>
            <h1 className="text-xl font-semibold text-warmGray-800">
              Admin console
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
          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin/blog"
              className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1.5 text-sm font-medium text-brand hover:bg-blue-100"
            >
              Manage blog →
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 rounded-full bg-warmGray-50 px-3 py-1.5 text-sm font-medium text-warmGray-800 hover:bg-warmGray-100"
            >
              Open clinic dashboard →
            </Link>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-4">
          <Stat label="Organizations" value={orgs.length} />
          <Stat label="Users" value={users.length} />
          <Stat label="Patients" value={stats.patients} />
          <Stat label="Visits" value={stats.visits} />
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-warmGray-600">
            Organizations
          </h2>
          {loading ? (
            <p className="text-sm text-warmGray-600">Loading…</p>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-warmGray-100 bg-white">
              <table className="w-full text-sm">
                <thead className="bg-warmGray-50/60 text-xs uppercase tracking-wide text-warmGray-600">
                  <tr>
                    <th className="px-4 py-3 text-left">Slug</th>
                    <th className="px-4 py-3 text-left">Name</th>
                    <th className="px-4 py-3 text-left">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {orgs.map((o) => (
                    <tr key={o.id} className="border-t border-warmGray-100">
                      <td className="px-4 py-3 font-mono text-xs text-warmGray-800">
                        {o.slug}
                      </td>
                      <td className="px-4 py-3 text-warmGray-800">{o.name}</td>
                      <td className="px-4 py-3 text-warmGray-600">
                        {fmt(o.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-warmGray-600">
            Users ({users.length})
          </h2>
          {users.length === 0 ? (
            <p className="text-sm text-warmGray-600">No users yet.</p>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-warmGray-100 bg-white">
              <table className="w-full text-sm">
                <thead className="bg-warmGray-50/60 text-xs uppercase tracking-wide text-warmGray-600">
                  <tr>
                    <th className="px-4 py-3 text-left">Email</th>
                    <th className="px-4 py-3 text-left">Role</th>
                    <th className="px-4 py-3 text-left">Org</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-t border-warmGray-100">
                      <td className="px-4 py-3 text-warmGray-800">
                        {u.email ?? <span className="text-warmGray-600">anonymous</span>}
                        {u.id === userId && (
                          <span className="ml-1.5 text-[10px] text-warmGray-600">(you)</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {u.id === userId ? (
                          // Never let the admin demote themselves from here —
                          // the last admin locking themselves out is unrecoverable
                          // without the SQL editor.
                          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-brand">
                            {u.role}
                          </span>
                        ) : (
                          <select
                            value={u.role}
                            onChange={(e) => void changeRole(u, e.target.value as AppRole)}
                            className="rounded-lg border border-warmGray-100 bg-white px-2 py-1 text-xs font-medium text-warmGray-800"
                          >
                            {ROLES.map((role) => (
                              <option key={role} value={role}>{role}</option>
                            ))}
                          </select>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-warmGray-600">
                        {orgs.find((o) => o.id === u.organization_id)?.slug ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {actionError && (
            <p className="mt-2 text-xs text-risk-medium">{actionError}</p>
          )}
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-warmGray-600">
            Doctor ↔ patient assignments ({assignments.length})
          </h2>
          <p className="mb-3 text-xs text-warmGray-600">
            A doctor only sees visits and results for patients assigned to them
            here. Assignments are enforced by database row-level security, not
            just by the UI.
          </p>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <select
              value={assignDoctor}
              onChange={(e) => setAssignDoctor(e.target.value)}
              className="rounded-lg border border-warmGray-100 bg-white px-3 py-2 text-sm text-warmGray-800"
            >
              <option value="">Choose doctor…</option>
              {users.filter((u) => u.role === "doctor").map((u) => (
                <option key={u.id} value={u.id}>{u.email ?? u.id.slice(0, 8)}</option>
              ))}
            </select>
            <span className="text-xs text-warmGray-600">cares for</span>
            <select
              value={assignPatient}
              onChange={(e) => setAssignPatient(e.target.value)}
              className="rounded-lg border border-warmGray-100 bg-white px-3 py-2 text-sm text-warmGray-800"
            >
              <option value="">Choose patient…</option>
              {users.filter((u) => u.role === "patient").map((u) => (
                <option key={u.id} value={u.id}>{u.email ?? u.id.slice(0, 8)}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => void addAssignment()}
              disabled={!assignDoctor || !assignPatient}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              Assign
            </button>
          </div>
          {assignments.length === 0 ? (
            <p className="text-sm text-warmGray-600">
              No assignments yet — doctors currently see no patient data.
            </p>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-warmGray-100 bg-white">
              <table className="w-full text-sm">
                <thead className="bg-warmGray-50/60 text-xs uppercase tracking-wide text-warmGray-600">
                  <tr>
                    <th className="px-4 py-3 text-left">Doctor</th>
                    <th className="px-4 py-3 text-left">Patient</th>
                    <th className="px-4 py-3 text-left">Since</th>
                    <th className="px-4 py-3 text-right">Remove</th>
                  </tr>
                </thead>
                <tbody>
                  {assignments.map((a) => (
                    <tr key={a.id} className="border-t border-warmGray-100">
                      <td className="px-4 py-3 text-warmGray-800">{userLabel(a.doctor_id)}</td>
                      <td className="px-4 py-3 text-warmGray-800">{userLabel(a.patient_id)}</td>
                      <td className="px-4 py-3 text-warmGray-600">{fmt(a.created_at)}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => void removeAssignment(a.id)}
                          className="text-xs font-medium text-risk-high"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-warmGray-100 bg-white p-4">
      <p className="text-xs uppercase tracking-wide text-warmGray-600">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-warmGray-800">{value}</p>
    </div>
  );
}
