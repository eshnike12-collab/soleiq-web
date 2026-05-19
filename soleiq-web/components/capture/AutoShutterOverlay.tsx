"use client";

import { motion, AnimatePresence } from "framer-motion";

export function AutoShutterOverlay({
  show,
  thumbnail,
}: {
  show: boolean;
  thumbnail?: string;
}) {
  return (
    <AnimatePresence>
      {show && (
        <>
          <motion.div
            initial={{ opacity: 0.6 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
            className="pointer-events-none absolute inset-0 bg-white"
          />
          {thumbnail && (
            <motion.img
              src={thumbnail}
              initial={{ scale: 1.1, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="absolute right-3 top-3 h-16 w-16 rounded-lg border-2 border-white object-cover shadow-lg"
              alt="Captured"
            />
          )}
        </>
      )}
    </AnimatePresence>
  );
}
