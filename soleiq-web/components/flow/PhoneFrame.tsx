"use client";

import { ReactNode } from "react";

export function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen w-full flex items-center justify-center md:p-6">
      <div
        className="
          relative w-full md:w-[390px] md:h-[844px]
          bg-white overflow-hidden
          md:rounded-[44px] md:border md:border-warmGray-100
          md:shadow-[0_30px_80px_-30px_rgba(28,28,28,0.25)]
        "
      >
        <div className="hidden md:block absolute left-1/2 top-2 z-30 h-1.5 w-24 -translate-x-1/2 rounded-full bg-warmGray-100" />
        {children}
      </div>
    </div>
  );
}
