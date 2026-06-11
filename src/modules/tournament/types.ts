import { z } from "zod";

export const TournamentFormatSchema = z.enum(["festival", "tiered", "elimination"]);
export const TournamentStatusSchema = z.enum(["draft", "paid", "live", "completed", "cancelled"]);

// Format gate: ≤8 = festival | 9–16 = tiered | 17–32 = elimination (non-overlapping)
export function inferFormat(teamCount: number): z.infer<typeof TournamentFormatSchema> {
  if (teamCount <= 8) return "festival";
  if (teamCount <= 16) return "tiered";
  return "elimination";
}

export const CreateTournamentSchema = z.object({
  name: z.string().min(3).max(100),
  code: z
    .string()
    .min(3)
    .max(20)
    .regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/, "Code must be lowercase alphanumeric with hyphens")
    .refine((c) => !c.includes("--"), "No consecutive hyphens"),
  format: TournamentFormatSchema,
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
  dailyStartTime: z.string().optional(),
  dailyEndTime: z.string().optional(),
  branding: z.record(z.unknown()).optional(),
});

export type CreateTournamentInput = z.infer<typeof CreateTournamentSchema>;

export const ApproveTournamentTeamSchema = z.object({
  tournamentId: z.string().uuid(),
  teamId: z.string().uuid(),
  approved: z.boolean(),
});

export type ApproveTournamentTeamInput = z.infer<typeof ApproveTournamentTeamSchema>;

export interface UpdateTournamentSettingsInput {
  name: string;
  startsAt: Date;
  endsAt: Date;
  dailyStartTime: string | null;
  dailyEndTime: string | null;
}

// Reserved tournament codes (TECH_PRD §4.2)
export const RESERVED_CODES = new Set([
  "api", "_next", "_marketing", "_app", "login", "logout", "signup",
  "oauth", "about", "legal", "terms", "privacy", "pricing", "app",
  "admin", "dashboard", "robots.txt", "sitemap.xml", "favicon.ico",
  "health", "status", ".well-known",
]);
