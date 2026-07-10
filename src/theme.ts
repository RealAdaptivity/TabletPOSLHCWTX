/** Shared design tokens — Long Horn Car Wash brand: red (#A93837) on white. */
export const colors = {
  // Grounds & neutrals (warm off-white biased toward the brand red)
  bg: "#F7F2F1",
  surface: "#FFFFFF",
  surfaceAlt: "#F2EAE9",
  border: "#E8DEDC",

  // Brand
  primary: "#A93837", // Long Horn red
  primaryDark: "#8C2C2B",
  onPrimary: "#FFFFFF", // text/icons on a red fill

  // Semantic (kept separate from the brand color)
  accent: "#1F7A4D", // success — used sparingly for positive rewards/points
  danger: "#C0392B", // destructive actions

  // Text
  text: "#22191A",
  textMuted: "#6F6463",
  textFaint: "#ABA0A0",
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

/** cents -> "$19.99" (guards against Hermes/Intl quirks in release builds) */
export function formatCents(cents: number | null | undefined): string {
  const v = (cents ?? 0) / 100;
  try {
    return v.toLocaleString(undefined, { style: "currency", currency: "USD" });
  } catch {
    return `$${v.toFixed(2)}`;
  }
}
