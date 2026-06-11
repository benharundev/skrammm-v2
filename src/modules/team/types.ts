import { z } from "zod";

export const CreateTeamSchema = z.object({
  name: z.string().min(2).max(100),
  origin: z.string().optional(),
  trainingGround: z.string().optional(),
});

export type CreateTeamInput = z.infer<typeof CreateTeamSchema>;

export const UpdateTeamSettingsSchema = z.object({
  name:           z.string().min(2).max(100),
  origin:         z.string().max(200).optional(),
  trainingGround: z.string().max(200).optional(),
  contactEmail:   z.string().email().optional().or(z.literal("")),
  contactPhone:   z.string().max(30).optional(),
});

export type UpdateTeamSettingsInput = z.infer<typeof UpdateTeamSettingsSchema>;

export const JoinTournamentSchema = z.object({
  tournamentId: z.string().uuid(),
  teamId: z.string().uuid(),
});

export type JoinTournamentInput = z.infer<typeof JoinTournamentSchema>;

export const JoinByCodeSchema = z.object({ code: z.string().min(4).max(20) });
export type JoinByCodeInput = z.infer<typeof JoinByCodeSchema>;
