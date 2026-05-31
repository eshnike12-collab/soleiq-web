"use client";

import { useState } from "react";
import { HelpCircle, X, BookOpen } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  getCondition,
  type ConditionDefinition,
  type ConditionTable,
} from "@/lib/conditionDefinitions";
import { cn } from "@/lib/utils";

interface Props {
  conditionId: string;
}

/**
 * "?" pill that opens an in-app dialog with the structured clinical definition
 * for the condition. Rendered inline beside each Medical-History checkbox.
 */
export function ConditionHelpButton({ conditionId }: Props) {
  const [open, setOpen] = useState(false);
  const def = getCondition(conditionId);
  if (!def) return null;
  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-warmGray-600 hover:bg-warmGray-50 hover:text-brand"
        aria-label={`What is ${def.name}?`}
        title={`What is ${def.name}?`}
      >
        <HelpCircle className="h-4 w-4" />
      </button>
      <ConditionDialog
        open={open}
        onClose={() => setOpen(false)}
        definition={def}
      />
    </>
  );
}

function ConditionDialog({
  open,
  onClose,
  definition: d,
}: {
  open: boolean;
  onClose: () => void;
  definition: ConditionDefinition;
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 z-40 bg-black/50 backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="absolute inset-x-3 top-6 bottom-3 z-50 overflow-hidden rounded-3xl bg-white shadow-2xl flex flex-col"
            role="dialog"
            aria-modal="true"
            aria-labelledby="condition-title"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="flex items-start justify-between border-b border-warmGray-100 px-4 py-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-brand">
                  Condition reference
                </p>
                <h2 id="condition-title" className="mt-0.5 text-lg font-semibold text-warmGray-800">
                  {d.name}
                </h2>
              </div>
              <button
                onClick={onClose}
                className="rounded-full p-1.5 text-warmGray-600 hover:bg-warmGray-50"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto px-4 py-4 text-sm leading-snug text-warmGray-800">
              <section className="mb-4">
                <p>{d.patientSummary}</p>
              </section>

              {d.tables.map((t, i) => (
                <TableBlock key={i} table={t} />
              ))}

              {d.treatmentNotes && d.treatmentNotes.length > 0 && (
                <Block title="Clinical notes">
                  <ul className="space-y-1 pl-1">
                    {d.treatmentNotes.map((n, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="mt-1.5 inline-block h-1 w-1 shrink-0 rounded-full bg-warmGray-600" />
                        <span>{n}</span>
                      </li>
                    ))}
                  </ul>
                </Block>
              )}

              {d.ageNotes && <Block title="By age"><p>{d.ageNotes}</p></Block>}
              {d.sexNotes && <Block title="By sex"><p>{d.sexNotes}</p></Block>}
              {d.ethnicityNotes && (
                <Block title="By race / ethnicity">
                  <p>{d.ethnicityNotes}</p>
                </Block>
              )}

              <Block title="Why it matters for foot-ulcer risk" highlight>
                <p>{d.dfuImplication}</p>
              </Block>

              {d.citations.length > 0 && (
                <div className="mt-4 flex items-start gap-1.5 border-t border-warmGray-100 pt-3 text-[11px] italic text-warmGray-600">
                  <BookOpen className="mt-0.5 h-3 w-3 shrink-0" />
                  <p>{d.citations.join(" · ")}</p>
                </div>
              )}

              <p className="mt-3 text-[10px] italic text-warmGray-600">
                Decision support, not a diagnosis. Discuss any specific
                clinical questions with the treating provider.
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function Block({
  title,
  children,
  highlight,
}: {
  title: string;
  children: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <section className="mb-3">
      <h3 className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-warmGray-600">
        {title}
      </h3>
      <div
        className={cn(
          "rounded-xl p-2.5 text-[13px]",
          highlight
            ? "bg-blue-50 border border-blue-100 text-blue-900"
            : "bg-warmGray-50"
        )}
      >
        {children}
      </div>
    </section>
  );
}

function TableBlock({ table }: { table: ConditionTable }) {
  const cols = table.columns ?? ["Category", "Range", "Meaning"];
  return (
    <section className="mb-3">
      <h3 className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-warmGray-600">
        {table.title}
      </h3>
      <div className="overflow-hidden rounded-xl border border-warmGray-100">
        <table className="w-full text-[12px]">
          <thead className="bg-warmGray-50 text-[10px] uppercase tracking-wide text-warmGray-600">
            <tr>
              {cols.map((c) => (
                <th key={c} className="px-2 py-1.5 text-left">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((r, i) => (
              <tr key={i} className="border-t border-warmGray-100">
                <td className="px-2 py-1.5 font-medium text-warmGray-800">{r.category}</td>
                <td className="px-2 py-1.5 text-warmGray-800">{r.range}</td>
                {r.meaning && (
                  <td className="px-2 py-1.5 text-warmGray-600">{r.meaning}</td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
