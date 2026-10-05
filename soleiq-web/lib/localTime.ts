/**
 * Timezone-aware timestamp formatting.
 *
 * Separated from the component so the rule that actually broke — which zone a
 * moment is rendered in — is unit-testable without a DOM. See
 * components/ui/LocalTime.tsx for why this exists at all.
 */

export type LocalTimeMode = "datetime" | "date" | "time";

const FORMATS: Record<LocalTimeMode, Intl.DateTimeFormatOptions> = {
  datetime: { dateStyle: "medium", timeStyle: "short" },
  date: { dateStyle: "medium" },
  time: { timeStyle: "short" },
};

/**
 * The same three shapes spelled out field by field.
 *
 * Needed because `dateStyle`/`timeStyle` CANNOT be combined with
 * `timeZoneName` — Intl throws a TypeError rather than ignoring it. Asking for
 * a zone label therefore has to abandon the style shorthands entirely.
 */
const EXPLICIT: Record<LocalTimeMode, Intl.DateTimeFormatOptions> = {
  datetime: {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  },
  date: { year: "numeric", month: "short", day: "numeric" },
  time: { hour: "numeric", minute: "2-digit" },
};

/** Epoch ms for anything a caller might hold, or null when unusable. */
export function toDate(
  value: string | number | Date | null | undefined
): Date | null {
  if (value == null) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

/**
 * Renders `date` in `zone`, or in the runtime's own zone when `zone` is
 * undefined.
 *
 * `locale` is threaded through for tests; production passes undefined so the
 * reader's own language and date conventions apply.
 */
export function formatInZone(
  date: Date,
  mode: LocalTimeMode = "datetime",
  zone?: string,
  withZoneName = false,
  locale?: string
): string {
  const wantsZoneName = withZoneName && mode !== "date";
  const base = wantsZoneName ? EXPLICIT[mode] : FORMATS[mode];

  // Preferred rendering: requested zone, and a zone label when asked for.
  try {
    return new Intl.DateTimeFormat(locale, {
      ...base,
      ...(zone ? { timeZone: zone } : {}),
      ...(wantsZoneName ? { timeZoneName: "short" as const } : {}),
    }).format(date);
  } catch {
    /* fall through */
  }

  // Degrade the LABEL before the ZONE. Dropping the zone first would render a
  // different moment's worth of clock time and look entirely normal doing it
  // — which is the failure this whole module exists to stop. Losing the
  // "EDT" suffix is cosmetic; losing the zone is the original bug.
  if (zone) {
    try {
      return new Intl.DateTimeFormat(locale, {
        ...FORMATS[mode],
        timeZone: zone,
      }).format(date);
    } catch {
      /* the zone name itself is not one Intl knows */
    }
  }

  // Last resort: the runtime's own zone. Only reached when `zone` is absent
  // or is not a real IANA name, so there is no correct zone left to honour.
  return new Intl.DateTimeFormat(locale, FORMATS[mode]).format(date);
}

/**
 * The reader's own IANA zone, e.g. "America/New_York".
 *
 * Recorded at capture so the moment can later be shown on the clock the
 * patient was actually looking at, rather than on whichever clock happens to
 * be reading the record. Returns null where the browser will not say.
 */
export function deviceTimeZone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    return null;
  }
}

/** Cheap sanity check before a zone string is stored or used. */
export function isValidTimeZone(zone: string | null | undefined): boolean {
  if (!zone || typeof zone !== "string") return false;
  try {
    new Intl.DateTimeFormat(undefined, { timeZone: zone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}
