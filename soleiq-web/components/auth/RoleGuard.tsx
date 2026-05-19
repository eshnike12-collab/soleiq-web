"use client";

import { ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth, AppRole } from "@/lib/auth";

export function RoleGuard({
  allow,
  children,
}: {
  allow: AppRole[];
  children: ReactNode;
}) {
  const { loading, userId, profile } = useAuth();
  const router = useRouter();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-warmGray-600">
        Loading…
      </div>
    );
  }
  if (!userId) {
    if (typeof window !== "undefined") router.replace("/login");
    return null;
  }
  if (!profile || !allow.includes(profile.role)) {
    return (
      <div className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center gap-3 px-6 text-center">
        <h1 className="text-xl font-semibold text-warmGray-800">Not authorized</h1>
        <p className="text-sm text-warmGray-600">
          Your account ({profile?.role ?? "unknown"}) doesn't have access to this
          area.
        </p>
        <Link href="/" className="text-sm font-medium text-brand">
          Back to patient flow
        </Link>
      </div>
    );
  }
  return <>{children}</>;
}
