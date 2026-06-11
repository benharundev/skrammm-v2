"use client";

import { useState } from "react";
import { Share2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function ShareButton({
  playerId: _playerId,
  type = "career",
  compact = false,
  className,
}: {
  playerId: string;
  type?: "career" | "last30" | "matches";
  compact?: boolean;
  className?: string;
}) {
  const [loading, setLoading] = useState(false);

  const CARD_META = {
    career:  { label: "Share My Card",      file: "my-player-card.png",  title: "My Skrammm Player Card",     text: "Check out my rugby stats on Skrammm!" },
    last30:  { label: "Share Last 30 Days", file: "my-last-30-days.png", title: "My Last 30 Days on Skrammm", text: "Check out my recent rugby performance!" },
    matches: { label: "Share Match Stats",  file: "my-match-stats.png",  title: "My Match Stats on Skrammm",  text: "Check out my rugby match statistics!" },
  } as const;

  const meta = CARD_META[type];

  async function handleShare() {
    setLoading(true);
    try {
      const res = await fetch(`/player/share/card?type=${type}`);
      if (res.status === 404) {
        toast.error("Claim your player profile first — go to Teams to get started.");
        return;
      }
      if (!res.ok) throw new Error("Card generation failed");

      const blob = await res.blob();
      const file = new File([blob], meta.file, { type: "image/png" });

      if (
        typeof navigator !== "undefined" &&
        "share" in navigator &&
        navigator.canShare?.({ files: [file] })
      ) {
        await navigator.share({ title: meta.title, text: meta.text, files: [file] });
      } else {
        // Fallback: trigger download for desktop
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = meta.file;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Card downloaded!");
      }
    } catch (err) {
      if (err instanceof Error && err.name !== "AbortError") {
        toast.error("Could not share card. Try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  if (compact) {
    return (
      <button
        type="button"
        onClick={handleShare}
        disabled={loading}
        className={
          className ??
          "flex h-7 w-7 items-center justify-center rounded-sm border-2 border-border bg-card text-muted-foreground shadow-brutalist-sm transition-shadow hover:shadow-brutalist hover:text-foreground disabled:opacity-50"
        }
        aria-label={meta.label}
        title={meta.label}
      >
        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Share2 className="h-3.5 w-3.5" />}
      </button>
    );
  }

  return (
    <Button
      type="button"
      onClick={handleShare}
      disabled={loading}
      className="w-full gap-2 bg-accent text-accent-foreground font-semibold shadow-brutalist-sm hover:shadow-brutalist"
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
      {loading ? "Generating card…" : meta.label}
    </Button>
  );
}
