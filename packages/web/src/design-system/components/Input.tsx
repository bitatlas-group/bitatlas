"use client";
import * as React from "react";
import { cn } from "../utils/cn";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ iconLeft, iconRight, className, ...rest }, ref) => (
    <div
      className={cn(
        "flex items-center gap-2.5 h-10 px-3.5 rounded-md bg-white border border-ink-100",
        "focus-within:border-brand-500 focus-within:ring-4 focus-within:ring-brand-500/15",
        className,
      )}
    >
      {iconLeft && <span className="text-ink-400 flex">{iconLeft}</span>}
      <input
        ref={ref}
        className="flex-1 bg-transparent outline-none text-[14px] text-ink-900 placeholder:text-ink-400"
        {...rest}
      />
      {iconRight && <span className="text-ink-400 flex">{iconRight}</span>}
    </div>
  ),
);
Input.displayName = "Input";
