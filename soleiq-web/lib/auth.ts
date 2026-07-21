"use client";

import { useEffect, useState } from "react";
import { getSupabase } from "./supabase";

export type AppRole = "admin" | "doctor" | "patient";

export interface Profile {
  id: string;
  role: AppRole;
  organization_id: string | null;
  email: string | null;
  full_name: string | null;
}

export interface AuthState {
  loading: boolean;
  userId: string | null;
  profile: Profile | null;
}

/** Live auth + profile state. Subscribes to Supabase auth changes. */
export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({
    loading: true,
    userId: null,
    profile: null,
  });

  useEffect(() => {
    const sb = getSupabase();
    if (!sb) {
      setState({ loading: false, userId: null, profile: null });
      return;
    }

    let cancelled = false;

    const refresh = async () => {
      const { data: u } = await sb.auth.getUser();
      const userId = u.user?.id ?? null;
      if (!userId) {
        if (!cancelled) setState({ loading: false, userId: null, profile: null });
        return;
      }
      const { data: p } = await sb
        .from("profiles")
        .select("id, role, organization_id, email, full_name")
        .eq("id", userId)
        .maybeSingle();
      if (!cancelled)
        setState({
          loading: false,
          userId,
          profile: (p as Profile) ?? null,
        });
    };

    refresh();
    const { data: sub } = sb.auth.onAuthStateChange(() => {
      refresh();
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  return state;
}

/** Where each role lands after login. Patients get their dashboard home
 *  base at /home; the visit flow itself lives at "/". */
export function homeForRole(role: AppRole | undefined | null): string {
  if (role === "admin") return "/admin";
  if (role === "doctor") return "/dashboard";
  return "/home";
}

// ---------------------------------------------------------------------------
// Sign-in methods — email + password only.
// ---------------------------------------------------------------------------

export async function signInWithPassword(email: string, password: string) {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase not configured");
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
}

export async function signUpWithPassword(
  email: string,
  password: string,
  requestedRole: "patient" | "doctor" = "patient"
) {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase not configured");
  // requested_role is read by the handle_new_user trigger; it only honors
  // 'doctor' (admin comes from the ADMIN_EMAIL list, never from here).
  const { error } = await sb.auth.signUp({
    email,
    password,
    options: { data: { requested_role: requestedRole } },
  });
  if (error) throw new Error(error.message);
}

/**
 * Demo path: anonymous Supabase session — no account, no email, no
 * confirmation step. The signup trigger still creates a patient profile,
 * so saving and Open Results work; data lives with the anonymous user
 * until the browser storage is cleared.
 */
export async function signInAsGuest() {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase not configured");
  const { error } = await sb.auth.signInAnonymously();
  if (error) throw new Error(error.message);
}

export async function signOut() {
  const sb = getSupabase();
  if (!sb) return;
  await sb.auth.signOut();
}

export function hasRole(profile: Profile | null, ...roles: AppRole[]) {
  return !!profile && roles.includes(profile.role);
}
