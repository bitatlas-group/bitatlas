/** Template for new icons. Copy this file, rename, keep the 24×24 canvas
 *  and 1.6px stroke. Use only currentColor; never hardcode fill or stroke. */
import * as React from "react";
import type { IconProps } from "./index";

export const IconTemplate = ({ size = 24, ...p }: IconProps) => (
  <svg
    width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth={1.6}
    strokeLinecap="round" strokeLinejoin="round"
    {...p}
  >
    {/* paths here */}
  </svg>
);
