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
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 30, opacity: 0 }}
          className="absolute bottom-16 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-warmGray-800 px-4 py-2 text-sm text-white shadow-lg"
        >
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
