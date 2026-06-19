"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import type { Route } from "next";
import { ArrowLeft, MapPin, User, Wifi, WifiOff, Star, Zap } from "lucide-react";
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
      <header className="border-b border-white/10 px-4 py-3 flex items-center justify-between">
        <Link
          href={`/organizer/match/${match.id}` as Route}
          className="flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Match Center
        </Link>
        <span className="text-xs font-extrabold tracking-widest text-white/40 uppercase">
          Commentator View
        </span>
        <div className="flex items-center gap-1.5 text-xs">
          {connected ? (
            <>
              <Wifi className="h-3.5 w-3.5 text-pitch-green" />
              <span className="text-pitch-green font-bold">LIVE</span>
            </>
          ) : (
            <>
              <WifiOff className="h-3.5 w-3.5 text-red-400" />
              <span className="text-red-400">RECONNECTING</span>
            </>
          )}
        </div>
      </header>

      <section className="bg-navy border-b-2 border-pitch-green px-6 py-8">
        <p className="text-center text-xs font-extrabold tracking-widest text-white/50 mb-1 uppercase">
          {match.tournament.name}
          {match.groupLabel ? ` · ${match.groupLabel}` : ""}
        </p>
        <div className="flex items-center justify-between max-w-2xl mx-auto gap-4">
          <div className="flex-1 text-center">
            <p className="text-2xl font-extrabold tracking-tight leading-none">{match.homeTeam.name}</p>
            <p className="text-xs text-white/40 mt-1 uppercase tracking-widest">Home</p>
          </div>
          <div className="text-center">
            <div className="flex items-center gap-3">
              <span className="text-6xl font-extrabold tabular-nums">{homeScore}</span>
              <span className="text-3xl font-bold text-white/30">–</span>
              <span className="text-6xl font-extrabold tabular-nums">{awayScore}</span>
            </div>
            <div className="mt-2 flex justify-center">
              <span
                className={`inline-block px-3 py-1 text-xs font-extrabold tracking-widest rounded-full ${
                  isLive ? "bg-pitch-green text-white animate-pulse" : "bg-white/10 text-white/60"
                }`}
              >
                {STATUS_LABEL[status] ?? status.toUpperCase()}
              </span>
            </div>
          </div>
          <div className="flex-1 text-center">
            <p className="text-2xl font-extrabold tracking-tight leading-none">{match.awayTeam.name}</p>
            <p className="text-xs text-white/40 mt-1 uppercase tracking-widest">Away</p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap justify-center gap-x-6 gap-y-1 text-xs text-white/50">
          {match.pitch && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {match.pitch}
            </span>
          )}
          {match.refereeName && (
            <span className="flex items-center gap-1">
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

      <div className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <LineupPanel
          team={match.homeTeam}
          side="home"
          playerPoints={stats.playerPoints}
          cardedPlayers={stats.cardedPlayers}
          topScorer={stats.topScorer}
          topTryScorer={stats.topTryScorer}
        />
        <div className="space-y-4">
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
        <div className="space-y-4">
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
    <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
      <div className="px-4 py-3 bg-white/5 border-b border-white/10">
        <p className="text-xs font-extrabold tracking-widest text-white/50 uppercase">
          {side === "home" ? "Home" : "Away"} · {team.name}
        </p>
      </div>
      <ul className="divide-y divide-white/5">
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
              className={`flex items-center gap-3 px-4 py-2 ${
                isTopScorer
                  ? "bg-pitch-green/10"
                  : carded
                  ? "bg-fair-play-gold/10"
                  : ""
              }`}
            >
              <span className="w-6 text-center text-xs font-bold text-white/30 shrink-0">
                {player.jerseyNumber ?? "–"}
              </span>
              <span className="flex-1 text-sm font-semibold truncate">
                {player.fullName}
                {player.position ? (
                  <span className="ml-1 text-xs text-white/30">{player.position}</span>
                ) : null}
              </span>
              <div className="flex items-center gap-1 shrink-0">
                {isTopScorer && <Star className="h-3 w-3 text-fair-play-gold" />}
                {isTopTry && !isTopScorer && <Zap className="h-3 w-3 text-pitch-green" />}
                {stat && stat.tries > 0 && (
                  <span className="text-xs font-bold text-pitch-green">T×{stat.tries}</span>
                )}
                {carded && (
                  <span
                    className={`w-3 h-4 rounded-sm inline-block ${
                      redCarded ? "bg-red-500" : "bg-fair-play-gold"
                    }`}
                  />
                )}
                {stat && stat.points > 0 && (
                  <span className="text-xs text-white/50 ml-1">{stat.points}pts</span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

const BREAKDOWN_ROWS: { key: keyof ScoringCounts; label: string }[] = [
  { key: "try", label: "Tries" },
  { key: "conversion", label: "Conversions" },
  { key: "penalty", label: "Penalties" },
  { key: "drop_goal", label: "Drop Goals" },
  { key: "yellow_card", label: "Yellow Cards" },
  { key: "red_card", label: "Red Cards" },
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
  return (
    <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
      <div className="grid grid-cols-3 px-4 py-2 bg-white/5 border-b border-white/10 text-xs font-extrabold tracking-widest text-white/40 uppercase">
        <span className="truncate">{homeTeamName}</span>
        <span className="text-center">EVENT</span>
        <span className="text-right truncate">{awayTeamName}</span>
      </div>
      {BREAKDOWN_ROWS.map(({ key, label }) => {
        const h = home[key];
        const a = away[key];
        return (
          <div
            key={key}
            className="grid grid-cols-3 items-center px-4 py-2 border-b border-white/5 last:border-0"
          >
            <span
              className={`text-lg font-extrabold tabular-nums ${
                h > a ? "text-pitch-green" : "text-white/50"
              }`}
            >
              {h}
            </span>
            <span className="text-center text-xs text-white/40 uppercase tracking-wide">
              {label}
            </span>
            <span
              className={`text-lg font-extrabold tabular-nums text-right ${
                a > h ? "text-pitch-green" : "text-white/50"
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

  return (
    <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
      <div className="grid grid-cols-3 px-4 py-2 bg-white/5 border-b border-white/10 text-xs font-extrabold tracking-widest text-white/40 uppercase">
        <span className="truncate">{homeTeamName}</span>
        <span className="text-center">STAT</span>
        <span className="text-right truncate">{awayTeamName}</span>
      </div>
      {STAT_GROUPS.map((group) => {
        const visibleStats = group.stats.filter((s) => s in performanceStats);
        if (visibleStats.length === 0) return null;
        return (
          <div key={group.label}>
            <div className="px-4 py-1 bg-white/[0.03] border-b border-white/5">
              <span className="text-[10px] font-extrabold tracking-widest text-white/30 uppercase">
                {group.label}
              </span>
            </div>
            {visibleStats.map((stat) => {
              const counts = performanceStats[stat];
              if (!counts) return null;
              const { home, away } = counts;
              const config = STAT_CONFIG[stat];
              return (
                <div
                  key={stat}
                  className="grid grid-cols-3 items-center px-4 py-2 border-b border-white/5 last:border-0"
                >
                  <span
                    className={`text-base font-extrabold tabular-nums ${
                      home > away ? "text-pitch-green" : "text-white/50"
                    }`}
                  >
                    {config?.displayMode === "metres" ? `${home}m` : home}
                  </span>
                  <span className="text-center text-xs text-white/40 uppercase tracking-wide">
                    {config?.label ?? stat}
                  </span>
                  <span
                    className={`text-base font-extrabold tabular-nums text-right ${
                      away > home ? "text-pitch-green" : "text-white/50"
                    }`}
                  >
                    {config?.displayMode === "metres" ? `${away}m` : away}
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
  return (
    <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
      <div className="px-4 py-3 bg-white/5 border-b border-white/10">
        <p className="text-xs font-extrabold tracking-widest text-white/50 uppercase">
          Player Spotlight
        </p>
      </div>
      <div className="p-4 space-y-4">
        {topScorer && (
          <div className="flex items-center gap-3">
            <Star className="h-5 w-5 text-fair-play-gold shrink-0" />
            <div>
              <p className="text-[10px] font-bold tracking-widest text-white/40 uppercase">
                Top Scorer
              </p>
              <p className="text-sm font-extrabold">{topScorer.name}</p>
              <p className="text-xs text-pitch-green font-bold">{topScorer.points} pts</p>
            </div>
          </div>
        )}
        {topTryScorer && topTryScorer.playerId !== topScorer?.playerId && (
          <div className="flex items-center gap-3">
            <Zap className="h-5 w-5 text-pitch-green shrink-0" />
            <div>
              <p className="text-[10px] font-bold tracking-widest text-white/40 uppercase">
                Top Try Scorer
              </p>
              <p className="text-sm font-extrabold">{topTryScorer.name}</p>
              <p className="text-xs text-pitch-green font-bold">
                {topTryScorer.tries} {topTryScorer.tries === 1 ? "try" : "tries"}
              </p>
            </div>
          </div>
        )}
        {cardedPlayers.length > 0 && (
          <div>
            <p className="text-[10px] font-bold tracking-widest text-white/40 uppercase mb-2">
              Cards
            </p>
            <ul className="space-y-1">
              {cardedPlayers.map((c, i) => (
                <li key={i} className="flex items-center gap-2 text-sm">
                  <span
                    className={`w-2.5 h-3.5 rounded-sm shrink-0 ${
                      c.cardType === "red_card" ? "bg-red-500" : "bg-fair-play-gold"
                    }`}
                  />
                  <span className="font-semibold">{c.name}</span>
                  {c.minute != null && (
                    <span className="text-white/40 text-xs">{c.minute}&apos;</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
        {scorerEntries.length > 0 && (
          <div>
            <p className="text-[10px] font-bold tracking-widest text-white/40 uppercase mb-2">
              All Scorers
            </p>
            <ul className="space-y-1">
              {scorerEntries.map(([pid, stat]) => (
                <li key={pid} className="flex items-center justify-between text-sm">
                  <span className="font-semibold truncate">{stat.name}</span>
                  <span className="text-white/50 text-xs shrink-0 ml-2">
                    {[
                      stat.tries > 0 && `T×${stat.tries}`,
                      stat.conversions > 0 && `C×${stat.conversions}`,
                      stat.penalties > 0 && `P×${stat.penalties}`,
                      stat.drop_goals > 0 && `DG×${stat.drop_goals}`,
                    ]
                      .filter(Boolean)
                      .join(" ")}{" "}
                    · {stat.points}pts
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {!topScorer && cardedPlayers.length === 0 && scorerEntries.length === 0 && (
          <p className="text-sm text-white/30 text-center py-2">No events recorded yet</p>
        )}
      </div>
    </div>
  );
}
