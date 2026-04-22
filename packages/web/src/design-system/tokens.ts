/** Bitatlas design tokens — typed exports. Mirrors tokens.css. */

export const colors = {
  brand: {
    50:  "#EFF4FF",
    100: "#DBEAFE",
    400: "#3B82F6",
    500: "#2563EB",
    600: "#1D4ED8",
  },
  ink: {
    25:  "#F8FAFC",
    50:  "#F1F5F9",
    100: "#E2E8F0",
    200: "#CBD5E1",
    300: "#94A3B8",
    400: "#64748B",
    500: "#475569",
    600: "#334155",
    700: "#1E293B",
    800: "#0F1B2E",
    900: "#081220",
  },
  semantic: {
    success: "#10B981",
    warn:    "#F59E0B",
    danger:  "#EF4444",
    info:    "#2563EB",
  },
} as const;

export const radius = {
  xs: 4, sm: 6, md: 10, lg: 14, xl: 20, pill: 9999,
} as const;

export const shadow = {
  sm:   "0 1px 2px rgba(8,18,32,0.06), 0 1px 1px rgba(8,18,32,0.04)",
  md:   "0 4px 12px rgba(8,18,32,0.08), 0 2px 4px rgba(8,18,32,0.04)",
  lg:   "0 16px 40px rgba(8,18,32,0.12), 0 4px 12px rgba(8,18,32,0.06)",
  glow: "0 0 0 4px rgba(37,99,235,0.15)",
} as const;

export const font = {
  sans: "'Poppins', system-ui, -apple-system, 'Segoe UI', sans-serif",
  mono: "'JetBrains Mono', 'SF Mono', Menlo, monospace",
} as const;

export const type = {
  display: { size: "72px", weight: 600, lineHeight: "1.02", tracking: "-0.03em" },
  h1:      { size: "40px", weight: 600, lineHeight: "1.1",  tracking: "-0.02em" },
  h2:      { size: "28px", weight: 600, lineHeight: "1.2",  tracking: "-0.015em" },
  h3:      { size: "20px", weight: 600, lineHeight: "1.3",  tracking: "-0.01em" },
  body:    { size: "16px", weight: 400, lineHeight: "1.6",  tracking: "0" },
  small:   { size: "14px", weight: 400, lineHeight: "1.5",  tracking: "0" },
  label:   { size: "11px", weight: 600, lineHeight: "1.3",  tracking: "0.24em", uppercase: true },
} as const;

export type ColorToken =
  | `brand.${keyof typeof colors.brand}`
  | `ink.${keyof typeof colors.ink}`
  | `semantic.${keyof typeof colors.semantic}`;
