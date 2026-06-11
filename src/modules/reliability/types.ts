import { z } from "zod";

export const ReliabilityComponentsSchema = z.object({
  attendance: z.number().min(0).max(100),
  punctuality: z.number().min(0).max(100),
  discipline: z.number().min(0).max(100),
});

export type ReliabilityComponents = z.infer<typeof ReliabilityComponentsSchema>;

// Scoring weights (TECH_PRD §10A)
export const WEIGHTS = { attendance: 0.5, punctuality: 0.25, discipline: 0.25 } as const;

// Warning thresholds
export const THRESHOLDS = { yellow: 60, red: 40 } as const;

// RRS v2 warning thresholds
export const RRS_V2_THRESHOLDS = {
  green: 50,
  yellow: 30,
} as const;

// ─── RRS v2 constants ────────────────────────────────────────────────────────

export const TOURNAMENT_WEIGHTS = {
  elimination: 1.5,
  tiered:      1.0,
  festival:    0.7,
} as const;

export const MATCH_WEIGHTS = {
  P:     50.0,  // base playing score
  w_try:  10.0,
  w_conv:  3.0,
  w_dg:    4.0,
  O_win:  10.0,
  O_tie:   5.0,
  O_loss:  0.0,
  v_yc:   15.0, // yellow card penalty
  v_rc:   40.0, // red card penalty
  gamma:   0.5, // risk-aversion coefficient
} as const;

// ─── RRS v2 engine types ─────────────────────────────────────────────────────

export interface MatchRawData {
  matchId: string;
  matchDate: Date;
  tournamentId: string;
  tournamentFormat: "festival" | "tiered" | "elimination";
  isPlaying: boolean;
  tries: number;
  conversions: number;
  dropGoals: number;
  yellowCards: number;
  redCards: number;
  outcome: "Win" | "Tie" | "Loss";
}

export interface RrsCareerLevel {
  rrsCareer: number;
  metricsMean: number;
  varianceSigma: number;
  totalCareerMatches: number;
}

export interface RrsLast30DaysLevel {
  rrs30Days: number;
  trendDelta: number;
  status: "Ascending Form" | "Stable Form" | "Slumping Form";
  lowRecentSample: boolean;
  matchesPlayedWindow: number;
}

export interface RrsTournamentLevel {
  tournamentId: string;
  tournamentRating: number;
  totalTeamMatches: number;
  playerAppearances: number;
}

export interface RrsV2Payload {
  playerId: string;
  executionDate: string;
  careerLevel: RrsCareerLevel;
  last30DaysLevel: RrsLast30DaysLevel;
  tournamentLevel: RrsTournamentLevel[];
}

export interface TeamRrsPayload {
  teamId: string;
  executionDate: string;
  teamRrs: number;
  squadSize: number;
  playerBreakdown: Array<{ playerId: string; rrsCareer: number }>;
}
