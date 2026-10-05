"use client";

import { useEffect, useState } from "react";

/**
 * "Good morning / afternoon / evening, <name>".
 *
 * A client component on purpose. Time of day has to come from the READER's
 * clock: rendered on the server it would use the server's timezone — UTC on
 * Vercel — and greet a patient in California with "Good evening" over
 * breakfast. Same failure as the photo timestamps; see components/ui/LocalTime.
 *
 * The first paint is the name alone, which is true at any hour, and the
 * greeting appears once the browser's clock is known. No layout shift beyond
 * the words themselves, and nothing here is clinical.
 */
function partOfDay(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function Greeting({ name }: { name?: string | null }) {
  const [greeting, setGreeting] = useState<string | null>(null);

  useEffect(() => {
    setGreeting(partOfDay(new Date().getHours()));
  }, []);

  const trimmed = name?.trim();
  return (
    <p className="text-[16px] font-semibold text-ink-soft">
      {greeting ? (trimmed ? `${greeting}, ${trimmed}` : greeting) : trimmed || " "}
    </p>
  );
}
