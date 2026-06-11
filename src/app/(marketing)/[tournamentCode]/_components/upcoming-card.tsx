"use client";

import { Share2 } from "lucide-react";
import type { PublicMatch } from "@modules/match";

interface UpcomingCardProps {
  match: PublicMatch;
  onTap: () => void;
}

export function UpcomingCard({ match, onTap }: UpcomingCardProps) {
  const isSuspended = match.status === "suspended";
  const kickoff = new Date(match.scheduledAt).toLocaleTimeString("en-MY", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  function handleShare(e: React.MouseEvent) {
    e.stopPropagation();
    const shareUrl = `${window.location.origin}${window.location.pathname}/share/${match.id}`;
    const title = `${match.homeTeam.name} vs ${match.awayTeam.name}`;
    if (typeof navigator.share === "function") {
      void navigator.share({ url: shareUrl, title });
    } else {
      const a = document.createElement("a");
      a.href = shareUrl;
      a.download = `match-${match.id}.png`;
      a.click();
    }
  }

  return (
    <button
      onClick={onTap}
      className="w-full text-left border-2 rounded-sm overflow-hidden hover:shadow-brutalist-navy transition-shadow"
      style={{ borderColor: isSuspended ? "#d97706" : "var(--border)" }}
    >
      <div
        className="flex items-center justify-between px-3 py-1.5"
        style={{ background: isSuspended ? "#d97706" : "var(--muted)" }}
      >
        <span
          style={{
            fontFamily: "var(--font-inter)",
            fontSize: "10px",
            fontWeight: 700,
            color: isSuspended ? "#fff" : "var(--muted-foreground)",
            textTransform: "uppercase" as const,
            letterSpacing: "0.05em",
          }}
        >
          {isSuspended ? "⚠ Suspended" : `KO ${kickoff}`}
        </span>
        <span
          style={{
            fontFamily: "var(--font-inter)",
            fontSize: "10px",
            color: isSuspended ? "rgba(255,255,255,0.7)" : "var(--muted-foreground)",
          }}
        >
          {[match.pitch, match.groupLabel].filter(Boolean).join(" · ")}
        </span>
        <button
          onClick={handleShare}
          className="text-muted-foreground hover:text-foreground transition-colors p-1"
          aria-label="Share match card"
        >
          <Share2 size={13} />
        </button>
      </div>

      <div className="bg-card px-4 py-3 flex items-center gap-3">
        <div className="flex-1 text-right">
          <p
            className="text-foreground"
            style={{ fontFamily: "var(--font-inter)", fontSize: "13px", fontWeight: 700 }}
          >
            {match.homeTeam.name}
          </p>
        </div>
        <span
          className="text-muted-foreground flex-shrink-0"
          style={{ fontFamily: "var(--font-inter)", fontSize: "13px" }}
        >
          vs
        </span>
        <div className="flex-1 text-left">
          <p
            className="text-foreground"
            style={{ fontFamily: "var(--font-inter)", fontSize: "13px", fontWeight: 700 }}
          >
            {match.awayTeam.name}
          </p>
        </div>
      </div>
    </button>
  );
}
