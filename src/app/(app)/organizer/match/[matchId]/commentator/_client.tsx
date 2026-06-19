"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import type { Route } from "next";
import { ArrowLeft, MapPin, User, Wifi, WifiOff, Star, Zap, Radio, Home, Plane } from "lucide-react";
import { computeLiveStats } from "./_lib/compute-live-stats";
import type { LiveStats, PlayerStat, CardedPlayer, ScoringCounts } from "./_lib/compute-live-stats";
import { STAT_GROUPS, STAT_CONFIG } from "@/app/(app)/organizer/_lib/event-config";
import type { getMatchWithRoster } from "@modules/match";

type Match = NonNullable<Awaited<ReturnType<typeof getMatchWithRoster>>>;
type RawEvent = Match["events"][number];

type SseScoreEvent = {
  id: string;
  matchId: string;
  eventType: string;
  teamId: string;
  playerId: string | null;
  minute: number | null;
  payload: unknown;
  homeScore: number;
  awayScore: number;
  createdAt: string;
};

type SseMessage =
  | { type: "state"; homeScore: number; awayScore: number; status: string }
  | { type: "phase_change"; status: string }
  | { type: "event_deleted"; eventId: string }
  | SseScoreEvent;

const STATUS_LABEL: Record<string, string> = {
  scheduled: "UPCOMING",
  live: "LIVE",
  suspended: "SUSPENDED",
  completed: "FULL TIME",
  locked: "LOCKED",
};

