"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSoleiqStore } from "@/lib/store";
import { PainMap } from "@/components/pain-map/PainMap";
import { Button } from "@/components/ui/button";
import { ScreenHeader } from "@/components/flow/ScreenContainer";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/I18nProvider";

export function PainAssessment() {
  const d = useT();
  const goNext = useSoleiqStore((s) => s.goNext);
  const update = useSoleiqStore((s) => s.updateProfile);
  const profile = useSoleiqStore((s) => s.profile);
  const [hasPain, setHasPain] = useState<boolean | null>(
    () => profile.painPresent ?? null
  );

  return (
    <div className="flex h-full flex-col">
      <ScreenHeader
        eyebrow={d.screens.painEyebrow}
        title={d.screens.painTitle}
        subtitle={d.screens.painSubtitle}
      />
      <div className="-mx-1 flex-1 space-y-4 overflow-y-auto px-1 pb-2">
        <div className="grid grid-cols-2 gap-2.5">
          {[
            { v: false, label: "No" },
            { v: true, label: "Yes" },
          ].map((o) => {
            const active = hasPain === o.v;
            return (
              <button
                key={o.label}
                onClick={() => setHasPain(o.v)}
                className={cn(
                  "h-14 rounded-2xl border text-[15px] transition-all duration-150 active:scale-[0.98]",
                  active
                    ? "border-primary bg-primary-soft font-bold text-primary"
                    : "border-slate-200 bg-surface-raised font-medium text-ink hover:border-slate-300"
                )}
              >
                {o.label}
              </button>
            );
          })}
        </div>

        <AnimatePresence>
          {hasPain && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <p className="mb-2 text-[13px] text-ink-soft">
                Tap each green point where you feel pain. They'll turn red.
              </p>
              <PainMap />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <div className="pt-3">
        <Button
          fullWidth
          disabled={hasPain === null}
          onClick={() => {
            update({ painPresent: !!hasPain });
            goNext();
          }}
        >
          Continue
        </Button>
      </div>
    </div>
  );
}
