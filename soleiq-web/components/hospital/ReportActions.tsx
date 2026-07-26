"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ReportActions({
  hospitalSlug,
  reportId,
  status,
}: {
  hospitalSlug: string;
  reportId: string;
  status: string;
}) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const act = async (
    action: "acknowledged" | "reviewed" | "escalated" | "released"
  ) => {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/h/${hospitalSlug}/reports/${reportId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, note }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload?.error?.message);
      setMessage(`Report ${action}.`);
      setNote("");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Action failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <h3 className="font-semibold text-slate-950">Clinical review</h3>
      <textarea
        value={note}
        onChange={(event) => setNote(event.target.value)}
        className="mt-3 min-h-24 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-brand"
        placeholder="Clinical note (optional)"
        maxLength={4000}
      />
      <div className="mt-3 flex flex-wrap gap-2">
        {(["acknowledged", "reviewed", "escalated"] as const).map((action) => (
          <button
            key={action}
            type="button"
            disabled={busy}
            onClick={() => void act(action)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold capitalize text-slate-700 disabled:opacity-50"
          >
            {action}
          </button>
        ))}
        {status !== "released" && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void act("released")}
            className="rounded-xl bg-brand px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
          >
            Release patient-safe report
          </button>
        )}
      </div>
      {message && <p className="mt-2 text-xs text-slate-600">{message}</p>}
    </section>
  );
}

