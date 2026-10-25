"use client";

import { ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  RESET_PASSWORD_PATH,
  hasRecoveryTokenInUrl,
  useAuth,
} from "@/lib/auth";
import { AuthConfigurationError } from "./AuthConfigurationError";
import { DelayedSkeleton } from "@/components/ui/DelayedSkeleton";
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

  /* The session is resolved once by AuthProvider in the root layout, so on a
     client-side navigation this state is already settled and the destination
     renders straight away. It is only genuinely pending on a cold load, and
     then the skeleton waits 150ms before drawing anything — a spinner here
     used to flash on every single page change. */
  if (loading || !userId) {
    return <DelayedSkeleton label={d.common.loading} />;
  }
  if (configurationError) {
    return <AuthConfigurationError message={configurationError} />;
  }
  return <>{children}</>;
}
