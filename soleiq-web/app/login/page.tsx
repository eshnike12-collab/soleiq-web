"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, HeartPulse, Loader2, Stethoscope } from "lucide-react";
import {
  homeForRole,
  signInAsGuest,
  signInWithPassword,
  signUpWithPassword,
  useAuth,
} from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Mode = "signin" | "signup";
type Audience = "patient" | "doctor";

export default function LoginPage() {
  const router = useRouter();
  const auth = useAuth();
  const [audience, setAudience] = useState<Audience | null>(null);
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Already signed in (fresh login or returning session) → land on the
  // role's home: admin → /admin, doctor → /dashboard, patient → /.
  useEffect(() => {
    if (!auth.loading && auth.userId) {
      router.replace(homeForRole(auth.profile?.role));
    }
  }, [auth.loading, auth.userId, auth.profile?.role, router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      if (mode === "signin") {
        await signInWithPassword(email.trim(), password);
      } else {
        await signUpWithPassword(
          email.trim(),
          password,
          audience === "doctor" ? "doctor" : "patient"
        );
        setInfo(
          "Account created. If email confirmation is enabled, check your inbox first; otherwise you can sign in now."
        );
        setMode("signin");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed.");
    } finally {
      setBusy(false);
    }
  };

  if (auth.loading || auth.userId) {
    return (
      <div className="flex min-h-screen items-center justify-center gap-2 text-sm text-warmGray-600">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
      </div>
    );
  }

  // ---- Step 1: who are you? ----------------------------------------------
  if (!audience) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center px-6 py-10">
        <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand to-blue-800 text-xl font-bold text-white">
          SQ
        </div>
        <h1 className="text-2xl font-semibold text-warmGray-800">Welcome to SoleIQ</h1>
        <p className="mt-1 text-sm text-warmGray-600">
          Tell us who you are so we can set up the right experience.
        </p>

        <div className="mt-8 space-y-3">
          <button
            type="button"
            onClick={() => setAudience("patient")}
            className="flex w-full items-center gap-4 rounded-2xl border border-warmGray-100 bg-white p-4 text-left transition hover:border-brand/40"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-teal-50">
              <HeartPulse className="h-6 w-6 text-teal-600" />
            </span>
            <span>
              <span className="block text-sm font-semibold text-warmGray-800">
                I&apos;m a patient
              </span>
              <span className="mt-0.5 block text-xs leading-snug text-warmGray-600">
                Check your feet with guided photos and keep your results in one place.
              </span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => setAudience("doctor")}
            className="flex w-full items-center gap-4 rounded-2xl border border-warmGray-100 bg-white p-4 text-left transition hover:border-brand/40"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50">
              <Stethoscope className="h-6 w-6 text-brand" />
            </span>
            <span>
              <span className="block text-sm font-semibold text-warmGray-800">
                I&apos;m a doctor or caregiver
              </span>
              <span className="mt-0.5 block text-xs leading-snug text-warmGray-600">
                Follow your patients&apos; foot checks, photo timelines, and AI summaries.
              </span>
            </span>
          </button>
        </div>
      </div>
    );
  }

  // ---- Step 2: sign in / create account ----------------------------------
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center px-6 py-10">
      <button
        type="button"
        onClick={() => {
          setAudience(null);
          setError(null);
          setInfo(null);
        }}
        className="mb-4 inline-flex items-center gap-1 self-start text-xs font-medium text-warmGray-600 hover:text-brand"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back
      </button>
      <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand to-blue-800 text-xl font-bold text-white">
        SQ
      </div>
      <h1 className="text-2xl font-semibold text-warmGray-800">
        {audience === "doctor" ? "Doctor / caregiver sign in" : "Sign in to SoleIQ"}
      </h1>
      <p className="mt-1 text-sm text-warmGray-600">
        {audience === "doctor"
          ? "Your dashboard shows the patients assigned to you."
          : "Your foot checks are saved to your account so they're here next time."}
      </p>

      <div className="mt-6 inline-flex rounded-xl bg-warmGray-50 p-1 text-sm">
        {(["signin", "signup"] as Mode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => {
              setMode(m);
              setError(null);
              setInfo(null);
            }}
            className={cn(
              "rounded-lg px-3 py-1.5 font-medium",
              mode === m ? "bg-white text-brand shadow-sm" : "text-warmGray-600"
            )}
          >
            {m === "signin" ? "Sign in" : "Create account"}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="mt-4 space-y-3">
        <div>
          <label className="field-label">Email</label>
          <Input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="field-label">Password</label>
          <Input
            type="password"
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            required
          />
        </div>
        {error && <p className="text-xs text-risk-medium">{error}</p>}
        {info && <p className="text-xs text-teal-800">{info}</p>}
        <Button type="submit" fullWidth disabled={busy}>
          {busy ? "Working…" : mode === "signin" ? "Sign in" : "Create account"}
        </Button>
      </form>

      {audience === "patient" && (
        <>
          <div className="my-5 flex items-center gap-3 text-[11px] uppercase tracking-wide text-warmGray-600">
            <span className="h-px flex-1 bg-warmGray-100" /> or <span className="h-px flex-1 bg-warmGray-100" />
          </div>

          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setError(null);
              setBusy(true);
              signInAsGuest()
                .catch((err) =>
                  setError(err instanceof Error ? err.message : "Demo sign-in failed.")
                )
                .finally(() => setBusy(false));
            }}
            className="inline-flex h-11 w-full items-center justify-center rounded-2xl border border-warmGray-100 bg-white text-sm font-semibold text-brand disabled:opacity-60"
          >
            Try the demo — continue as guest
          </button>
          <p className="mt-2 text-[11px] leading-relaxed text-warmGray-600">
            Guest checks are saved on this device&apos;s session only and aren&apos;t tied to
            an account.
          </p>
        </>
      )}

      <p className="mt-6 text-[11px] leading-relaxed text-warmGray-600">
        {audience === "doctor"
          ? "Doctor accounts start with no patients — an administrator links patients to you."
          : "New accounts are patient accounts. Doctor and admin access is granted by an administrator."}
      </p>
    </div>
  );
}
