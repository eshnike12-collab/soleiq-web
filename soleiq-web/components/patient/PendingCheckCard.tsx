import { Loader2 } from "lucide-react";
import { LocalTime } from "@/components/ui/LocalTime";

export interface PendingSession {
  id: string;
  status: string | null;
  started_at: string | null;
}

/**
 * A check that is saved but has not been read yet.
 *
 * It exists so a saved check is never invisible. The dashboard lists reports,
 * and a report only appears once analysis succeeds — so a check saved while
 * analysis was still running showed up nowhere, and the dashboard looked
 * exactly as it had before the patient took their photos. That is
 * indistinguishable from the check having been thrown away.
 *
 * It says SAVED first, because that is the part the patient is anxious about,
 * and "still being read" second. It claims nothing about what the photos show
 * — there is no result yet, and inventing a reassuring one would be worse
 * than the silence it replaces.
 *
 * Resolves in place: when the report is released, the live stream refreshes
 * the dashboard and this row is replaced by the real result.
 */
export function PendingCheckCard({ session }: { session: PendingSession }) {
  return (
    // A div, not an li: the report history around it is a divide-y stack
    // of links, not a list element.
    <div className="flex items-center gap-3 py-4">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft">
        <Loader2
          className="h-5 w-5 animate-spin text-primary motion-reduce:animate-none"
          aria-hidden="true"
        />
      </span>
      <div className="min-w-0">
        <p className="font-semibold text-ink">Saved — still being read</p>
        <p className="text-[13px] text-ink-faint">
          {session.started_at ? (
            <LocalTime value={session.started_at} />
          ) : (
            "Just now"
          )}{" "}
          · your photos are stored safely
        </p>
      </div>
    </div>
  );
}