export function CommentatorClient({ match }: { match: Match }) {
  const [events, setEvents] = useState<RawEvent[]>(match.events);
  const [homeScore, setHomeScore] = useState(match.homeScore);
  const [awayScore, setAwayScore] = useState(match.awayScore);
  const [status, setStatus] = useState(match.status);
  const [connected, setConnected] = useState(false);
  const lastEventIdRef = useRef<string | null>(null);

  const playerMap = useMemo(() => {
    const map = new Map<string, { fullName: string }>();
    for (const p of match.homeTeam.players) map.set(p.id, { fullName: p.fullName });
    for (const p of match.awayTeam.players) map.set(p.id, { fullName: p.fullName });
    return map;
  }, [match.homeTeam.players, match.awayTeam.players]);

  const stats = useMemo(
    () => computeLiveStats(events, match.homeTeam.id, playerMap),
    [events, match.homeTeam.id, playerMap]
  );

  useEffect(() => {
    const source = new EventSource(`/api/stream/${match.id}`);
    source.onopen = () => { setConnected(true); };
    source.onerror = () => { setConnected(false); };
    source.onmessage = (e: MessageEvent<string>) => {
      const data = JSON.parse(e.data) as SseMessage;

      if ("type" in data && data.type === "state") {
        setHomeScore(data.homeScore);
        setAwayScore(data.awayScore);
        setStatus(data.status as Match["status"]);
        return;
      }
      if ("type" in data && data.type === "phase_change") {
        setStatus(data.status as Match["status"]);
        return;
      }
      if ("type" in data && data.type === "event_deleted") {
        setEvents((prev) => prev.filter((ev) => ev.id !== data.eventId));
        return;
      }

      const ev = data as SseScoreEvent;
      lastEventIdRef.current = ev.id;
      setHomeScore(ev.homeScore);
      setAwayScore(ev.awayScore);
      const newEvent: RawEvent = {
        id: ev.id,
        eventType: ev.eventType as RawEvent["eventType"],
        teamId: ev.teamId,
        playerId: ev.playerId,
        minute: ev.minute,
        createdAt: new Date(ev.createdAt),
        payload: ev.payload as RawEvent["payload"],
      };
      setEvents((prev) => [...prev, newEvent]);
    };

    return () => { source.close(); };
  }, [match.id]);

  const isLive = status === "live";

  const scorerEntries = useMemo(
    () =>
      [...stats.playerPoints.entries()]
        .filter(([, s]) => s.points > 0)
        .sort(([, a], [, b]) => b.points - a.points),
    [stats]
  );

  return (
    <div className="min-h-screen bg-navy text-white font-[family-name:var(--font-lexend)]">

      {/* ── Header ── */}
      <header className="border-b-2 border-white/10 px-4 py-3 flex items-center justify-between">
        <Link
          href={`/organizer/match/${match.id}` as Route}
          className="flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          Match Center
        </Link>
        <div className="flex items-center gap-2">
          <Radio className="h-3.5 w-3.5 text-white/30" />
          <span className="text-xs font-extrabold tracking-widest text-white/50 uppercase">
            Commentator View
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span
            className={`inline-block w-2 h-2 rounded-full ${
              connected ? "bg-pitch-green animate-pulse" : "bg-red-card"
            }`}
          />
          <span className={connected ? "text-pitch-green font-bold" : "text-red-400 font-bold"}>
            {connected ? "LIVE FEED" : "RECONNECTING"}
          </span>
          {connected ? (
            <Wifi className="h-3.5 w-3.5 text-pitch-green" />
          ) : (
            <WifiOff className="h-3.5 w-3.5 text-red-400" />
          )}
        </div>
      </header>

      {/* ── Score Hero ── */}
      <section className="relative border-b-4 border-pitch-green bg-navy px-6 py-8">
        <p className="text-center text-[10px] font-extrabold tracking-widest text-pitch-green/70 mb-3 uppercase">
          {match.tournament.name}
          {match.groupLabel ? ` · ${match.groupLabel}` : ""}
        </p>

        <div className="flex items-stretch justify-between max-w-2xl mx-auto gap-6">
          {/* Home team */}
          <div className="flex-1 flex flex-col items-center justify-center gap-1 text-center">
            <p className="text-2xl font-extrabold tracking-tight leading-tight">{match.homeTeam.name}</p>
            <span className="text-[10px] font-black tracking-widest text-pitch-green/60 uppercase border border-pitch-green/30 px-2 py-0.5 rounded-sm">
              HOME
            </span>
          </div>

          {/* Score */}
          <div className="flex flex-col items-center gap-2 shrink-0">
            <div className="flex items-center gap-4">
              <span className="text-7xl font-extrabold tabular-nums leading-none">{homeScore}</span>
              <span className="text-4xl font-bold text-white/20">–</span>
              <span className="text-7xl font-extrabold tabular-nums leading-none">{awayScore}</span>
            </div>
            <div className="flex items-center gap-2">
              {isLive && (
                <span className="inline-block w-2 h-2 rounded-full bg-pitch-green animate-pulse shrink-0" />
              )}
              <span
                className={`text-xs font-extrabold tracking-widest px-3 py-1 rounded-sm ${
                  isLive
                    ? "bg-pitch-green text-white"
                    : status === "completed" || status === "locked"
                    ? "bg-white/10 text-white/50"
                    : "bg-fair-play-gold/20 text-fair-play-gold"
                }`}
              >
                {STATUS_LABEL[status] ?? status.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Away team */}
          <div className="flex-1 flex flex-col items-center justify-center gap-1 text-center">
            <p className="text-2xl font-extrabold tracking-tight leading-tight">{match.awayTeam.name}</p>
            <span className="text-[10px] font-black tracking-widest text-white/40 uppercase border border-white/20 px-2 py-0.5 rounded-sm">
              AWAY
            </span>
          </div>
        </div>

        {/* Match metadata */}
        <div className="mt-5 flex flex-wrap justify-center gap-x-6 gap-y-1 text-xs text-white/40">
          {match.pitch && (
            <span className="flex items-center gap-1.5">
              <MapPin className="h-3 w-3" />
              {match.pitch}
            </span>
          )}
          {match.refereeName && (
            <span className="flex items-center gap-1.5">
              <User className="h-3 w-3" />
              Ref: {match.refereeName}
            </span>
          )}
          {match.scheduledAt && (
            <span>
              {new Date(match.scheduledAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          )}
        </div>
      </section>

      {/* ── Main Grid ── */}
      <div className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Col 1: Home Lineup */}
        <LineupPanel
          team={match.homeTeam}
          side="home"
          playerPoints={stats.playerPoints}
          cardedPlayers={stats.cardedPlayers}
          topScorer={stats.topScorer}
          topTryScorer={stats.topTryScorer}
        />

        {/* Col 2: Live stats */}
        <div className="space-y-5">
          <ScoringBreakdown
            home={stats.breakdown.home}
            away={stats.breakdown.away}
            homeTeamName={match.homeTeam.name}
            awayTeamName={match.awayTeam.name}
          />
          <PerformanceStats
            performanceStats={stats.performanceStats}
            homeTeamName={match.homeTeam.name}
            awayTeamName={match.awayTeam.name}
          />
        </div>

        {/* Col 3: Away Lineup + Spotlight */}
        <div className="space-y-5">
          <LineupPanel
            team={match.awayTeam}
            side="away"
            playerPoints={stats.playerPoints}
            cardedPlayers={stats.cardedPlayers}
            topScorer={stats.topScorer}
            topTryScorer={stats.topTryScorer}
          />
          <PlayerSpotlight
            topScorer={stats.topScorer}
            topTryScorer={stats.topTryScorer}
            cardedPlayers={stats.cardedPlayers}
            scorerEntries={scorerEntries}
          />
        </div>
      </div>
    </div>
  );
}

// ── Lineup Panel ──────────────────────────────────────────────────────────────

type TeamShape = Match["homeTeam"];

function LineupPanel({
  team,
  side,
  playerPoints,
  cardedPlayers,
  topScorer,
  topTryScorer,
}: {
  team: TeamShape;
  side: "home" | "away";
  playerPoints: Map<string, PlayerStat>;
  cardedPlayers: CardedPlayer[];
  topScorer: LiveStats["topScorer"];
  topTryScorer: LiveStats["topTryScorer"];
}) {
  const cardedMap = new Map(
    cardedPlayers.filter((c) => c.team === side).map((c) => [c.playerId, c])
  );

  return (
    <div className="border-2 border-white/15 rounded-sm overflow-hidden">
      <div className="px-4 py-2.5 bg-white/[0.08] border-b-2 border-white/15 flex items-center justify-between">
        <p className="text-[10px] font-extrabold tracking-widest text-white/60 uppercase flex items-center gap-1.5">
          {side === "home"
            ? <Home className="h-3 w-3 inline" />
            : <Plane className="h-3 w-3 inline" />}
          {side === "home" ? "Home" : "Away"}&ensp;·&ensp;{team.name}
        </p>
        <span className="text-[10px] text-white/30 font-bold">{team.players.length} players</span>
      </div>
      <ul className="divide-y divide-white/[0.06]">
        {team.players.map((player) => {
          const stat = playerPoints.get(player.id);
          const cardedEntry = cardedMap.get(player.id);
          const carded = cardedEntry !== undefined;
          const isTopScorer = topScorer?.playerId === player.id;
          const isTopTry = topTryScorer?.playerId === player.id;
          const redCarded = cardedEntry?.cardType === "red_card";

          return (
            <li
              key={player.id}
              className={`flex items-center gap-3 px-3 py-2 transition-colors ${
                isTopScorer
                  ? "bg-pitch-green/15 border-l-2 border-pitch-green"
                  : isTopTry
                  ? "bg-pitch-green/8 border-l-2 border-pitch-green/50"
                  : carded
                  ? redCarded
                    ? "bg-red-card/10 border-l-2 border-red-card"
                    : "bg-fair-play-gold/8 border-l-2 border-fair-play-gold"
                  : "border-l-2 border-transparent"
              }`}
            >
              {/* Jersey number */}
              <span className="w-7 text-center text-sm font-extrabold text-white/40 shrink-0 tabular-nums">
                {player.jerseyNumber ?? "–"}
              </span>

              {/* Name + position */}
              <div className="flex-1 min-w-0">
                <span className="text-sm font-semibold truncate block leading-tight">
                  {player.fullName}
                </span>
                {player.position && (
                  <span className="text-[10px] text-white/35 uppercase tracking-wide">{player.position}</span>
                )}
              </div>

              {/* Badges */}
              <div className="flex items-center gap-1.5 shrink-0">
                {isTopScorer && (
                  <Star className="h-3.5 w-3.5 text-fair-play-gold" />
                )}
                {isTopTry && !isTopScorer && (
                  <Zap className="h-3.5 w-3.5 text-pitch-green" />
                )}
                {stat && stat.tries > 0 && (
                  <span className="text-[10px] font-extrabold text-pitch-green bg-pitch-green/15 px-1.5 py-0.5 rounded-sm">
                    T×{stat.tries}
                  </span>
                )}
                {/* Card indicator */}
                {carded && (
                  <span
                    className={`w-3 h-4 rounded-sm inline-block shrink-0 shadow-sm ${
                      redCarded ? "bg-red-card" : "bg-fair-play-gold"
                    }`}
                    title={redCarded ? "Red card" : "Yellow card"}
                  />
                )}
                {stat && stat.points > 0 && (
                  <span className="text-[11px] font-bold text-white/50 tabular-nums">{stat.points}pts</span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ── Scoring Breakdown ─────────────────────────────────────────────────────────

const BREAKDOWN_ROWS: { key: keyof ScoringCounts; label: string; accent?: string }[] = [
  { key: "try",         label: "Tries",         accent: "text-pitch-green" },
  { key: "conversion",  label: "Conversions",   accent: "text-pitch-green/70" },
  { key: "penalty",     label: "Penalties",     accent: "text-fair-play-gold" },
  { key: "drop_goal",   label: "Drop Goals",    accent: "text-fair-play-gold/70" },
  { key: "yellow_card", label: "Yellow Cards",  accent: "text-fair-play-gold" },
  { key: "red_card",    label: "Red Cards",     accent: "text-red-card" },
];

function ScoringBreakdown({
  home,
  away,
  homeTeamName,
  awayTeamName,
}: {
  home: ScoringCounts;
  away: ScoringCounts;
  homeTeamName: string;
  awayTeamName: string;
}) {
  const homeShort = homeTeamName.slice(0, 3).toUpperCase();
  const awayShort = awayTeamName.slice(0, 3).toUpperCase();

  return (
    <div className="border-2 border-white/15 rounded-sm overflow-hidden">
      {/* Header with pitch-green accent */}
      <div className="bg-pitch-green px-4 py-2.5 border-b border-pitch-green/70">
        <p className="text-white text-[10px] font-extrabold tracking-widest uppercase">Scoring Breakdown</p>
      </div>

      {/* Column labels */}
      <div className="grid grid-cols-3 px-4 py-1.5 bg-white/[0.04] border-b border-white/[0.08] text-[10px] font-extrabold tracking-widest text-white/35 uppercase">
        <span>{homeShort}</span>
        <span className="text-center">EVENT</span>
        <span className="text-right">{awayShort}</span>
      </div>

      {BREAKDOWN_ROWS.map(({ key, label, accent }) => {
        const h = home[key];
        const a = away[key];
        const hasData = h > 0 || a > 0;
        return (
          <div
            key={key}
            className={`grid grid-cols-3 items-center px-4 py-2.5 border-b border-white/[0.05] last:border-0 ${
              hasData ? "bg-white/[0.02]" : ""
            }`}
          >
            <span
              className={`text-xl font-extrabold tabular-nums ${
                h > a ? (accent ?? "text-white") : h === 0 ? "text-white/20" : "text-white/50"
              }`}
            >
              {h}
            </span>
            <span className="text-center text-[11px] font-bold text-white/40">{label}</span>
            <span
              className={`text-xl font-extrabold tabular-nums text-right ${
                a > h ? (accent ?? "text-white") : a === 0 ? "text-white/20" : "text-white/50"
              }`}
            >
              {a}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Performance Stats ─────────────────────────────────────────────────────────

function PerformanceStats({
  performanceStats,
  homeTeamName,
  awayTeamName,
}: {
  performanceStats: Record<string, { home: number; away: number }>;
  homeTeamName: string;
  awayTeamName: string;
}) {
  const hasAny = Object.keys(performanceStats).length > 0;
  if (!hasAny) return null;

  const homeShort = homeTeamName.slice(0, 3).toUpperCase();
  const awayShort = awayTeamName.slice(0, 3).toUpperCase();

  return (
    <div className="border-2 border-white/15 rounded-sm overflow-hidden">
      <div className="bg-navy/80 border-b-2 border-white/15 px-4 py-2.5">
        <p className="text-[10px] font-extrabold tracking-widest text-white/60 uppercase">Performance Stats</p>
      </div>

      <div className="grid grid-cols-3 px-4 py-1.5 bg-white/[0.04] border-b border-white/[0.08] text-[10px] font-extrabold tracking-widest text-white/35 uppercase">
        <span>{homeShort}</span>
        <span className="text-center">STAT</span>
        <span className="text-right">{awayShort}</span>
      </div>

      {STAT_GROUPS.map((group) => {
        const visibleStats = group.stats.filter((s) => s in performanceStats);
        if (visibleStats.length === 0) return null;
        return (
          <div key={group.label}>
            <div className="px-4 py-1.5 bg-white/[0.03] border-b border-white/[0.05] border-t border-white/[0.05]">
              <span className="text-[9px] font-extrabold tracking-widest text-white/25 uppercase">
                {group.label}
              </span>
            </div>
            {visibleStats.map((stat) => {
              const counts = performanceStats[stat];
              if (!counts) return null;
              const { home, away } = counts;
              const config = STAT_CONFIG[stat];
              const displayHome = config?.displayMode === "metres" ? `${home}m` : home;
              const displayAway = config?.displayMode === "metres" ? `${away}m` : away;

              return (
                <div
                  key={stat}
                  className="grid grid-cols-3 items-center px-4 py-2 border-b border-white/[0.05] last:border-0"
                >
                  <span
                    className={`text-base font-extrabold tabular-nums ${
                      home > away ? "text-pitch-green" : home === 0 ? "text-white/20" : "text-white/55"
                    }`}
                  >
                    {displayHome}
                  </span>
                  {/* Full stat name for commentator context */}
                  <span className="text-center text-[10px] text-white/40 leading-tight px-1">
                    {config?.full ?? stat}
                  </span>
                  <span
                    className={`text-base font-extrabold tabular-nums text-right ${
                      away > home ? "text-pitch-green" : away === 0 ? "text-white/20" : "text-white/55"
                    }`}
                  >
                    {displayAway}
                  </span>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

// ── Player Spotlight ──────────────────────────────────────────────────────────

function PlayerSpotlight({
  topScorer,
  topTryScorer,
  cardedPlayers,
  scorerEntries,
}: {
  topScorer: LiveStats["topScorer"];
  topTryScorer: LiveStats["topTryScorer"];
  cardedPlayers: CardedPlayer[];
  scorerEntries: [string, PlayerStat][];
}) {
  const hasContent =
    topScorer !== null ||
    topTryScorer !== null ||
    cardedPlayers.length > 0 ||
    scorerEntries.length > 0;

  return (
    <div className="border-2 border-fair-play-gold/30 rounded-sm overflow-hidden">
      <div className="bg-fair-play-gold/15 border-b-2 border-fair-play-gold/30 px-4 py-2.5 flex items-center gap-2">
        <Star className="h-3.5 w-3.5 text-fair-play-gold" />
        <p className="text-[10px] font-extrabold tracking-widest text-fair-play-gold uppercase">
          Player Spotlight
        </p>
      </div>

      {!hasContent ? (
        <div className="px-4 py-6 text-center">
          <p className="text-sm text-white/25 italic">No events recorded yet</p>
        </div>
      ) : (
        <div className="divide-y divide-white/[0.06]">

          {/* Top Scorer */}
          {topScorer && (
            <div className="p-4 flex items-start gap-3">
              <div className="w-8 h-8 rounded-sm bg-fair-play-gold/20 flex items-center justify-center shrink-0">
                <Star className="h-4 w-4 text-fair-play-gold" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[9px] font-extrabold tracking-widest text-fair-play-gold/70 uppercase mb-0.5">
                  Top Scorer
                </p>
                <p className="text-base font-extrabold truncate">{topScorer.name}</p>
                <p className="text-xs text-pitch-green font-bold mt-0.5">{topScorer.points} pts</p>
              </div>
            </div>
          )}

          {/* Top Try Scorer */}
          {topTryScorer && topTryScorer.playerId !== topScorer?.playerId && (
            <div className="p-4 flex items-start gap-3">
              <div className="w-8 h-8 rounded-sm bg-pitch-green/15 flex items-center justify-center shrink-0">
                <Zap className="h-4 w-4 text-pitch-green" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[9px] font-extrabold tracking-widest text-pitch-green/60 uppercase mb-0.5">
                  Top Try Scorer
                </p>
                <p className="text-base font-extrabold truncate">{topTryScorer.name}</p>
                <p className="text-xs text-pitch-green font-bold mt-0.5">
                  {topTryScorer.tries} {topTryScorer.tries === 1 ? "try" : "tries"}
                </p>
              </div>
            </div>
          )}

          {/* Cards */}
          {cardedPlayers.length > 0 && (
            <div className="p-4">
              <p className="text-[9px] font-extrabold tracking-widest text-white/35 uppercase mb-2">
                Cards Issued
              </p>
              <ul className="space-y-2">
                {cardedPlayers.map((c, i) => (
                  <li key={i} className="flex items-center gap-2.5 text-sm">
                    <span
                      className={`w-3 h-4 rounded-sm shrink-0 ${
                        c.cardType === "red_card" ? "bg-red-card" : "bg-fair-play-gold"
                      }`}
                    />
                    <span className="font-semibold flex-1 truncate">{c.name}</span>
                    {c.minute != null && (
                      <span className="text-white/35 text-xs tabular-nums shrink-0">{c.minute}&apos;</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* All Scorers */}
          {scorerEntries.length > 0 && (
            <div className="p-4">
              <p className="text-[9px] font-extrabold tracking-widest text-white/35 uppercase mb-2">
                All Scorers
              </p>
              <ul className="space-y-2">
                {scorerEntries.map(([pid, stat], idx) => (
                  <li key={pid} className="flex items-center gap-2.5 text-sm">
                    <span className="text-[10px] font-extrabold text-white/25 w-4 shrink-0 tabular-nums">
                      {idx + 1}.
                    </span>
                    <span className="font-semibold flex-1 truncate">{stat.name}</span>
                    <span className="text-white/45 text-[10px] shrink-0 ml-1 tabular-nums">
                      {[
                        stat.tries > 0 && `T×${stat.tries}`,
                        stat.conversions > 0 && `C×${stat.conversions}`,
                        stat.penalties > 0 && `P×${stat.penalties}`,
                        stat.drop_goals > 0 && `DG×${stat.drop_goals}`,
                      ]
                        .filter(Boolean)
                        .join(" ")}{" "}
                      · <span className="text-pitch-green font-bold">{stat.points}pts</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
