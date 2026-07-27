"use client";

import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { useSoleiqStore } from "@/lib/store";
import { deleteMyVisit, listMyPriorVisits } from "@/lib/db";
import { listMyCanonicalChecks } from "@/lib/canonicalScreenings";
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

const VIEW_SHORT: Record<string, string> = {
  top: "top",
  sole: "sole",
  heel: "heel",
  between_toes: "toes",
};

/** Unified row the timeline renders — canonical reports and legacy visits
 *  both map into this. */
interface TimelineCheck {
  id: string;
  startedAt: number;
  level: ScreeningLevel | null;
  photos: { side: string; view: string; url: string }[];
  /** Only legacy rows can be deleted from here (canonical reports are
   *  clinical records managed by the hospital). */
  deletable: boolean;
}

export function Timeline() {
  const fallback = useSoleiqStore((state) => state.priorVisits);
  const reset = useSoleiqStore((state) => state.reset);
  const [checks, setChecks] = useState<TimelineCheck[]>(
    isSupabaseConfigured() ? [] : fallback.map((visit) => legacyVisitToCheck(visit))
  );
  const [loading, setLoading] = useState(isSupabaseConfigured());
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    let cancelled = false;
    const load = async () => {
      // Canonical released reports are the source of truth; legacy visits
      // cover pre-migration saves; seeded demo data covers empty accounts.
      const canonical = await listMyCanonicalChecks().catch(() => []);
      if (cancelled) return;
      if (canonical.length > 0) {
        setChecks(
          canonical.map((check) => ({
            id: check.reportId,
            startedAt: check.startedAt,
            level: check.riskLevel ?? null,
            photos: check.photos.map((photo) => ({
              side: photo.side,
              view: photo.view,
              url: photo.url,
            })),
            deletable: false,
          }))
        );
        setLoading(false);
        return;
      }
      const legacy = await listMyPriorVisits().catch(() => [] as Visit[]);
      if (cancelled) return;
      setChecks(
        (legacy.length > 0 ? legacy : fallback).map((visit) =>
          legacyVisitToCheck(visit, legacy.length > 0)
        )
      );
      setLoading(false);
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [fallback]);

  const latest = checks[checks.length - 1];
  const previous = checks[checks.length - 2];
  const levelRank: Record<ScreeningLevel, number> = {
    clear: 0,
    watch: 1,
    see_someone_soon: 2,
    urgent: 3,
  };
  const changeText =
    latest?.level && previous?.level
      ? levelRank[latest.level] > levelRank[previous.level]
        ? "The latest photo check has a more cautious status than the previous check. Review the highlighted areas and follow the latest care guidance."
        : levelRank[latest.level] < levelRank[previous.level]
          ? "The latest photo check has a less cautious status. Photos alone cannot confirm healing, so keep following your care team's advice."
          : "The latest and previous photo checks have the same status. Compare the photos for visible differences and seek help for any change that worries you."
      : null;
  const findSole = (check?: TimelineCheck) =>
    check?.photos.find((photo) => photo.side === "right" && photo.view === "sole")?.url ??
    "/sample-foot.svg";

  const remove = async (checkId: string) => {
    setDeleting(checkId);
    try {
      await deleteMyVisit(checkId);
      setChecks((current) => current.filter((check) => check.id !== checkId));
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="-mx-1 flex h-full flex-col overflow-y-auto px-1 pb-2">
      <ScreenHeader
        eyebrow="Photo history"
        title="Your foot checks"
        subtitle={loading ? "Loading your saved checks…" : `${checks.length} saved check${checks.length === 1 ? "" : "s"}.`}
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
        {[...checks].reverse().map((check) => (
          <Card key={check.id}>
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-warmGray-800">
                  {new Date(check.startedAt).toLocaleDateString()}
                </p>
                <p className="truncate text-xs text-warmGray-600">
                  {check.level ? STATUS[check.level] : "Older screening record"}
                </p>
              </div>
              {check.deletable && (
                <button
                  type="button"
                  disabled={deleting === check.id}
                  onClick={() => void remove(check.id)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full text-warmGray-600 hover:bg-warmGray-50 hover:text-risk-high"
                  aria-label="Delete this saved check"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
            {check.photos.length > 0 && (
              <div className="mt-2 grid grid-cols-4 gap-1.5">
                {check.photos.slice(0, 4).map((photo, index) => (
                  <a
                    key={index}
                    href={photo.url}
                    target="_blank"
                    rel="noreferrer"
                    className="relative block overflow-hidden rounded-lg bg-warmGray-50"
                  >
                    <div className="aspect-square">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photo.url}
                        alt={`${photo.side} foot ${photo.view}`}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <span className="absolute inset-x-0 bottom-0 bg-black/45 px-1 py-0.5 text-center text-[9px] font-semibold uppercase text-white">
                      {photo.side === "left" ? "L" : "R"} {VIEW_SHORT[photo.view] ?? photo.view}
                    </span>
                  </a>
                ))}
              </div>
            )}
          </Card>
        ))}
      </div>

      <div className="mt-auto pt-4">
        <Button fullWidth variant="outline" onClick={reset}>Start a new check</Button>
      </div>
    </div>
  );
}

function legacyVisitToCheck(visit: Visit, deletable = false): TimelineCheck {
  return {
    id: visit.id,
    startedAt: visit.startedAt,
    level: visit.result?.screening?.overall.level ?? null,
    photos: visit.images.map((image) => ({
      side: image.side,
      view: image.view,
      url: image.dataUrl,
    })),
    deletable,
  };
}
