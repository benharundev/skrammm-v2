import type { $Enums } from "@prisma/client";

type EventType = Extract<
  $Enums.MatchEventType,
  "try" | "conversion" | "penalty" | "drop_goal" | "yellow_card" | "red_card"
>;

export type StatType =
  // Kick / Pass / Run
  | "kicks_from_hand" | "passes" | "runs" | "metres_run"
  // Attacking
  | "possession_phase" | "territory_phase"
  | "clean_breaks" | "defenders_beaten" | "offloads"
  | "rucks_won" | "rucks_lost" | "mauls_won" | "mauls_lost"
  | "turnovers_conceded"
  // Defensive
  | "tackles_made" | "tackles_missed"
  // Set Pieces
  | "scrums_own_feed_won" | "scrums_own_feed_lost"
  | "lineouts_own_throw_won" | "lineouts_own_throw_lost"
  // Discipline
  | "penalties_conceded"
  | "forward_pass"
  | "knock_on";

interface EventConfig {
  label: string;
  points: number;
  colorClass: string;
}

export const EVENT_CONFIG: Record<EventType, EventConfig> = {
  try:         { label: "TRY",  points: 5, colorClass: "bg-pitch-green text-white" },
  conversion:  { label: "CONV", points: 2, colorClass: "bg-pitch-green/70 text-white" },
  penalty:     { label: "PEN",  points: 3, colorClass: "bg-navy text-white" },
  drop_goal:   { label: "DROP", points: 3, colorClass: "bg-navy/70 text-white" },
  yellow_card: { label: "YC",   points: 0, colorClass: "bg-fair-play-gold text-pitch-green" },
  red_card:    { label: "RC",   points: 0, colorClass: "bg-red-card text-white" },
};

// "pair"        → "X from Y (Z%)"   e.g. rucks_won paired with rucks_lost
// "ratio"       → "X / Y" + derived success rate row  e.g. tackles_made / tackles_missed
// "possession"  → "X% (H1: X% / H2: X%)" derived from payload.half counts
// "metres"      → sum payload.value, display as "Xm"
// undefined     → simple count
export type DisplayMode = "pair" | "ratio" | "possession" | "metres";

export interface StatConfig {
  label: string;
  full: string;
  displayMode?: DisplayMode;
  pairWith?: StatType;
}

export const STAT_CONFIG: Record<StatType, StatConfig> = {
  // Kick / Pass / Run
  kicks_from_hand:          { label: "KICKS",  full: "Kicks from Hand" },
  passes:                   { label: "PASS",   full: "Passes" },
  runs:                     { label: "RUNS",   full: "Runs" },
  metres_run:               { label: "MTR",    full: "Metres Run with Ball", displayMode: "metres" },
  // Attacking
  possession_phase:         { label: "POSS",   full: "Possession", displayMode: "possession" },
  territory_phase:          { label: "TERR",   full: "Territory", displayMode: "possession" },
  clean_breaks:             { label: "CB",     full: "Clean Breaks" },
  defenders_beaten:         { label: "DEF B",  full: "Defenders Beaten" },
  offloads:                 { label: "OFFLD",  full: "Offloads" },
  rucks_won:                { label: "RK W",   full: "Rucks Won", displayMode: "pair", pairWith: "rucks_lost" },
  rucks_lost:               { label: "RK L",   full: "Rucks Lost" },
  mauls_won:                { label: "ML W",   full: "Mauls Won", displayMode: "pair", pairWith: "mauls_lost" },
  mauls_lost:               { label: "ML L",   full: "Mauls Lost" },
  turnovers_conceded:       { label: "TOVER",  full: "Turnovers Conceded" },
  // Defensive
  tackles_made:             { label: "TKL",    full: "Tackles Made", displayMode: "ratio", pairWith: "tackles_missed" },
  tackles_missed:           { label: "MISS",   full: "Tackles Missed" },
  // Set Pieces
  scrums_own_feed_won:      { label: "SC W",   full: "Scrums Won (Own Feed)", displayMode: "pair", pairWith: "scrums_own_feed_lost" },
  scrums_own_feed_lost:     { label: "SC L",   full: "Scrums Lost (Own Feed)" },
  lineouts_own_throw_won:   { label: "LO W",   full: "Lineouts Won (Own Throw)", displayMode: "pair", pairWith: "lineouts_own_throw_lost" },
  lineouts_own_throw_lost:  { label: "LO L",   full: "Lineouts Lost (Own Throw)" },
  // Discipline
  penalties_conceded:       { label: "PEN",    full: "Penalties Conceded" },
  forward_pass:             { label: "FWD",    full: "Forward Pass" },
  knock_on:                 { label: "K/O",    full: "Knock On" },
};

export const STAT_GROUPS: { label: string; stats: StatType[] }[] = [
  {
    label: "Kick / Pass / Run",
    stats: ["kicks_from_hand", "passes", "runs", "metres_run"],
  },
  {
    label: "Attacking",
    stats: [
      "possession_phase", "territory_phase",
      "clean_breaks", "defenders_beaten", "offloads",
      "rucks_won", "rucks_lost",
      "mauls_won", "mauls_lost",
      "turnovers_conceded",
    ],
  },
  {
    label: "Defensive",
    stats: ["tackles_made", "tackles_missed"],
  },
  {
    label: "Set Pieces",
    stats: [
      "scrums_own_feed_won", "scrums_own_feed_lost",
      "lineouts_own_throw_won", "lineouts_own_throw_lost",
    ],
  },
  {
    label: "Discipline",
    stats: ["penalties_conceded", "forward_pass", "knock_on"],
  },
];
