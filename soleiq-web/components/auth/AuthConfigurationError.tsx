"use client";

import { Database, ShieldAlert } from "lucide-react";
import { SignOutButton } from "./SignOutButton";

export function AuthConfigurationError({ message }: { message: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <section className="w-full max-w-lg rounded-3xl border border-amber-200 bg-white p-7 shadow-sm">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50 text-amber-800">
          <ShieldAlert className="h-5 w-5" />
        </div>
        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.16em] text-amber-800">
          Platform setup required
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-950">
          Your account is signed in, but roles are not available.
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">{message}</p>
        <div className="mt-5 flex gap-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
          <Database className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
          <p>
            A platform operator must apply the canonical migrations and legacy
            role backfill. SoleIQ will not guess a staff role from a login form.
          </p>
        </div>
        <div className="mt-6">
          <SignOutButton />
        </div>
      </section>
    </div>
  );
}
