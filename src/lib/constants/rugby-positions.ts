export const RUGBY_POSITIONS = [
  "Prop",
  "Hooker",
  "Lock",
  "Flanker",
  "Number 8",
  "Scrum-half",
  "Fly-half",
  "Centre",
  "Wing",
  "Fullback",
] as const;

export type RugbyPosition = (typeof RUGBY_POSITIONS)[number];
