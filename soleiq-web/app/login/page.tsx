"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  signInWithPassword,
  signUpWithPassword,
  useAuth,
} from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Mode = "signin" | "signup";

export default function LoginPage() {
  const router = useRouter();
  const auth = useAuth();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (auth.profile?.role === "super_admin") {
    if (typeof window !== "undefined") router.replace("/admin");
  } else if (auth.profile?.role === "clinic_admin") {
    if (typeof window !== "undefined") router.replace("/dashboard");
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      if (mode === "signin") {
        await signInWithPassword(email.trim(), password);
        router.refresh();
      } else {
        await signUpWithPassword(email.trim(), password);
        setInfo(
          "Account created. If email confirmation is enabled in Supabase, check your inbox first; otherwise you can sign in now."
        );
        setMode("signin");
      }
    } catch (err) {
      setError((err as Error).message ?? "Failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center px-6 py-10">
      <h1 className="text-2xl font-semibold text-warmGray-800">
        {mode === "signin" ? "Staff sign in" : "Create staff account"}
      </h1>
      <p className="mt-1 text-sm text-warmGray-600">
        Patients don't need an account —{" "}
        <Link href="/" className="text-brand">
          continue as patient
        </Link>
        .
      </p>

      <div className="mt-5 inline-flex rounded-xl bg-warmGray-50 p-1 text-sm">
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
              mode === m
                ? "bg-white text-brand shadow-sm"
                : "text-warmGray-600"
            )}
          >
            {m === "signin" ? "Sign in" : "Sign up"}
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
          {busy
            ? mode === "signin"
              ? "Signing in…"
              : "Creating…"
            : mode === "signin"
            ? "Sign in"
            : "Create account"}
        </Button>
      </form>

      <p className="mt-6 text-xs text-warmGray-600">
        New accounts default to <span className="font-mono">patient</span> role.
        To unlock <span className="font-mono">clinic_admin</span> or{" "}
        <span className="font-mono">super_admin</span>, run this in your Supabase
        SQL editor:
      </p>
      <pre className="mt-2 overflow-x-auto rounded-lg bg-warmGray-50 p-2 text-[11px] text-warmGray-800">
{`select public.promote_to_super_admin('your@email.com');
-- or:
update profiles set role = 'clinic_admin'
where email = 'your@email.com';`}
      </pre>
    </div>
  );
}
