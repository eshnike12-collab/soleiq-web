"use client";

/**
 * Doctor/caregiver view of one patient: header facts, photo timeline of
 * every saved check (with when the last photos were taken), links to full
 * reports, and the per-patient AI assistant. Access is enforced by RLS —
 * an unassigned doctor gets an empty record here, not other people's data.
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Camera, Clock, Loader2 } from "lucide-react";
import {
  getPatientByAuthUid,
  listVisitsForUser,
  type PatientRecord,
} from "@/lib/db";
import { PatientChat } from "@/components/dashboard/PatientChat";
import { cn } from "@/lib/utils";
import type { ScreeningLevel, Visit } from "@/lib/types";

const LEVEL_BADGE: Record<ScreeningLevel, string> = {
  clear: "bg-teal-50 text-teal-800",
  watch: "bg-amber-50 text-amber-800",
  see_someone_soon: "bg-orange-100 text-orange-900",
  urgent: "bg-risk-high text-white",
};

const LEVEL_LABEL: Record<ScreeningLevel, string> = {
  clear: "Looks clear",
  watch: "Watch",
  see_someone_soon: "See someone soon",
  urgent: "Urgent",
};

const fmtDate = (ts: number) =>
  new Date(ts).toLocaleDateString(undefined, { dateStyle: "medium" });

const daysAgo = (ts: number) => {
  const days = Math.round((Date.now() - ts) / (24 * 60 * 60 * 1000));
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  return `${days} days ago`;
};

export default function PatientDetailPage({
  params,
}: {
  params: { uid: string };
}) {
  const uid = params.uid;
  const [patient, setPatient] = useState<PatientRecord | null>(null);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getPatientByAuthUid(uid), listVisitsForUser(uid)]).then(
      ([record, rows]) => {
        if (cancelled) return;
        setPatient(record);
        setVisits(rows);
        setLoading(false);
      }
    );
    return () => {
      cancelled = true;
    };
  }, [uid]);

  const lastPhotoAt = useMemo(() => {
    let last: number | null = null;
    for (const visit of visits) {
      for (const image of visit.images) {
        if (image.capturedAt && (!last || image.capturedAt > last)) {
          last = image.capturedAt;
        }
      }
    }
    return last;
  }, [visits]);

  const name = patient?.full_name ?? "Patient";

  return (
    <div className="min-h-screen bg-warmGray-50/40">
      <header className="border-b border-warmGray-100 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <div>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1 text-xs text-warmGray-600 hover:text-brand"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> All patients
            </Link>
            <h1 className="mt-0.5 text-xl font-semibold text-warmGray-800">{name}</h1>
            <p className="text-xs text-warmGray-600">
              {[
                patient?.age ? `Age ${patient.age}` : null,
                patient?.sex ?? null,
                patient?.city ? `${patient.city}, ${patient.state ?? ""}` : null,
                patient?.conditions?.length ? patient.conditions.join(", ") : null,
              ]
                .filter(Boolean)
                .join(" · ") || "No intake details on file"}
            </p>
          </div>
          <div className="text-right">
            <p className="flex items-center justify-end gap-1 text-[11px] uppercase tracking-wide text-warmGray-600">
              <Camera className="h-3.5 w-3.5" /> Last photos
            </p>
            <p className="text-sm font-semibold text-warmGray-800">
              {lastPhotoAt ? `${fmtDate(lastPhotoAt)} (${daysAgo(lastPhotoAt)})` : "None yet"}
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-6 px-6 py-6">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-20 text-sm text-warmGray-600">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading patient record…
          </div>
        ) : (
          <>
            <section>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-warmGray-600">
                <Clock className="h-4 w-4" /> Photo timeline ({visits.length} check
                {visits.length === 1 ? "" : "s"})
              </h2>
              {visits.length === 0 ? (
                <p className="rounded-2xl border border-warmGray-100 bg-white p-4 text-sm text-warmGray-600">
                  No saved checks for this patient yet — or your account isn&apos;t
                  assigned to them.
                </p>
              ) : (
                <div className="space-y-4">
                  {[...visits].reverse().map((visit) => {
                    const level = visit.result?.screening?.overall.level;
                    return (
                      <div
                        key={visit.id}
                        className="rounded-2xl border border-warmGray-100 bg-white p-4"
                      >
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold text-warmGray-800">
                              {fmtDate(visit.startedAt)}
                            </p>
                            <p className="text-[11px] text-warmGray-600">
                              {daysAgo(visit.startedAt)} · {visit.images.length} photos
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {level && (
                              <span
                                className={cn(
                                  "rounded-full px-2.5 py-1 text-xs font-semibold",
                                  LEVEL_BADGE[level]
                                )}
                              >
                                {LEVEL_LABEL[level]}
                              </span>
                            )}
                            <Link
                              href={`/results?patient=${uid}`}
                              className="text-xs font-semibold text-brand"
                            >
                              Open report →
                            </Link>
                          </div>
                        </div>
                        {visit.result?.screening?.overall.headline && (
                          <p className="mb-3 text-xs text-warmGray-800">
                            {visit.result.screening.overall.headline}
                          </p>
                        )}
                        <div className="grid grid-cols-4 gap-2">
                          {visit.images.map((image, index) => (
                            <figure key={index}>
                              <div className="aspect-square overflow-hidden rounded-xl bg-warmGray-50">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={image.dataUrl}
                                  alt={`${image.side} foot ${image.view}`}
                                  className="h-full w-full object-cover"
                                />
                              </div>
                              <figcaption className="mt-1 text-center text-[10px] text-warmGray-600">
                                {image.side === "left" ? "L" : "R"} ·{" "}
                                {image.view.replace("_", " ")}
                              </figcaption>
                            </figure>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <PatientChat patientAuthUid={uid} patientName={patient?.full_name} />
          </>
        )}
      </main>
    </div>
  );
}
