"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FolderOpen, LogOut, ShieldCheck, Stethoscope } from "lucide-react";
import { BrandLockup } from "@/components/brand/Logo";
import { useSoleiqStore } from "@/lib/store";
import { loadSavedIntake } from "@/lib/intake";
import { signOut, useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { CenteredScreen } from "@/components/flow/ScreenContainer";
import { fill, useT } from "@/lib/i18n/I18nProvider";

export function Welcome() {
  const d = useT();
  const goNext = useSoleiqStore((s) => s.goNext);
  const { profile, memberships } = useAuth();
  const router = useRouter();

  // Returning patient in a fresh session: pull the answers saved with their
  // last completed assessment so the questionnaire starts prefilled and the
  // review screen activates. Session answers (mid-flow) are never clobbered.
  useEffect(() => {
    const state = useSoleiqStore.getState();
    const sessionProfile = state.profile;
    const hasSessionAnswers =
      sessionProfile.hasSavedIntake ||
      sessionProfile.fullName ||
      sessionProfile.age != null ||
      (sessionProfile.conditions?.length ?? 0) > 0;
    if (hasSessionAnswers) return;
    let cancelled = false;
    void loadSavedIntake().then((saved) => {
      if (cancelled || !saved) return;
      useSoleiqStore.getState().updateProfile({ ...saved, hasSavedIntake: true });
    });
    return () => {
      cancelled = true;
    };
  }, []);
  const adminMembership = memberships.find(
    (membership) => membership.status === "active" && membership.role === "admin"
  );
  const doctorMembership = memberships.find(
    (membership) => membership.status === "active" && membership.role === "doctor"
  );

  return (
    <CenteredScreen>
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", duration: 0.6 }}
        className="mb-6"
      >
        <BrandLockup large />
      </motion.div>
      <p className="mt-2 max-w-[290px] text-[15px] leading-relaxed text-ink-soft">
        {d.welcome.intro}
      </p>
      <div className="mt-10 w-full max-w-[300px]">
        <Button fullWidth size="lg" onClick={goNext}>
          {d.welcome.start}
        </Button>
        <Link
          href="/home"
          className="mt-2 inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-2xl border border-slate-200 bg-surface-raised text-sm font-bold text-primary transition-all duration-150 hover:border-slate-300 active:scale-[0.98]"
        >
          <FolderOpen className="h-4 w-4" /> {d.nav.dashboard}
        </Link>
        <p className="mt-3 text-xs text-ink-faint">
          {d.welcome.duration}
        </p>

        {/* View switcher — admins can enter any point of view; doctors get
            their dashboard. Patients see nothing extra. UX only; RLS still
            decides what each role can actually read. */}
        {(adminMembership || doctorMembership) && (
          <div className="mt-4 grid gap-2">
            {adminMembership?.organizations?.slug && (
              <Link
                href={`/h/${adminMembership.organizations.slug}/admin`}
                className="inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-2xl bg-ink text-xs font-semibold text-white transition-all duration-150 active:scale-[0.98]"
              >
                <ShieldCheck className="h-3.5 w-3.5" /> {d.nav.adminConsole}
              </Link>
            )}
            {doctorMembership?.organizations?.slug && (
              <Link
                href={`/h/${doctorMembership.organizations.slug}/doctor`}
                className="inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-2xl border border-slate-200 bg-surface-raised text-xs font-semibold text-ink transition-all duration-150 hover:border-slate-300 active:scale-[0.98]"
              >
                <Stethoscope className="h-3.5 w-3.5" /> {d.nav.doctorDashboard}
              </Link>
            )}
          </div>
        )}
      </div>

      {profile && (
        <div className="mt-8 flex items-center gap-2 text-xs text-ink-faint">
          <span>
            {fill(d.nav.signedInAs, {
              email: profile.email ?? d.nav.yourAccount,
            })}{" "}
            {memberships.length > 0
              ? `(${memberships.map((membership) => membership.role).join(", ")})`
              : `(${d.nav.noMembership})`}
          </span>
          <button
            type="button"
            onClick={() => {
              void signOut().then(() => router.replace("/login"));
            }}
            className="inline-flex min-h-[44px] items-center gap-1 font-semibold text-primary"
          >
            <LogOut className="h-3 w-3" /> {d.nav.signOut}
          </button>
        </div>
      )}
    </CenteredScreen>
  );
}
