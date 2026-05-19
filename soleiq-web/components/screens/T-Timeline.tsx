"use client";

import { useEffect, useState } from "react";
import { useSoleiqStore } from "@/lib/store";
import { listMyPriorVisits } from "@/lib/db";
import { isSupabaseConfigured } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { TimelineChart } from "@/components/timeline/TimelineChart";
import { BeforeAfterSlider } from "@/components/timeline/BeforeAfterSlider";
import { Card } from "@/components/ui/card";
import { ScreenHeader } from "@/components/flow/ScreenContainer";
import type { Visit } from "@/lib/types";

const fmtDate = (ts: number) =>
  new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric" });

const daysAgo = (ts: number) => {
  const ms = Date.now() - ts;
  const d = Math.round(ms / (24 * 60 * 60 * 1000));
  if (d <= 0) return "Today";
  if (d === 1) return "1 day ago";
  return `${d} days ago`;
};

export function Timeline() {
  const fallback = useSoleiqStore((s) => s.priorVisits);
  const reset = useSoleiqStore((s) => s.reset);
  const [priors, setPriors] = useState<Visit[]>(
    isSupabaseConfigured() ? [] : fallback
  );
  const [loading, setLoading] = useState(isSupabaseConfigured());
  const [source, setSource] = useState<"live" | "mock">(
    isSupabaseConfigured() ? "live" : "mock"
  );

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    let cancelled = false;
    listMyPriorVisits().then((rows) => {
      if (cancelled) return;
      if (rows.length > 0) {
        setPriors(rows);
        setSource("live");
      } else {
        setPriors(fallback);
        setSource("mock");
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [fallback]);

  const trendData = priors
    .filter((v) => v.result?.volumetrics?.[0]?.woundVolumeMm3 != null)
    .map((v) => ({
      label: fmtDate(v.startedAt),
      volume: v.result!.volumetrics[0].woundVolumeMm3 ?? 0,
    }));

  const findSole = (v: Visit | undefined) =>
    v?.images.find((i) => i.view === "sole" && i.side === "right")?.dataUrl ??
    "/sample-foot.svg";

  const earliest = priors[0];
  const latest = priors[priors.length - 1];
  const trendLabel =
    trendData.length >= 2
      ? trendData[trendData.length - 1].volume < trendData[0].volume
        ? "improving"
        : trendData[trendData.length - 1].volume > trendData[0].volume
        ? "worsening"
        : "stable"
      : "first scan";

  return (
    <div className="-mx-1 flex h-full flex-col overflow-y-auto px-1 pb-2">
      <ScreenHeader
        eyebrow="Trends"
        title="Your timeline"
        subtitle={
          loading
            ? "Loading your visits…"
            : `${priors.length} visit${priors.length === 1 ? "" : "s"} on record${
                source === "mock" ? " (sample data)" : ""
              }.`
        }
      />
      {!loading && (
        <div className="space-y-3">
          {trendData.length > 0 ? (
            <TimelineChart data={trendData} />
          ) : (
            <Card>
              <p className="text-sm text-warmGray-600">
                Wound-volume trend will appear here after your next visit with a
                detected wound.
              </p>
            </Card>
          )}

          {earliest && latest && earliest.id !== latest.id ? (
            <BeforeAfterSlider
              beforeSrc={findSole(earliest)}
              afterSrc={findSole(latest)}
              beforeLabel={daysAgo(earliest.startedAt)}
              afterLabel="Most recent"
            />
          ) : null}

          <Card>
            <p className="text-sm font-semibold text-warmGray-800">Summary</p>
            <ul className="mt-1 space-y-1 text-sm text-warmGray-800">
              <li>
                Wound volume trend:{" "}
                <span className="font-medium text-teal-800">{trendLabel}</span>
              </li>
              <li>Visits on record: {priors.length}</li>
              <li>
                Most recent risk:{" "}
                {latest?.result?.riskLevel ?? "—"}
              </li>
            </ul>
          </Card>
        </div>
      )}

      <div className="mt-auto pt-4">
        <Button fullWidth variant="outline" onClick={reset}>
          Reset demo
        </Button>
      </div>
    </div>
  );
}
