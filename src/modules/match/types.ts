import { z } from "zod";

export const MatchEventTypeSchema = z.enum([
  "try", "conversion", "penalty", "drop_goal",
  "yellow_card", "red_card", "sub_in", "sub_out",
  // Performance stats — persisted as zero-point events
  "tackles_dom", "tackles_passive", "tackles_miss",
  "line_breaks", "ball_carries", "offloads",
  "handling_errors", "rucks_secured", "turnovers_won",
  "scrums_won", "scrums_lost", "lineouts_won",
  "lineouts_lost", "penalties_conceded",
]);

export const AddMatchEventSchema = z.object({
  matchId: z.string().uuid(),
  teamId: z.string().uuid(),
  playerId: z.string().uuid().optional(),
  eventType: MatchEventTypeSchema,
  minute: z.number().int().min(0).max(120).optional(),
  payload: z.record(z.unknown()).optional(),
});

export type AddMatchEventInput = z.infer<typeof AddMatchEventSchema>;

export const CreateMatchSchema = z.object({
  tournamentId: z.string().uuid(),
  homeTeamId: z.string().uuid(),
  awayTeamId: z.string().uuid(),
  scheduledAt: z.coerce.date(),
  round: z.string().optional(),
  groupLabel: z.string().optional(),
  pitch: z.string().optional(),
  refereeName: z.string().optional(),
});

export type CreateMatchInput = z.infer<typeof CreateMatchSchema>;

// Points per event type (rugby union)
export const POINTS: Partial<Record<z.infer<typeof MatchEventTypeSchema>, number>> = {
  try: 5,
  conversion: 2,
  penalty: 3,
  drop_goal: 3,
};

// ---------------------------------------------------------------------------
// Public / spectator types — safe to expose without auth
// ---------------------------------------------------------------------------

export type PublicMatchEvent = {
  id: string;
  eventType: string;
  teamId: string;
  minute: number;
  player: { fullName: string } | null;
};

export type PublicMatch = {
  id: string;
  status: "scheduled" | "live" | "suspended" | "locked" | "completed";
  homeScore: number;
  awayScore: number;
  scheduledAt: Date;
  pitch: string | null;
  groupLabel: string | null;
  round: string | null;
  homeTeam: { id: string; name: string; logoUrl: string | null };
  awayTeam: { id: string; name: string; logoUrl: string | null };
  events: PublicMatchEvent[];
};

export type StandingRow = {
  pos: number;
  teamId: string;
  teamName: string;
  p: number;
  w: number;
  d: number;
  l: number;
  pf: number;
  pa: number;
  pts: number;
};

export interface UpdateMatchMetadataInput {
  refereeName?: string | null;
  pitch?: string | null;
  scheduledAt?: Date;
}

// Valid Prisma MatchStatus values (must match the DB enum exactly)
export type MatchPhaseStatus = "scheduled" | "live" | "suspended" | "locked" | "completed";
