"use client";
import * as React from "react";

export interface BitGridProps {
  width?: number;
  height?: number;
  color?: string;
  density?: number;
  className?: string;
}

/** Sparse cell-field texture for data-heavy backgrounds. */
export function BitGrid({
  width = 400, height = 200, color = "#2563EB", density = 0.5, className,
}: BitGridProps) {
  const cells = React.useMemo(() => {
    const out: React.ReactElement[] = [];
    const s = 8;
    for (let y = 0; y < height; y += s) {
      for (let x = 0; x < width; x += s) {
        const h = Math.sin(x * 0.05) * Math.cos(y * 0.07) + Math.sin((x + y) * 0.03);
        if (h > 1 - density) {
          out.push(
            <rect key={`${x}-${y}`} x={x} y={y} width={s - 2} height={s - 2}
              fill={color} opacity={0.15 + 0.6 * (h - (1 - density))} />
          );
        }
      }
    }
    return out;
  }, [width, height, color, density]);
  return (
    <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} className={className} aria-hidden>
      {cells}
    </svg>
  );
}
