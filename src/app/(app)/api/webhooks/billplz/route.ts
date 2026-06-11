import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";
import { verifyBillplzSignature, handleBillplzWebhook, PAYMENTS_ENABLED, BillplzWebhookSchema } from "@modules/payment";

export async function POST(request: NextRequest) {
  if (!PAYMENTS_ENABLED) {
    return NextResponse.json({ ok: true }); // Silently accept while dormant
  }

  const rawBody = await request.text();
  const xSignature = request.headers.get("x-signature") ?? "";

  if (!verifyBillplzSignature(rawBody, xSignature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const parsed = BillplzWebhookSchema.safeParse(JSON.parse(rawBody));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  await handleBillplzWebhook(parsed.data);
  return NextResponse.json({ ok: true });
}
