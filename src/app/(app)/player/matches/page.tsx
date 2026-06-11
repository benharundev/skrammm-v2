import { requireAuth } from "@lib/auth/server";
import {
  getClaimedPlayerForUser,
  getPlayerTournamentHistory,
  getPlayerStats,
  type PlayerStats,
} from "@modules/player";
import { TriesBarChart } from "../_components/stats-charts";
import { TournamentShareButton } from "../_components/tournament-share-button";
import { Badge } from "@/components/ui/badge";
import { Trophy, Calendar, Hash } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";

function fmt(d: Date) {
  return new Intl.DateTimeFormat("en-MY", {
    month: "short",
    year: "numeric",
  }).format(d);
}

const STATUS_BADGE: Record<string, string> = {
  completed: "bg-primary text-white",
  live: "bg-destructive text-white",
  draft: "bg-secondary text-white",
  paid: "bg-secondary text-white",
  cancelled: "bg-muted text-muted-foreground",
};

const STATUS_LABEL: Record<string, string> = {
  completed: "Completed",
  live: "Live",
  draft: "Upcoming",
  paid: "Upcoming",
  cancelled: "Cancelled",
};

export default async function MatchesPage() {
  const session = await requireAuth();
  const dbPlayer = await getClaimedPlayerForUser(session.user.id);
  const EMPTY_STATS: PlayerStats = {
    matchesPlayed: 0, tries: 0, conversions: 0, penalties: 0,
    dropGoals: 0, yellowCards: 0, redCards: 0, startersCount: 0,
  };

  const [history, stats] = dbPlayer
    ? await Promise.all([
        getPlayerTournamentHistory(dbPlayer.id),
        getPlayerStats(dbPlayer.id),
      ])
    : [[], EMPTY_STATS];

  const chartData = history.map((item, i) => ({
    label: item.tournament.name.slice(0, 10),
    tries: i + 1,
  }));

  const playerName = dbPlayer?.fullName ?? "";

  return (
    <div className="max-w-2xl space-y-6 p-4 md:p-8">
      <header className="space-y-1">
        <h1 className="font-[family-name:var(--font-lexend)] text-2xl font-extrabold tracking-tight text-foreground">
          Match Statistics
        </h1>
        <p className="text-sm text-muted-foreground">
          Played in {history.length} tournament{history.length !== 1 ? "s" : ""} ·{" "}
          {stats.matchesPlayed} matches
        </p>
      </header>

      {/* Stat pills */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Tournaments", value: history.length },
          { label: "Matches", value: stats.matchesPlayed },
          { label: "Starting XV", value: stats.startersCount },
        ].map(({ label, value }) => (
          <div
            key={label}
            className="rounded-sm border-2 border-border bg-card p-3 shadow-brutalist text-center"
          >
            <p className="font-[family-name:var(--font-lexend)] text-xl font-black text-foreground">
              {value}
            </p>
            <p className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
              {label}
            </p>
          </div>
        ))}
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <section>
          <h2 className="mb-3 font-[family-name:var(--font-lexend)] text-sm font-bold uppercase tracking-widest text-muted-foreground">
            Tournaments Played
          </h2>
          <div className="rounded-sm border-2 border-border bg-card p-4 shadow-brutalist">
            <TriesBarChart data={chartData} />
          </div>
        </section>
      )}

      {/* Tournament history feed */}
      <section className="space-y-3">
        <h2 className="font-[family-name:var(--font-lexend)] text-sm font-bold uppercase tracking-widest text-muted-foreground">
          Tournament History
        </h2>
        {history.length === 0 ? (
          <div className="rounded-sm border-2 border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            No tournaments yet. Join a team to start competing.
          </div>
        ) : (
          history.map((item) => (
            <div
              key={item.tournament.id}
              className="relative block overflow-hidden rounded-sm border-2 border-border bg-card shadow-brutalist transition-shadow hover:shadow-brutalist-lg"
            >
            <Link
              href={`/player/tournaments/${item.tournament.id}` as Route}
              className="block p-4"
            >
              <div className="flex items-start justify-between gap-3 pr-9">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm bg-primary text-white">
                    <Trophy className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-[family-name:var(--font-lexend)] font-bold text-foreground">
                      {item.tournament.name}
                    </p>
                    {item.teamName && (
                      <p className="text-xs text-muted-foreground">
                        {item.teamName}
                      </p>
                    )}
                    <div className="mt-1 flex items-center gap-2">
                      <Calendar className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {fmt(item.tournament.startsAt)}
                      </span>
                      <Hash className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {item.matchCount}{" "}
                        {item.matchCount === 1 ? "match" : "matches"}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Badge
                    className={
                      STATUS_BADGE[item.tournament.status] ??
                      "bg-muted text-muted-foreground"
                    }
                  >
                    {STATUS_LABEL[item.tournament.status] ??
                      item.tournament.status}
                  </Badge>
                </div>
              </div>
            </Link>
            <TournamentShareButton
              tournamentId={item.tournament.id}
              tournamentName={item.tournament.name}
              playerName={playerName}
            />
            </div>
          ))
        )}
      </section>
    </div>
  );
}
