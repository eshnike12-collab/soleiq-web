"use client";

import { motion } from "framer-motion";
import { useSoleiqStore } from "@/lib/store";
import { Button } from "@/components/ui/button";

export function Welcome() {
  const goNext = useSoleiqStore((s) => s.goNext);
  return (
    <div className="flex h-full flex-col items-center justify-center text-center">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", duration: 0.6 }}
        className="mb-8 flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-brand to-blue-800 text-3xl font-bold text-white shadow-[0_20px_40px_-15px_rgba(31,78,121,0.6)]"
      >
        SQ
      </motion.div>
      <h1 className="text-3xl font-semibold text-warmGray-800">SoleIQ</h1>
      <p className="mt-2 max-w-[280px] text-sm leading-snug text-warmGray-600">
        AI-assisted diabetic foot screening — clinician decision support for
        primary care and podiatry visits.
      </p>
      <div className="mt-10 w-full max-w-[300px]">
        <Button fullWidth size="lg" onClick={goNext}>
          Start patient visit
        </Button>
        <p className="mt-3 text-[11px] text-warmGray-600">
          ~4 minutes per patient. For clinical use.
        </p>
      </div>
    </div>
  );
}
