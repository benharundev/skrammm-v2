import { requireAuth } from "@lib/auth/server";
import { getManagerTeam } from "@modules/team";
import { getUpcomingMatchesForTeam } from "@modules/match";
import { saveLineupAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Users } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";

function fmtDate(d: Date) {
  return new Intl.DateTimeFormat("en-MY", {
    weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  }).format(d);
}

export default async function LineupsPage({
  searchParams,
}: {
  searchParams: Promise<{ matchId?: string }>;
}) {
  const { matchId } = await searchParams;

  const session = await requireAuth();
  const dbTeam = await getManagerTeam(session.user.id);
  const upcomingMatches = dbTeam ? await getUpcomingMatchesForTeam(dbTeam.id) : [];
  const canSaveLineup = !!dbTeam && upcomingMatches.length > 0;
  const players = dbTeam?.players ?? [];

  const activeMatch = upcomingMatches.find(m => m.id === matchId) ?? upcomingMatches[0];

  const currentLineup = activeMatch?.lineups ?? [];

  // Matches after the active one (queue)
  const queueMatches = activeMatch
    ? upcomingMatches.filter(m => m.id !== activeMatch.id)
    : upcomingMatches.slice(1);

  return (
    <div className="max-w-2xl space-y-6 p-4 md:p-8">
      <header className="space-y-1">
        <h1 className="font-[family-name:var(--font-lexend)] text-2xl font-extrabold tracking-tight text-foreground">Lineups</h1>
        <p className="text-sm text-muted-foreground">Select players for upcoming matches</p>
      </header>

      {!activeMatch ? (
        <div className="rounded-sm border-2 border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No upcoming matches. Lineups appear here once fixtures are scheduled.
        </div>
      ) : (
        <>
          <section className="overflow-hidden rounded-sm border-2 border-border bg-card shadow-brutalist">
            {/* Active match header */}
            <div className="flex items-center gap-3 border-b border-border p-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm bg-primary text-white">
                <Users className="h-4 w-4" />
              </div>
              <div>
                <p className="font-[family-name:var(--font-lexend)] font-bold text-foreground">
                  {activeMatch.homeTeam.name} vs {activeMatch.awayTeam.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {activeMatch.tournament.name} · {fmtDate(activeMatch.scheduledAt)}
                </p>
              </div>
            </div>

            <form action={canSaveLineup ? saveLineupAction : undefined} className="space-y-5 p-4">
              {canSaveLineup && <input type="hidden" name="matchId" value={activeMatch.id} />}

              {/* Player list */}
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  {currentLineup.length} selected
                </p>
                {players.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No players in squad.</p>
                ) : (
                  <div className="space-y-2">
                    {players.map((player) => (
                      <label
                        key={player.id}
                        className="flex cursor-pointer items-center gap-3 rounded-sm border-2 border-border p-3 transition-colors hover:bg-muted/50"
                      >
                        <input
                          type="checkbox"
                          name="starters"
                          value={player.id}
                          defaultChecked={currentLineup.some(l => l.playerId === player.id)}
                          disabled={!canSaveLineup}
                          className="h-4 w-4 rounded border-border"
                        />
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                          {player.jerseyNumber !== null && (
                            <span className="w-6 shrink-0 text-right font-mono text-sm font-bold text-accent">#{player.jerseyNumber}</span>
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground">{player.fullName}</p>
                            {player.position && <p className="text-xs text-muted-foreground">{player.position}</p>}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <Button type="submit" className="w-full bg-primary text-primary-foreground shadow-brutalist-sm" disabled={!canSaveLineup}>
                Confirm Lineup
              </Button>
            </form>
          </section>

          {/* Match queue */}
          {queueMatches.length > 0 && (
            <section className="space-y-3">
              <h2 className="font-[family-name:var(--font-lexend)] text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Upcoming ({queueMatches.length})
              </h2>
              <div className="space-y-2">
                {queueMatches.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between gap-3 rounded-sm border-2 border-border bg-card p-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {m.homeTeam.name} vs {m.awayTeam.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {m.tournament.name} · {fmtDate(m.scheduledAt)}
                      </p>
                    </div>
                    <Link
                      href={`/tm/lineups?matchId=${m.id}` as Route}
                      className="shrink-0 text-xs font-semibold text-accent hover:underline"
                    >
                      Set →
                    </Link>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
