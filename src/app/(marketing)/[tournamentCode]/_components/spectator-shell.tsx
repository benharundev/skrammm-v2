"use client";

import Image from "next/image";
import { useState } from "react";
import { Clock, Trophy } from "lucide-react";
import type { PublicMatch, StandingRow } from "@modules/match";
import { LiveMatchCard } from "./live-match-card";
import { UpcomingCard } from "./upcoming-card";
import { ResultCard } from "./result-card";
import { MatchDetailOverlay } from "./match-detail-overlay";
import { StandingsSection } from "./standings-section";
import { DrawSection } from "./draw-section";
import { NextUpBanner } from "./next-up-banner";
import { ChampionBanner } from "./champion-banner";
import { LiveRefresh } from "./live-refresh";

interface TournamentTeamEntry {
  team: {
    id: string;
    name: string;
    logoUrl: string | null;
    slug: string;
    origin: string | null;
    trainingGround: string | null;
    createdByUserId: string;
    createdAt: Date | string;
    updatedAt: Date | string;
  };
}

interface Tournament {
  id: string;
  name: string;
  code: string;
  format: string;
  status: string;
  startsAt: Date | string;
  endsAt: Date | string;
  teams: TournamentTeamEntry[];
}

interface SpectatorShellProps {
  tournament: Tournament;
  hasLiveMatches: boolean;
  live: PublicMatch[];
  upcoming: PublicMatch[];
  results: PublicMatch[];
  standings: Record<string, StandingRow[]>;
  allMatches: PublicMatch[];
  isCompleted: boolean;
  isNotStarted: boolean;
  championName: string | null;
  nextUpMatch: PublicMatch | null;
  startDateFormatted: string;
}

