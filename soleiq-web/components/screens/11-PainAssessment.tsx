"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSoleiqStore } from "@/lib/store";
import { PainMap } from "@/components/pain-map/PainMap";
import { Button } from "@/components/ui/button";
import { ScreenHeader } from "@/components/flow/ScreenContainer";
import { cn } from "@/lib/utils";

export function PainAssessment() {
  const goNext = useSoleiqStore((s) => s.goNext);
  const update = useSoleiqStore((s) => s.updateProfile);
  const [hasPain, setHasPain] = useState<boolean | null>(null);

  return (
    <div className="flex h-full flex-col">
      <ScreenHeader
        eyebrow="Symptoms"
        title="Pain assessment"
        subtitle="Ask the patient: any pain in their feet right now?"
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
                  "h-14 rounded-2xl border text-sm font-medium transition-colors",
                  active
                    ? "border-brand bg-blue-50 text-brand"
                    : "border-warmGray-100 bg-white text-warmGray-800"
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
              <p className="mb-2 text-xs text-warmGray-600">
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
