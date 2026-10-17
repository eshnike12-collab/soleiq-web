import { ArrowRight, Mail } from "lucide-react";
import Link from "next/link";
import { RISK_ORDER, type MonthlyReportStats, type ReportWindow } from "@/lib/monthlyReport";
import { Metric } from "./Ui";

/**
 * The monthly operator report, shown on screen.
 *
 * The same figures the emailed report carries, so the inbox and the dashboard
 * can be reconciled rather than quietly disagreeing. Presentation only — the
 * caller has already proved the reader is a platform administrator.
 *
 * Aggregate counts only, for the reason given in lib/monthlyReport.ts.
 */

const RISK_LABEL: Record<string, string> = {
  clear: "Clear",
  watch: "Watch",
  see_someone_soon: "See someone soon",
  urgent: "Urgent",
};

const RISK_TINT: Record<string, string> = {
  clear: "bg-secondary-soft text-secondary",
  watch: "bg-warn-soft text-warn",
  see_someone_soon: "bg-orange-100 text-orange-700",
  urgent: "bg-urgent-soft text-urgent",
};

export function PlatformMonthlyPanel({
  current,
  currentStats,
  previous,
  previousStats,
  reportRecipient,
}: {
  current: ReportWindow;
  currentStats: MonthlyReportStats;
  previous: ReportWindow;
  previousStats: MonthlyReportStats;
  /** Shown so the operator can see where the email goes without guessing. */
  reportRecipient: string;
}) {
  const figures: { label: string; now: number; before: number }[] = [
    { label: "New sign-ups", now: currentStats.newSignups, before: previousStats.newSignups },
    { label: "Foot checks started", now: currentStats.checksStarted, before: previousStats.checksStarted },
    { label: "Reports released", now: currentStats.reportsReleased, before: previousStats.reportsReleased },
    { label: "New enrollments", now: currentStats.newEnrollments, before: previousStats.newEnrollments },
  ];

  return (
    <section className="rounded-2xl border border-slate-200 bg-surface-raised p-5 shadow-card sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[13px] font-bold uppercase tracking-[0.07em] text-primary">
            Platform report
          </p>
          <h3 className="mt-1 text-[19px] font-bold text-ink">
            {current.label} so far
          </h3>
          <p className="mt-1 text-[14px] text-ink-soft">
            Compared with {previous.label}. Aggregate counts only — no
            patient-identifying or clinical information.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1.5 text-[13px] font-semibold text-primary">
          <Mail className="h-3.5 w-3.5" aria-hidden="true" />
          Emailed monthly
        </span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {figures.map((f) => (
          <Metric
            key={f.label}
            label={f.label}
            value={f.now}
            note={`${previous.label}: ${f.before}`}
          />
        ))}
      </div>

      <h4 className="mt-6 text-[13px] font-bold uppercase tracking-[0.07em] text-ink-faint">
        Reports by screening level · {current.label}
      </h4>
      <div className="mt-2 flex flex-wrap gap-2">
        {RISK_ORDER.map((level) => (
          <span
            key={level}
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[13px] font-semibold ${
              RISK_TINT[level] ?? "bg-slate-100 text-ink-soft"
            }`}
          >
            {RISK_LABEL[level]}
            <span className="font-bold">{currentStats.byRiskLevel[level] ?? 0}</span>
          </span>
        ))}
      </div>

      {currentStats.partial && (
        <p
          role="status"
          className="mt-5 rounded-xl bg-warn-soft px-4 py-3 text-[14px] leading-relaxed text-warn"
        >
          <span className="font-bold">Incomplete.</span>{" "}
          {currentStats.unavailable.join(", ")} could not be read, so those
          figures show as zero rather than a real count.
        </p>
      )}

      <p className="mt-5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-ink-faint">
        <span>
          Sent on the 1st of each month to{" "}
          <span className="font-semibold text-ink-soft">{reportRecipient}</span>.
        </span>
        <Link
          href="/platform"
          className="inline-flex min-h-[44px] items-center gap-1 font-bold text-primary transition-colors hover:text-primary-deep"
        >
          Platform console <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </p>
    </section>
  );
}
