"use client";

import { Share2 } from "lucide-react";
import type { PublicMatch } from "@modules/match";

interface ResultCardProps {
  match: PublicMatch;
  onTap: () => void;
}

export function ResultCard({ match, onTap }: ResultCardProps) {
  function handleShare(e: React.MouseEvent) {
    e.stopPropagation();
    const shareUrl = `${window.location.origin}${window.location.pathname}/share/${match.id}`;
    const title = `FT: ${match.homeTeam.name} ${match.homeScore}–${match.awayScore} ${match.awayTeam.name}`;
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
      className="w-full text-left border-2 border-border rounded-sm overflow-hidden hover:shadow-brutalist-navy transition-shadow"
    >
      <div className="flex items-center justify-between px-3 py-1.5 bg-pitch-green">
        <span
          className="text-white uppercase tracking-wider"
          style={{ fontFamily: "var(--font-inter)", fontSize: "10px", fontWeight: 700 }}
        >
          Full Time
        </span>
        <span
          className="text-white/50"
          style={{ fontFamily: "var(--font-inter)", fontSize: "10px" }}
        >
          {[match.pitch, match.groupLabel].filter(Boolean).join(" · ")}
        </span>
        <button
          onClick={handleShare}
          className="text-white/40 hover:text-fair-play-gold transition-colors p-1"
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
        <div className="flex items-center gap-2 flex-shrink-0">
          <span
            style={{
              fontFamily: "var(--font-lexend)",
              fontSize: "24px",
              fontWeight: 900,
              color: "var(--foreground)",
              lineHeight: 1,
            }}
          >
            {match.homeScore}
          </span>
          <span
            className="text-muted-foreground"
            style={{ fontFamily: "var(--font-inter)", fontSize: "13px" }}
          >
            –
          </span>
          <span
            style={{
              fontFamily: "var(--font-lexend)",
              fontSize: "24px",
              fontWeight: 900,
              color: "var(--foreground)",
              lineHeight: 1,
            }}
          >
            {match.awayScore}
          </span>
        </div>
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
