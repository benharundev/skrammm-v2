"use client";

import { useState } from "react";
import { Share2, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface TournamentShareButtonProps {
  tournamentId: string;
  tournamentName: string;
  playerName: string;
  className?: string;
}

export function TournamentShareButton({
  tournamentId,
  tournamentName,
  playerName,
  className,
}: TournamentShareButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleShare(e: React.MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`/player/share/tournament/${tournamentId}`);
      if (res.status === 404) {
        toast.error("Claim your player profile first — go to Teams to get started.");
        return;
      }
      if (!res.ok) throw new Error("Card generation failed");

      const blob = await res.blob();
      const filename = `skrammm-tournament-${tournamentId}.png`;
      const file = new File([blob], filename, { type: "image/png" });

      if (
        typeof navigator.share === "function" &&
        navigator.canShare?.({ files: [file] })
      ) {
        await navigator.share({
          files: [file],
          title: `${playerName} @ ${tournamentName} — Skrammm`,
        });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Card downloaded!");
      }
    } catch (err) {
      if (err instanceof Error && err.name !== "AbortError") {
        toast.error("Could not share.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      disabled={loading}
      className={
        "flex h-7 w-7 items-center justify-center rounded-sm border border-border bg-card text-muted-foreground shadow-brutalist-sm transition-shadow hover:text-foreground hover:shadow-brutalist disabled:opacity-50" +
        (className ? ` ${className}` : " absolute right-3 top-3")
      }
      aria-label="Share tournament performance"
    >
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Share2 className="h-3.5 w-3.5" />
      )}
    </button>
  );
}
