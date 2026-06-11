"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { toast } from "sonner";
import { authClient } from "@/lib/auth/client";
import { orgAuthClient } from "@/lib/auth/org-client";
import { getRealOtpForMock } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AuthContext } from "@/components/auth/login-flow";

const RESEND_COOLDOWN_SECONDS = 60;

interface OtpVerifyFormProps {
  /** Display email (no org:: prefix). */
  email: string;
  /** Optional post-login redirect target (overrides destination). */
  next?: string;
  /** Default portal to land on after login. */
  destination?: string;
  /** Return to the email entry step. */
  onBack: () => void;
  authContext?: AuthContext;
}

export function OtpVerifyForm({
  email,
  next,
  destination = "/player",
  onBack,
  authContext = "app",
}: OtpVerifyFormProps) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);

  const identifier = email;
  const client = authContext === "org" ? orgAuthClient : authClient;

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (code.length !== 6) return;

    setIsVerifying(true);

    let actualCode = code;
    // Intercept mock codes in development (TECH_PRD §6.1 / Manual Override)
    if (
      process.env.NODE_ENV === "development" &&
      (code === "111111" || code === "222222")
    ) {
      const dbCode = await getRealOtpForMock(identifier);
      if (dbCode) {
        actualCode = dbCode;
      } else {
        // If no code in DB, it will fail naturally, but we can try to warn
        console.warn(`[DEV] No real OTP found in DB for ${identifier}. Mock code ${code} will likely fail.`);
      }
    }

    const { error } = await client.signIn.emailOtp({ email: identifier, otp: actualCode });
    setIsVerifying(false);

    if (error) {
      toast.error(error.message ?? "Invalid or expired code.");
      return;
    }

    router.push((next ?? destination) as Route);
  }

  const handleResend = useCallback(async () => {
    setIsResending(true);
    const { error } = await client.emailOtp.sendVerificationOtp({
      email: identifier,
      type: "sign-in",
    });
    setIsResending(false);

    if (error) {
      toast.error(error.message ?? "Could not resend the code.");
      return;
    }

    toast.success("A new code is on its way.");
    setCooldown(RESEND_COOLDOWN_SECONDS);
  }, [client, identifier]);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="otp" className="text-foreground">
          Enter the 6-digit code
        </Label>
        <p className="text-sm text-muted-foreground">
          Sent to <span className="font-medium text-foreground">{email}</span>
        </p>
        <Input
          id="otp"
          name="otp"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          pattern="\d{6}"
          required
          placeholder="000000"
          value={code}
          onChange={(event) =>
            setCode(event.target.value.replace(/\D/g, "").slice(0, 6))
          }
          disabled={isVerifying}
          className="text-center text-lg tracking-[0.5em]"
        />
      </div>

      <Button
        type="submit"
        disabled={isVerifying || code.length !== 6}
        className="w-full bg-primary text-primary-foreground shadow-brutalist transition-transform hover:translate-x-[1px] hover:translate-y-[1px] hover:bg-primary"
      >
        {isVerifying ? "Verifying…" : "Verify code"}
      </Button>

      <div className="flex items-center justify-between text-sm">
        <button
          type="button"
          onClick={onBack}
          className="text-muted-foreground transition-colors hover:text-foreground"
        >
          ← Back
        </button>

        {cooldown > 0 ? (
          <span className="text-muted-foreground">
            Resend in {cooldown}s
          </span>
        ) : (
          <button
            type="button"
            onClick={handleResend}
            disabled={isResending}
            className="font-medium text-primary underline-offset-4 hover:underline disabled:opacity-50"
          >
            {isResending ? "Resending…" : "Resend code"}
          </button>
        )}
      </div>
    </form>
  );
}
