"use client";

/**
 * Side-by-side comparison of two assessments — shared by the patient
 * Comparison tab (/compare) and the doctor's per-patient comparison view.
 *
 * Given the list of a person's checks (oldest → newest), the user picks any
 * two dates; the view computes and renders:
 *   - the risk-level change (improved / worsened / unchanged) as a banner,
 *   - a per-area diff of findings: new, no longer flagged, and persisting
 *     (with a severity arrow when the concern level moved),
 *   - the photos of both checks paired per view (right/left × top/sole),
 *   - each check's headline and notes side by side.
 * Nothing here mutates data; it reads the stored report summaries so nobody
 * has to eyeball two old reports manually.
 */

import { useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  Minus,
  PlusCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ScreeningLevel } from "@/lib/types";

export interface ComparableFinding {
  foot: string;
  surface: string;
  what_we_saw: string;
  location_plain?: string;
  concern?: "low" | "medium" | "high";
}

export interface ComparableCheck {
  id: string;
  date: number;
  riskLevel: ScreeningLevel;
  status?: string;
  headline?: string | null;
  findings: ComparableFinding[];
  looksGood: string[];
  notes: string[];
  photos: { side: string; view: string; url: string }[];
}

const LEVEL_RANK: Record<ScreeningLevel, number> = {
  clear: 0,
  watch: 1,
  see_someone_soon: 2,
  urgent: 3,
};

const LEVEL_LABEL: Record<ScreeningLevel, string> = {
  clear: "Looks clear",
  watch: "Watch this",
  see_someone_soon: "See someone soon",
  urgent: "Urgent",
};

const LEVEL_CHIP: Record<ScreeningLevel, string> = {
  clear: "bg-emerald-50 text-emerald-800",
  watch: "bg-amber-50 text-amber-900",
  see_someone_soon: "bg-orange-100 text-orange-900",
  urgent: "bg-red-100 text-red-900",
};

const CONCERN_RANK = { low: 0, medium: 1, high: 2 } as const;

const VIEWS: { side: string; view: string; label: string }[] = [
  { side: "right", view: "top", label: "Right foot — top" },
  { side: "right", view: "sole", label: "Right foot — sole" },
  { side: "left", view: "top", label: "Left foot — top" },
  { side: "left", view: "sole", label: "Left foot — sole" },
];

const fmtDate = (ts: number) =>
  new Date(ts).toLocaleDateString(undefined, { dateStyle: "medium" });

const areaLabel = (foot: string, surface: string) =>
  `${foot === "left" ? "Left" : "Right"} foot, ${surface}`;

interface AreaDiff {
  key: string;
  label: string;
  kind: "new" | "resolved" | "persisting";
  earlier?: ComparableFinding;
  later?: ComparableFinding;
  /** For persisting areas: -1 improved, 0 same, 1 worsened (by concern). */
  trend?: -1 | 0 | 1;
}

function diffFindings(
  earlier: ComparableFinding[],
  later: ComparableFinding[]
): AreaDiff[] {
  const byArea = (findings: ComparableFinding[]) => {
    const map = new Map<string, ComparableFinding>();
    for (const finding of findings) {
      const key = `${finding.foot}-${finding.surface}`;
      const existing = map.get(key);
      // Keep the most concerning finding per area as its representative.
      if (
        !existing ||
        CONCERN_RANK[finding.concern ?? "low"] >
          CONCERN_RANK[existing.concern ?? "low"]
      ) {
        map.set(key, finding);
      }
    }
    return map;
  };
  const before = byArea(earlier);
  const after = byArea(later);
  const keys = Array.from(new Set([...before.keys(), ...after.keys()]));
  return keys.map((key) => {
    const b = before.get(key);
    const a = after.get(key);
    const [foot, surface] = key.split("-");
    const label = areaLabel(foot, surface);
    if (b && !a) return { key, label, kind: "resolved" as const, earlier: b };
    if (!b && a) return { key, label, kind: "new" as const, later: a };
    const beforeRank = CONCERN_RANK[b!.concern ?? "low"];
    const afterRank = CONCERN_RANK[a!.concern ?? "low"];
    return {
      key,
      label,
      kind: "persisting" as const,
      earlier: b,
      later: a,
      trend: afterRank > beforeRank ? 1 : afterRank < beforeRank ? -1 : 0,
    };
  });
}

