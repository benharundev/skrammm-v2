"use server";

import { getRealOtpForMock as _getRealOtpForMock } from "@lib/auth/dev";

export async function getRealOtpForMock(email: string) {
  return _getRealOtpForMock(email);
}
