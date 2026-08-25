"use client";

import { ArrowUpRight } from "lucide-react";
import { WEBSITE_URL, withLocale } from "@/lib/i18n/config";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { cn } from "@/lib/utils";

/**
 * The way back to soleiqhealth.com.
 *
 * The mirror image of the marketing site's own button: same left cluster,
 * immediately beside the logo, same height as the logo so the two sit on one
 * optical line, same trailing arrow. There it says "App" and points here;
 * here it says "Website" and points there.
 *
 * The chosen language rides along in the URL. localStorage cannot cross from
 * app.soleiqhealth.com to soleiqhealth.com — they are separate origins — so
 * without this someone who picked Bengali here would land on the marketing
 * site in whatever their browser happens to ask for.
 */
export function WebsiteLink({ className }: { className?: string }) {
  const { d, locale } = useI18n();
  return (
    <a
      href={withLocale(WEBSITE_URL, locale)}
      aria-label={d.nav.websiteAria}
      /* The site's `.btn .btn-primary .btn-sm`, value for value: its deep
         navy rather than the app's lighter primary, an 8px radius rather than
         16px, medium weight rather than bold, its 15px side padding, and no
         shadow. The app's own buttons are untouched — only this one has a
         twin on another domain to match. */
      className={cn(
        "inline-flex h-10 shrink-0 items-center gap-2 rounded-lg bg-brand-ink px-[0.9375rem]",
        "text-sm font-medium leading-none text-white",
        "transition-colors duration-150 hover:bg-brand-ink/90",
        className
      )}
    >
      {d.nav.website}
      <ArrowUpRight size={15} aria-hidden="true" className="rtl-flip" />
    </a>
  );
}
