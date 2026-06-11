"use client";

import { X, Clock, MapPin } from "lucide-react";
import type { PublicMatch } from "@modules/match";

interface MatchDetailOverlayProps {
  match: PublicMatch;
  onClose: () => void;
}

const EVENT_BADGE: Record<string, { label: string; bg: string; color: string }> = {
  try:         { label: "TRY",  bg: "var(--pitch-green)", color: "#fff" },
  conversion:  { label: "CONV", bg: "var(--navy)",        color: "#fff" },
  penalty:     { label: "PEN",  bg: "var(--navy)",        color: "#fff" },
  drop_goal:   { label: "DG",   bg: "var(--navy)",        color: "#fff" },
  yellow_card: { label: "YC",   bg: "#f59e0b",            color: "#000" },
  red_card:    { label: "RC",   bg: "var(--red-card)",    color: "#fff" },
  sub_in:      { label: "SUB↑", bg: "#6b7280",            color: "#fff" },
  sub_out:     { label: "SUB↓", bg: "#6b7280",            color: "#fff" },
};

function EventBadge({ type }: { type: string }) {
  const meta = EVENT_BADGE[type] ?? { label: type.toUpperCase().slice(0, 4), bg: "var(--navy)", color: "#fff" };
  return (
    <span
      className="px-2 py-0.5 rounded-sm flex-shrink-0"
      style={{
        background: meta.bg,
        color: meta.color,
        fontFamily: "var(--font-inter)",
        fontSize: "10px",
        fontWeight: 800,
        letterSpacing: "0.05em",
      }}
    >
      {meta.label}
    </span>
  );
}

export function MatchDetailOverlay({ match, onClose }: MatchDetailOverlayProps) {
  const kickoff = new Date(match.scheduledAt).toLocaleTimeString("en-MY", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const statusLabel =
    match.status === "live"
      ? "Live"
      : match.status === "completed" || match.status === "locked"
      ? "Full Time"
      : match.status === "suspended"
      ? "Suspended"
      : `KO ${kickoff}`;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: "var(--pitch-green)" }}
    >
      <div className="flex items-center justify-between px-4 h-14 border-b-2 border-white/10 flex-shrink-0">
        <button
          onClick={onClose}
          className="flex items-center gap-2 text-white/70 hover:text-white transition-colors"
          style={{ fontFamily: "var(--font-inter)", fontSize: "14px", fontWeight: 600 }}
        >
          ← Back
        </button>
        <span
          className="text-white/50"
          style={{ fontFamily: "var(--font-inter)", fontSize: "12px" }}
        >
          {[match.groupLabel, match.pitch].filter(Boolean).join(" · ")}
        </span>
        <button onClick={onClose} className="text-white/60 hover:text-white transition-colors">
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-8 flex flex-col items-center gap-2">
          <div className="flex items-center gap-6 w-full max-w-sm">
            <div className="flex-1 text-right">
              <p
                className="text-white"
                style={{ fontFamily: "var(--font-lexend)", fontSize: "16px", fontWeight: 800, lineHeight: 1.2 }}
              >
                {match.homeTeam.name}
              </p>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <span
                className="text-white"
                style={{ fontFamily: "var(--font-lexend)", fontSize: "42px", fontWeight: 900 }}
              >
                {match.homeScore}
              </span>
              <div className="flex flex-col items-center gap-1">
                <span
                  className="text-white/50 uppercase tracking-wider"
                  style={{ fontFamily: "var(--font-inter)", fontSize: "10px", fontWeight: 700 }}
                >
                  {statusLabel}
                </span>
                <span className="text-white/30" style={{ fontSize: "18px", fontWeight: 300 }}>
                  –
                </span>
              </div>
              <span
                className="text-white"
                style={{ fontFamily: "var(--font-lexend)", fontSize: "42px", fontWeight: 900 }}
              >
                {match.awayScore}
              </span>
            </div>
            <div className="flex-1 text-left">
              <p
                className="text-white"
                style={{ fontFamily: "var(--font-lexend)", fontSize: "16px", fontWeight: 800, lineHeight: 1.2 }}
              >
                {match.awayTeam.name}
              </p>
            </div>
          </div>

          <div
            className="flex items-center gap-3 mt-2 text-white/40"
            style={{ fontFamily: "var(--font-inter)", fontSize: "12px" }}
          >
            <span className="flex items-center gap-1">
              <Clock size={12} /> {kickoff}
            </span>
            {match.pitch && (
              <span className="flex items-center gap-1">
                <MapPin size={12} /> {match.pitch}
              </span>
            )}
          </div>
        </div>

        <div className="bg-background rounded-t-xl px-4 pb-8 min-h-64">
          <div className="max-w-lg mx-auto">
            <div className="py-4 border-b border-border mb-4">
              <p
                className="text-muted-foreground uppercase tracking-wider text-center"
                style={{ fontFamily: "var(--font-inter)", fontSize: "11px", fontWeight: 700 }}
              >
                Match Events
              </p>
            </div>

            {match.events.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-12 text-center">
                <Clock size={28} className="text-muted-foreground/30" />
                <p
                  className="text-muted-foreground"
                  style={{ fontFamily: "var(--font-inter)", fontSize: "14px" }}
                >
                  {match.status === "scheduled"
                    ? "Match hasn't started yet"
                    : "No events recorded"}
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-0.5">
                {[...match.events]
                  .sort((a, b) => a.minute - b.minute)
                  .map((ev, i) => (
                    <div
                      key={ev.id}
                      className={`flex items-center gap-3 px-4 py-3 rounded-sm ${
                        ev.teamId === match.homeTeam.id ? "flex-row" : "flex-row-reverse"
                      } ${i % 2 === 0 ? "bg-muted/40" : ""}`}
                    >
                      <span
                        className="text-muted-foreground w-8 flex-shrink-0 text-center"
                        style={{
                          fontFamily: "var(--font-lexend)",
                          fontSize: "13px",
                          fontWeight: 700,
                        }}
                      >
                        {ev.minute}′
                      </span>
                      <EventBadge type={ev.eventType} />
                      <div
                        className={`flex-1 ${ev.teamId === match.awayTeam.id ? "text-right" : ""}`}
                      >
                        <p
                          className="text-foreground"
                          style={{ fontFamily: "var(--font-inter)", fontSize: "13px", fontWeight: 600 }}
                        >
                          {ev.player?.fullName ?? "—"}
                        </p>
                        <p
                          className="text-muted-foreground"
                          style={{ fontFamily: "var(--font-inter)", fontSize: "11px" }}
                        >
                          {ev.teamId === match.homeTeam.id
                            ? match.homeTeam.name
                            : match.awayTeam.name}
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
