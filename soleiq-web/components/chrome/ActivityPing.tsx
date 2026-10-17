"use client";

import { useEffect } from "react";

/**
 * Tells the server this account used the app today.
 *
 * Mounted in the patient and clinician shells. Fires once per browser session
 * per UTC day: the server counts opens, and a component that pinged on every
 * route change would turn "people who used it" into "pages they looked at",
 * which is both a different number and more tracking than this needs.
 *
 * sessionStorage, not localStorage — a new tab or a fresh browser session
 * counts again, which is closer to "a visit" than a once-ever flag would be.
 * Storage being unavailable (private mode) just means it pings; that is the
 * safe direction to fail.
 */
const KEY = "soleiq.activity.pinged";

export function ActivityPing() {
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    try {
      if (window.sessionStorage.getItem(KEY) === today) return;
      window.sessionStorage.setItem(KEY, today);
    } catch {
      /* Private mode: ping anyway rather than silently never counting. */
    }
    void fetch("/api/activity", { method: "POST", keepalive: true }).catch(
      () => undefined
    );
  }, []);

  return null;
}
