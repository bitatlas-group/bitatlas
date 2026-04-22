"use client";
import * as React from "react";
import { cn } from "../utils/cn";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "dark";
type Size = "sm" | "md" | "lg";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
  asChild?: boolean;
}

const variants: Record<Variant, string> = {
  primary:   "bg-brand-500 text-white border border-brand-500 hover:bg-brand-600 hover:border-brand-600 active:bg-brand-600",
  secondary: "bg-white text-ink-800 border border-ink-100 hover:bg-ink-50",
  outline:   "bg-transparent text-brand-500 border border-brand-500 hover:bg-brand-50",
  ghost:     "bg-transparent text-brand-500 border border-transparent hover:bg-brand-50",
  dark:      "bg-ink-900 text-white border border-ink-900 hover:bg-ink-800 hover:border-ink-800",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-[14px] text-[13px] gap-[6px]",
  md: "h-10 px-[18px] text-[14px] gap-2",
  lg: "h-12 px-6 text-[15px] gap-[10px]",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", iconLeft, iconRight, className, children, ...rest }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center rounded-md font-medium tracking-tight transition-colors",
        "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-500/15",
        "disabled:opacity-50 disabled:pointer-events-none",
        sizes[size],
        variants[variant],
        className,
      )}
      {...rest}
    >
      {iconLeft}
      {children}
      {iconRight}
    </button>
  ),
);
Button.displayName = "Button";