export function ComparisonView({ checks }: { checks: ComparableCheck[] }) {
  // Oldest → newest, deduped ids.
  const ordered = useMemo(
    () => [...checks].sort((a, b) => a.date - b.date),
    [checks]
  );
  const [earlierId, setEarlierId] = useState(
    () => ordered[Math.max(0, ordered.length - 2)]?.id ?? ""
  );
  const [laterId, setLaterId] = useState(
    () => ordered[ordered.length - 1]?.id ?? ""
  );

  if (ordered.length < 2) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center">
        <p className="font-semibold text-slate-900">Not enough checks to compare yet</p>
        <p className="mt-1 text-sm text-slate-500">
          A comparison needs at least two saved assessments. After the next
          check, the changes between dates will appear here automatically.
        </p>
      </div>
    );
  }

  const earlier = ordered.find((check) => check.id === earlierId) ?? ordered[0];
  const later =
    ordered.find((check) => check.id === laterId) ?? ordered[ordered.length - 1];
  // Keep the pair in chronological order regardless of what was picked.
  const [a, b] = earlier.date <= later.date ? [earlier, later] : [later, earlier];

  const levelDelta = LEVEL_RANK[b.riskLevel] - LEVEL_RANK[a.riskLevel];
  const diffs = diffFindings(a.findings, b.findings);
  const newOnes = diffs.filter((d) => d.kind === "new");
  const resolved = diffs.filter((d) => d.kind === "resolved");
  const persisting = diffs.filter((d) => d.kind === "persisting");

  const pickPhoto = (check: ComparableCheck, side: string, view: string) =>
    check.photos.find((photo) => photo.side === side && photo.view === view);

  const selector = (
    label: string,
    value: string,
    onChange: (id: string) => void
  ) => (
    <label className="flex-1 text-xs font-medium text-slate-600">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
      >
        {ordered.map((check) => (
          <option key={check.id} value={check.id}>
            {fmtDate(check.date)} — {LEVEL_LABEL[check.riskLevel]}
          </option>
        ))}
      </select>
    </label>
  );

  return (
    <div className="space-y-4">
      {/* Date pickers */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row">
        {selector("Earlier check", a.id, setEarlierId)}
        {selector("Later check", b.id, setLaterId)}
      </div>

      {/* Overall change banner */}
      <div
        className={cn(
          "flex items-start gap-3 rounded-2xl p-4",
          levelDelta > 0
            ? "bg-red-50 text-red-900"
            : levelDelta < 0
              ? "bg-emerald-50 text-emerald-900"
              : "bg-slate-100 text-slate-700"
        )}
      >
        {levelDelta > 0 ? (
          <ArrowUpRight className="mt-0.5 h-5 w-5 shrink-0" />
        ) : levelDelta < 0 ? (
          <ArrowDownRight className="mt-0.5 h-5 w-5 shrink-0" />
        ) : (
          <Minus className="mt-0.5 h-5 w-5 shrink-0" />
        )}
        <div>
          <p className="text-sm font-semibold">
            {levelDelta > 0
              ? "The later check has a more cautious status"
              : levelDelta < 0
                ? "The later check has a less cautious status"
                : "The overall status is unchanged between these checks"}
          </p>
          <p className="mt-0.5 text-xs">
            {fmtDate(a.date)}: {LEVEL_LABEL[a.riskLevel]} → {fmtDate(b.date)}:{" "}
            {LEVEL_LABEL[b.riskLevel]}. Photos can look different with lighting
            and angle — this compares the recorded results, not healing itself.
          </p>
        </div>
      </div>

      {/* Two-column check headers */}
      <div className="grid grid-cols-2 gap-3">
        {[a, b].map((check, index) => (
          <div key={check.id} className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              {index === 0 ? "Earlier" : "Later"}
            </p>
            <p className="mt-0.5 text-sm font-semibold text-slate-900">{fmtDate(check.date)}</p>
            <span
              className={cn(
                "mt-1.5 inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                LEVEL_CHIP[check.riskLevel]
              )}
            >
              {LEVEL_LABEL[check.riskLevel]}
            </span>
            {check.status && check.status !== "released" && (
              <p className="mt-1 text-[10px] font-semibold text-slate-400">Pending review</p>
            )}
            {check.headline && (
              <p className="mt-2 text-xs leading-snug text-slate-600">{check.headline}</p>
            )}
          </div>
        ))}
      </div>

      {/* Findings diff */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <h3 className="font-semibold text-slate-950">What changed</h3>
        {diffs.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">
            Neither check recorded a visible finding — nothing to compare here.
          </p>
        ) : (
          <div className="mt-3 space-y-4">
            {newOnes.length > 0 && (
              <div>
                <p className="flex items-center gap-1.5 text-xs font-semibold text-red-900">
                  <PlusCircle className="h-3.5 w-3.5" /> New since {fmtDate(a.date)}
                </p>
                {newOnes.map((diff) => (
                  <p key={diff.key} className="mt-1.5 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-900">
                    <span className="font-semibold">{diff.label}:</span>{" "}
                    {diff.later?.what_we_saw}
                    {diff.later?.concern ? ` (${diff.later.concern} concern)` : ""}
                  </p>
                ))}
              </div>
            )}
            {resolved.length > 0 && (
              <div>
                <p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-900">
                  <CheckCircle2 className="h-3.5 w-3.5" /> No longer flagged
                </p>
                {resolved.map((diff) => (
                  <p key={diff.key} className="mt-1.5 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
                    <span className="font-semibold">{diff.label}:</span>{" "}
                    {diff.earlier?.what_we_saw} — not seen in the later photos.
                  </p>
                ))}
              </div>
            )}
            {persisting.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-600">Seen in both checks</p>
                {persisting.map((diff) => (
                  <div key={diff.key} className="mt-1.5 rounded-xl border border-slate-100 px-3 py-2">
                    <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
                      {diff.trend === 1 ? (
                        <ArrowUpRight className="h-3.5 w-3.5 text-red-700" />
                      ) : diff.trend === -1 ? (
                        <ArrowDownRight className="h-3.5 w-3.5 text-emerald-700" />
                      ) : (
                        <Minus className="h-3.5 w-3.5 text-slate-400" />
                      )}
                      {diff.label}
                      <span className="font-normal text-slate-500">
                        {diff.trend === 1
                          ? " — concern increased"
                          : diff.trend === -1
                            ? " — concern decreased"
                            : " — similar concern"}
                      </span>
                    </p>
                    <div className="mt-1 grid grid-cols-2 gap-2 text-xs text-slate-600">
                      <p>
                        <span className="font-semibold">{fmtDate(a.date)}:</span>{" "}
                        {diff.earlier?.what_we_saw}
                        {diff.earlier?.concern ? ` (${diff.earlier.concern})` : ""}
                      </p>
                      <p>
                        <span className="font-semibold">{fmtDate(b.date)}:</span>{" "}
                        {diff.later?.what_we_saw}
                        {diff.later?.concern ? ` (${diff.later.concern})` : ""}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Paired photos per view */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <h3 className="font-semibold text-slate-950">Photos side by side</h3>
        <p className="mt-0.5 text-xs text-slate-500">
          Earlier on the left, later on the right — tap any photo to open it full-size.
        </p>
        <div className="mt-3 space-y-4">
          {VIEWS.map(({ side, view, label }) => {
            const left = pickPhoto(a, side, view);
            const right = pickPhoto(b, side, view);
            if (!left && !right) return null;
            return (
              <div key={`${side}-${view}`}>
                <p className="mb-1 text-xs font-semibold text-slate-600">{label}</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { photo: left, date: a.date },
                    { photo: right, date: b.date },
                  ].map(({ photo, date }, index) => (
                    <div key={index} className="relative overflow-hidden rounded-xl bg-slate-100">
                      {photo ? (
                        <a href={photo.url} target="_blank" rel="noreferrer" className="block">
                          <div className="aspect-square">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={photo.url}
                              alt={`${label} — ${fmtDate(date)}`}
                              className="h-full w-full object-cover"
                            />
                          </div>
                          <span className="absolute inset-x-0 bottom-0 bg-black/50 px-1.5 py-0.5 text-center text-[10px] font-semibold text-white">
                            {fmtDate(date)}
                          </span>
                        </a>
                      ) : (
                        <div className="flex aspect-square items-center justify-center text-xs italic text-slate-400">
                          No photo
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Notes / positives side by side */}
      {(a.notes.length > 0 || b.notes.length > 0 || a.looksGood.length > 0 || b.looksGood.length > 0) && (
        <section className="rounded-2xl border border-slate-200 bg-white p-4">
          <h3 className="font-semibold text-slate-950">Notes from each check</h3>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {[a, b].map((check) => (
              <div key={check.id} className="min-w-0">
                <p className="text-xs font-semibold text-slate-600">{fmtDate(check.date)}</p>
                {check.looksGood.length > 0 && (
                  <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs text-emerald-900">
                    {check.looksGood.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                )}
                {check.notes.length > 0 && (
                  <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs text-slate-600">
                    {check.notes.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                )}
                {check.looksGood.length === 0 && check.notes.length === 0 && (
                  <p className="mt-1 text-xs italic text-slate-400">No notes recorded.</p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      <p className="text-center text-[11px] text-slate-500">
        This comparison reads the stored screening results. It is screening
        support, not a diagnosis, and does not measure clinical progression.
      </p>
    </div>
  );
}
