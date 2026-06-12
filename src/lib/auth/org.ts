import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { emailOTP } from "better-auth/plugins";
import { db } from "@lib/db";
import { sendOTP } from "@lib/email";
import { v7 as uuidv7 } from "uuid";

// Mirror of appAuth (src/lib/auth/index.ts) — keep session, generateId, crossSubDomain, and cookie config in sync
export const orgAuth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL!,
  database: prismaAdapter(db, {
    provider: "postgresql",
  }),

  emailAndPassword: {
    enabled: false,
  },

  plugins: [
    emailOTP({
      async sendVerificationOTP({ email, otp }) {
        if (process.env.NODE_ENV === "development") {
          type GlobalWithOtps = typeof globalThis & {
            __MOCK_OTPS__?: Map<string, string>;
          };
          const g = globalThis as GlobalWithOtps;
          if (!g.__MOCK_OTPS__) g.__MOCK_OTPS__ = new Map();
          g.__MOCK_OTPS__.set(email, otp);
        }

        await sendOTP(email, otp);
      },
      otpLength: 6,
      expiresIn: 600,
    }),
  ],

  basePath: "/api/org-auth",

  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
  },

  advanced: {
    generateId: () => uuidv7(),
    cookiePrefix:
      process.env.NODE_ENV === "production"
        ? "__Secure-skrammm-org"
        : "skrammm-org",
    crossSubDomainCookies: {
      enabled: process.env.NODE_ENV === "production",
      domain: ".skrammm.com",
    },
    defaultCookieAttributes: {
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
    },
  },
});
