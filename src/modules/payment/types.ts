import { z } from "zod";

// Billplz — dormant for UAT + Alpha. All tournaments are free.
// Wired but gated behind PAYMENTS_ENABLED env var.
export const PAYMENTS_ENABLED = process.env.PAYMENTS_ENABLED === "true";

export const CreatePaymentSchema = z.object({
  tournamentId: z.string().uuid(),
  organizerUserId: z.string().uuid(),
  amountCents: z.number().int().positive(),
  currency: z.string().default("MYR"),
});

export type CreatePaymentInput = z.infer<typeof CreatePaymentSchema>;

export const BillplzWebhookSchema = z.object({
  id: z.string(),
  collection_id: z.string(),
  paid: z.boolean(),
  state: z.string(),
  amount: z.number(),
  paid_amount: z.number(),
  due_at: z.string(),
  email: z.string().email(),
  mobile: z.string().optional(),
  name: z.string(),
  url: z.string().url(),
  paid_at: z.string().optional(),
  transaction_id: z.string().optional(),
  transaction_status: z.string().optional(),
});

export type BillplzWebhook = z.infer<typeof BillplzWebhookSchema>;
