"use client";

/**
 * "Are you taking any major medications, and which?"
 *
 * Three answers, not two: yes, no, and prefer not to say. The third is a real
 * answer — it records that the question was put and declined, which is why it
 * stores `null` rather than leaving the field undefined. Undefined means
 * never asked, and that is what makes this screen mandatory for returning
 * patients (see lib/medications.ts).
 *
 * The name list is free text with suggestions over a local table. A name we
 * do not recognise is accepted and stored verbatim — the suggestions exist to
 * save typing and to attach a category, never to restrict what can be said.
 */

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { useSoleiqStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RadioGroup } from "@/components/ui/radio";
import { ScreenHeader } from "@/components/flow/ScreenContainer";
import { useT } from "@/lib/i18n/I18nProvider";
import {
  medicationsNeedAnswer,
  suggestMedications,
  toMedicationItem,
} from "@/lib/medications";
import type { MedicationCategory } from "@/lib/types";

type Answer = "yes" | "no" | "undisclosed";

export function Medications() {
  const d = useT();
  const goNext = useSoleiqStore((s) => s.goNext);
  const update = useSoleiqStore((s) => s.updateProfile);
  const profile = useSoleiqStore((s) => s.profile);
  const m = d.screens.medications;

  /* Returning patients who have never seen this question get told why they
     are being asked, rather than wondering what changed. Captured on mount:
     answering must not make the explanation vanish mid-screen. */
  const [wasNewQuestion] = useState(() => medicationsNeedAnswer(profile));

  const saved = profile.medications;
  const [answer, setAnswer] = useState<Answer | undefined>(() => {
    if (!saved) return undefined;
    if (saved.takesMajorMedication === null) return "undisclosed";
    return saved.takesMajorMedication ? "yes" : "no";
  });
  const [items, setItems] = useState<{ name: string; category?: MedicationCategory }[]>(
    () => saved?.items ?? []
  );
  const [draft, setDraft] = useState("");
  const [notes, setNotes] = useState(saved?.notes ?? "");

  const suggestions = suggestMedications(draft).filter(
    (entry) => !items.some((item) => item.name.toLowerCase() === entry.name.toLowerCase())
  );

  const add = (name: string) => {
    const item = toMedicationItem(name);
    if (!item.name) return;
    // Same medicine twice is a slip, not an answer.
    if (items.some((existing) => existing.name.toLowerCase() === item.name.toLowerCase())) {
      setDraft("");
      return;
    }
    setItems([...items, item]);
    setDraft("");
  };

  const categoryLabel = (category?: MedicationCategory) =>
    category ? m.categories[category] : null;

  // "Yes" with nothing named is still an answer — someone may not remember
  // the names, and that is more useful to a clinician than a forced blank.
  const ready = answer !== undefined;

  return (
    <div className="flex h-full flex-col">
      <ScreenHeader
        eyebrow={d.screens.historyEyebrow}
        title={m.title}
        subtitle={m.subtitle}
      />

      <div className="-mx-1 flex-1 space-y-4 overflow-y-auto px-1 pb-2">
        {wasNewQuestion && (
          <p className="rounded-2xl bg-primary-soft p-3 text-[13px] font-semibold leading-snug text-primary-deep">
            {m.newQuestion}
          </p>
        )}

        <div>
          <label className="field-label">{m.question}</label>
          <RadioGroup<Answer>
            value={answer}
            onChange={setAnswer}
            options={[
              { value: "yes", label: d.common.yes },
              { value: "no", label: d.common.no },
              { value: "undisclosed", label: m.preferNotToSay },
            ]}
          />
        </div>

        {answer === "yes" && (
          <div className="space-y-2.5">
            <div>
              <label className="field-label">{m.listTitle}</label>
              <p className="mb-2 text-[12px] leading-snug text-ink-faint">{m.listHint}</p>
              <div className="flex items-center gap-2">
                <Input
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      add(draft);
                    }
                  }}
                  placeholder={m.inputPlaceholder}
                  aria-label={m.listTitle}
                  autoComplete="off"
                />
                <button
                  type="button"
                  onClick={() => add(draft)}
                  disabled={draft.trim().length === 0}
                  className="inline-flex h-12 shrink-0 items-center gap-1 rounded-2xl bg-primary px-4 text-sm font-bold text-white transition-transform duration-150 active:scale-[0.97] disabled:opacity-50"
                >
                  <Plus className="h-4 w-4" /> {d.common.add}
                </button>
              </div>
            </div>

            {suggestions.length > 0 && (
              <div>
                <p className="mb-1.5 text-[12px] font-semibold text-ink-faint">
                  {m.suggestions}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {suggestions.map((entry) => (
                    <button
                      key={entry.name}
                      type="button"
                      onClick={() => add(entry.name)}
                      className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full border border-slate-200 bg-surface-raised px-3 text-[13px] font-semibold text-ink transition-colors hover:border-primary"
                    >
                      {entry.name}
                      <span className="text-[11px] font-medium text-ink-faint">
                        {categoryLabel(entry.category)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <p className="mb-1.5 text-[12px] font-semibold text-ink-faint">
                {m.added}
              </p>
              {items.length === 0 ? (
                <p className="text-[13px] text-ink-faint">{m.empty}</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {items.map((item) => (
                    <span
                      key={item.name}
                      className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full border border-primary bg-primary-soft px-3 text-[13px] font-semibold text-primary-deep"
                    >
                      {item.name}
                      {categoryLabel(item.category) && (
                        <span className="text-[11px] font-medium opacity-70">
                          {categoryLabel(item.category)}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() =>
                          setItems(items.filter((other) => other.name !== item.name))
                        }
                        aria-label={`${d.common.remove}: ${item.name}`}
                        className="ml-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full hover:bg-white/60"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="field-label" htmlFor="medication-notes">
                {m.notesLabel}{" "}
                <span className="font-normal text-ink-faint">({d.common.optional})</span>
              </label>
              <textarea
                id="medication-notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder={m.notesPlaceholder}
                rows={3}
                className="w-full rounded-2xl border border-slate-200 bg-surface-raised px-4 py-3 text-base text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-primary focus:ring-4 focus:ring-primary-soft"
              />
            </div>
          </div>
        )}

        <p className="text-[12px] leading-snug text-ink-faint">{m.privacy}</p>
      </div>

      <div className="pt-3">
        <Button
          fullWidth
          disabled={!ready}
          onClick={() => {
            // "no" and "prefer not to say" discard any names typed before the
            // answer changed, so the stored record matches what was chosen.
            const takesMajorMedication =
              answer === "yes" ? true : answer === "no" ? false : null;
            update({
              medications: {
                takesMajorMedication,
                items: answer === "yes" ? items : [],
                ...(answer === "yes" && notes.trim() ? { notes: notes.trim() } : {}),
              },
            });
            goNext();
          }}
        >
          {d.common.continue}
        </Button>
      </div>
    </div>
  );
}
