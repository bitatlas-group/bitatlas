"use client";
import * as React from "react";
import { cn } from "../utils/cn";

/** Uppercase tracking label, e.g. section eyebrow. */
export function Label({ className, children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("text-label uppercase text-ink-400", className)}
      {...rest}
    >
      {children}
    </div>
  );
}
