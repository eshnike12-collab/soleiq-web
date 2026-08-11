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
import type { EmailOtpType, SupabaseClient } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase";
import { validatePassword } from "@/lib/auth";

type Stage = "verifying" | "ready" | "saving" | "done" | "invalid";

const EXPIRED_MESSAGE =
  "This reset link has expired or was already used. Request a new one from the sign-in page.";
const SAME_BROWSER_MESSAGE =
  "This link has to be opened in the same browser that asked for it. Request a new reset email and open it on this device.";

/** Poll for a session the auth client may still be establishing. */
async function waitForSession(sb: SupabaseClient, timeoutMs: number) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const { data } = await sb.auth.getSession();
    if (data.session) return data.session;
    if (Date.now() >= deadline) return null;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
}

function ResetPasswordContent() {
  const params = useSearchParams();
  const [stage, setStage] = useState<Stage>("verifying");
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const ran = useRef(false);

  // Only ever promotes out of "verifying", so a late event can't yank the
  // form away from someone already typing their new password.
  const succeed = () =>
    setStage((current) => (current === "verifying" ? "ready" : current));
  const fail = (message: string) => {
    setStage((current) => (current === "verifying" ? "invalid" : current));
    setError(message);
  };

  // The client establishes the recovery session itself for the link shapes it
  // understands, and does it asynchronously — listening as well as polling
  // means we react the moment it lands.
  useEffect(() => {
    const sb = getSupabase();
    if (!sb) return;
    const { data: listener } = sb.auth.onAuthStateChange((_event, session) => {
      if (session) succeed();
    });
    return () => listener.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // The tokens below are single-use: never process them twice (React
    // StrictMode remounts effects in development).
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
        const hash = new URLSearchParams(
          typeof window !== "undefined" ? window.location.hash.replace(/^#/, "") : ""
        );
        // An expired or already-used token comes back as an error on the URL
        // rather than as a session that never arrives.
        if (hash.get("error") || hash.get("error_code") || params?.get("error")) {
          fail(EXPIRED_MESSAGE);
          return;
        }

        // Implicit link (#access_token=…): the browser client runs in PKCE
        // mode and rejects these outright ("Not a valid PKCE flow url"), so
        // adopt the tokens directly. Recovery emails sent from the Supabase
        // dashboard or the admin API arrive in exactly this shape.
        const accessToken = hash.get("access_token");
        const refreshToken = hash.get("refresh_token");
        if (accessToken && refreshToken) {
          const { error: sessionError } = await sb.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (sessionError) throw sessionError;
          window.history.replaceState(
            window.history.state,
            "",
            window.location.pathname
          );
          succeed();
          return;
        }

        // OTP link (?token_hash=…&type=recovery). Never auto-detected, and
        // the only shape that survives being opened in another browser.
        const tokenHash = params?.get("token_hash") ?? hash.get("token_hash");
        if (tokenHash) {
          const type = (params?.get("type") ?? "recovery") as EmailOtpType;
          const { error: otpError } = await sb.auth.verifyOtp({
            type,
            token_hash: tokenHash,
          });
          if (otpError) throw otpError;
          succeed();
          return;
        }

        // PKCE link (?code=…). The client exchanges this during its own
        // initialisation and CONSUMES the single-use code verifier doing so.
        // Exchanging it a second time here — which is what this page used to
        // do — always failed with "code verifier could not be found", so a
        // perfectly good link was reported as invalid. Wait for the client's
        // exchange, and only do it by hand if that clearly didn't happen.
        const code = params?.get("code");
        if (await waitForSession(sb, code ? 6000 : 1500)) {
          succeed();
          return;
        }
        if (code) {
          const { error: exchangeError } = await sb.auth.exchangeCodeForSession(code);
          if (exchangeError) throw exchangeError;
          succeed();
          return;
        }
        fail(
          "Open the reset link from your email to set a new password, or request a new one from the sign-in page."
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : "";
        fail(
          /code verifier|both auth code/i.test(message)
            ? SAME_BROWSER_MESSAGE
            : EXPIRED_MESSAGE
        );
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    <div className="flex min-h-screen items-center justify-center px-5 py-10">
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
        <div className="flex min-h-screen items-center justify-center text-[15px] text-ink-soft">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
