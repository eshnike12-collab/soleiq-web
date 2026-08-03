"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { AuthConfigurationError } from "@/components/auth/AuthConfigurationError";

/** Compatibility redirect for pre-tenancy bookmarks. */
export default function LegacyDoctorDashboard() {
  const auth = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (auth.loading || auth.configurationError) return;
    const membership = auth.memberships.find(
      (row) =>
        row.status === "active" &&
        (row.role === "doctor" || row.role === "admin")
    );
    router.replace(
      membership?.organizations?.slug
        ? `/h/${membership.organizations.slug}/${membership.role === "admin" ? "admin" : "doctor"}`
        : "/home"
    );
  }, [auth.loading, auth.memberships, auth.configurationError, router]);
  if (auth.configurationError) {
    return <AuthConfigurationError message={auth.configurationError} />;
  }
  return <div className="flex min-h-screen items-center justify-center bg-surface text-[15px] text-ink-soft">Resolving hospital…</div>;
}
