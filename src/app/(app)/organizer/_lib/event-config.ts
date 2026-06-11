import type { $Enums } from "@prisma/client";

type EventType = Extract<
  $Enums.MatchEventType,
  "try" | "conversion" | "penalty" | "drop_goal" | "yellow_card" | "red_card"
>;

type StatType =
  | "tackles_dom" | "tackles_passive" | "tackles_miss"
  | "line_breaks" | "ball_carries" | "offloads"
  | "handling_errors" | "rucks_secured" | "turnovers_won"
  | "scrums_won" | "scrums_lost"
  | "lineouts_won" | "lineouts_lost"
  | "penalties_conceded";

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

interface StatConfig { label: string; full: string }

export const STAT_CONFIG: Record<StatType, StatConfig> = {
  tackles_dom:        { label: "DOM",    full: "Tackles – Dominant" },
  tackles_passive:    { label: "PAS",    full: "Tackles – Passive" },
  tackles_miss:       { label: "MISS",   full: "Missed Tackles" },
  line_breaks:        { label: "LB",     full: "Line Breaks" },
  ball_carries:       { label: "CARRY",  full: "Ball Carries" },
  offloads:           { label: "OFFLD",  full: "Offloads" },
  handling_errors:    { label: "KNOCK",  full: "Handling Errors" },
  rucks_secured:      { label: "RUCK",   full: "Rucks Secured" },
  turnovers_won:      { label: "TOVER",  full: "Turnovers Won" },
  scrums_won:         { label: "SCR W",  full: "Scrums Won" },
  scrums_lost:        { label: "SCR L",  full: "Scrums Lost/Pen" },
  lineouts_won:       { label: "LO W",   full: "Lineouts Won" },
  lineouts_lost:      { label: "LO L",   full: "Lineouts Lost" },
  penalties_conceded: { label: "PEN",    full: "Penalties Conceded" },
};

export const STAT_GROUPS: { label: string; stats: StatType[] }[] = [
  {
    label: "Defence",
    stats: ["tackles_dom", "tackles_passive", "tackles_miss", "turnovers_won"],
  },
  {
    label: "Attack",
    stats: ["line_breaks", "ball_carries", "offloads", "handling_errors", "rucks_secured"],
  },
  {
    label: "Set Pieces",
    stats: ["scrums_won", "scrums_lost", "lineouts_won", "lineouts_lost", "penalties_conceded"],
  },
];
