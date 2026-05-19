"use client";

import { useEffect, useState } from "react";
import { getSupabase } from "./supabase";

export type AppRole = "super_admin" | "clinic_admin" | "patient";

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

export async function signInWithPassword(email: string, password: string) {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase not configured");
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function signUpWithPassword(email: string, password: string) {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase not configured");
  const { error } = await sb.auth.signUp({ email, password });
  if (error) throw error;
}

export async function signOut() {
  const sb = getSupabase();
  if (!sb) return;
  await sb.auth.signOut();
}

export function hasRole(profile: Profile | null, ...roles: AppRole[]) {
  return !!profile && roles.includes(profile.role);
}
