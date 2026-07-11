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

export const TrainingSlotSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  venue: z.string().max(200).optional(),
});
export type TrainingSlotInput = z.infer<typeof TrainingSlotSchema>;

export const CreatePublicTeamSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
  origin: z.string().max(200).optional(),
  trainingGround: z.string().max(200).optional(),
  contactEmail: z.string().email().optional().or(z.literal("")),
  contactPhone: z.string().max(30).optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  address: z.string().optional(),
  trainingSlots: z.array(TrainingSlotSchema),
});
export type CreatePublicTeamInput = z.infer<typeof CreatePublicTeamSchema>;

export const UpdatePublicListingSchema = z.object({
  isPublic: z.boolean().optional(),
  description: z.string().max(500).optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  address: z.string().optional(),
  trainingGround: z.string().max(200).optional(),
});
export type UpdatePublicListingInput = z.infer<typeof UpdatePublicListingSchema>;
