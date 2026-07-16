"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import type { Route } from "next";
import { ArrowLeft, MapPin, User, Wifi, WifiOff, Star, Zap, Radio, Home, Plane } from "lucide-react";
import { computeLiveStats } from "./_lib/compute-live-stats";
import type { LiveStats, PlayerStat, CardedPlayer, ScoringCounts } from "./_lib/compute-live-stats";
import { STAT_GROUPS, STAT_CONFIG } from "@/app/(app)/organizer/_lib/event-config";
import type { getMatchWithRoster } from "@modules/match";
import { useLiveClock } from "../_lib/use-live-clock";

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
  | { type: "state"; homeScore: number; awayScore: number; status: string; startedAt: string | null; secondHalfStartedAt: string | null; pausedAt: string | null; totalPausedMs: number }
  | { type: "phase_change"; status: string; startedAt: string | null; secondHalfStartedAt: string | null; pausedAt: string | null; totalPausedMs: number }
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
  const [startedAt, setStartedAt] = useState<Date | null>(match.startedAt ?? null);
  const [secondHalfStartedAt, setSecondHalfStartedAt] = useState<Date | null>(match.secondHalfStartedAt ?? null);
  const [pausedAt, setPausedAt] = useState<Date | null>(match.pausedAt ?? null);
  const [totalPausedMs, setTotalPausedMs] = useState(match.totalPausedMs);
  const [connected, setConnected] = useState(false);
  const lastEventIdRef = useRef<string | null>(null);
  const minute = useLiveClock(startedAt, secondHalfStartedAt, status === "live", pausedAt, totalPausedMs);

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
        if (data.startedAt) setStartedAt(new Date(data.startedAt));
        if (data.secondHalfStartedAt) setSecondHalfStartedAt(new Date(data.secondHalfStartedAt));
        setPausedAt(data.pausedAt ? new Date(data.pausedAt) : null);
        setTotalPausedMs(data.totalPausedMs);
        return;
      }
      if ("type" in data && data.type === "phase_change") {
        setStatus(data.status as Match["status"]);
        if (data.startedAt) setStartedAt(new Date(data.startedAt));
        if (data.secondHalfStartedAt) setSecondHalfStartedAt(new Date(data.secondHalfStartedAt));
        setPausedAt(data.pausedAt ? new Date(data.pausedAt) : null);
        setTotalPausedMs(data.totalPausedMs);
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
    <div className="min-h-dvh bg-background font-[family-name:var(--font-lexend)]">

      {/* ── Header ── */}
      <header className="border-b-2 border-border px-4 py-3 flex items-center justify-between bg-card">
        <Link
          href={`/organizer/match/${match.id}` as Route}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          Match Center
        </Link>
        <div className="flex items-center gap-2">
          <Radio className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-extrabold tracking-widest text-muted-foreground uppercase">
            Commentator View
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span
            className={`inline-block w-2 h-2 rounded-full ${
              connected ? "bg-pitch-green animate-pulse" : "bg-red-card"
            }`}
          />
          <span className={`font-bold ${connected ? "text-pitch-green" : "text-red-card"}`}>
            {connected ? "LIVE FEED" : "RECONNECTING"}
          </span>
          {connected ? (
            <Wifi className="h-3.5 w-3.5 text-pitch-green" />
          ) : (
            <WifiOff className="h-3.5 w-3.5 text-red-card" />
          )}
        </div>
      </header>

      {/* ── Score Hero — pitch-green like other organizer section headers ── */}
      <section className="bg-pitch-green text-white border-b-4 border-navy px-6 py-8">
        <p className="text-center text-[10px] font-extrabold tracking-widest text-white/70 mb-4 uppercase">
          {match.tournament.name}
          {match.groupLabel ? ` · ${match.groupLabel}` : ""}
        </p>

        <div className="flex items-stretch justify-between max-w-2xl mx-auto gap-6">
          {/* Home team */}
          <div className="flex-1 flex flex-col items-center justify-center gap-1.5 text-center">
            <p className="text-2xl font-extrabold tracking-tight leading-tight">{match.homeTeam.name}</p>
            <span className="text-[10px] font-black tracking-widest text-white/50 uppercase border border-white/30 px-2 py-0.5 rounded-sm">
              HOME
            </span>
          </div>

          {/* Score */}
          <div className="flex flex-col items-center gap-2 shrink-0">
            <div className="flex items-center gap-4">
              <span className="text-7xl font-extrabold tabular-nums leading-none">{homeScore}</span>
              <span className="text-4xl font-bold text-white/30">–</span>
              <span className="text-7xl font-extrabold tabular-nums leading-none">{awayScore}</span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              {isLive && (
                <span className="inline-block w-2 h-2 rounded-full bg-fair-play-gold animate-pulse shrink-0" />
              )}
              <span
                className={`text-xs font-extrabold tracking-widest px-3 py-1 rounded-sm ${
                  isLive
                    ? "bg-fair-play-gold text-pitch-green"
                    : status === "completed" || status === "locked"
                    ? "bg-white/10 text-white/60"
                    : "bg-white/20 text-white"
                }`}
              >
                {STATUS_LABEL[status] ?? status.toUpperCase()}
              </span>
              {startedAt && (
                <span className="text-fair-play-gold font-extrabold tabular-nums text-sm">
                  {minute}&apos;
                </span>
              )}
            </div>
          </div>

          {/* Away team */}
          <div className="flex-1 flex flex-col items-center justify-center gap-1.5 text-center">
            <p className="text-2xl font-extrabold tracking-tight leading-tight">{match.awayTeam.name}</p>
            <span className="text-[10px] font-black tracking-widest text-white/50 uppercase border border-white/30 px-2 py-0.5 rounded-sm">
              AWAY
            </span>
          </div>
        </div>

        {/* Match metadata */}
        <div className="mt-5 flex flex-wrap justify-center gap-x-6 gap-y-1 text-xs text-white/50">
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
    <div className="bg-card border-2 border-border rounded-sm overflow-hidden shadow-brutalist-navy">
      {/* Panel header */}
      <div className="bg-pitch-green px-4 py-3 border-b-2 border-navy flex items-center justify-between">
        <p className="text-white font-[family-name:var(--font-lexend)] text-sm font-bold flex items-center gap-2">
          {side === "home"
            ? <Home className="h-3.5 w-3.5" />
            : <Plane className="h-3.5 w-3.5" />}
          {side === "home" ? "Home" : "Away"} · {team.name}
        </p>
        <span className="text-white/50 text-[10px] font-bold">{team.players.length}p</span>
      </div>

      <ul className="divide-y divide-border">
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
              className={`flex items-center gap-3 px-3 py-2 border-l-2 transition-colors ${
                isTopScorer
                  ? "bg-pitch-green/10 border-l-pitch-green"
                  : isTopTry
                  ? "bg-pitch-green/5 border-l-pitch-green/40"
                  : carded
                  ? redCarded
                    ? "bg-destructive/5 border-l-red-card"
                    : "bg-fair-play-gold/10 border-l-fair-play-gold"
                  : "border-l-transparent"
              }`}
            >
              {/* Jersey number */}
              <span className="w-7 text-center text-sm font-extrabold text-muted-foreground shrink-0 tabular-nums">
                {player.jerseyNumber ?? "–"}
              </span>

              {/* Name + position */}
              <div className="flex-1 min-w-0">
                <span className="text-sm font-semibold truncate block leading-tight text-foreground">
                  {player.fullName}
                </span>
                {player.position && (
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wide">{player.position}</span>
                )}
              </div>

              {/* Badges */}
              <div className="flex items-center gap-1.5 shrink-0">
                {isTopScorer && <Star className="h-3.5 w-3.5 text-fair-play-gold" />}
                {isTopTry && !isTopScorer && <Zap className="h-3.5 w-3.5 text-pitch-green" />}
                {stat && stat.tries > 0 && (
                  <span className="text-[10px] font-extrabold text-pitch-green bg-pitch-green/10 px-1.5 py-0.5 rounded-sm">
                    T×{stat.tries}
                  </span>
                )}
                {carded && (
                  <span
                    className={`w-3 h-4 rounded-sm inline-block shrink-0 ${
                      redCarded ? "bg-red-card" : "bg-fair-play-gold"
                    }`}
                    title={redCarded ? "Red card" : "Yellow card"}
                  />
                )}
                {stat && stat.points > 0 && (
                  <span className="text-[11px] font-bold text-muted-foreground tabular-nums">{stat.points}pts</span>
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

const BREAKDOWN_ROWS: { key: keyof ScoringCounts; label: string; winColor: string }[] = [
  { key: "try",         label: "Tries",        winColor: "text-pitch-green" },
  { key: "conversion",  label: "Conversions",  winColor: "text-pitch-green" },
  { key: "penalty",     label: "Penalties",    winColor: "text-navy" },
  { key: "drop_goal",   label: "Drop Goals",   winColor: "text-navy" },
  { key: "yellow_card", label: "Yellow Cards", winColor: "text-fair-play-gold" },
  { key: "red_card",    label: "Red Cards",    winColor: "text-red-card" },
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
    <div className="bg-card border-2 border-border rounded-sm overflow-hidden shadow-brutalist-navy">
      <div className="bg-pitch-green px-4 py-3 border-b-2 border-navy">
        <p className="text-white font-[family-name:var(--font-lexend)] text-sm font-bold">Scoring Breakdown</p>
      </div>

      {/* Column labels */}
      <div className="grid grid-cols-3 px-4 py-1.5 bg-muted/40 border-b border-border text-[10px] font-extrabold tracking-widest text-muted-foreground uppercase">
        <span>{homeShort}</span>
        <span className="text-center">EVENT</span>
        <span className="text-right">{awayShort}</span>
      </div>

      {BREAKDOWN_ROWS.map(({ key, label, winColor }) => {
        const h = home[key];
        const a = away[key];
        return (
          <div
            key={key}
            className="grid grid-cols-3 items-center px-4 py-2.5 border-b border-border last:border-0"
          >
            <span
              className={`text-xl font-extrabold tabular-nums ${
                h > a ? winColor : h === 0 ? "text-muted-foreground/40" : "text-foreground"
              }`}
            >
              {h}
            </span>
            <span className="text-center text-[11px] font-bold text-muted-foreground">{label}</span>
            <span
              className={`text-xl font-extrabold tabular-nums text-right ${
                a > h ? winColor : a === 0 ? "text-muted-foreground/40" : "text-foreground"
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
    <div className="bg-card border-2 border-border rounded-sm overflow-hidden shadow-brutalist-navy">
      <div className="bg-pitch-green px-4 py-3 border-b-2 border-navy">
        <p className="text-white font-[family-name:var(--font-lexend)] text-sm font-bold">Performance Stats</p>
      </div>

      <div className="grid grid-cols-3 px-4 py-1.5 bg-muted/40 border-b border-border text-[10px] font-extrabold tracking-widest text-muted-foreground uppercase">
        <span>{homeShort}</span>
        <span className="text-center">STAT</span>
        <span className="text-right">{awayShort}</span>
      </div>

      {STAT_GROUPS.map((group) => {
        const visibleStats = group.stats.filter((s) => s in performanceStats);
        if (visibleStats.length === 0) return null;
        return (
          <div key={group.label}>
            <div className="px-4 py-1.5 bg-muted/50 border-b border-border border-t border-border">
              <span className="text-[9px] font-extrabold tracking-widest text-muted-foreground uppercase">
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
                  className="grid grid-cols-3 items-center px-4 py-2 border-b border-border last:border-0"
                >
                  <span
                    className={`text-base font-extrabold tabular-nums ${
                      home > away ? "text-pitch-green" : home === 0 ? "text-muted-foreground/40" : "text-foreground"
                    }`}
                  >
                    {displayHome}
                  </span>
                  <span className="text-center text-[10px] text-muted-foreground leading-tight px-1">
                    {config?.full ?? stat}
                  </span>
                  <span
                    className={`text-base font-extrabold tabular-nums text-right ${
                      away > home ? "text-pitch-green" : away === 0 ? "text-muted-foreground/40" : "text-foreground"
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
    <div className="bg-card border-2 border-border rounded-sm overflow-hidden shadow-brutalist-navy border-t-4 border-t-fair-play-gold">
      <div className="bg-pitch-green px-4 py-3 border-b-2 border-navy flex items-center gap-2">
        <Star className="h-3.5 w-3.5 text-fair-play-gold" />
        <p className="text-white font-[family-name:var(--font-lexend)] text-sm font-bold">Player Spotlight</p>
      </div>

      {!hasContent ? (
        <div className="px-4 py-6 text-center">
          <p className="text-sm text-muted-foreground italic">No events recorded yet</p>
        </div>
      ) : (
        <div className="divide-y divide-border">

          {/* Top Scorer */}
          {topScorer && (
            <div className="p-4 flex items-start gap-3">
              <div className="w-8 h-8 rounded-sm bg-fair-play-gold/20 border border-fair-play-gold/30 flex items-center justify-center shrink-0">
                <Star className="h-4 w-4 text-fair-play-gold" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[9px] font-extrabold tracking-widest text-muted-foreground uppercase mb-0.5">
                  Top Scorer
                </p>
                <p className="text-base font-extrabold truncate text-foreground">{topScorer.name}</p>
                <p className="text-xs text-pitch-green font-bold mt-0.5">{topScorer.points} pts</p>
              </div>
            </div>
          )}

          {/* Top Try Scorer */}
          {topTryScorer && topTryScorer.playerId !== topScorer?.playerId && (
            <div className="p-4 flex items-start gap-3">
              <div className="w-8 h-8 rounded-sm bg-pitch-green/10 border border-pitch-green/20 flex items-center justify-center shrink-0">
                <Zap className="h-4 w-4 text-pitch-green" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[9px] font-extrabold tracking-widest text-muted-foreground uppercase mb-0.5">
                  Top Try Scorer
                </p>
                <p className="text-base font-extrabold truncate text-foreground">{topTryScorer.name}</p>
                <p className="text-xs text-pitch-green font-bold mt-0.5">
                  {topTryScorer.tries} {topTryScorer.tries === 1 ? "try" : "tries"}
                </p>
              </div>
            </div>
          )}

          {/* Cards */}
          {cardedPlayers.length > 0 && (
            <div className="p-4">
              <p className="text-[9px] font-extrabold tracking-widest text-muted-foreground uppercase mb-2">
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
                    <span className="font-semibold flex-1 truncate text-foreground">{c.name}</span>
                    {c.minute != null && (
                      <span className="text-muted-foreground text-xs tabular-nums shrink-0">{c.minute}&apos;</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* All Scorers */}
          {scorerEntries.length > 0 && (
            <div className="p-4">
              <p className="text-[9px] font-extrabold tracking-widest text-muted-foreground uppercase mb-2">
                All Scorers
              </p>
              <ul className="space-y-2">
                {scorerEntries.map(([pid, stat], idx) => (
                  <li key={pid} className="flex items-center gap-2.5 text-sm">
                    <span className="text-[10px] font-extrabold text-muted-foreground/60 w-4 shrink-0 tabular-nums">
                      {idx + 1}.
                    </span>
                    <span className="font-semibold flex-1 truncate text-foreground">{stat.name}</span>
                    <span className="text-muted-foreground text-[10px] shrink-0 ml-1 tabular-nums">
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
