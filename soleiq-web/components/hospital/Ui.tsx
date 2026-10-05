import type { LucideIcon } from "lucide-react";

/**
 * Shared presentation primitives for the clinician and administrator portal.
 *
 * Restyled to the same medical light-blue system as the patient app rather
 * than replaced: all ten hospital pages already import these three, so
 * retuning them here restyles the whole portal without touching a page.
 *
 * Presentation only — no state, no data access, no authorization. The prop
 * shapes are unchanged so every existing call site keeps working; `description`
 * widened from `string` to `ReactNode` so a page can pass a <LocalTime>.
 */

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  /** ReactNode rather than string so callers can embed a <LocalTime>, which
   *  has to render a timestamp in the reader's timezone rather than the
   *  server's. */
  description?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-[13px] font-bold uppercase tracking-[0.07em] text-primary">
            {eyebrow}
          </p>
        )}
        <h2 className="mt-1 text-[25px] font-bold leading-[1.18] tracking-[-0.015em] text-ink sm:text-[29px]">
          {title}
        </h2>
        {description && (
          <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-ink-soft">
            {description}
          </p>
        )}
      </div>
      {action}
    </header>
  );
}

export function Metric({
  label,
  value,
  note,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  note?: string;
  icon?: LucideIcon;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-surface-raised p-5 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[13px] font-bold uppercase tracking-[0.07em] text-ink-faint">
          {label}
        </p>
        {Icon && (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
            <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
          </span>
        )}
      </div>
      <p className="mt-2 text-[28px] font-bold leading-none text-ink">{value}</p>
      {note && <p className="mt-2 text-[14px] leading-snug text-ink-soft">{note}</p>}
    </div>
  );
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-surface-raised p-8 text-center text-[15px] leading-relaxed text-ink-soft">
      {children}
    </div>
  );
}

/**
 * The portal's standard content card.
 *
 * New export, added because every hospital page was restating
 * `rounded-2xl border border-slate-200 bg-surface-raised shadow-card p-5` by hand and they had
 * drifted apart. Existing pages are free to keep their literal classes; this
 * is for the ones being touched anyway.
 */
export function Panel({
  children,
  className = "",
  padded = true,
}: {
  children: React.ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <section
      className={`rounded-2xl border border-slate-200 bg-surface-raised shadow-card ${
        padded ? "p-5 sm:p-6" : ""
      } ${className}`}
    >
      {children}
    </section>
  );
}
