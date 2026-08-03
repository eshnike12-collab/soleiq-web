"use client";

import { useEffect, useState } from "react";
import { getSupabase } from "./supabase";

export type AppRole = "admin" | "doctor" | "patient";

/** Global identity contains no role or hospital. */
export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  account_status: "pending" | "active" | "suspended" | "closed";
}

export interface HospitalMembership {
  id: string;
  organization_id: string;
  role: AppRole;
  status: "invited" | "active" | "suspended" | "ended";
  permissions: Record<string, boolean>;
  organizations: {
    slug: string;
    display_name: string;
    branding: Record<string, unknown>;
  } | null;
}

export interface AuthState {
  loading: boolean;
  userId: string | null;
  profile: Profile | null;
  memberships: HospitalMembership[];
  configurationError: string | null;
}

/** Live auth, global profile, and hospital-membership state. */
export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({
    loading: true,
    userId: null,
    profile: null,
    memberships: [],
    configurationError: null,
  });

  useEffect(() => {
    const sb = getSupabase();
    if (!sb) {
      setState({
        loading: false,
        userId: null,
        profile: null,
        memberships: [],
        configurationError: null,
      });
      return;
    }

    let cancelled = false;
    const refresh = async () => {
      const { data: userData } = await sb.auth.getUser();
      const userId = userData.user?.id ?? null;
      if (!userId) {
        if (!cancelled) {
          setState({
            loading: false,
            userId: null,
            profile: null,
            memberships: [],
            configurationError: null,
          });
        }
        return;
      }

      const [profileResult, membershipResult] = await Promise.all([
        sb
          .from("profiles")
          .select("id, email, full_name, phone, account_status")
          .eq("id", userId)
          .maybeSingle(),
        sb
          .from("organization_memberships")
          .select(
            "id, organization_id, role, status, permissions, organizations(slug, display_name, branding)"
          )
          .eq("user_id", userId)
          .in("status", ["active", "invited"]),
      ]);

      if (!cancelled) {
        const schemaIsMissing =
          profileResult.error?.code === "42703" ||
          profileResult.error?.code === "PGRST204" ||
          membershipResult.error?.code === "42P01" ||
          membershipResult.error?.code === "PGRST205";
        const configurationError = schemaIsMissing
          ? "This SoleIQ environment has not applied the hospital-membership database upgrade."
          : profileResult.error || membershipResult.error
            ? "SoleIQ could not load your hospital access. Please try again or contact the platform operator."
            : null;
        setState({
          loading: false,
          userId,
          profile: (profileResult.data as Profile) ?? null,
          memberships: (membershipResult.data ?? []) as unknown as HospitalMembership[],
          configurationError,
        });
      }
    };

    void refresh();
    const { data: subscription } = sb.auth.onAuthStateChange((event) => {
      // A password-recovery link can land on ANY page (e.g. when the email
      // was requested without an explicit redirect and Supabase fell back
      // to the Site URL). Always finish the story on the set-new-password
      // screen instead of silently signing the user in wherever they landed.
      if (
        event === "PASSWORD_RECOVERY" &&
        typeof window !== "undefined" &&
        !window.location.pathname.startsWith("/reset-password")
      ) {
        window.location.replace("/reset-password");
        return;
      }
      void refresh();
    });
    return () => {
      cancelled = true;
      subscription.subscription.unsubscribe();
    };
  }, []);

  return state;
}

/** Resolve a landing route from an active hospital membership. */
export function homeForMemberships(memberships: HospitalMembership[]): string {
  const active = memberships.filter((membership) => membership.status === "active");
  const admin = active.find((membership) => membership.role === "admin");
  if (admin?.organizations?.slug) return `/h/${admin.organizations.slug}/admin`;
  const doctor = active.find((membership) => membership.role === "doctor");
  if (doctor?.organizations?.slug) return `/h/${doctor.organizations.slug}/doctor`;
  return "/home";
}

export async function signInWithPassword(email: string, password: string) {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase not configured");
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
}

/**
 * Password policy: longer than 6 characters AND at least one number or
 * special character. Returns a user-facing message, or null when valid.
 * (Also mirror this in the Supabase dashboard's password settings so the
 * auth server enforces it for requests that bypass this client.)
 */
export function validatePassword(password: string): string | null {
  if (password.length <= 6 || !/[0-9]|[^A-Za-z0-9]/.test(password)) {
    return "Password must be longer than 6 characters and include at least one number or symbol.";
  }
  return null;
}

/** Public signup creates a global patient identity only. */
export async function signUpWithPassword(email: string, password: string) {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase not configured");
  const policyError = validatePassword(password);
  if (policyError) throw new Error(policyError);
  const { error } = await sb.auth.signUp({
    email,
    password,
    options: {
      // The confirmation link lands back on the sign-in page; the client
      // exchanges the token, and the page shows the signed-in confirmation.
      emailRedirectTo: `${window.location.origin}/login?confirmed=1`,
    },
  });
  if (error) throw new Error(error.message);
}

/** Re-send the signup confirmation email for an unconfirmed account. */
export async function resendConfirmationEmail(email: string) {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase not configured");
  const { error } = await sb.auth.resend({
    type: "signup",
    email,
    options: {
      emailRedirectTo: `${window.location.origin}/login?confirmed=1`,
    },
  });
  if (error) throw new Error(error.message);
}

/** Anonymous sessions may use the local capture flow but receive no hospital role. */
export async function signInAsGuest() {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase not configured");
  const { error } = await sb.auth.signInAnonymously();
  if (error) throw new Error(error.message);
}

export async function requestPasswordReset(email: string) {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase not configured");
  // Lands on the dedicated set-new-password page. NOTE: this origin must be
  // allowed in Supabase → Authentication → URL Configuration, or Supabase
  // silently rewrites the link to the project's Site URL instead.
  const { error } = await sb.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });
  if (error) throw new Error(error.message);
}

export async function signOut() {
  const sb = getSupabase();
  if (!sb) return;
  await sb.auth.signOut();
}

export function hasActiveRole(
  memberships: HospitalMembership[],
  ...roles: AppRole[]
) {
  return memberships.some(
    (membership) =>
      membership.status === "active" && roles.includes(membership.role)
  );
}
