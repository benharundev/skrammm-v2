"use client";

import { Share2 } from "lucide-react";
import type { PublicMatch } from "@modules/match";

interface LiveMatchCardProps {
  match: PublicMatch;
  onTap: () => void;
}

const EVENT_CHIP: Record<string, { label: string; className: string }> = {
  try:         { label: "⚡ Try",  className: "bg-fair-play-gold text-black" },
  conversion:  { label: "Conv",    className: "bg-navy text-white" },
  penalty:     { label: "Pen",     className: "bg-navy text-white" },
  drop_goal:   { label: "DG",      className: "bg-navy text-white" },
  yellow_card: { label: "🟨 YC",   className: "bg-yellow-400 text-black" },
  red_card:    { label: "🟥 RC",   className: "bg-red-card text-white" },
};

export function LiveMatchCard({ match, onTap }: LiveMatchCardProps) {
  function handleShare(e: React.MouseEvent) {
    e.stopPropagation();
    const shareUrl = `${window.location.origin}${window.location.pathname}/share/${match.id}`;
    const title = `${match.homeTeam.name} ${match.homeScore}–${match.awayScore} ${match.awayTeam.name}`;
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
      className="w-full text-left rounded-sm overflow-hidden"
      style={{
        background: "var(--pitch-green)",
        border: "2px solid var(--fair-play-gold)",
        boxShadow: "4px 4px 0 var(--fair-play-gold-dark)",
      }}
    >
      <div className="flex items-center justify-between px-4 py-2">
        <span
          className="flex items-center gap-1.5 px-2 py-0.5 rounded-sm"
          style={{
            background: "var(--red-card)",
            fontFamily: "var(--font-inter)",
            fontSize: "10px",
            fontWeight: 800,
            color: "#fff",
            letterSpacing: "0.05em",
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse inline-block" />
          LIVE
        </span>
        <span
          className="text-white/40"
          style={{ fontFamily: "var(--font-inter)", fontSize: "11px" }}
        >
          {[match.pitch, match.groupLabel].filter(Boolean).join(" · ")}
        </span>
        <button
          onClick={handleShare}
          className="text-white/40 hover:text-fair-play-gold transition-colors p-1"
          aria-label="Share match card"
        >
          <Share2 size={14} />
        </button>
      </div>

      <div className="flex items-center gap-4 px-4 pb-3">
        <div className="flex-1 text-right">
          <p
            className="text-white"
            style={{ fontFamily: "var(--font-lexend)", fontSize: "15px", fontWeight: 800 }}
          >
            {match.homeTeam.name}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <span
            style={{
              fontFamily: "var(--font-lexend)",
              fontSize: "38px",
              fontWeight: 900,
              color: "var(--fair-play-gold)",
              lineHeight: 1,
            }}
          >
            {match.homeScore}
          </span>
          <span className="text-white/30" style={{ fontSize: "20px" }}>
            –
          </span>
          <span
            style={{
              fontFamily: "var(--font-lexend)",
              fontSize: "38px",
              fontWeight: 900,
              color: "var(--fair-play-gold)",
              lineHeight: 1,
            }}
          >
            {match.awayScore}
          </span>
        </div>
        <div className="flex-1 text-left">
          <p
            className="text-white"
            style={{ fontFamily: "var(--font-lexend)", fontSize: "15px", fontWeight: 800 }}
          >
            {match.awayTeam.name}
          </p>
        </div>
      </div>

      {match.events.length > 0 && (
        <div
          className="flex flex-wrap gap-1.5 px-4 pb-3 pt-2"
          style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}
        >
          {match.events.slice(-6).map((ev) => {
            const chip = EVENT_CHIP[ev.eventType];
            if (!chip) return null;
            return (
              <span
                key={ev.id}
                className={`text-xs px-2 py-0.5 rounded-sm font-bold ${chip.className}`}
                style={{ fontFamily: "var(--font-inter)", fontSize: "10px" }}
              >
                {chip.label}
                {ev.player ? ` ${ev.player.fullName}` : ""} {ev.minute}′
              </span>
            );
          })}
        </div>
      )}
    </button>
  );
}
