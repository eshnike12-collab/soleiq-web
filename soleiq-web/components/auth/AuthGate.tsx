"use client";

import { ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";

/**
 * Hard gate in front of the patient flow: unauthenticated users are sent to
 * /login and never mount anything downstream (capture, results, timeline).
 * All roles may use the flow — doctors/admins land on their dashboards after
 * login but can still run a visit from here. This is UX-level protection;
 * the actual security boundary is RLS in Postgres.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const { loading, userId } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !userId) router.replace("/login");
  }, [loading, userId, router]);

  if (loading || !userId) {
    return (
      <div className="flex h-full min-h-screen items-center justify-center gap-2 text-sm text-warmGray-600">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
      </div>
    );
  }
  return <>{children}</>;
}
