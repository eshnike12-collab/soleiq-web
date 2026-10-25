"use client";

import { useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useReportStream } from "@/lib/useReportStream";
import type { ReportStreamRow } from "@/lib/reportStream";

/**
 * Makes a server-rendered page react to a report landing.
 *
 * The dashboards and worklists are server components that read the database
 * on every request. The only thing missing was a reason to request again, so
 * that is all this adds: it listens for a readable report change and calls
 * `router.refresh()`, which re-runs the server component and repaints with
 * real data.
 *
 * Deliberately NOT a client-side re-query. Re-fetching reports here would
 * mean restating the dashboard's joins, its photo signing and its ordering in
 * a second place, free to drift from the server's version. Refreshing reuses
 * the one implementation that already exists.
 *
 * Renders nothing.
 */
export function ReportLiveRefresh({
  watchReportId,
  onChange,
}: {
  /** Follow one report and stop once it settles. Omit for a dashboard. */
  watchReportId?: string;
  /** Extra handler, for a page that also wants to show its own state. */
  onChange?: (row: ReportStreamRow) => void;
}) {
  const router = useRouter();
  const lastRefreshAt = useRef(0);
  const pending = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handle = useCallback(
    (row: ReportStreamRow) => {
      onChange?.(row);

      /* Coalesce. A finished check writes a report and then releases it, so
         two events arrive within a second or so; a sweep draining a backlog
         can produce several. Each refresh is a full server render, so they
         are collapsed into at most one per second. */
      const since = Date.now() - lastRefreshAt.current;
      const wait = Math.max(0, 1000 - since);
      if (pending.current) clearTimeout(pending.current);
      pending.current = setTimeout(() => {
        lastRefreshAt.current = Date.now();
        pending.current = null;
        router.refresh();
      }, wait);
    },
    [onChange, router]
  );

  useReportStream({ watchReportId, onChange: handle });

  useEffect(
    () => () => {
      if (pending.current) clearTimeout(pending.current);
    },
    []
  );

  return null;
}
