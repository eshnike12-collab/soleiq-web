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
        // Implicit-flow links (#access_token) are picked up automatically by
        // the client — either way a session must exist now.
        const { data } = await sb.auth.getSession();
        if (data.session) {
          setStage("ready");
        } else {
          setStage("invalid");
          setError(
            "This reset link is invalid or has expired. Request a new one from the sign-in page — and open it on the same device you asked from."
          );
        }
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
    <div className="flex min-h-screen items-center justify-center bg-[#f4f6f8] px-5 py-10">
      <main className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-brand">
          <KeyRound className="h-6 w-6" />
        </span>
        <h1 className="mt-4 text-2xl font-semibold text-slate-950">
          Set a new password
        </h1>

        {stage === "verifying" && (
          <p className="mt-4 flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Checking your reset link…
          </p>
        )}

        {stage === "invalid" && (
          <>
            <p className="mt-3 rounded-2xl bg-red-50 p-4 text-sm leading-relaxed text-red-700">
              {error}
            </p>
            <Link
              href="/login"
              className="mt-4 inline-block w-full rounded-2xl bg-brand px-4 py-3 text-center text-sm font-semibold text-white"
            >
              Back to sign in
            </Link>
          </>
        )}

        {(stage === "ready" || stage === "saving") && (
          <form onSubmit={submit} className="mt-4 space-y-3">
            <p className="text-sm text-slate-500">
              Longer than 6 characters, with at least one number or symbol.
            </p>
            {error && (
              <p className="rounded-2xl bg-red-50 p-3 text-sm text-red-700">{error}</p>
            )}
            <label className="block">
              <span className="text-xs font-medium text-slate-600">New password</span>
              <div className="mt-1 flex items-center gap-2 rounded-2xl border border-slate-200 px-3 py-2.5">
                <input
                  type={show ? "text" : "password"}
                  required
                  autoFocus
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-transparent text-sm text-slate-900 outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  aria-label={show ? "Hide password" : "Show password"}
                  className="text-slate-400"
                >
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </label>
            <label className="block">
              <span className="text-xs font-medium text-slate-600">
                Confirm new password
              </span>
              <input
                type={show ? "text" : "password"}
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none"
              />
            </label>
            <button
              type="submit"
              disabled={stage === "saving"}
              className="w-full rounded-2xl bg-brand px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
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
            <p className="mt-3 flex items-start gap-2 rounded-2xl bg-teal-50 p-4 text-sm leading-relaxed text-teal-800">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              Your password was updated. Sign in with it now.
            </p>
            <Link
              href="/login"
              className="mt-4 inline-block w-full rounded-2xl bg-brand px-4 py-3 text-center text-sm font-semibold text-white"
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
        <div className="flex min-h-screen items-center justify-center bg-[#f4f6f8] text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
