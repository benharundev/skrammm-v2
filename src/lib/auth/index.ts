import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { emailOTP } from "better-auth/plugins";
import { db } from "@lib/db";
import { sendOTP } from "@lib/email";
import { v7 as uuidv7 } from "uuid";

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL!,
  database: prismaAdapter(db, {
    provider: "postgresql",
  }),

  // Email OTP is the sole auth mechanism — no password, no OAuth
  emailAndPassword: {
    enabled: false,
  },

  plugins: [
    emailOTP({
      async sendVerificationOTP({ email, otp }) {
        if (process.env.NODE_ENV === "development") {
          type GlobalWithOtps = typeof globalThis & { __MOCK_OTPS__?: Map<string, string> };
          const g = globalThis as GlobalWithOtps;
          if (!g.__MOCK_OTPS__) g.__MOCK_OTPS__ = new Map();
          g.__MOCK_OTPS__.set(email, otp);
        }

        if (process.env.OTP_DEBUG === "true") {
          console.log(`[OTP_DEBUG] ${email} → ${otp}`);
        }

        await sendOTP(email, otp);
      },
      otpLength: 6,
      expiresIn: 600, // 10 minutes in seconds
    }),
  ],

  session: {
    // cookieCache disabled: Better Auth's implementation accesses localStorage
    // in Next.js Edge Runtime (where it exists but lacks standard methods).
    // Re-enable once upstream fixes Edge Runtime compatibility.
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24, // Refresh rolling session daily
  },

  advanced: {
    generateId: () => uuidv7(),
    cookiePrefix: "skrammm",
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

export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;
