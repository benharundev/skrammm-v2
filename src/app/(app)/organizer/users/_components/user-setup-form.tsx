"use client";
import { useState, useTransition } from "react";
import { UserPlus, RefreshCw, Copy, CheckCheck, KeyRound } from "lucide-react";
import { setupUserAction, lookupOTPAction } from "../actions";

export function UserSetupForm() {
  const [email, setEmail] = useState("");
  const [tournamentCode, setTournamentCode] = useState("");
  const [otp, setOtp] = useState<string | null>(null);
  const [transferred, setTransferred] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleSetup = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setOtp(null);
    startTransition(async () => {
      const result = await setupUserAction(email, tournamentCode || undefined);
      if ("error" in result) {
        setError(result.error);
      } else {
        setOtp(result.otp);
        setTransferred(result.tournamentTransferred);
      }
    });
  };

  const handleLookup = () => {
    setError(null);
    startTransition(async () => {
      const result = await lookupOTPAction(email);
      if ("error" in result) {
        setError(result.error);
      } else {
        setOtp(result.otp);
      }
    });
  };

  const copy = async () => {
    if (!otp) return;
    await navigator.clipboard.writeText(otp);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-lg flex flex-col gap-6">
      <div className="bg-card border-2 border-border rounded-sm p-6 shadow-brutalist-navy">
        <div className="flex items-center gap-2 mb-4">
          <UserPlus size={18} className="text-pitch-green" />
          <h2 className="font-[family-name:var(--font-lexend)] font-bold text-base">
            Create account &amp; get OTP
          </h2>
        </div>
        <p className="text-muted-foreground text-sm mb-5">
          Creates the user account, generates a 6-digit OTP, and displays it
          here so you can relay it manually (WhatsApp, etc.).
        </p>
        <form onSubmit={handleSetup} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="victo.broadcasting@gmail.com"
              required
              disabled={isPending}
              className="h-10 px-3 border-2 border-border bg-background rounded-sm text-sm placeholder:text-muted-foreground outline-none focus:border-pitch-green disabled:opacity-50"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
              Tournament code{" "}
              <span className="font-normal normal-case">(optional — transfers ownership)</span>
            </label>
            <input
              type="text"
              value={tournamentCode}
              onChange={e => setTournamentCode(e.target.value)}
              placeholder="pialaagong26"
              disabled={isPending}
              className="h-10 px-3 border-2 border-border bg-background rounded-sm text-sm placeholder:text-muted-foreground outline-none focus:border-pitch-green disabled:opacity-50"
            />
          </div>
          <button
            type="submit"
            disabled={isPending || !email}
            className="h-10 px-4 bg-pitch-green text-white font-bold text-sm rounded-sm border-2 border-navy shadow-brutalist-navy hover:bg-pitch-green/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? "Creating…" : "Create account & get OTP"}
          </button>
        </form>
        {error && (
          <p className="mt-3 text-sm text-destructive font-medium">{error}</p>
        )}
      </div>

      {otp && (
        <div className="bg-card border-2 border-pitch-green rounded-sm p-5 shadow-brutalist-navy flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <KeyRound size={16} className="text-pitch-green" />
            <span className="font-bold text-sm">One-time passcode</span>
            <span className="ml-auto text-muted-foreground text-[11px]">Expires in 10 min</span>
          </div>

          <div className="flex items-center justify-between gap-4">
            <span className="font-[family-name:var(--font-lexend)] font-extrabold text-4xl tracking-[0.2em] text-foreground">
              {otp}
            </span>
            <button
              onClick={copy}
              className="h-9 px-3 border-2 border-border bg-card rounded-sm hover:bg-muted transition-colors flex items-center gap-1.5 text-sm font-bold flex-shrink-0"
            >
              {copied
                ? <CheckCheck size={14} className="text-pitch-green" />
                : <Copy size={14} />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>

          {transferred && (
            <p className="text-xs text-pitch-green font-bold">
              Tournament transferred to this account.
            </p>
          )}

          <p className="text-muted-foreground text-xs border-t border-border pt-3">
            Tell them: go to{" "}
            <span className="font-mono font-bold text-foreground">
              app.skrammm.com/login/organizer
            </span>
            , enter their email, then use this code.
          </p>

          <button
            type="button"
            onClick={handleLookup}
            disabled={isPending || !email}
            className="self-start flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          >
            <RefreshCw size={12} className={isPending ? "animate-spin" : ""} />
            Refresh (if they re-requested from login page)
          </button>
        </div>
      )}
    </div>
  );
}
