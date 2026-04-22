"use client";
import * as React from "react";

export interface DottedGlobeProps {
  size?: number;
  color?: string;
  dim?: string;
  opacity?: number;
  className?: string;
}

/** Dotted hemisphere — the brand's signature texture. */
export function DottedGlobe({
  size = 300,
  color = "#2563EB",
  dim = "#1D4ED8",
  opacity = 1,
  className,
}: DottedGlobeProps) {
  const dots = React.useMemo(() => {
    const out: React.ReactElement[] = [];
    const cx = size / 2, cy = size / 2, R = size * 0.46;
    const rows = 26;
    for (let r = 0; r < rows; r++) {
      const yr = cy - R + (r * (R * 2)) / (rows - 1);
      const dy = yr - cy;
      const w = Math.sqrt(Math.max(0, R * R - dy * dy));
      const count = Math.max(3, Math.round(w / 4));
      for (let i = 0; i < count; i++) {
        const t = count === 1 ? 0.5 : i / (count - 1);
        const xr = cx - w + t * (w * 2);
        const edge = Math.abs(xr - cx) / (w || 1);
        const h = Math.sin(xr * 0.15) * Math.cos(yr * 0.11) + Math.sin(yr * 0.22 + xr * 0.05);
        if (h <= -0.4) continue;
        const op = (0.25 + 0.75 * (1 - edge * 0.9)) * opacity;
        out.push(
          <circle key={`${r}-${i}`} cx={xr} cy={yr} r={size * 0.006} fill={h > 0.6 ? color : dim} opacity={op} />
        );
      }
    }
    return out;
  }, [size, color, dim, opacity]);
  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} className={className} aria-hidden>
      {dots}
    </svg>
  );
}
