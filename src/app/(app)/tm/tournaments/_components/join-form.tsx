"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { joinTournamentAction } from "../actions";

export function JoinTournamentForm() {
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    const code = formData.get("code") as string;
    if (!code) return;

    setLoading(true);
    try {
      const result = await joinTournamentAction(formData);
      if (result.ok) {
        toast.success("Joined tournament successfully! Waiting for approval.");
        // Form will be reset on success if needed, but the page will revalidate
        const form = document.getElementById("join-form") as HTMLFormElement;
        form?.reset();
      } else {
        toast.error(result.reason || "Failed to join tournament");
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="overflow-hidden rounded-sm border-2 border-fair-play-gold bg-card shadow-brutalist">
      <div className="flex items-center gap-3 border-b-2 border-fair-play-gold p-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm bg-pitch-green text-fair-play-gold border-2 border-pitch-green">
          <Link2 className="h-4 w-4" />
        </div>
        <div>
          <h2 className="font-[family-name:var(--font-lexend)] font-bold text-foreground">Join Tournament</h2>
          <p className="text-[11px] text-muted-foreground uppercase font-bold tracking-tight">Enter code from organizer</p>
        </div>
      </div>
      <form id="join-form" action={handleSubmit} className="flex flex-col sm:flex-row gap-3 p-4">
        <div className="flex-1 space-y-1.5">
          <Label htmlFor="code" className="sr-only">Tournament Code</Label>
          <Input 
            id="code" 
            name="code" 
            placeholder="KLTOUR2026" 
            required
            className="h-11 font-mono uppercase border-2 border-border focus:border-fair-play-gold focus:ring-0 shadow-brutalist-sm" 
          />
        </div>
        <Button 
          type="submit" 
          disabled={loading}
          className="h-11 px-6 bg-pitch-green text-white font-bold border-2 border-pitch-green shadow-brutalist-navy-sm hover:shadow-none transition-all disabled:opacity-50"
        >
          {loading ? "Joining..." : "Join"}
        </Button>
      </form>
    </section>
  );
}
