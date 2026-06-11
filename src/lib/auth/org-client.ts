import { createAuthClient } from "better-auth/react";
import { emailOTPClient } from "better-auth/client/plugins";

export const orgAuthClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  basePath: "/api/org-auth",
  plugins: [emailOTPClient()],
});

export const { signOut: orgSignOut } = orgAuthClient;
