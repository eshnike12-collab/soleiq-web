"use client";

import { useEffect, useState } from "react";
import {
  formatInZone,
  toDate,
  type LocalTimeMode,
} from "@/lib/localTime";

/**
 * A timestamp shown in the right timezone.
 *
 * THE BUG THIS EXISTS TO FIX
 *
 * Most of this app's date rendering was `new Date(iso).toLocaleString()`
 * written directly inside a server component. `toLocaleString()` with no
 * timezone uses the timezone of whatever machine runs it — which in a server
 * component is the server. Vercel runs UTC. So a patient in New York who
 * photographed their foot at 6pm saw their record say 10pm: the stored
 * instant was correct all along, and only the rendering was four hours out.
 *
 * WHY `zone` MATTERS
 *
 * Falling back to the viewer's device is right for a patient at home, and
 * wrong twice over otherwise: a patient who travels sees their history shift,
 * and a clinician in another country sees every patient's photos stamped in
 * the clinician's own working hours. When the capture timezone was recorded,
 * pass it — then "6pm" means the 6pm the patient actually saw on their own
 * clock, wherever anyone later reads it from.
 *
 * WHY THE TWO-PASS RENDER
 *
 * The server cannot know the reader's timezone; only the browser does. So the
 * first paint uses a FIXED zone — the capture zone when known, otherwise UTC
 * — which server and client both compute identically, and an effect re-renders
 * in the device zone after mount. Both passes agree, so there is no hydration
 * mismatch to suppress. When `zone` is given there is no second pass at all
 * and no flicker, which is the other reason to record it.
 */

export function LocalTime({
  value,
  mode = "datetime",
  zone,
  className,
  fallback = "—",
}: {
  /** ISO string, epoch milliseconds, or a Date. */
  value: string | number | Date | null | undefined;
  mode?: LocalTimeMode;
  /**
   * IANA zone the moment should be read in — normally the timezone the photo
   * was taken in. Omit to use the reader's own device.
   */
  zone?: string | null;
  className?: string;
  /** Shown when the value is missing or unparseable. */
  fallback?: string;
}) {
  const date = toDate(value);

  // False on the server AND on the first client render, so the two agree.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!date) return <span className={className}>{fallback}</span>;

  const useDeviceZone = mounted && !zone;
  const text = useDeviceZone
    ? formatInZone(date, mode, undefined, false)
    : formatInZone(date, mode, zone || "UTC", !zone);

  return (
    <time dateTime={date.toISOString()} className={className}>
      {text}
    </time>
  );
}
