// In production: https://skrammm.com (set via NEXT_PUBLIC_SPECTATOR_ORIGIN)
// In local dev: http://localhost:3000 (both hosts share the same port)
export const SPECTATOR_ORIGIN =
  process.env.NEXT_PUBLIC_SPECTATOR_ORIGIN ?? "https://skrammm.com";

// TODO: replace with a CSS variable when the sidebar layout is revisited
export const SIDEBAR_WIDTH_CLASS = "left-64";
