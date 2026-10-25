"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, ShieldCheck, AlertTriangle } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { AppTopBar } from "@/components/chrome/AppTopBar";
import { fill, useT } from "@/lib/i18n/I18nProvider";
import type { ClaimFailure } from "@/lib/claimOutcome";
import { CLAIM_TTL_DAYS } from "@/lib/claimOutcome";

/**
 * The patient's side of the handover.
 *
 * Three states, in the order a person meets them: the offer, the sign-in, and
 * the outcome. The offer is shown BEFORE asking anyone to sign in, because
 * "create an account" is a lot to ask of someone who has not yet been told
 * what the account is for or that they can remove whoever set it up.
 */
export function ClaimRecord({ token }: { token: string }) {
  const d = useT();
  const t = d.screens.claim;
  const router = useRouter();
  const { loading, userId } = useAuth();

  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<ClaimFailure | null>(null);
  const [claimed, setClaimed] = useState(false);
  const [resendNoted, setResendNoted] = useState(false);

  const claim = async () => {
    setBusy(true);
    setFailure(null);
    try {
      const response = await fetch("/api/patient/claim", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        setFailure("unknown");
        return;
      }
      if (body?.ok) {
        setClaimed(true);
        return;
      }
      setFailure((body?.reason as ClaimFailure) ?? "unknown");
    } catch {
      setFailure("unknown");
    } finally {
      setBusy(false);
    }
  };

  const requestNewLink = async () => {
    setBusy(true);
    try {
      await fetch("/api/patient/claim", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "request_new_link", token }),
      });
    } catch {
      /* The acknowledgement below is deliberately identical either way: this
         page is reachable by anyone holding a dead link, so whether a record
         exists for it must not be inferable from the response. */
    } finally {
      setResendNoted(true);
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <AppTopBar />
      <main className="mx-auto w-full max-w-xl flex-1 px-5 py-8">
        {claimed ? (
          <Outcome
            tone="good"
            title={t.successTitle}
            body={t.successBody}
            action={
              <Button fullWidth size="lg" onClick={() => router.replace("/home")}>
                {t.successCta}
              </Button>
            }
          />
        ) : failure ? (
          <FailureView
            failure={failure}
            t={t}
            busy={busy}
            resendNoted={resendNoted}
            onRequestNewLink={requestNewLink}
          />
        ) : (
          <>
            <p className="mc-section-title text-primary">{t.eyebrow}</p>
            <h1 className="mt-1 text-[26px] font-bold leading-tight text-ink">
              {t.title}
            </h1>

            <div className="mt-5 space-y-3">
              {/* Deliberately does not name the caregiver. This page is
                  reachable before sign-in, so it cannot verify who created the
                  record — and the signed-in profile is the PATIENT's, not the
                  caregiver's. The invitation email, which does know, carries
                  the name; naming anyone here would be a guess. */}
              <p className="text-[15px] leading-relaxed text-ink-soft">{t.intro}</p>
              <p className="text-[15px] leading-relaxed text-ink-soft">
                {t.whatHappens}
              </p>
              <div className="flex items-start gap-2.5 rounded-2xl bg-primary-soft p-3.5">
                <ShieldCheck className="mt-0.5 h-[18px] w-[18px] shrink-0 text-primary" />
                <p className="text-[14px] font-semibold leading-snug text-primary-deep">
                  {t.canRemove}
                </p>
              </div>
            </div>

            <div className="mt-6">
              {loading ? (
                <p className="flex items-center gap-2 text-[15px] text-ink-soft">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  {d.common.loading}
                </p>
              ) : userId ? (
                <Button fullWidth size="lg" disabled={busy} onClick={claim}>
                  {busy ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" /> {t.claiming}
                    </span>
                  ) : (
                    t.claimCta
                  )}
                </Button>
              ) : (
                <>
                  <p className="mb-3 text-[14px] leading-snug text-ink-soft">
                    {t.signInPrompt}
                  </p>
                  {/* The token travels in `next` so signing up and coming back
                      does not lose it. */}
                  <Link
                    href={`/login?next=${encodeURIComponent(`/claim/${token}`)}`}
                    className="inline-flex min-h-[48px] w-full items-center justify-center rounded-2xl bg-primary px-4 text-[15px] font-bold text-white shadow-button transition-transform duration-150 active:scale-[0.98]"
                  >
                    {t.signInCta}
                  </Link>
                </>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function FailureView({
  failure,
  t,
  busy,
  resendNoted,
  onRequestNewLink,
}: {
  failure: ClaimFailure;
  t: ReturnType<typeof useT>["screens"]["claim"];
  busy: boolean;
  resendNoted: boolean;
  onRequestNewLink: () => void;
}) {
  /* Every failure gets its own words. They are genuinely different problems
     and a single "invalid link" would send the wrong person looking for the
     wrong fix — particularly email_mismatch, which is what a caregiver sees
     when they follow the link themselves. */
  const copy: Record<ClaimFailure, { title: string; body: string; offerResend: boolean }> = {
    invalid_or_expired: {
      title: t.expiredTitle,
      body: fill(t.expiredBody, { days: CLAIM_TTL_DAYS }),
      offerResend: true,
    },
    already_claimed: { title: t.usedTitle, body: t.usedBody, offerResend: true },
    email_mismatch: {
      title: t.mismatchTitle,
      body: t.mismatchBody,
      offerResend: false,
    },
    account_already_linked: {
      title: t.linkedTitle,
      body: t.linkedBody,
      offerResend: false,
    },
    unknown: { title: t.unknownTitle, body: t.unknownBody, offerResend: true },
  };
  const { title, body, offerResend } = copy[failure];

  return (
    <Outcome
      tone="bad"
      title={title}
      body={body}
      action={
        offerResend ? (
          resendNoted ? (
            <p className="text-[14px] leading-snug text-ink-soft">{t.requestNewSent}</p>
          ) : (
            <Button fullWidth variant="outline" disabled={busy} onClick={onRequestNewLink}>
              {t.requestNewCta}
            </Button>
          )
        ) : null
      }
    />
  );
}

function Outcome({
  tone,
  title,
  body,
  action,
}: {
  tone: "good" | "bad";
  title: string;
  body: string;
  action: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center py-6 text-center">
      <span
        className={`flex h-14 w-14 items-center justify-center rounded-full ${
          tone === "good" ? "bg-secondary-soft" : "bg-warn-soft"
        }`}
      >
        {tone === "good" ? (
          <CheckCircle2 className="h-7 w-7 text-secondary" />
        ) : (
          <AlertTriangle className="h-7 w-7 text-warn" />
        )}
      </span>
      <h1 className="mt-4 text-[22px] font-bold leading-tight text-ink">{title}</h1>
      <p className="mt-2 max-w-[340px] text-[15px] leading-relaxed text-ink-soft">
        {body}
      </p>
      {action && <div className="mt-6 w-full max-w-[320px]">{action}</div>}
    </div>
  );
}
