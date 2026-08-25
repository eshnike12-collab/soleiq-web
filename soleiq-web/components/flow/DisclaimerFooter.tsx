"use client";

import { useT } from "@/lib/i18n/I18nProvider";

export function DisclaimerFooter() {
  const d = useT();
  return (
    <footer className="shrink-0 border-t border-slate-100 bg-surface-raised/80 px-5 py-2.5 text-center backdrop-blur-sm">
      <p className="text-[11px] italic leading-snug text-ink-faint">
        {d.flow.disclaimer}
      </p>
    </footer>
  );
}
