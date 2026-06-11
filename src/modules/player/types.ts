import { z } from "zod";

export const CreatePlayerSchema = z.object({
  teamId: z.string().uuid(),
  fullName: z.string().min(2).max(100),
  dob: z.coerce.date().optional(),
  jerseyNumber: z.number().int().min(1).max(99).optional(),
  position: z.string().optional(),
  claimContact: z.string().email("Claim contact must be a valid email").optional(),
  isMinor: z.boolean().default(false),
  guardianName: z.string().optional(),
  guardianContact: z.string().optional(),
});

export type CreatePlayerInput = z.infer<typeof CreatePlayerSchema>;

export const ClaimPlayerSchema = z.object({
  playerIdCode: z.string().min(1),
  otp: z.string().length(6),
});

export type ClaimPlayerInput = z.infer<typeof ClaimPlayerSchema>;

export interface PlayerStats {
  tries: number;
  conversions: number;
  penalties: number;
  dropGoals: number;
  yellowCards: number;
  redCards: number;
  matchesPlayed: number;
  startersCount: number;
}

export interface TournamentHistoryItem {
  tournament: {
    id: string;
    name: string;
    code: string;
    startsAt: Date;
    endsAt: Date;
    status: string;
  };
  matchCount: number;
  teamName: string | null;
}

export interface ReliabilityDataPoint {
  score: number;
  computedAt: Date;
}

export const UpdateProfileSchema = z.object({
  fullName: z.string().min(2).max(100),
  jerseyNumber: z.number().int().min(1).max(99).optional(),
  position: z.string().optional(),
});

export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;

export const UpdateMedicalProfileSchema = z.object({
  fitnessStatus: z.enum(["fit", "doubtful", "out"]).optional(),
  bloodType: z.string().max(10).optional(),
  allergies: z.string().max(500).optional(),
  emergencyContactName: z.string().max(100).optional(),
  emergencyContactPhone: z.string().max(30).optional(),
  note: z.string().max(1000).optional(),
});
export type UpdateMedicalProfileInput = z.infer<typeof UpdateMedicalProfileSchema>;
