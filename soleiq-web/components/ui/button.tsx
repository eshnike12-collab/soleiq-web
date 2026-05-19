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
    "bg-brand text-white shadow-[0_8px_24px_-8px_rgba(31,78,121,0.6)] hover:bg-blue-800 disabled:bg-warmGray-100 disabled:text-warmGray-600 disabled:shadow-none",
  ghost: "bg-transparent text-brand hover:bg-blue-50",
  outline:
    "border border-warmGray-100 bg-white text-warmGray-800 hover:bg-warmGray-50",
  subtle: "bg-warmGray-50 text-warmGray-800 hover:bg-warmGray-100",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-12 px-5 text-base",
  lg: "h-14 px-6 text-base",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", fullWidth, ...rest }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center rounded-2xl font-semibold transition-all",
        "active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-80",
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
