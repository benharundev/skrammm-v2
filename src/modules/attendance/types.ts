import { z } from "zod";

export const ScanPlayerQrSchema = z.object({
  token: z.string().min(1),
  matchId: z.string().uuid(),
  teamId: z.string().uuid(),
  isManualOverride: z.boolean().default(false),
});

export type ScanPlayerQrInput = z.infer<typeof ScanPlayerQrSchema>;

export const TeamCheckInSchema = z.object({
  tournamentId: z.string().uuid(),
  matchId: z.string().uuid(),
  teamId: z.string().uuid(),
});

export type TeamCheckInInput = z.infer<typeof TeamCheckInSchema>;
