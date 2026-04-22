"use client";
import * as React from "react";
import { cn } from "../utils/cn";

type Tone = "brand" | "neutral" | "success" | "warn" | "danger" | "dark";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
}

const tones: Record<Tone, string> = {
  brand:   "bg-brand-50 text-brand-600 ring-brand-100",
  neutral: "bg-ink-50 text-ink-700 ring-ink-100",
  success: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  warn:    "bg-amber-50 text-amber-700 ring-amber-200",
  danger:  "bg-red-50 text-red-700 ring-red-100",
  dark:    "bg-ink-900 text-white ring-ink-800",
};

export function Badge({ tone = "brand", className, children, ...rest }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-medium tracking-tight ring-1 ring-inset",
        tones[tone],
        className,
      )}
      {...rest}
    >
      {children}
    </span>
  );
}
