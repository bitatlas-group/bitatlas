"use client";
import * as React from "react";

export interface MeridiansProps {
  size?: number;
  color?: string;
  opacity?: number;
  className?: string;
}

/** Geodesic grid — thin-stroke globe lines. */
export function Meridians({ size = 400, color = "#2563EB", opacity = 0.4, className }: MeridiansProps) {
  const cx = size / 2, cy = size / 2, R = size * 0.46;
  const elems: React.ReactElement[] = [];
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI;
    const rx = R * Math.abs(Math.cos(a));
    elems.push(<ellipse key={`m${i}`} cx={cx} cy={cy} rx={rx} ry={R} fill="none" stroke={color} strokeWidth={0.6} opacity={opacity} />);
  }
  for (let i = 1; i < 6; i++) {
    const ry = (i / 6) * R;
    elems.push(<ellipse key={`p${i}`} cx={cx} cy={cy} rx={R} ry={ry} fill="none" stroke={color} strokeWidth={0.6} opacity={opacity} />);
  }
  elems.push(<circle key="eq" cx={cx} cy={cy} r={R} fill="none" stroke={color} strokeWidth={0.8} opacity={opacity} />);
  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} className={className} aria-hidden>
      {elems}
    </svg>
  );
}
