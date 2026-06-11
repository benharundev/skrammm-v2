import { z } from "zod";

export const FitnessStatusSchema = z.enum(["fit", "doubtful", "out"]);
export const InjurySeveritySchema = z.enum(["minor", "moderate", "serious"]);

export const UpsertMedicalProfileSchema = z.object({
  playerId: z.string().uuid(),
  fitnessStatus: FitnessStatusSchema.optional(),
  injuryType: z.string().optional(),
  bodyPart: z.string().optional(),
  expectedReturnAt: z.coerce.date().optional(),
  allergies: z.string().optional(),
  bloodType: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  note: z.string().optional(),
});

export type UpsertMedicalProfileInput = z.infer<typeof UpsertMedicalProfileSchema>;

export const CreateInjuryReportSchema = z.object({
  matchId: z.string().uuid(),
  playerId: z.string().uuid(),
  injuryType: z.string().min(1),
  bodyPart: z.string().optional(),
  severity: InjurySeveritySchema.default("minor"),
  actionTaken: z.string().optional(),
  note: z.string().optional(),
});

export type CreateInjuryReportInput = z.infer<typeof CreateInjuryReportSchema>;
