"use client";

import { ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { AuthConfigurationError } from "./AuthConfigurationError";

/**
 * Hard gate in front of the patient flow: unauthenticated users are sent to
 * /login and never mount anything downstream (capture, results, timeline).
 * All roles may use the flow — doctors/admins land on their dashboards after
 * login but can still run a visit from here. This is UX-level protection;
 * the actual security boundary is RLS in Postgres.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const { loading, userId, configurationError } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !userId) router.replace("/login");
  }, [loading, userId, router]);

  if (loading || !userId) {
    return (
      <div className="flex h-full min-h-screen items-center justify-center gap-2 bg-surface text-[15px] text-ink-soft">
        <Loader2 className="h-5 w-5 animate-spin text-primary" /> Loading…
      </div>
    );
  }
  if (configurationError) {
    return <AuthConfigurationError message={configurationError} />;
  }
  return <>{children}</>;
}
