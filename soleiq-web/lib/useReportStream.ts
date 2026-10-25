"use client";

import { useEffect, useRef, useState } from "react";
import { getSupabase } from "./supabase";
import {
  createReportStream,
  type StreamClient,
  type StreamStatus,
} from "./reportStreamEngine";
import type { ReportStreamRow } from "./reportStream";

/**
 * Live updates for the `reports` table.
 *
 * A check is saved and analysed asynchronously: when analysis outruns the
 * route's 45s deadline the HTTP response says "saved, still analyzing" and
 * the real result lands later from a background sweep. Nothing listened for
 * that, so the result stayed invisible until someone reloaded.
 *
 * RLS IS THE ACCESS CONTROL, AND THE ONLY ONE. Realtime evaluates the
 * subscriber's own SELECT policies per row, so a patient receives their
 * reports and a clinician receives those they are assigned to. This hook adds
 * no ownership filtering — a second copy of that rule could only drift from
 * the database's.
 *
 * The machinery lives in reportStreamEngine.ts so it can be tested without a
 * DOM; this is the React wrapper around it.
 */

export type { StreamStatus };

export interface UseReportStreamOptions {
  onChange?: (row: ReportStreamRow) => void;
  /** Watch one report and stop once it settles. Omit for a dashboard. */
  watchReportId?: string;
  enabled?: boolean;
}

export function useReportStream(options: UseReportStreamOptions = {}) {
  const { onChange, watchReportId, enabled = true } = options;
  const [status, setStatus] = useState<StreamStatus>("connecting");

  /* Held in a ref so an inline arrow from a caller does not tear down and
     rebuild the channel on every render. */
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!enabled) {
      setStatus("stopped");
      return;
    }
    const supabase = getSupabase();
    if (!supabase) {
      setStatus("stopped");
      return;
    }

    const stream = createReportStream({
      client: supabase as unknown as StreamClient,
      watchReportId,
      onChange: (row) => onChangeRef.current?.(row),
      onStatus: setStatus,
    });
    return () => stream.dispose();
  }, [enabled, watchReportId]);

  return { status };
}
