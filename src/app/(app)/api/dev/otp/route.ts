import { type NextRequest, NextResponse } from "next/server";
import { db } from "@lib/db";

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const { email } = (await req.json()) as { email: string };
  const record = await db.verification.findFirst({
    where: { identifier: email, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!record) {
    return NextResponse.json({ error: "No OTP found" }, { status: 404 });
  }
  return NextResponse.json({ otp: record.value });
}
