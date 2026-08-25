"use client";

import { ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import {
  RESET_PASSWORD_PATH,
  hasRecoveryTokenInUrl,
  useAuth,
} from "@/lib/auth";
import { AuthConfigurationError } from "./AuthConfigurationError";
import { useT } from "@/lib/i18n/I18nProvider";

/**
 * Hard gate in front of the patient flow: unauthenticated users are sent to
 * /login and never mount anything downstream (capture, results, timeline).
 * All roles may use the flow — doctors/admins land on their dashboards after
 * login but can still run a visit from here. This is UX-level protection;
 * the actual security boundary is RLS in Postgres.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const d = useT();
  const { loading, userId, configurationError } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading || userId) return;
    // A recovery link whose redirectTo wasn't allow-listed lands here on the
    // project's Site URL instead of /reset-password. Hand the token on with
    // the URL intact rather than bouncing to /login and losing it.
    if (hasRecoveryTokenInUrl()) {
      window.location.replace(
        `${RESET_PASSWORD_PATH}${window.location.search}${window.location.hash}`
      );
      return;
    }
    router.replace("/login");
  }, [loading, userId, router]);

  if (loading || !userId) {
    return (
      <div className="flex h-full min-h-screen items-center justify-center gap-2 text-[15px] text-ink-soft">
        <Loader2 className="h-5 w-5 animate-spin text-primary" /> {d.common.loading}
      </div>
    );
  }
  if (configurationError) {
    return <AuthConfigurationError message={configurationError} />;
  }
  return <>{children}</>;
}
