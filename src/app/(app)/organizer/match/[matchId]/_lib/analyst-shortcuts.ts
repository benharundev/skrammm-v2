export const ANALYST_SHORTCUTS: Record<string, string> = {
  // Scoring / Discipline
  t: "try",
  c: "conversion",
  p: "penalty",
  d: "drop_goal",
  y: "yellow_card",
  r: "red_card",
  // Kick / Pass / Run
  k: "kicks_from_hand",
  a: "passes",
  n: "runs",
  m: "metres_run",
  // Attacking
  q: "possession_phase",
  g: "territory_phase",
  b: "clean_breaks",
  v: "defenders_beaten",
  o: "offloads",
  w: "rucks_won",
  l: "rucks_lost",
  j: "mauls_won",
  h: "mauls_lost",
  u: "turnovers_conceded",
  // Defensive
  e: "tackles_made",
  x: "tackles_missed",
  // Set Pieces (number row)
  "1": "scrums_own_feed_won",
  "2": "scrums_own_feed_lost",
  "3": "lineouts_own_throw_won",
  "4": "lineouts_own_throw_lost",
  // Discipline stats
  s: "penalties_conceded",
  f: "forward_pass",
  z: "knock_on",
};

export const ANALYST_SHORTCUT_LABELS: Record<string, string> = Object.fromEntries(
  Object.entries(ANALYST_SHORTCUTS).map(([key, val]) => [val, key.toUpperCase()])
);
