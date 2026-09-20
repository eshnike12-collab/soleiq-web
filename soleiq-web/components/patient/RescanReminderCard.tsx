"use client";

import { useCallback, useEffect, useState } from "react";
import {
  RescanReminderView,
  type RescanStatus,
} from "./RescanReminderView";

/**
 * The weekly check reminder, on the patient's home screen.
 *
 * This is the channel that actually guarantees the reminder lands. Email can
 * bounce, go to spam, or never be configured; push needs a permission the
 * patient may refuse and, on iOS, a home-screen install most people never do.
 * A card on the screen they land on after signing in has no such failure mode
 * — if they are in the app, they see it.
 *
 * Fetching it also CREATES the schedule row on first sign-in, so opening the
 * app is what starts the seven-day timer. See app/api/rescan/route.ts.
 *
 * Renders nothing until the fetch resolves, and nothing at all if the endpoint
 * is unreachable, unauthenticated, or the migration has not been applied. A
 * reminder is an enhancement; it must never be the reason a patient cannot
 * see their results.
 */
export function RescanReminderCard() {
  const [status, setStatus] = useState<RescanStatus | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch("/api/rescan", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((body) => {
        if (alive && body?.ok) setStatus(body.data as RescanStatus);
      })
      .catch(() => {
        /* An unreachable reminder endpoint hides the card; nothing else. */
      });
    return () => {
      alive = false;
    };
  }, []);

  const act = useCallback(
    async (action: "snooze" | "pause" | "resume", days?: number) => {
      setBusy(true);
      try {
        const response = await fetch("/api/rescan", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action, days }),
        });
        const body = await response.json();
        if (body?.ok) setStatus(body.data as RescanStatus);
      } catch {
        /* Leave the card as it was; the patient can try again. */
      } finally {
        setBusy(false);
      }
    },
    []
  );

  if (!status) return null;
  return (
    <RescanReminderView
      status={status}
      busy={busy}
      onAct={(action, days) => void act(action, days)}
    />
  );
}
