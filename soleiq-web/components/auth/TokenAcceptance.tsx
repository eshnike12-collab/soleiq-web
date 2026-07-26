"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { AuthConfigurationError } from "./AuthConfigurationError";

export function TokenAcceptance({
  token,
  kind,
}: {
  token: string;
  kind: "membership" | "patient_share";
}) {
  const auth = useAuth();
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const path = kind === "membership" ? `/invite/${token}` : `/share/${token}`;
  if (auth.loading) return <p className="text-sm text-slate-500">Checking your session…</p>;
  if (auth.configurationError) {
    return <AuthConfigurationError message={auth.configurationError} />;
  }
  if (!auth.userId) {
    return (
      <div>
        <p className="text-sm text-slate-600">
          Sign in first. The token remains in the return link and is never used
          as your role or identity.
        </p>
        <Link
          href={`/login?next=${encodeURIComponent(path)}`}
          className="mt-4 inline-flex rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white"
        >
          Sign in to continue
        </Link>
      </div>
    );
  }
  return (
    <div>
      <p className="text-sm text-slate-600">
        {kind === "membership"
          ? "Accept the hospital invitation for this signed-in account. Doctor access remains inactive until hospital verification."
          : "Accept this patient-directed access grant with your active doctor membership."}
      </p>
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            const response = await fetch(
              kind === "membership"
                ? "/api/invitations/accept"
                : "/api/patient/access/accept",
              {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ token }),
              }
            );
            const payload = await response.json();
            if (!response.ok || !payload.ok) throw new Error(payload?.error?.message);
            setMessage("Accepted.");
            const accepted = payload.data;
            router.push(
              kind === "membership" &&
                accepted?.membership_status === "active" &&
                accepted?.membership_role === "admin"
                ? `/h/${accepted.organization_slug}/admin`
                : kind === "membership" &&
                    accepted?.membership_status === "active" &&
                    accepted?.membership_role === "doctor"
                  ? `/h/${accepted.organization_slug}/doctor`
                  : "/home"
            );
            router.refresh();
          } catch (error) {
            setMessage(error instanceof Error ? error.message : "Acceptance failed.");
          } finally {
            setBusy(false);
          }
        }}
        className="mt-4 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        {busy ? "Accepting…" : "Accept"}
      </button>
      {message && <p className="mt-3 text-sm text-slate-600">{message}</p>}
    </div>
  );
}
