"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useSoleiqStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { ScreenHeader } from "@/components/flow/ScreenContainer";
import { cn } from "@/lib/utils";
import {
  FOOT_PROCEDURES,
  FOOT_REGION_LABEL,
  type FootRegion,
} from "@/lib/types";

type Event = {
  type: "ulcer" | "amputation";
  side: "left" | "right";
  region: FootRegion;
  year: number;
};

const REGION_OPTIONS = Object.entries(FOOT_REGION_LABEL) as [FootRegion, string][];

const YesNo = ({
  value,
  onChange,
}: {
  value: boolean | null;
  onChange: (v: boolean) => void;
}) => (
  <div className="grid grid-cols-2 gap-2.5">
    {(["no", "yes"] as const).map((opt) => {
      const v = opt === "yes";
      const active = value === v;
      return (
        <button
          key={opt}
          onClick={() => onChange(v)}
          className={cn(
            "h-12 rounded-2xl border text-sm font-medium capitalize transition-colors",
            active
              ? "border-brand bg-blue-50 text-brand"
              : "border-warmGray-100 bg-white text-warmGray-800"
          )}
        >
          {opt}
        </button>
      );
    })}
  </div>
);

const SidePicker = ({
  value,
  onChange,
}: {
  value: "left" | "right";
  onChange: (v: "left" | "right") => void;
}) => (
  <div className="grid grid-cols-2 gap-2">
    {(["right", "left"] as const).map((s) => {
      const active = value === s;
      return (
        <button
          key={s}
          type="button"
          onClick={() => onChange(s)}
          className={cn(
            "h-10 rounded-xl border text-sm font-medium capitalize transition-colors",
            active
              ? "border-brand bg-blue-50 text-brand"
              : "border-warmGray-100 bg-white text-warmGray-800"
          )}
        >
          {s}
        </button>
      );
    })}
  </div>
);

export function FootHistory() {
  const goNext = useSoleiqStore((s) => s.goNext);
  const update = useSoleiqStore((s) => s.updateProfile);
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 1979 }, (_, i) => currentYear - i);

  const [hasEvents, setHasEvents] = useState<boolean | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [hasSurgery, setHasSurgery] = useState<boolean | null>(null);
  const [procedures, setProcedures] = useState<string[]>([]);

  const addEvent = () =>
    setEvents([
      ...events,
      { type: "ulcer", side: "right", region: "great_toe", year: currentYear },
    ]);
  const remove = (i: number) => setEvents(events.filter((_, idx) => idx !== i));
  const patch = (i: number, p: Partial<Event>) =>
    setEvents(events.map((e, idx) => (idx === i ? { ...e, ...p } : e)));

  const toggleProcedure = (v: string) => {
    const next = new Set(procedures);
    next.has(v) ? next.delete(v) : next.add(v);
    setProcedures(Array.from(next));
  };

  const eventsOk =
    hasEvents === false || (hasEvents === true && events.length > 0);
  const surgeryOk =
    hasSurgery === false || (hasSurgery === true && procedures.length > 0);
  const ready = eventsOk && surgeryOk;

  return (
    <div className="flex h-full flex-col">
      <ScreenHeader
        eyebrow="Health history"
        title="Foot history"
        subtitle="Prior ulcers, amputations, or recent surgeries."
      />
      <div className="-mx-1 flex-1 space-y-4 overflow-y-auto px-1 pb-2">
        <div>
          <label className="field-label">Any prior foot ulcer or amputation?</label>
          <YesNo value={hasEvents} onChange={setHasEvents} />
          {hasEvents && (
            <div className="mt-2.5 space-y-2">
              {events.map((e, i) => (
                <div
                  key={i}
                  className="space-y-2 rounded-2xl border border-warmGray-100 bg-white p-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] uppercase tracking-wide text-warmGray-600">
                      Event #{i + 1}
                    </span>
                    <button
                      onClick={() => remove(i)}
                      className="text-warmGray-600"
                      aria-label="Remove event"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div>
                    <p className="mb-1 text-[11px] text-warmGray-600">Type</p>
                    <Select
                      value={e.type}
                      onChange={(ev) =>
                        patch(i, { type: ev.target.value as Event["type"] })
                      }
                    >
                      <option value="ulcer">Ulcer</option>
                      <option value="amputation">Amputation</option>
                    </Select>
                  </div>

                  <div>
                    <p className="mb-1 text-[11px] text-warmGray-600">Side</p>
                    <SidePicker
                      value={e.side}
                      onChange={(s) => patch(i, { side: s })}
                    />
                  </div>

                  <div>
                    <p className="mb-1 text-[11px] text-warmGray-600">Region</p>
                    <Select
                      value={e.region}
                      onChange={(ev) =>
                        patch(i, { region: ev.target.value as FootRegion })
                      }
                    >
                      {REGION_OPTIONS.map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div>
                    <p className="mb-1 text-[11px] text-warmGray-600">Year</p>
                    <Select
                      value={e.year}
                      onChange={(ev) =>
                        patch(i, { year: Number(ev.target.value) })
                      }
                    >
                      {years.map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>
              ))}
              <Button variant="outline" fullWidth onClick={addEvent}>
                <Plus className="mr-1 h-4 w-4" /> Add event
              </Button>
            </div>
          )}
        </div>

        <div>
          <label className="field-label">
            Foot surgery in the past 12 months?
          </label>
          <YesNo value={hasSurgery} onChange={setHasSurgery} />
          {hasSurgery && (
            <div className="mt-2.5 space-y-2">
              <p className="text-xs text-warmGray-600">
                Select all procedures that apply.
              </p>
              {FOOT_PROCEDURES.map((p) => (
                <Checkbox
                  key={p.value}
                  checked={procedures.includes(p.value)}
                  onChange={() => toggleProcedure(p.value)}
                  label={p.label}
                />
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="pt-3">
        <Button
          fullWidth
          disabled={!ready}
          onClick={() => {
            update({
              priorEvents: hasEvents ? events : [],
              recentSurgery: {
                flag: !!hasSurgery,
                procedures: hasSurgery ? procedures : undefined,
              },
            });
            goNext();
          }}
        >
          Continue
        </Button>
      </div>
    </div>
  );
}
