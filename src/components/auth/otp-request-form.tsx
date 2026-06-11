"use client";

import { useState } from "react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth/client";
import { orgAuthClient } from "@/lib/auth/org-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AuthContext } from "@/components/auth/login-flow";

interface OtpRequestFormProps {
  /** Called with the email once a verification code has been sent. */
  onSuccess: (email: string) => void;
  authContext?: AuthContext;
}

export function OtpRequestForm({
  onSuccess,
  authContext = "app",
}: OtpRequestFormProps) {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;

    setIsLoading(true);

    const identifier = trimmed;
    const client = authContext === "org" ? orgAuthClient : authClient;

    const { error } = await client.emailOtp.sendVerificationOtp({
      email: identifier,
      type: "sign-in",
    });
    setIsLoading(false);

    if (error) {
      toast.error(error.message ?? "Could not send the code. Try again.");
      return;
    }

    toast.success("Code sent. Check your inbox.");
    onSuccess(trimmed);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email" className="text-foreground">
          Email address
        </Label>
        <Input
          id="email"
          type="email"
          name="email"
          autoComplete="email"
          required
          placeholder="you@club.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          disabled={isLoading}
        />
      </div>

      <Button
        type="submit"
        disabled={isLoading || !email.trim()}
        className="w-full bg-primary text-primary-foreground shadow-brutalist transition-transform hover:translate-x-[1px] hover:translate-y-[1px] hover:bg-primary"
      >
        {isLoading ? "Sending code…" : "Send sign-in code"}
      </Button>
    </form>
  );
}
