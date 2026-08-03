"use client";

import { forwardRef, ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "ghost" | "outline" | "subtle";
type Size = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
}

const variants: Record<Variant, string> = {
  primary:
    "bg-primary text-white shadow-button hover:bg-primary-deep disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none",
  ghost: "bg-transparent text-primary hover:bg-primary-soft",
  outline:
    "border border-slate-200 bg-surface-raised text-ink hover:border-slate-300 hover:bg-slate-50",
  subtle: "bg-slate-100 text-ink hover:bg-slate-200",
};

// 44px minimum touch target on every size.
const sizes: Record<Size, string> = {
  sm: "h-11 px-4 text-sm",
  md: "h-12 px-5 text-base",
  lg: "h-14 px-6 text-base",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", fullWidth, ...rest }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center rounded-2xl font-bold transition-all duration-150",
        "active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-90 disabled:active:scale-100",
        variants[variant],
        sizes[size],
        fullWidth && "w-full",
        className
      )}
      {...rest}
    />
  )
);
Button.displayName = "Button";
