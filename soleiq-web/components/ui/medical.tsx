import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Shared presentation primitives for the patient app.
 *
 * Presentation only — nothing here holds state, calls an API, or decides
 * anything clinical. They exist so the same card, the same section heading and
 * the same empty state are not restated with slightly different padding on
 * every screen, and so the whole app's surface treatment can be retuned in one
 * file rather than twenty.
 *
 * `Card` and `Button` in this folder already covered the two commonest cases
 * and are deliberately left alone; these fill the gaps around them.
 *
 * STATUS COLOUR IS NEVER THE ONLY SIGNAL. Every status surface below pairs its
 * tint with a word and, where one is given, an icon — a patient with diabetic
 * retinopathy or colour-blindness has to be able to read the state, and a
 * colour alone would not survive a greyscale print of a report either.
 */

/* ── Status vocabulary ──────────────────────────────────────────────────────
   Named for what they MEAN, not what colour they are, so a screen says
   `tone="attention"` and the palette decision stays here. These map onto the
   app's existing four risk levels plus a neutral. */
export type MedicalTone = "neutral" | "positive" | "attention" | "urgent" | "info";

const TONE: Record<
  MedicalTone,
  { chip: string; panel: string; icon: string; rule: string }
> = {
  neutral: {
    chip: "bg-slate-100 text-ink-soft",
    panel: "border-slate-200 bg-slate-50",
    icon: "bg-slate-100 text-ink-soft",
    rule: "bg-slate-300",
  },
  positive: {
    chip: "bg-secondary-soft text-secondary",
    panel: "border-teal-200 bg-secondary-soft",
    icon: "bg-secondary-soft text-secondary",
    rule: "bg-teal-400",
  },
  attention: {
    chip: "bg-warn-soft text-warn",
    panel: "border-amber-200 bg-warn-soft",
    icon: "bg-warn-soft text-warn",
    rule: "bg-amber-400",
  },
  urgent: {
    chip: "bg-urgent-soft text-urgent",
    panel: "border-red-200 bg-urgent-soft",
    icon: "bg-urgent-soft text-urgent",
    rule: "bg-red-500",
  },
  info: {
    chip: "bg-primary-soft text-primary",
    panel: "border-blue-200 bg-primary-soft",
    icon: "bg-primary-soft text-primary",
    rule: "bg-blue-400",
  },
};

/* ── Page header ──────────────────────────────────────────────────────────── */
export function PageHeader({
  eyebrow,
  title,
  description,
  action,
  className,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "flex flex-wrap items-start justify-between gap-4 gap-y-3",
        className
      )}
    >
      <div className="min-w-0">
        {eyebrow && <p className="mc-section-title">{eyebrow}</p>}
        {/* h1 because this names the page. Size steps up at `sm` so a long
            title does not wrap three times on a 360px phone. */}
        <h1 className="mt-1 text-[25px] font-bold leading-[1.18] tracking-[-0.015em] text-ink sm:text-[29px]">
          {title}
        </h1>
        {description && (
          <p className="mt-2 max-w-2xl text-[16px] leading-relaxed text-ink-soft">
            {description}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}

/* ── Section heading ──────────────────────────────────────────────────────── */
export function SectionHeader({
  title,
  icon: Icon,
  action,
  className,
}: {
  title: ReactNode;
  icon?: LucideIcon;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-between gap-3", className)}>
      <h2 className="flex items-center gap-2 text-[19px] font-bold leading-tight text-ink">
        {Icon && <Icon className="h-[18px] w-[18px] shrink-0 text-primary" aria-hidden="true" />}
        {title}
      </h2>
      {action}
    </div>
  );
}

/* ── Card ─────────────────────────────────────────────────────────────────── */
export function MedicalCard({
  children,
  className,
  as: Tag = "section",
  padded = true,
}: {
  children: ReactNode;
  className?: string;
  as?: "section" | "div" | "article" | "li";
  padded?: boolean;
}) {
  return (
    <Tag
      className={cn(
        "rounded-2xl border border-slate-200 bg-surface-raised shadow-card",
        padded && "p-5 sm:p-6",
        className
      )}
    >
      {children}
    </Tag>
  );
}

/* ── Status chip ──────────────────────────────────────────────────────────── */
export function StatusChip({
  tone = "neutral",
  children,
  icon: Icon,
  className,
}: {
  tone?: MedicalTone;
  children: ReactNode;
  icon?: LucideIcon;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[13px] font-semibold",
        TONE[tone].chip,
        className
      )}
    >
      {Icon && <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
      {children}
    </span>
  );
}

