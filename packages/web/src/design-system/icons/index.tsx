/* Icon primitives — 24x24, 1.6px stroke, currentColor.
   Add new icons by copying _template.tsx. */

import * as React from "react";

export type IconProps = React.SVGProps<SVGSVGElement> & { size?: number };

const base = (size: number): React.SVGProps<SVGSVGElement> => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round",
  strokeLinejoin: "round",
});

export const IconGlobe = ({ size = 24, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
  </svg>
);

export const IconData = ({ size = 24, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <rect x="3" y="4" width="4" height="4" /><rect x="10" y="4" width="4" height="4" />
    <rect x="17" y="4" width="4" height="4" /><rect x="3" y="11" width="4" height="4" />
    <rect x="17" y="11" width="4" height="4" /><rect x="10" y="18" width="4" height="2.5" />
    <path d="M7 6h3M14 6h3M5 8v3M19 8v3M5 15v3h5M19 15v3h-5" />
  </svg>
);

export const IconShield = ({ size = 24, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3zM9 12l2 2 4-4" />
  </svg>
);

export const IconChart = ({ size = 24, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <path d="M3 21V5M3 21h18" />
    <rect x="6" y="13" width="3" height="6" /><rect x="11" y="9" width="3" height="10" />
    <rect x="16" y="5" width="3" height="14" />
  </svg>
);

export const IconCompass = ({ size = 24, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <circle cx="12" cy="12" r="9" /><path d="M15.5 8.5l-2 5-5 2 2-5z" />
  </svg>
);

export const IconLayers = ({ size = 24, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <path d="M12 3l9 5-9 5-9-5 9-5zM3 13l9 5 9-5M3 17l9 5 9-5" />
  </svg>
);

export const IconPulse = ({ size = 24, ...p }: IconProps) => (
  <svg {...base(size)} {...p}><path d="M3 12h4l2-6 4 12 2-6h6" /></svg>
);

export const IconNode = ({ size = 24, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <circle cx="5" cy="5" r="2" /><circle cx="19" cy="5" r="2" />
    <circle cx="12" cy="12" r="2" /><circle cx="5" cy="19" r="2" /><circle cx="19" cy="19" r="2" />
    <path d="M7 5l3 6M17 5l-3 6M7 19l3-6M17 19l-3-6" />
  </svg>
);

export const IconSearch = ({ size = 24, ...p }: IconProps) => (
  <svg {...base(size)} {...p}><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></svg>
);

export const IconArrow = ({ size = 24, ...p }: IconProps) => (
  <svg {...base(size)} {...p}><path d="M5 12h14M13 6l6 6-6 6" /></svg>
);

export const IconCheck = ({ size = 24, ...p }: IconProps) => (
  <svg {...base(size)} {...p}><path d="M4 12l5 5L20 6" /></svg>
);

export const IconSpark = ({ size = 24, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6" />
  </svg>
);

export const Icons = {
  globe: IconGlobe, data: IconData, shield: IconShield, chart: IconChart,
  compass: IconCompass, layers: IconLayers, pulse: IconPulse, node: IconNode,
  search: IconSearch, arrow: IconArrow, check: IconCheck, spark: IconSpark,
} as const;

export type IconName = keyof typeof Icons;

/** Name-indexed icon renderer. */
export function Icon({ name, ...rest }: IconProps & { name: IconName }) {
  const C = Icons[name];
  return <C {...rest} />;
}
