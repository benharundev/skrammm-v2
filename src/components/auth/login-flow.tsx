"use client";

import { useState } from "react";
import { OtpRequestForm } from "@/components/auth/otp-request-form";
import { OtpVerifyForm } from "@/components/auth/otp-verify-form";

export type AuthContext = "app" | "org";

interface LoginFlowProps {
  next?: string;
  destination?: string;
  authContext?: AuthContext;
}

export function LoginFlow({
  next,
  destination,
  authContext = "app",
}: LoginFlowProps) {
  const [email, setEmail] = useState<string | null>(null);

  if (email) {
    return (
      <OtpVerifyForm
        email={email}
        authContext={authContext}
        {...(destination ? { destination } : {})}
        {...(next ? { next } : {})}
        onBack={() => setEmail(null)}
      />
    );
  }

  return <OtpRequestForm onSuccess={setEmail} authContext={authContext} />;
}
