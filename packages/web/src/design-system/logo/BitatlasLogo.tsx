"use client";
import * as React from "react";
import { BitatlasMark } from "./BitatlasMark";
import { cn } from "../utils/cn";

export interface BitatlasLogoProps {
  /** Mark height; wordmark scales relative to this */
  size?: number;
  /** Mark color */
  color?: string;
  /** Wordmark color */
  wordColor?: string;
  /** Tagline color; defaults to mark color */
  taglineColor?: string;
  /** Show "MAP THE DIGITAL WORLD" tagline under wordmark */
  tagline?: boolean;
  className?: string;
}

/** Horizontal lockup: mark + wordmark + (optional) tagline. */
export function BitatlasLogo({
  size = 40,
  color = "#2563EB",
  wordColor = "#081220",
  taglineColor,
  tagline = false,
  className,
}: BitatlasLogoProps) {
  const tc = taglineColor || color;
  return (
    <div
      className={cn("inline-flex items-center", className)}
      style={{ gap: size * 0.28 }}
    >
      <BitatlasMark size={size} color={color} />
      <div className="flex flex-col" style={{ lineHeight: 1, gap: size * 0.08 }}>
        <span
          className="font-sans font-semibold tracking-tight"
          style={{ fontSize: size * 0.95, color: wordColor }}
        >
          bitatlas
        </span>
        {tagline && (
          <span
            className="font-sans font-medium uppercase"
            style={{ fontSize: size * 0.19, letterSpacing: "0.28em", color: tc }}
          >
            Map the digital world
          </span>
        )}
      </div>
    </div>
  );
}
