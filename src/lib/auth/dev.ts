import { db } from "@lib/db";

type GlobalWithOtps = typeof globalThis & { __MOCK_OTPS__?: Map<string, string> };

export async function getRealOtpForMock(email: string): Promise<string | null> {
  if (process.env.NODE_ENV !== "development") return null;

  const g = globalThis as GlobalWithOtps;
  if (g.__MOCK_OTPS__?.has(email)) {
    return g.__MOCK_OTPS__.get(email) ?? null;
  }

  const v = await db.verification.findFirst({
    where: { identifier: { contains: email } },
    orderBy: { createdAt: "desc" },
  });
  return v?.value ?? null;
}