/* ── Alert / callout ──────────────────────────────────────────────────────── */
export function MedicalAlert({
  tone = "info",
  title,
  children,
  icon: Icon,
  className,
}: {
  tone?: MedicalTone;
  title?: ReactNode;
  children?: ReactNode;
  icon?: LucideIcon;
  className?: string;
}) {
  return (
    <div
      // `status` rather than `alert`: these are informational panels rendered
      // with the page, not interruptions, and `alert` would make a screen
      // reader talk over whatever the reader is doing.
      role="status"
      className={cn("rounded-2xl border p-4 sm:p-5", TONE[tone].panel, className)}
    >
      <div className="flex gap-3">
        {Icon && (
          <Icon
            className={cn(
              "mt-0.5 h-5 w-5 shrink-0",
              tone === "urgent" ? "text-urgent" : tone === "attention" ? "text-warn" : tone === "positive" ? "text-secondary" : "text-primary"
            )}
            aria-hidden="true"
          />
        )}
        <div className="min-w-0">
          {title && <p className="font-bold text-ink">{title}</p>}
          {children && (
            <div className={cn("text-[15px] leading-relaxed text-ink-soft", title && "mt-1")}>
              {children}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Empty state ──────────────────────────────────────────────────────────── */
export function EmptyState({
  icon: Icon,
  title,
  children,
  action,
  tone = "info",
  className,
}: {
  icon?: LucideIcon;
  title?: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  tone?: MedicalTone;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center px-4 py-8 text-center", className)}>
      {Icon && (
        <span
          className={cn(
            "flex h-14 w-14 items-center justify-center rounded-2xl",
            TONE[tone].icon
          )}
        >
          <Icon className="h-7 w-7" aria-hidden="true" />
        </span>
      )}
      {title && <p className="mt-4 text-[17px] font-bold text-ink">{title}</p>}
      {children && (
        <div className="mt-2 max-w-md text-[15px] leading-relaxed text-ink-soft">
          {children}
        </div>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/* ── Loading state ────────────────────────────────────────────────────────── */
export function LoadingState({
  label = "Loading…",
  rows = 3,
  className,
}: {
  /** Announced to assistive tech; the bars themselves are decorative. */
  label?: string;
  rows?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-3", className)} role="status" aria-live="polite">
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          aria-hidden="true"
          className="h-24 animate-pulse rounded-2xl border border-slate-200 bg-surface-raised"
        />
      ))}
    </div>
  );
}

/* ── Metric ───────────────────────────────────────────────────────────────── */
export function MetricCard({
  label,
  value,
  note,
  icon: Icon,
  tone = "info",
  className,
}: {
  label: ReactNode;
  value: ReactNode;
  note?: ReactNode;
  icon?: LucideIcon;
  tone?: MedicalTone;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-200 bg-surface-raised p-5 shadow-card",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="mc-section-title">{label}</p>
        {Icon && (
          <span
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
              TONE[tone].icon
            )}
          >
            <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
          </span>
        )}
      </div>
      <p className="mt-2 text-[28px] font-bold leading-none text-ink">{value}</p>
      {note && <p className="mt-2 text-[14px] leading-snug text-ink-soft">{note}</p>}
    </div>
  );
}

/* ── Timeline row ─────────────────────────────────────────────────────────── */
export function TimelineItem({
  children,
  tone = "info",
  last = false,
  className,
}: {
  children: ReactNode;
  tone?: MedicalTone;
  /** Suppresses the connecting rule under the final entry. */
  last?: boolean;
  className?: string;
}) {
  return (
    <li className={cn("relative flex gap-4", className)}>
      {/* The rail. Decorative, so it is hidden from assistive tech — the list
          semantics already convey the sequence. */}
      <div className="flex shrink-0 flex-col items-center" aria-hidden="true">
        <span
          className={cn(
            "mt-1.5 h-3 w-3 shrink-0 rounded-full ring-4 ring-surface-raised",
            TONE[tone].rule
          )}
        />
        {!last && <span className="mt-1 w-px flex-1 bg-slate-200" />}
      </div>
      <div className={cn("min-w-0 flex-1", last ? "pb-0" : "pb-5")}>{children}</div>
    </li>
  );
}
