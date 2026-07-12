"use client";

import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { useSoleiqStore } from "@/lib/store";
import { deleteMyVisit, listMyPriorVisits } from "@/lib/db";
import { isSupabaseConfigured } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { BeforeAfterSlider } from "@/components/timeline/BeforeAfterSlider";
import { Card } from "@/components/ui/card";
import { ScreenHeader } from "@/components/flow/ScreenContainer";
import type { ScreeningLevel, Visit } from "@/lib/types";

const STATUS: Record<ScreeningLevel, string> = {
  clear: "Looks clear",
  watch: "Watch this",
  see_someone_soon: "See someone soon",
  urgent: "Urgent, get care now",
};

export function Timeline() {
  const fallback = useSoleiqStore((state) => state.priorVisits);
  const reset = useSoleiqStore((state) => state.reset);
  const [visits, setVisits] = useState<Visit[]>(isSupabaseConfigured() ? [] : fallback);
  const [loading, setLoading] = useState(isSupabaseConfigured());
  const [live, setLive] = useState(isSupabaseConfigured());
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    let cancelled = false;
    listMyPriorVisits().then((rows) => {
      if (cancelled) return;
      setVisits(rows.length > 0 ? rows : fallback);
      setLive(rows.length > 0);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [fallback]);

  const latest = visits[visits.length - 1];
  const previous = visits[visits.length - 2];
  const levelRank: Record<ScreeningLevel, number> = {
    clear: 0,
    watch: 1,
    see_someone_soon: 2,
    urgent: 3,
  };
  const latestLevel = latest?.result?.screening?.overall.level;
  const previousLevel = previous?.result?.screening?.overall.level;
  const changeText =
    latestLevel && previousLevel
      ? levelRank[latestLevel] > levelRank[previousLevel]
        ? "The latest photo check has a more cautious status than the previous check. Review the highlighted areas and follow the latest care guidance."
        : levelRank[latestLevel] < levelRank[previousLevel]
          ? "The latest photo check has a less cautious status. Photos alone cannot confirm healing, so keep following your care team's advice."
          : "The latest and previous photo checks have the same status. Compare the photos for visible differences and seek help for any change that worries you."
      : null;
  const findSole = (visit?: Visit) =>
    visit?.images.find((image) => image.side === "right" && image.view === "sole")?.dataUrl ??
    "/sample-foot.svg";

  const remove = async (visitId: string) => {
    setDeleting(visitId);
    try {
      await deleteMyVisit(visitId);
      setVisits((current) => current.filter((visit) => visit.id !== visitId));
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="-mx-1 flex h-full flex-col overflow-y-auto px-1 pb-2">
      <ScreenHeader
        eyebrow="Photo history"
        title="Your foot checks"
        subtitle={loading ? "Loading your saved checks…" : `${visits.length} saved check${visits.length === 1 ? "" : "s"}.`}
      />

      {!loading && previous && latest && (
        <div className="mb-3">
          {changeText && (
            <Card className="mb-3">
              <p className="text-sm font-semibold text-warmGray-800">Compared with last time</p>
              <p className="mt-1 text-xs leading-relaxed text-warmGray-600">{changeText}</p>
            </Card>
          )}
          <BeforeAfterSlider
            beforeSrc={findSole(previous)}
            afterSrc={findSole(latest)}
            beforeLabel={new Date(previous.startedAt).toLocaleDateString()}
            afterLabel="Most recent"
          />
          <p className="mt-2 text-[11px] leading-relaxed text-warmGray-600">
            This is a visual comparison only. Lighting and camera angle can make areas look different; it does not measure clinical progression.
          </p>
        </div>
      )}

      <div className="space-y-2.5">
        {[...visits].reverse().map((visit) => {
          const level = visit.result?.screening?.overall.level;
          return (
            <Card key={visit.id} className="flex items-center gap-3">
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-warmGray-50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={findSole(visit)} alt="Saved right sole" className="h-full w-full object-contain" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-warmGray-800">
                  {new Date(visit.startedAt).toLocaleDateString()}
                </p>
                <p className="truncate text-xs text-warmGray-600">
                  {level ? STATUS[level] : "Older screening record"}
                </p>
              </div>
              {live && (
                <button
                  type="button"
                  disabled={deleting === visit.id}
                  onClick={() => void remove(visit.id)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full text-warmGray-600 hover:bg-warmGray-50 hover:text-risk-high"
                  aria-label="Delete this saved check"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </Card>
          );
        })}
      </div>

      <div className="mt-auto pt-4">
        <Button fullWidth variant="outline" onClick={reset}>Start a new check</Button>
      </div>
    </div>
  );
}
