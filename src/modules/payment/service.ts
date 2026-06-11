import { db } from "@lib/db";
import { v4 as uuidv4 } from "uuid";
import crypto from "crypto";
import { PAYMENTS_ENABLED } from "./types";
import type { CreatePaymentInput, BillplzWebhook } from "./types";

// Verify Billplz webhook HMAC-SHA256 signature
export function verifyBillplzSignature(
  rawBody: string,
  xSignatureHeader: string
): boolean {
  const secret = process.env.BILLPLZ_SIGNATURE_KEY ?? "";
  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");
  return crypto.timingSafeEqual(
    Buffer.from(expected),
    Buffer.from(xSignatureHeader)
  );
}

export async function createPayment(input: CreatePaymentInput) {
  if (!PAYMENTS_ENABLED) {
    throw new Error("Payments are disabled for UAT/Alpha");
  }

  return db.payment.create({
    data: {
      id: uuidv4(),
      ...input,
      processor: "billplz",
      processorRef: `pending-${uuidv4()}`,
      status: "pending",
    },
    select: { id: true },
  });
}

export async function handleBillplzWebhook(webhook: BillplzWebhook): Promise<void> {
  if (!PAYMENTS_ENABLED) return;

  // Idempotent — unique on (processor, processorRef)
  const payment = await db.payment.findFirst({
    where: { processor: "billplz", processorRef: webhook.id },
  });

  if (!payment) return;

  if (webhook.paid) {
    await db.payment.update({
      where: { id: payment.id },
      data: {
        status: "paid",
        paidAt: webhook.paid_at ? new Date(webhook.paid_at) : new Date(),
        raw: webhook as object,
      },
    });
  }
}
