"use client";

import Link from "next/link";
import { ReactNode } from "react";
import { BrandNavLockup } from "@/components/brand/Logo";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { WebsiteLink } from "./WebsiteLink";
import { useT } from "@/lib/i18n/I18nProvider";

/**
 * The bar across the top of the app, laid out the way soleiqhealth.com lays
 * out its own, so the two properties read as one product.
 *
 * Left cluster: the orb logo, then the cross-property button. On the site that
 * button goes to the app; here it goes back to the site, and it sits in
 * exactly the same place. Right: the language switcher, then whatever the
 * screen wants there — sign out, feedback, a role chip.
 *
 * Both left items are given the same height on one `items-center` row, which
 * is what keeps the badge and the button on a single optical line rather than
 * one riding below the other.
 */
export function AppTopBar({
  title,
  actions,
}: {
  /** Page identity — shown after the cross-property button, and truncated. */
  title?: ReactNode;
  /** Screen-specific controls for the right-hand end. */
  actions?: ReactNode;
}) {
  const d = useT();
  return (
    <header className="shrink-0 border-b border-brand-muted/15 bg-white/[0.82] backdrop-blur-md">
      {/* The site's own `.shell`: 74rem wide, 1.5rem of gutter that becomes
          2.5rem from md up. The bar keeps this measure whatever the page
          beneath it uses, which is the whole point — the logo has to land on
          the same pixel on both properties, not on whatever column this
          particular screen happens to have. */}
      <div className="mx-auto flex h-[4.75rem] w-full max-w-[74rem] items-center gap-3 px-6 md:px-10">
        <div className="flex min-w-0 shrink items-center gap-3 sm:gap-5">
          <Link
            href="/"
            aria-label={d.nav.home}
            className="flex h-10 min-w-0 items-center rounded"
          >
            {/* Always the full lockup, including "Health", exactly as the site
                shows it. It used to drop the wordmark whenever a title was
                present, which meant the brand moved and changed shape from one
                screen to the next — and never matched the site at all. */}
            <BrandNavLockup size={38} />
          </Link>

          <WebsiteLink />

          {title && <div className="min-w-0 truncate">{title}</div>}
        </div>

        <div className="ms-auto flex shrink-0 items-center gap-3">
          <LanguageSwitcher />
          {actions}
        </div>
      </div>
    </header>
  );
}
