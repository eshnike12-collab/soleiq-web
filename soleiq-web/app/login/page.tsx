"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  HeartPulse,
  Loader2,
  Stethoscope,
} from "lucide-react";
import { BrandLockup } from "@/components/brand/Logo";
import {
  homeForMemberships,
  requestPasswordReset,
  resendConfirmationEmail,
  signInWithPassword,
  signUpWithPassword,
  useAuth,
  validatePassword,
} from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthConfigurationError } from "@/components/auth/AuthConfigurationError";
import { AppTopBar } from "@/components/chrome/AppTopBar";
import { cn } from "@/lib/utils";
import { fill, useT } from "@/lib/i18n/I18nProvider";
import type { Dictionary } from "@/lib/i18n/locales/en";

/** Raw auth errors can be server JSON like "{}" — never show those. */
function friendlyAuthError(
  d: Dictionary,
  err: unknown,
  fallback: string,
): string {
  const raw =
    err instanceof Error ? err.message : typeof err === "string" ? err : "";
  const trimmed = (raw ?? "").trim();
  if (
    !trimmed ||
    /^[{[]/.test(trimmed) ||
    /unexpected_failure/i.test(trimmed)
  ) {
    return fallback;
  }
  if (/error sending .*email/i.test(trimmed)) {
    return d.auth.errorSendFailed;
  }
  if (/rate limit/i.test(trimmed)) {
    return d.auth.errorRateLimited;
  }
  return trimmed;
}

type Mode = "signin" | "signup";
type Audience = "patient" | "doctor";

export default function LoginPage() {
  const d = useT();
  const router = useRouter();
  const auth = useAuth();
  const [audience, setAudience] = useState<Audience | null>(null);
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);

  // Arriving from the email-confirmation link (?confirmed=1). If the link
  // also signed the user in, the redirect effect below takes over; if not,
  // tell them their email is confirmed and to sign in.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (new URLSearchParams(window.location.search).get("confirmed") === "1") {
      setAudience("patient");
      setInfo(d.auth.emailConfirmed);
    }
  }, [d]);

  // Signed in (fresh login, confirmation link, or returning session) →
  // show a clear "Successfully signed in" beat, then land on the role's
  // home from their hospital memberships.
  useEffect(() => {
    if (!auth.loading && auth.userId && !auth.configurationError) {
      const requestedNext =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search).get("next")
          : null;
      const safeNext =
        requestedNext?.startsWith("/") && !requestedNext.startsWith("//")
          ? requestedNext
          : null;
      const target = safeNext ?? homeForMemberships(auth.memberships);
      const timer = setTimeout(() => router.replace(target), 1100);
      return () => clearTimeout(timer);
    }
  }, [
    auth.loading,
    auth.userId,
    auth.memberships,
    auth.configurationError,
    router,
  ]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setNeedsConfirmation(false);
    setBusy(true);
    try {
      if (mode === "signin") {
        await signInWithPassword(email.trim(), password);
      } else {
        if (audience === "doctor") {
          throw new Error(d.auth.errorStaffInviteOnly);
        }
        const policyError = validatePassword(password);
        if (policyError) {
          setError(policyError);
          return;
        }
        await signUpWithPassword(email.trim(), password);
        setInfo(d.auth.accountCreated);
        setMode("signin");
      }
    } catch (err) {
      const message = friendlyAuthError(d, err, d.auth.errorSignInFailed);
      if (/not confirmed/i.test(message)) {
        setNeedsConfirmation(true);
        setError(d.auth.errorUnconfirmed);
      } else {
        setError(message);
      }
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    if (!email.trim()) {
      setError(d.auth.errorEmailFirst);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await resendConfirmationEmail(email.trim());
      setInfo(d.auth.resendSent);
      setNeedsConfirmation(false);
    } catch (err) {
      setError(friendlyAuthError(d, err, d.auth.errorResendFailed));
    } finally {
      setBusy(false);
    }
  };

  if (auth.loading) {
    return (
      <div className="flex min-h-screen items-center justify-center gap-2 text-[15px] text-ink-soft">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />{" "}
        {d.common.loading}
      </div>
    );
  }
  if (auth.userId && auth.configurationError) {
    return <AuthConfigurationError message={auth.configurationError} />;
  }
  if (auth.userId) {
    // The redirect effect fires ~1s later — this is the explicit
    // "Successfully signed in" confirmation the user sees first.
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary-soft">
          <CheckCircle2 className="h-8 w-8 text-secondary" />
        </span>
        <h1 className="text-xl font-bold text-ink">{d.auth.signedIn}</h1>
        <p className="text-[15px] text-ink-soft">{d.auth.redirecting}</p>
      </div>
    );
  }

  // ---- Step 1: who are you? ----------------------------------------------
  if (!audience) {
    return (
      <div className="flex min-h-screen flex-col">
        <AppTopBar />
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-10">
          <BrandLockup className="mb-6" />
          <h1 className="text-2xl font-bold text-ink">{d.auth.welcome}</h1>
          <p className="mt-1 text-[15px] leading-relaxed text-ink-soft">
            {d.auth.chooseSubtitle}
          </p>

          <div className="mt-8 space-y-3">
            <button
              type="button"
              onClick={() => setAudience("patient")}
              className="flex w-full items-center gap-4 rounded-2xl border border-slate-200 bg-surface-raised p-4 text-left shadow-card transition duration-150 hover:border-primary/40 hover:shadow-lifted active:scale-[0.99]"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-secondary-soft">
                <HeartPulse className="h-6 w-6 text-secondary" />
              </span>
              <span>
                <span className="block text-[15px] font-bold text-ink">
                  {d.auth.iAmPatient}
                </span>
                <span className="mt-0.5 block text-[13px] leading-snug text-ink-soft">
                  {d.auth.iAmPatientBody}
                </span>
              </span>
            </button>

            <button
              type="button"
              onClick={() => setAudience("doctor")}
              className="flex w-full items-center gap-4 rounded-2xl border border-slate-200 bg-surface-raised p-4 text-left shadow-card transition duration-150 hover:border-primary/40 hover:shadow-lifted active:scale-[0.99]"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-soft">
                <Stethoscope className="h-6 w-6 text-primary" />
              </span>
              <span>
                <span className="block text-[15px] font-bold text-ink">
                  {d.auth.iAmDoctor}
                </span>
                <span className="mt-0.5 block text-[13px] leading-snug text-ink-soft">
                  {d.auth.iAmDoctorBody}
                </span>
              </span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---- Step 2: sign in / create account ----------------------------------
  return (
    <div className="flex min-h-screen flex-col">
      <AppTopBar />
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-10">
        <button
          type="button"
          onClick={() => {
            setAudience(null);
            setError(null);
            setInfo(null);
          }}
          className="mb-4 inline-flex min-h-[44px] items-center gap-1 self-start rounded-lg py-2 pr-2 text-sm font-semibold text-ink-soft transition-colors hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4 rtl-flip" /> {d.flow.back}
        </button>
        <BrandLockup className="mb-6" />
        <h1 className="text-2xl font-bold text-ink">
          {audience === "doctor" ? d.auth.titleDoctor : d.auth.titlePatient}
        </h1>
        <p className="mt-1 text-[15px] leading-relaxed text-ink-soft">
          {audience === "doctor"
            ? d.auth.subtitleDoctor
            : d.auth.subtitlePatient}
        </p>

        <div className="mt-6 rounded-3xl border border-slate-200 bg-surface-raised p-5 shadow-card">
          <div className="inline-flex rounded-xl bg-surface-sunken p-1 text-sm">
            {(audience === "doctor"
              ? (["signin"] as Mode[])
              : (["signin", "signup"] as Mode[])
            ).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setMode(m);
                  setError(null);
                  setInfo(null);
                }}
                className={cn(
                  "min-h-[44px] rounded-lg px-4 py-2 font-semibold transition-colors",
                  mode === m
                    ? "bg-surface-raised text-primary shadow-sm"
                    : "text-ink-soft",
                )}
              >
                {m === "signin" ? d.auth.signIn : d.auth.createAccount}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="mt-4 space-y-3">
            <div>
              <label className="field-label">{d.auth.email}</label>
              <Input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="field-label">{d.auth.password}</label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  autoComplete={
                    mode === "signin" ? "current-password" : "new-password"
                  }
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={7}
                  required
                  className="pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={
                    showPassword ? d.auth.hidePassword : d.auth.showPassword
                  }
                  className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-xl text-ink-faint transition-colors hover:text-ink"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
              {mode === "signup" && (
                <p
                  className={cn(
                    "mt-1 text-[13px] leading-snug",
                    password.length === 0
                      ? "text-ink-soft"
                      : validatePassword(password)
                        ? "text-warn"
                        : "text-secondary",
                  )}
                >
                  {password.length === 0
                    ? d.auth.passwordHint
                    : (validatePassword(password) ?? d.auth.passwordOk)}
                </p>
              )}
            </div>
            {error && (
              <p className="rounded-xl bg-urgent-soft px-3 py-2 text-[13px] font-medium leading-snug text-red-800">
                {error}
              </p>
            )}
            {info && (
              <p className="rounded-xl bg-secondary-soft px-3 py-2 text-[13px] font-medium leading-snug text-teal-800">
                {info}
              </p>
            )}
            {needsConfirmation && (
              <button
                type="button"
                disabled={busy}
                onClick={() => void resend()}
                className="min-h-[44px] w-full rounded-2xl border border-slate-200 bg-surface-raised py-2.5 text-[13px] font-bold text-primary transition-colors hover:bg-primary-soft"
              >
                {d.auth.resend}
              </button>
            )}
            <Button type="submit" fullWidth disabled={busy}>
              {busy
                ? d.auth.working
                : mode === "signin"
                  ? d.auth.signIn
                  : d.auth.createAccount}
            </Button>
            {mode === "signin" && (
              <button
                type="button"
                disabled={sendingReset}
                className="inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 py-2 text-center text-[13px] font-semibold text-primary transition-colors hover:text-primary-deep disabled:opacity-60"
                onClick={async () => {
                  const target = email.trim();
                  if (!target) {
                    setError(d.auth.errorForgotEmailFirst);
                    return;
                  }
                  setSendingReset(true);
                  setError(null);
                  setInfo(null);
                  try {
                    await requestPasswordReset(target);
                    // Deliberately not confirming whether the address exists.
                    setInfo(fill(d.auth.resetSent, { email: target }));
                  } catch (err) {
                    setError(
                      friendlyAuthError(d, err, d.auth.errorRecoveryFailed),
                    );
                  } finally {
                    setSendingReset(false);
                  }
                }}
              >
                {sendingReset ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />{" "}
                    {d.auth.sendingReset}
                  </>
                ) : (
                  d.auth.forgot
                )}
              </button>
            )}
          </form>
        </div>

        <p className="mt-6 text-xs leading-relaxed text-ink-faint">
          {audience === "doctor" ? d.auth.staffNote : d.auth.patientNote}
        </p>
      </div>
    </div>
  );
}
