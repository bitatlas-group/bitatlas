"use client";
import * as React from "react";

export interface BitatlasMarkProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
  /** main b color */
  color?: string;
  /** dot cluster color; defaults to `color` */
  dotColor?: string;
}

/**
 * Primary Bitatlas mark — lowercase "b" whose bowl contains a dotted
 * hemisphere (globe rendered bit-by-bit). Scales from 16px up.
 */
export function BitatlasMark({
  size = 120,
  color = "#2563EB",
  dotColor,
  ...rest
}: BitatlasMarkProps) {
  const dc = dotColor || color;
  const dots: React.ReactElement[] = [];
  const cx = 62, cy = 76, R = 20;
  const rows = 7;
  for (let r = 0; r < rows; r++) {
    const yr = cy - R + (r * (R * 2)) / (rows - 1);
    const dy = yr - cy;
    const w = Math.sqrt(Math.max(0, R * R - dy * dy));
    const count = Math.max(2, Math.round(w / 2.6));
    for (let i = 0; i < count; i++) {
      const t = count === 1 ? 0.5 : i / (count - 1);
      const xr = cx - w + t * (w * 2);
      const edge = Math.abs(xr - cx) / (w || 1);
      const op = 0.35 + 0.65 * (1 - edge * 0.8);
      dots.push(<circle key={`${r}-${i}`} cx={xr} cy={yr} r={1.6} fill={dc} opacity={op} />);
    }
  }
  const clipId = React.useId();
  return (
    <svg
      viewBox="0 0 110 120"
      width={size}
      height={(size * 120) / 110}
      role="img"
      aria-label="Bitatlas"
      {...rest}
    >
      <path
        d="M 22 10 L 34 10 L 34 56 C 40 48, 52 44, 62 44 C 82 44, 96 58, 96 76 C 96 94, 82 108, 62 108 C 42 108, 28 94, 28 76 L 28 60 Z M 62 56 C 50 56, 40 64, 40 76 C 40 88, 50 96, 62 96 C 74 96, 84 88, 84 76 C 84 64, 74 56, 62 56 Z"
        fill={color}
        fillRule="evenodd"
      />
      <defs>
        <clipPath id={clipId}>
          <circle cx={cx} cy={cy} r={R} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>{dots}</g>
    </svg>
  );
}
