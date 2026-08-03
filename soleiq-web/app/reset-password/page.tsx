"use client";

/**
 * Landing page for the password-recovery email link. Handles every link
 * shape Supabase sends (?code= PKCE exchange, ?token_hash= OTP verify, or
 * #access_token implicit — the last is auto-detected by the client), then
 * lets the user set a new password under the app's password policy.
 *
 * requestPasswordReset() points recovery emails here. The link only works
 * if this origin is allowed in Supabase → Authentication → URL
 * Configuration (Site URL / Redirect URLs).
 */

import { FormEvent, Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Eye, EyeOff, KeyRound, Loader2 } from "lucide-react";
import { getSupabase } from "@/lib/supabase";
import { validatePassword } from "@/lib/auth";

type Stage = "verifying" | "ready" | "saving" | "done" | "invalid";

function ResetPasswordContent() {
  const params = useSearchParams();
  const [stage, setStage] = useState<Stage>("verifying");
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    const sb = getSupabase();
    if (!sb) {
      setStage("invalid");
      setError("SoleIQ isn't configured for sign-in on this environment.");
      return;
    }
    (async () => {
      try {
        // Links whose token expired arrive with an error in the URL hash —
        // surface that cleanly instead of waiting for a session that will
        // never appear.
        if (
          typeof window !== "undefined" &&
          /error(_code|_description)?=/.test(window.location.hash)
        ) {
          setStage("invalid");
          setError(
            "This reset link has expired or was already used. Request a new one from the sign-in page."
          );
          return;
        }
        const code = params?.get("code");
        const tokenHash = params?.get("token_hash");
        if (code) {
          const { error: exchangeError } = await sb.auth.exchangeCodeForSession(code);
          if (exchangeError) throw exchangeError;
        } else if (tokenHash) {
          const { error: otpError } = await sb.auth.verifyOtp({
            type: "recovery",
            token_hash: tokenHash,
          });
          if (otpError) throw otpError;
        }
        // Fragment-based links (#access_token) — and recovery sessions
        // established a beat earlier on another page — are processed by the
        // auth client ASYNCHRONOUSLY. Checking once races that work and
        // falsely reports a bad link, so poll briefly for the session.
        for (let attempt = 0; attempt < 15; attempt++) {
          const { data } = await sb.auth.getSession();
          if (data.session) {
            setStage("ready");
            return;
          }
          await new Promise((resolve) => setTimeout(resolve, 400));
        }
        setStage("invalid");
        setError(
          "This reset link is invalid or has expired. Request a new one from the sign-in page."
        );
      } catch (err) {
        setStage("invalid");
        setError(
          err instanceof Error && /code verifier|both auth code/i.test(err.message)
            ? "This link was opened in a different browser than the one that requested it. Request a new reset email from this device."
            : "This reset link is invalid or has expired. Request a new one from the sign-in page."
        );
      }
    })();
  }, [params]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const sb = getSupabase();
    if (!sb || stage === "saving") return;
    setError(null);
    const policyError = validatePassword(password);
    if (policyError) {
      setError(policyError);
      return;
    }
    if (password !== confirm) {
      setError("The two passwords don't match.");
      return;
    }
    setStage("saving");
    const { error: updateError } = await sb.auth.updateUser({ password });
    if (updateError) {
      setStage("ready");
      setError(
        /same password/i.test(updateError.message)
          ? "That's already your current password — pick a different one."
          : updateError.message
      );
      return;
    }
    // Fresh start with the new password keeps every device consistent.
    await sb.auth.signOut();
    setStage("done");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-5 py-10">
      <main className="w-full max-w-md rounded-3xl border border-slate-200 bg-surface-raised p-7 shadow-card">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-soft text-primary">
          <KeyRound className="h-6 w-6" />
        </span>
        <h1 className="mt-4 text-2xl font-bold text-ink">
          Set a new password
        </h1>

        {stage === "verifying" && (
          <p className="mt-4 flex items-center gap-2 text-[15px] text-ink-soft">
            <Loader2 className="h-4 w-4 animate-spin text-primary" /> Checking your reset link…
          </p>
        )}

        {stage === "invalid" && (
          <>
            <p className="mt-3 rounded-2xl bg-urgent-soft p-4 text-sm leading-relaxed text-red-800">
              {error}
            </p>
            <Link
              href="/login"
              className="mt-4 inline-block w-full rounded-2xl bg-primary px-4 py-3 text-center text-sm font-bold text-white shadow-button transition-transform duration-150 active:scale-[0.98]"
            >
              Back to sign in
            </Link>
          </>
        )}

        {(stage === "ready" || stage === "saving") && (
          <form onSubmit={submit} className="mt-4 space-y-3">
            <p className="text-[15px] text-ink-soft">
              Longer than 6 characters, with at least one number or symbol.
            </p>
            {error && (
              <p className="rounded-2xl bg-urgent-soft p-3 text-sm text-red-800">{error}</p>
            )}
            <label className="block">
              <span className="text-[13px] font-semibold text-ink-soft">New password</span>
              <div className="mt-1 flex min-h-[48px] items-center gap-2 rounded-2xl border border-slate-200 bg-surface-raised px-3 py-2 transition-colors focus-within:border-primary focus-within:ring-4 focus-within:ring-primary-soft">
                <input
                  type={show ? "text" : "password"}
                  required
                  autoFocus
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-transparent text-base text-ink outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  aria-label={show ? "Hide password" : "Show password"}
                  className="-my-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-ink-faint transition-colors hover:text-primary"
                >
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </label>
            <label className="block">
              <span className="text-[13px] font-semibold text-ink-soft">
                Confirm new password
              </span>
              <input
                type={show ? "text" : "password"}
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="mt-1 min-h-[48px] w-full rounded-2xl border border-slate-200 bg-surface-raised px-3 py-2.5 text-base text-ink outline-none transition-colors focus:border-primary focus:ring-4 focus:ring-primary-soft"
              />
            </label>
            <button
              type="submit"
              disabled={stage === "saving"}
              className="min-h-[48px] w-full rounded-2xl bg-primary px-4 py-3 text-sm font-bold text-white shadow-button transition-transform duration-150 active:scale-[0.98] disabled:opacity-50"
            >
              {stage === "saving" ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Saving…
                </span>
              ) : (
                "Save new password"
              )}
            </button>
          </form>
        )}

        {stage === "done" && (
          <>
            <p className="mt-3 flex items-start gap-2 rounded-2xl bg-secondary-soft p-4 text-sm leading-relaxed text-teal-800">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              Your password was updated. Sign in with it now.
            </p>
            <Link
              href="/login"
              className="mt-4 inline-block w-full rounded-2xl bg-primary px-4 py-3 text-center text-sm font-bold text-white shadow-button transition-transform duration-150 active:scale-[0.98]"
            >
              Sign in
            </Link>
          </>
        )}
      </main>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-surface text-[15px] text-ink-soft">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
