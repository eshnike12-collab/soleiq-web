"use client";

import { create } from "zustand";
import { AnimatePresence, motion } from "framer-motion";

interface ToastStore {
  message: string | null;
  show: (m: string, ms?: number) => void;
  hide: () => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  message: null,
  show: (m, ms = 2500) => {
    set({ message: m });
    setTimeout(() => set({ message: null }), ms);
  },
  hide: () => set({ message: null }),
}));

export function ToastHost() {
  const message = useToastStore((s) => s.message);
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 24, opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="absolute bottom-16 left-1/2 z-50 -translate-x-1/2 rounded-2xl bg-ink px-4 py-2.5 text-sm font-semibold text-surface shadow-lifted"
        >
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
