import { z } from "zod";

export const CreateSponsorSchema = z.object({
  tournamentId: z.string().uuid(),
  name: z.string().min(1).max(100),
  logoUrl: z.string().url().optional(),
  clickUrl: z.string().url().optional(),
  tier: z.enum(["title", "gold", "silver", "bronze"]).optional(),
  startsAt: z.coerce.date().optional(),
  endsAt: z.coerce.date().optional(),
});

export type CreateSponsorInput = z.infer<typeof CreateSponsorSchema>;
