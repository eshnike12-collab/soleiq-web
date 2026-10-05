"use client";

import Link from "next/link";
import { Camera, ChevronDown, Home, LayoutGrid } from "lucide-react";
import { BrandNavLockup } from "@/components/brand/Logo";
import { PATIENT_FEATURES } from "./patientFeatures";

/**
 * Patient portal navigation.
 *
 * Two destinations, not five: Home, and Features. Progress and Care Team were
 * promoted into the bar during the redesign and have gone back into Features,
 * where the rest of the list already lives — a bar that lifts two items out of
 * an eleven-item hub mostly raises the question of why those two.
 *
 * On desktop, Features is both a link and a menu: hovering (or focusing)
 * opens the full list so any feature is one move away, and clicking goes to
 * the hub exactly as before. The menu is a convenience on top of the link, not
 * a replacement for it — so it costs nothing on touch, where hover does not
 * exist and the tap simply follows the link.
 *
 * Client component because the dropdown needs hover/focus state. The `active`
 * prop still drives the current tab, so every existing call site is unchanged.
 */

export type PatientNavTab =
  | "home"
  | "features"
  /** Accepted aliases from before the bar was reduced. All light Features. */
  | "progress"
  | "care-team"
  | "scan";

function isFeatures(active?: PatientNavTab) {
  return active !== undefined && active !== "home";
}

export function PatientNav({ active }: { active?: PatientNavTab }) {
  const homeActive = active === "home";
  const featuresActive = isFeatures(active);

  return (
    <>
      {/* ── Mobile / tablet: bottom bar ─────────────────────────────────── */}
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-surface-raised/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        <div className="mx-auto flex max-w-3xl items-stretch justify-around gap-2 px-4 py-1.5">
          <Link
            href="/home"
            aria-current={homeActive ? "page" : undefined}
            className={`flex min-h-[44px] flex-1 flex-col items-center justify-center gap-1 rounded-xl px-2 py-1.5 text-[11px] font-semibold transition-colors ${
              homeActive ? "text-primary" : "text-ink-faint hover:text-ink-soft"
            }`}
          >
            <Home className="h-[22px] w-[22px]" aria-hidden="true" />
            Home
          </Link>

          {/* The one action the portal exists to prompt. */}
          <Link
            href="/"
            aria-label="Start foot check"
            className="group flex min-h-[44px] flex-1 flex-col items-center gap-1 px-2 text-[11px] font-semibold text-ink-soft"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-white shadow-button transition-transform duration-150 group-active:scale-95">
              <Camera className="h-[22px] w-[22px]" aria-hidden="true" />
            </span>
            Check
          </Link>

          <Link
            href="/features"
            aria-current={featuresActive ? "page" : undefined}
            className={`flex min-h-[44px] flex-1 flex-col items-center justify-center gap-1 rounded-xl px-2 py-1.5 text-[11px] font-semibold transition-colors ${
              featuresActive ? "text-primary" : "text-ink-faint hover:text-ink-soft"
            }`}
          >
            <LayoutGrid className="h-[22px] w-[22px]" aria-hidden="true" />
            Features
          </Link>
        </div>
      </nav>

      {/* ── Desktop: left sidebar ───────────────────────────────────────── */}
      <nav
        aria-label="Main"
        className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-slate-200 bg-surface-raised lg:flex"
      >
        <div className="flex h-[4.75rem] shrink-0 items-center border-b border-slate-200 px-6">
          <Link
            href="/home"
            aria-label="SoleIQ Health home"
            /* min-h-11: the lockup is 34px tall, which left this under the
               44px target every other control here meets. */
            className="flex min-h-[44px] items-center rounded"
          >
            <BrandNavLockup size={34} />
          </Link>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-6">
          <Link
            href="/"
            className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-[15px] font-bold text-white shadow-button transition-colors hover:bg-primary-deep"
          >
            <Camera className="h-[18px] w-[18px]" aria-hidden="true" />
            Start Foot Check
          </Link>

          <ul className="mt-7 space-y-1">
            <li>
              <Link
                href="/home"
                aria-current={homeActive ? "page" : undefined}
                className={`flex min-h-[44px] items-center gap-3 rounded-xl px-3 text-[15px] font-semibold transition-colors ${
                  homeActive
                    ? "bg-primary-soft text-primary"
                    : "text-ink-soft hover:bg-slate-50 hover:text-ink"
                }`}
              >
                <Home className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
                Home
              </Link>
            </li>

            {/* Features: a link that also reveals the list.
                `group` + focus-within so it opens on hover AND on keyboard
                focus — a menu that only answers to a mouse is not a menu for
                everyone. The flyout is positioned, not conditionally
                rendered, so every item stays in the tab order and a screen
                reader can walk the list without a pointer. */}
            <li className="group relative">
              <Link
                href="/features"
                aria-current={featuresActive ? "page" : undefined}
                className={`flex min-h-[44px] items-center gap-3 rounded-xl px-3 text-[15px] font-semibold transition-colors ${
                  featuresActive
                    ? "bg-primary-soft text-primary"
                    : "text-ink-soft hover:bg-slate-50 hover:text-ink"
                }`}
              >
                <LayoutGrid className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
                Features
                <ChevronDown
                  className="ms-auto h-4 w-4 shrink-0 transition-transform duration-150 group-hover:-rotate-180 group-focus-within:-rotate-180"
                  aria-hidden="true"
                />
              </Link>

              <div
                className="pointer-events-none invisible absolute left-full top-0 z-50 w-[17rem] pl-2 opacity-0 transition-opacity duration-150 group-hover:pointer-events-auto group-hover:visible group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:visible group-focus-within:opacity-100 motion-reduce:transition-none"
              >
                <ul className="max-h-[70vh] overflow-y-auto rounded-2xl border border-slate-200 bg-surface-raised p-2 shadow-lifted">
                  {PATIENT_FEATURES.map((feature) => (
                    <li key={feature.href}>
                      <Link
                        href={feature.href}
                        className="flex min-h-[44px] items-center gap-3 rounded-xl px-3 text-[15px] font-medium text-ink-soft transition-colors hover:bg-slate-50 hover:text-ink"
                      >
                        <feature.icon
                          className="h-[18px] w-[18px] shrink-0 text-primary"
                          aria-hidden="true"
                        />
                        {feature.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </li>
          </ul>
        </div>

        <div className="shrink-0 border-t border-slate-200 px-6 py-4">
          <p className="text-[12px] leading-snug text-ink-faint">
            SoleIQ is a wellness monitoring tool and is not a substitute for
            professional medical diagnosis.
          </p>
        </div>
      </nav>
    </>
  );
}

/** Spacer matching the bottom bar's height, for pages that prefer it over pb-24. */
export function PatientNavSpacer() {
  return <div className="h-20 lg:h-0" aria-hidden="true" />;
}
