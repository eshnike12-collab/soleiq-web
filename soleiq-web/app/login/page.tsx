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
import { cn } from "@/lib/utils";


/** Raw auth errors can be server JSON like "{}" — never show those. */
function friendlyAuthError(err: unknown, fallback: string): string {
  const raw =
    err instanceof Error ? err.message : typeof err === "string" ? err : "";
  const trimmed = (raw ?? "").trim();
  if (!trimmed || /^[{[]/.test(trimmed) || /unexpected_failure/i.test(trimmed)) {
    return fallback;
  }
  if (/error sending .*email/i.test(trimmed)) {
    return "Our email service couldn't send the message just now — please try again in a few minutes.";
  }
  if (/rate limit/i.test(trimmed)) {
    return "Too many emails were requested in a short time. Wait a bit and try again.";
  }
  return trimmed;
}

type Mode = "signin" | "signup";
type Audience = "patient" | "doctor";

export default function LoginPage() {
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
      setInfo("Email confirmed — sign in below.");
    }
  }, []);

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
          throw new Error(
            "Staff accounts are created from a hospital invitation. Ask your hospital administrator for an invite."
          );
        }
        const policyError = validatePassword(password);
        if (policyError) {
          setError(policyError);
          return;
        }
        await signUpWithPassword(email.trim(), password);
        setInfo(
          "Account created — we've sent a confirmation email. Open the link in it, then sign in here."
        );
        setMode("signin");
      }
    } catch (err) {
      const message = friendlyAuthError(err, "Sign-in failed.");
      if (/not confirmed/i.test(message)) {
        setNeedsConfirmation(true);
        setError(
          "Your email isn't confirmed yet. Open the confirmation link we sent you — or resend it below."
        );
      } else {
        setError(message);
      }
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    if (!email.trim()) {
      setError("Enter your email first.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await resendConfirmationEmail(email.trim());
      setInfo("Confirmation email sent — check your inbox (and spam).");
      setNeedsConfirmation(false);
    } catch (err) {
      setError(friendlyAuthError(err, "Could not resend the email."));
    } finally {
      setBusy(false);
    }
  };

  if (auth.loading) {
    return (
      <div className="flex min-h-screen items-center justify-center gap-2 bg-surface text-[15px] text-ink-soft">
        <Loader2 className="h-5 w-5 animate-spin text-primary" /> Loading…
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
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-surface px-6 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary-soft">
          <CheckCircle2 className="h-8 w-8 text-secondary" />
        </span>
        <h1 className="text-xl font-bold text-ink">Successfully signed in</h1>
        <p className="text-[15px] text-ink-soft">Taking you to your dashboard…</p>
      </div>
    );
  }

  // ---- Step 1: who are you? ----------------------------------------------
  if (!audience) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center bg-surface px-6 py-10">
        <BrandLockup className="mb-6" />
        <h1 className="text-2xl font-bold text-ink">Welcome</h1>
        <p className="mt-1 text-[15px] leading-relaxed text-ink-soft">
          Tell us who you are so we can set up the right experience.
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
                I&apos;m a patient
              </span>
              <span className="mt-0.5 block text-[13px] leading-snug text-ink-soft">
                Check your feet with guided photos and keep your results in one place.
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
                I&apos;m a doctor or caregiver
              </span>
              <span className="mt-0.5 block text-[13px] leading-snug text-ink-soft">
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
    <div className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center bg-surface px-6 py-10">
      <button
        type="button"
        onClick={() => {
          setAudience(null);
          setError(null);
          setInfo(null);
        }}
        className="mb-4 inline-flex min-h-[44px] items-center gap-1 self-start rounded-lg py-2 pr-2 text-sm font-semibold text-ink-soft transition-colors hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>
      <BrandLockup className="mb-6" />
      <h1 className="text-2xl font-bold text-ink">
        {audience === "doctor" ? "Doctor / caregiver sign in" : "Sign in to SoleIQ"}
      </h1>
      <p className="mt-1 text-[15px] leading-relaxed text-ink-soft">
        {audience === "doctor"
          ? "Your dashboard shows the patients assigned to you."
          : "Your foot checks are saved to your account so they're here next time."}
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
              mode === m ? "bg-surface-raised text-primary shadow-sm" : "text-ink-soft"
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
          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={7}
              required
              className="pr-12"
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-xl text-ink-faint transition-colors hover:text-ink"
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
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
                    : "text-secondary"
              )}
            >
              {password.length === 0
                ? "More than 6 characters, with at least one number or symbol."
                : validatePassword(password) ??
                  "Password meets the requirements."}
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
            Resend confirmation email
          </button>
        )}
        <Button type="submit" fullWidth disabled={busy}>
          {busy ? "Working…" : mode === "signin" ? "Sign in" : "Create account"}
        </Button>
        {mode === "signin" && (
          <button
            type="button"
            disabled={sendingReset}
            className="inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 py-2 text-center text-[13px] font-semibold text-primary transition-colors hover:text-primary-deep disabled:opacity-60"
            onClick={async () => {
              const target = email.trim();
              if (!target) {
                setError("Enter your email first, then tap Forgot password.");
                return;
              }
              setSendingReset(true);
              setError(null);
              setInfo(null);
              try {
                await requestPasswordReset(target);
                // Deliberately not confirming whether the address exists.
                setInfo(
                  `If an account exists for ${target}, a reset link is on its way — check spam too. Open it on this device; the link expires in an hour.`
                );
              } catch (err) {
                setError(friendlyAuthError(err, "Recovery request failed."));
              } finally {
                setSendingReset(false);
              }
            }}
          >
            {sendingReset ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Sending reset link…
              </>
            ) : (
              "Forgot password?"
            )}
          </button>
        )}
      </form>
      </div>

      <p className="mt-6 text-xs leading-relaxed text-ink-faint">
        {audience === "doctor"
          ? "Doctor and administrator access comes only from an expiring hospital invitation. New doctors remain inactive until the hospital verifies them."
          : "New accounts do not choose a staff role. Hospital access is added through an invitation or patient-record linking workflow."}
      </p>
    </div>
  );
}
