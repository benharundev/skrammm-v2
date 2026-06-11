import { requireAuth } from "@lib/auth/server";
import { getClaimedPlayerForUser, getPlayerStats } from "@modules/player";
import { computeRrsV2 } from "@modules/reliability";
import { getUpcomingMatchesForTeam } from "@modules/match";
import { PlayerCard } from "./_components/player-card";
import { ShareButton } from "./_components/share-button";
import { ReliabilityLineChart } from "./_components/stats-charts";
import Link from "next/link";
import { Activity, Users, ChevronRight, Calendar, Radio, TrendingUp, Minus, TrendingDown } from "lucide-react";
import type { Route } from "next";

function fmtDate(d: Date) {
  return new Intl.DateTimeFormat("en-MY", {
    weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  }).format(d);
}

const FORM_ICON = {
  "Ascending Form":  TrendingUp,
  "Stable Form":     Minus,
  "Slumping Form":   TrendingDown,
} as const;

const FORM_COLOR = {
  "Ascending Form":  "text-pitch-green",
  "Stable Form":     "text-muted-foreground",
  "Slumping Form":   "text-destructive",
} as const;

export default async function PlayerHomePage() {
  const session = await requireAuth();
  const dbPlayer = await getClaimedPlayerForUser(session.user.id);

  if (!dbPlayer) {
    return (
      <div className="max-w-2xl space-y-6 p-4 md:p-8">
        <header className="space-y-1">
          <h1 className="font-[family-name:var(--font-lexend)] text-2xl font-extrabold tracking-tight text-foreground">
            Player Portal
          </h1>
          <p className="text-sm text-muted-foreground">Claim your player profile to get started.</p>
        </header>
        <div className="rounded-sm border-2 border-dashed border-border p-12 text-center text-sm text-muted-foreground">
          Go to <Link href={"/player/teams" as Route} className="underline text-foreground font-semibold">Teams</Link> to claim your player ID.
        </div>
      </div>
    );
  }

  const player = dbPlayer;
  const team = dbPlayer.team;

  const [last30Stats, rrsData, upcomingMatches] = await Promise.all([
    getPlayerStats(dbPlayer.id),
    computeRrsV2(dbPlayer.id),
    getUpcomingMatchesForTeam(dbPlayer.team.id),
  ]);

  const nextMatch = upcomingMatches[0] ?? null;
  const isLive = nextMatch?.status === "live";

  const rrsCareer = Math.round(rrsData.careerLevel.rrsCareer);
  const formStatus = rrsData.last30DaysLevel.status;
  const FormIcon = FORM_ICON[formStatus];

  const reliabilityChartData = rrsData.tournamentLevel.map((t, i) => ({
    label: `T${i + 1}`,
    score: Math.round(t.tournamentRating),
  }));

  const STAT_ITEMS = [
    { label: "Matches",   value: last30Stats.matchesPlayed },
    { label: "Tries",     value: last30Stats.tries },
    { label: "Penalties", value: last30Stats.penalties },
    { label: "YC",        value: last30Stats.yellowCards },
  ];

  return (
    <div className="max-w-2xl space-y-6 p-4 md:p-8">
      <PlayerCard
        id="player-card-share-target"
        player={player}
        team={team}
        stats={{
          tries: last30Stats.tries,
          matchesPlayed: last30Stats.matchesPlayed,
          yellowCards: last30Stats.yellowCards,
          redCards: last30Stats.redCards,
        }}
        reliabilityScore={rrsCareer}
        shareAction={
          <ShareButton
            type="last30"
            playerId={player.playerIdCode}
            compact
            className="flex items-center justify-center text-white/30 transition-colors hover:text-accent disabled:opacity-40"
          />
        }
      />
      <section>
        <h2 className="mb-3 font-[family-name:var(--font-lexend)] text-sm font-bold uppercase tracking-widest text-muted-foreground">
          Last 30 Days
        </h2>
        <div className="grid grid-cols-4 gap-2">
          {STAT_ITEMS.map(({ label, value }) => (
            <div key={label} className="rounded-sm border-2 border-border bg-card p-3 shadow-brutalist text-center">
              <p className="font-[family-name:var(--font-lexend)] text-2xl font-black text-foreground">{value}</p>
              <p className="mt-0.5 text-[9px] uppercase tracking-wider text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {reliabilityChartData.length > 1 && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-[family-name:var(--font-lexend)] text-sm font-bold uppercase tracking-widest text-muted-foreground">
              RRS — Reliability Rating Score
            </h2>
            <div className="flex items-center gap-2">
              <FormIcon className={`h-4 w-4 ${FORM_COLOR[formStatus]}`} />
              <span className="font-[family-name:var(--font-lexend)] text-lg font-black text-foreground">
                {rrsCareer}
              </span>
            </div>
          </div>
          <div className="rounded-sm border-2 border-border bg-card p-4 shadow-brutalist">
            <ReliabilityLineChart data={reliabilityChartData} />
          </div>
          <p className={`mt-2 text-right text-xs font-medium ${FORM_COLOR[formStatus]}`}>
            {formStatus}
            {rrsData.last30DaysLevel.lowRecentSample && (
              <span className="ml-1 font-normal text-muted-foreground">*</span>
            )}
          </p>
          {rrsData.last30DaysLevel.lowRecentSample && (
            <p className="mt-1 text-right text-[10px] text-muted-foreground">
              * fewer than 2 recent matches — 30-day trend may not be representative
            </p>
          )}
        </section>
      )}

      {nextMatch && (
        <section>
          <h2 className="mb-3 font-[family-name:var(--font-lexend)] text-sm font-bold uppercase tracking-widest text-muted-foreground">
            {isLive ? "Live Now" : "Next Match"}
          </h2>
          <div className={`rounded-sm border-2 bg-card p-4 ${isLive ? "border-red-card shadow-brutalist-red" : "border-border shadow-brutalist"}`}>
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-sm ${isLive ? "bg-red-card" : "bg-primary"} text-white`}>
                {isLive ? <Radio className="h-5 w-5" /> : <Calendar className="h-5 w-5" />}
              </div>
              <div className="min-w-0 flex-1">
                {isLive && (
                  <span className="mb-1 inline-block bg-red-card text-white px-2 py-0.5 rounded-sm animate-pulse text-[10px] font-bold tracking-[0.1em]">● LIVE</span>
                )}
                <p className="font-[family-name:var(--font-lexend)] font-bold text-foreground">
                  {nextMatch.homeTeam.name} vs {nextMatch.awayTeam.name}
                </p>
                {isLive ? (
                  <p className="font-[family-name:var(--font-lexend)] text-lg font-extrabold tabular-nums text-red-card">
                    {nextMatch.homeScore} – {nextMatch.awayScore}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">{fmtDate(nextMatch.scheduledAt)}</p>
                )}
                <p className="text-xs text-muted-foreground">{nextMatch.tournament.name}</p>
              </div>
            </div>
          </div>
        </section>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Link href={"/player/matches" as Route} className="flex items-center gap-3 rounded-sm border-2 border-border bg-card p-4 shadow-brutalist transition-shadow hover:shadow-brutalist-lg">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm bg-primary text-white">
            <Activity className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">Matches</p>
            <p className="text-xs text-muted-foreground">Career history</p>
          </div>
          <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-muted-foreground" />
        </Link>
        <Link href={"/player/teams" as Route} className="flex items-center gap-3 rounded-sm border-2 border-border bg-card p-4 shadow-brutalist transition-shadow hover:shadow-brutalist-lg">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm bg-primary text-white">
            <Users className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">Teams</p>
            <p className="text-xs text-muted-foreground">{team.name}</p>
          </div>
          <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-muted-foreground" />
        </Link>
      </div>
    </div>
  );
}
