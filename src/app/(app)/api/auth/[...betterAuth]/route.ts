import { auth } from "@lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

// Better Auth catch-all route — handles all /api/auth/* requests
// (OTP send, verify, sign-out, session, etc.)
export const { GET, POST } = toNextJsHandler(auth);
