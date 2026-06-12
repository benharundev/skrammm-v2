import { type NextRequest, NextResponse } from "next/server";
import { getRealOtpForMock } from "@lib/auth/dev";

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const { email } = (await req.json()) as { email: string };
  const otp = await getRealOtpForMock(email);
  if (!otp) {
    return NextResponse.json({ error: "No OTP found" }, { status: 404 });
  }
  return NextResponse.json({ otp });
}
