"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Loader2 } from "lucide-react";
import { RANGE_LABEL, type StatsRange } from "@/lib/platformReport";

/**
 * Usage over time, for the platform operator.
 *
 * Four series, all counted from real timestamps — nothing here is modelled,
 * smoothed, or extrapolated:
 *
 *   Active users  distinct accounts that opened the app in the bucket
 *   Sign-ups      accounts created
 *   Checks        screening sessions started
 *   Reports       reports released
 *
 * HONESTY ABOUT "ACTIVE USERS"
 *
 * Nothing recorded app usage before user_activity_daily shipped, and
 * `auth.users.last_sign_in_at` holds only the most recent sign-in, so earlier
 * usage was never written down and cannot be reconstructed. Buckets before
 * recording began are drawn as GAPS, not zeros — a flat zero line would say
 * "nobody came", which is a claim the data cannot support.
 *
 * Recharts is already a dependency (components/timeline/TimelineChart.tsx), so
 * this adds no new package.
 */

const RANGES: StatsRange[] = ["1d", "7d", "30d", "365d", "all"];

interface SeriesPoint {
  t: string;
  signups: number;
  activeUsers: number;
  checks: number;
  reports: number;
}

interface Payload {
  points: SeriesPoint[];
  unavailable: string[];
  activityStartedAt: string | null;
}

const SERIES = [
  { key: "activeUsers", name: "Active users", color: "#1B64CC" },
  { key: "signups", name: "Sign-ups", color: "#27694A" },
  { key: "checks", name: "Checks", color: "#8A6209" },
  { key: "reports", name: "Reports", color: "#64748B" },
] as const;

export function PlatformActivityChart() {
  const [range, setRange] = useState<StatsRange>("30d");
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    fetch(`/api/platform/activity?range=${range}`, { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((body) => {
        if (!alive) return;
        if (body?.ok) setData(body.data as Payload);
        else setError("Could not load usage data.");
      })
      .catch(() => {
        if (alive) setError("Could not load usage data.");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [range]);

  /* Buckets before activity recording began carry `null` rather than 0, which
     recharts draws as a break in the line instead of a floor. */
  const points = useMemo(() => {
    if (!data) return [];
    const startedMs = data.activityStartedAt
      ? new Date(`${data.activityStartedAt}T00:00:00.000Z`).getTime()
      : null;
    return data.points.map((point) => ({
      ...point,
      activeUsers:
        startedMs !== null && new Date(point.t).getTime() < startedMs
          ? null
          : point.activeUsers,
      label: formatBucket(point.t, range),
    }));
  }, [data, range]);

  const noActivityYet =
    data !== null && data.activityStartedAt === null && !loading;

  return (
    <section className="rounded-2xl border border-slate-200 bg-surface-raised p-5 shadow-card sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[13px] font-bold uppercase tracking-[0.07em] text-primary">
            Usage
          </p>
          <h3 className="mt-1 text-[19px] font-bold text-ink">
            People using SoleIQ
          </h3>
        </div>

        {/* Range selector. Radio semantics, not buttons: these are five
            mutually exclusive views of one chart. */}
        <div
          role="radiogroup"
          aria-label="Time range"
          className="flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1"
        >
          {RANGES.map((option) => {
            const selected = option === range;
            return (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setRange(option)}
                className={`min-h-[36px] rounded-lg px-3 text-[13px] font-semibold transition-colors ${
                  selected
                    ? "bg-surface-raised text-primary shadow-card"
                    : "text-ink-soft hover:text-ink"
                }`}
              >
                {RANGE_LABEL[option]}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-5 h-[18rem] w-full">
        {loading ? (
          <p className="flex h-full items-center justify-center gap-2 text-[14px] text-ink-faint">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Loading usage…
          </p>
        ) : error ? (
          <p role="status" className="flex h-full items-center justify-center text-[14px] text-warn">
            {error}
          </p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={points} margin={{ top: 4, right: 8, bottom: 0, left: -18 }}>
              <CartesianGrid stroke="#E5EBF0" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "#64748B" }}
                tickLine={false}
                axisLine={{ stroke: "#E5EBF0" }}
                minTickGap={24}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11, fill: "#64748B" }}
                tickLine={false}
                axisLine={false}
                width={44}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid #E5EBF0",
                  fontSize: 13,
                }}
              />
              <Legend wrapperStyle={{ fontSize: 13, paddingTop: 8 }} />
              {SERIES.map((series) => (
                <Line
                  key={series.key}
                  type="monotone"
                  dataKey={series.key}
                  name={series.name}
                  stroke={series.color}
                  strokeWidth={2}
                  dot={false}
                  // Draws a gap where the value is null, rather than joining
                  // across a period that was never recorded.
                  connectNulls={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {noActivityYet && (
        <p
          role="status"
          className="mt-4 rounded-xl bg-warn-soft px-4 py-3 text-[14px] leading-relaxed text-warn"
        >
          <span className="font-bold">No usage recorded yet.</span> Usage began
          being recorded when this shipped — earlier visits were never written
          down and cannot be recovered. Sign-ups, checks and reports are exact
          for the whole period.
        </p>
      )}

      {data && data.unavailable.length > 0 && (
        <p
          role="status"
          className="mt-4 rounded-xl bg-warn-soft px-4 py-3 text-[14px] leading-relaxed text-warn"
        >
          <span className="font-bold">Incomplete.</span>{" "}
          {data.unavailable.join(", ")} could not be read, so{" "}
          {data.unavailable.length === 1 ? "that line is" : "those lines are"}{" "}
          missing rather than zero.
        </p>
      )}
    </section>
  );
}

/** Axis label for a bucket, in the reader's own timezone. */
function formatBucket(iso: string, range: StatsRange): string {
  const date = new Date(iso);
  if (range === "1d") {
    return new Intl.DateTimeFormat(undefined, {
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  }
  if (range === "365d" || range === "all") {
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      year: "2-digit",
    }).format(date);
  }
  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
  }).format(date);
}
