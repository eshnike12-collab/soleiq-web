"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import {
  listOrganizations,
  listProfiles,
  listPatients,
  listVisits,
} from "@/lib/db";
import { SignOutButton } from "@/components/auth/SignOutButton";

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
  const { profile } = useAuth();
  const [orgs, setOrgs] = useState<OrgRow[]>([]);
  const [users, setUsers] = useState<ProfileRow[]>([]);
  const [stats, setStats] = useState({ patients: 0, visits: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      listOrganizations(),
      listProfiles(),
      listPatients(),
      listVisits(),
    ]).then(([o, u, p, v]) => {
      setOrgs(o as OrgRow[]);
      setUsers(u as ProfileRow[]);
      setStats({ patients: p.length, visits: v.length });
      setLoading(false);
    });
  }, []);

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
              Super admin
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
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-brand">
                          {u.role}
                        </span>
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
