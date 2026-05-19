"use client";

import { forwardRef, InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...rest }, ref) => (
    <input
      ref={ref}
      className={cn(
        "h-12 w-full rounded-2xl border border-warmGray-100 bg-warmGray-50/60 px-4 text-base",
        "outline-none transition-colors",
        "focus:border-brand focus:bg-white focus:ring-4 focus:ring-blue-50",
        "placeholder:text-warmGray-600",
        className
      )}
      {...rest}
    />
  )
);
Input.displayName = "Input";