export function SpectatorShell({
  tournament,
  hasLiveMatches,
  live,
  upcoming,
  results,
  standings,
  allMatches,
  isCompleted,
  isNotStarted,
  championName,
  nextUpMatch,
  startDateFormatted,
}: SpectatorShellProps) {
  const [selectedMatch, setSelectedMatch] = useState<PublicMatch | null>(null);

  const statusBadge = hasLiveMatches ? (
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
  ) : isCompleted ? (
    <span
      className="px-2 py-0.5 rounded-sm"
      style={{
        background: "var(--pitch-green-light, #234e40)",
        fontFamily: "var(--font-inter)",
        fontSize: "10px",
        fontWeight: 800,
        color: "rgba(255,255,255,0.7)",
        letterSpacing: "0.05em",
      }}
    >
      COMPLETED
    </span>
  ) : (
    <span
      className="px-2 py-0.5 rounded-sm"
      style={{
        background: "var(--navy)",
        fontFamily: "var(--font-inter)",
        fontSize: "10px",
        fontWeight: 800,
        color: "#fff",
        letterSpacing: "0.05em",
      }}
    >
      UPCOMING
    </span>
  );

  const dateRange = (() => {
    const opts: Intl.DateTimeFormatOptions = {
      day: "numeric",
      month: "short",
      year: "numeric",
    };
    return `${new Date(tournament.startsAt).toLocaleDateString("en-MY", opts)} – ${new Date(tournament.endsAt).toLocaleDateString("en-MY", opts)}`;
  })();

  const noFixtures = allMatches.length === 0;

  return (
    <>
      {selectedMatch !== null && (
        <MatchDetailOverlay
          match={selectedMatch}
          onClose={() => {
            setSelectedMatch(null);
          }}
        />
      )}

      <LiveRefresh hasLiveMatches={hasLiveMatches} />

      <div className="min-h-screen bg-background">
        <header
          className="sticky top-0 z-40 border-b-2 border-navy"
          style={{ background: "var(--pitch-green)" }}
        >
          <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
            <Image
              src="/logos/logo-wordmark-yellow.png"
              alt="Skrammm"
              width={86}
              height={24}
            />
            <div className="flex items-center gap-3">
              <span
                className="text-white/60 truncate max-w-[140px]"
                style={{ fontFamily: "var(--font-inter)", fontSize: "13px" }}
              >
                {tournament.name}
              </span>
              {statusBadge}
            </div>
          </div>
        </header>

        <div
          className="border-b-2 border-navy px-4 py-5"
          style={{ background: "var(--pitch-green-mid, #0d3b2e)" }}
        >
          <div className="max-w-2xl mx-auto">
            <h1
              className="text-white mb-1"
              style={{
                fontFamily: "var(--font-lexend)",
                fontSize: "26px",
                fontWeight: 900,
                lineHeight: 1.1,
              }}
            >
              {tournament.name}
            </h1>
            <div className="flex items-center gap-3 flex-wrap">
              {dateRange && (
                <span
                  className="text-white/50"
                  style={{ fontFamily: "var(--font-inter)", fontSize: "12px" }}
                >
                  {dateRange}
                </span>
              )}
              <span
                className="text-white/50"
                style={{
                  fontFamily: "var(--font-inter)",
                  fontSize: "12px",
                  textTransform: "capitalize",
                }}
              >
                {tournament.format}
              </span>
              <span
                className="text-white/50"
                style={{ fontFamily: "var(--font-inter)", fontSize: "12px" }}
              >
                {tournament.teams.length} teams
              </span>
              {isNotStarted && (
                <span
                  className="px-2 py-0.5 rounded-sm"
                  style={{
                    background: "var(--fair-play-gold)",
                    fontFamily: "var(--font-inter)",
                    fontSize: "10px",
                    fontWeight: 800,
                    color: "var(--pitch-green)",
                  }}
                >
                  Starts {startDateFormatted}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col gap-8">
          {isCompleted && championName !== null && (
            <ChampionBanner teamName={championName} />
          )}

          {!isCompleted && !isNotStarted && nextUpMatch !== null && (
            <NextUpBanner match={nextUpMatch} />
          )}

          {noFixtures && (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <Clock size={32} className="text-muted-foreground/30" />
              <p
                className="text-muted-foreground"
                style={{ fontFamily: "var(--font-inter)", fontSize: "15px" }}
              >
                Schedule not published yet — check back soon.
              </p>
            </div>
          )}

          {live.length > 0 && (
            <section
              className="rounded-sm overflow-hidden border-2 border-fair-play-gold p-4 flex flex-col gap-3"
              style={{ background: "var(--pitch-green)" }}
            >
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-card animate-pulse" />
                <span
                  className="text-white/80 uppercase tracking-wider"
                  style={{
                    fontFamily: "var(--font-inter)",
                    fontSize: "11px",
                    fontWeight: 700,
                  }}
                >
                  Live Now · {live.length} match{live.length > 1 ? "es" : ""}
                </span>
              </div>
              {live.map((m) => (
                <LiveMatchCard
                  key={m.id}
                  match={m}
                  onTap={() => {
                    setSelectedMatch(m);
                  }}
                />
              ))}
            </section>
          )}

          {tournament.format !== "elimination" &&
            Object.keys(standings).length > 0 && (
              <StandingsSection standings={standings} />
            )}

          {tournament.format === "elimination" && allMatches.length > 0 && (
            <DrawSection matches={allMatches} />
          )}

          {upcoming.length > 0 && !isNotStarted && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Clock size={14} className="text-muted-foreground" />
                <h2
                  className="text-foreground"
                  style={{
                    fontFamily: "var(--font-lexend)",
                    fontSize: "16px",
                    fontWeight: 800,
                  }}
                >
                  Upcoming
                </h2>
              </div>
              <div className="flex flex-col gap-2.5">
                {upcoming.map((m) => (
                  <UpcomingCard
                    key={m.id}
                    match={m}
                    onTap={() => {
                      setSelectedMatch(m);
                    }}
                  />
                ))}
              </div>
            </section>
          )}

          {upcoming.length > 0 && isNotStarted && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Clock size={14} className="text-muted-foreground" />
                <h2
                  className="text-foreground"
                  style={{
                    fontFamily: "var(--font-lexend)",
                    fontSize: "16px",
                    fontWeight: 800,
                  }}
                >
                  Fixtures
                </h2>
              </div>
              <div className="flex flex-col gap-2.5">
                {upcoming.map((m) => (
                  <UpcomingCard
                    key={m.id}
                    match={m}
                    onTap={() => {
                      setSelectedMatch(m);
                    }}
                  />
                ))}
              </div>
            </section>
          )}

          {results.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Trophy size={14} className="text-muted-foreground" />
                <h2
                  className="text-foreground"
                  style={{
                    fontFamily: "var(--font-lexend)",
                    fontSize: "16px",
                    fontWeight: 800,
                  }}
                >
                  Results
                </h2>
              </div>
              <div className="flex flex-col gap-2.5">
                {results.map((m) => (
                  <ResultCard
                    key={m.id}
                    match={m}
                    onTap={() => {
                      setSelectedMatch(m);
                    }}
                  />
                ))}
              </div>
            </section>
          )}
        </div>

        <footer className="border-t-2 border-border py-6 px-4 text-center">
          <p
            className="text-muted-foreground"
            style={{ fontFamily: "var(--font-inter)", fontSize: "12px" }}
          >
            Powered by{" "}
            <span className="text-pitch-green font-bold">Skrammm</span> · Live
            tournament management
          </p>
        </footer>
      </div>
    </>
  );
}
