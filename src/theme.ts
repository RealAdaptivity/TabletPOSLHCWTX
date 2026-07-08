/** Shared design tokens. Dark, tablet-friendly car-wash palette. */
export const colors = {
  bg: "#0B1220",
  surface: "#151E30",
  surfaceAlt: "#1E2A42",
  border: "#2A3852",
  primary: "#2EC4F1", // wash-water cyan
  primaryDark: "#1899C4",
  accent: "#38E08A", // rewards green
  danger: "#F1594A",
  text: "#F5F8FF",
  textMuted: "#93A3BE",
  textFaint: "#5C6B85",
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const radius = {
  sm: 8,
  md: 14,
  lg: 22,
  pill: 999,
};

/** cents -> "$19.99" */
export function formatCents(cents: number | null | undefined): string {
  const v = (cents ?? 0) / 100;
  return v.toLocaleString(undefined, { style: "currency", currency: "USD" });
}
