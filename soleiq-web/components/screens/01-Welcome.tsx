"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FolderOpen, LogOut, ShieldCheck, Stethoscope } from "lucide-react";
import { useSoleiqStore } from "@/lib/store";
import { signOut, useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export function Welcome() {
  const goNext = useSoleiqStore((s) => s.goNext);
  const { profile } = useAuth();
  const router = useRouter();

  return (
    <div className="flex h-full flex-col items-center justify-center text-center">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", duration: 0.6 }}
        className="mb-8 flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-brand to-blue-800 text-3xl font-bold text-white shadow-[0_20px_40px_-15px_rgba(31,78,121,0.6)]"
      >
        SQ
      </motion.div>
      <h1 className="text-3xl font-semibold text-warmGray-800">SoleIQ</h1>
      <p className="mt-2 max-w-[280px] text-sm leading-snug text-warmGray-600">
        AI-assisted diabetic foot screening — clinician decision support for
        primary care and podiatry visits.
      </p>
      <div className="mt-10 w-full max-w-[300px]">
        <Button fullWidth size="lg" onClick={goNext}>
          Start patient visit
        </Button>
        <Link
          href="/home"
          className="mt-2 inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-2xl border border-warmGray-100 bg-white text-sm font-semibold text-brand"
        >
          <FolderOpen className="h-4 w-4" /> My dashboard
        </Link>
        <p className="mt-3 text-[11px] text-warmGray-600">
          ~4 minutes per patient. For clinical use.
        </p>

        {/* View switcher — admins can enter any point of view; doctors get
            their dashboard. Patients see nothing extra. UX only; RLS still
            decides what each role can actually read. */}
        {(profile?.role === "admin" || profile?.role === "doctor") && (
          <div className="mt-4 grid gap-2">
            {profile.role === "admin" && (
              <Link
                href="/admin"
                className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-2xl bg-warmGray-800 text-xs font-semibold text-white"
              >
                <ShieldCheck className="h-3.5 w-3.5" /> Admin console
              </Link>
            )}
            <Link
              href="/dashboard"
              className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-2xl border border-warmGray-100 bg-white text-xs font-semibold text-warmGray-800"
            >
              <Stethoscope className="h-3.5 w-3.5" /> Doctor dashboard
            </Link>
          </div>
        )}
      </div>

      {profile && (
        <div className="mt-8 flex items-center gap-2 text-[11px] text-warmGray-600">
          <span>
            Signed in as{" "}
            <span className="font-medium text-warmGray-800">
              {profile.email ?? "your account"}
            </span>{" "}
            ({profile.role})
          </span>
          <button
            type="button"
            onClick={() => {
              void signOut().then(() => router.replace("/login"));
            }}
            className="inline-flex items-center gap-1 font-medium text-brand"
          >
            <LogOut className="h-3 w-3" /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}
