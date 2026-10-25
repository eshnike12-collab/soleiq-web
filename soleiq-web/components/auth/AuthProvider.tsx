"use client";

import { ReactNode } from "react";
import { AuthContext, useAuthRoot } from "@/lib/auth";

/**
 * Resolves the session once for the whole app.
 *
 * It belongs in the root layout, which persists across client-side
 * navigation. Before this existed, every page's AuthGate ran its own
 * `getUser()` + profile + memberships sequence on mount — roughly two serial
 * round trips — and rendered a full-screen loader until they came back. That
 * happened on every route change even though the session had not changed,
 * which is most of what made moving between pages feel slow.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const value = useAuthRoot();
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
