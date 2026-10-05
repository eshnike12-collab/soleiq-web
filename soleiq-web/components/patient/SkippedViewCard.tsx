import { XCircle } from "lucide-react";

/** A view the patient could not photograph. */
export interface SkippedSlotRecord {
  side: "left" | "right";
  view: "top" | "sole";
  reason?: string | null;
}

const VIEW_LABEL: Record<string, string> = { top: "top", sole: "sole" };

export function slotLabel(slot: SkippedSlotRecord): string {
  return `${slot.side === "left" ? "Left" : "Right"} foot · ${
    VIEW_LABEL[slot.view] ?? slot.view
  }`;
}

/**
 * The placeholder a skipped view leaves in a report.
 *
 * It renders as an explicit gap, not as a blank. A missing view and a normal
 * view look identical if you simply show three photographs instead of four,
 * and on a report a clinician reads, "not captured" and "nothing to see" are
 * very different statements. The cross says the first one.
 *
 * The reason is the patient's own words, shown verbatim where they gave one
 * and named as absent where they did not — "no reason given" is itself
 * information.
 */
export function SkippedViewCard({ slot }: { slot: SkippedSlotRecord }) {
  const reason = slot.reason?.trim();
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-surface-sunken p-3 text-center">
      <XCircle className="h-7 w-7 text-ink-faint" aria-hidden="true" />
      <p className="mt-2 text-[13px] font-bold capitalize text-ink-soft">
        {slotLabel(slot)}
      </p>
      <p className="mt-0.5 text-[12px] font-semibold uppercase tracking-wide text-ink-faint">
        Not captured
      </p>
      <p className="mt-1.5 text-[12px] leading-snug text-ink-faint">
        {reason ? reason : "No reason given."}
      </p>
    </div>
  );
}

/** The whole set, with a heading, or nothing when none were skipped. */
export function SkippedViews({ slots }: { slots: SkippedSlotRecord[] }) {
  if (slots.length === 0) return null;
  return (
    <div className="mt-4">
      <p className="mc-section-title">Views not captured ({slots.length})</p>
      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {slots.map((slot) => (
          <SkippedViewCard key={`${slot.side}-${slot.view}`} slot={slot} />
        ))}
      </div>
      <p className="mt-2 text-[13px] leading-relaxed text-ink-faint">
        These views were not photographed, so the check could not look at them.
        That is not the same as finding nothing there.
      </p>
    </div>
  );
}
