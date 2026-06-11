import { requireAuth } from "@lib/auth/server";
import { getManagerTeam } from "@modules/team";
import { getUpcomingMatchesForTeam, getPastMatchesForTeam } from "@modules/match";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Users, Trophy, QrCode, ClipboardList, Plus, ChevronRight } from "lucide-react";
import type { Route } from "next";
import { ClubCard } from "./_components/club-card";
import type { PastMatch } from "./_components/club-card";

function fmtDate(d: Date) {
  return new Intl.DateTimeFormat("en-MY", {
    weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  }).format(d);
}

export default async function TMDashboardPage() {
  const session = await requireAuth();
  const dbTeam = await getManagerTeam(session.user.id);

  if (!dbTeam) {
    return (
      <div className="max-w-3xl space-y-6 p-4 md:p-8">
        <header className="space-y-1">
          <h1 className="font-[family-name:var(--font-lexend)] text-2xl font-extrabold tracking-tight text-foreground">
            Manager Portal
          </h1>
          <p className="text-sm text-muted-foreground">Create a club to get started</p>
        </header>
        <div className="flex flex-col items-center gap-3 rounded-sm border-2 border-dashed border-border p-12 text-center">
          <Plus className="h-8 w-8 text-muted-foreground" />
          <p className="font-[family-name:var(--font-lexend)] font-bold text-foreground">No club yet</p>
          <p className="text-sm text-muted-foreground">
            Create your club to manage players, set lineups, and join tournaments.
          </p>
          <Button asChild className="bg-primary text-primary-foreground shadow-brutalist-sm">
            <Link href={"/tm/create-team" as Route}>Create Club</Link>
          </Button>
        </div>
      </div>
    );
  }

  const players = dbTeam.players;
  const tournamentEntries = dbTeam.tournamentEntries;
  const [upcomingMatches, pastMatches]: [Awaited<ReturnType<typeof getUpcomingMatchesForTeam>>, PastMatch[]] =
    await Promise.all([
      getUpcomingMatchesForTeam(dbTeam.id),
      getPastMatchesForTeam(dbTeam.id),
    ]);
  const cardTeamId = dbTeam.id;

  const nextMatch = upcomingMatches[0];
  const isLive = nextMatch?.status === "live";
  const approvedTournaments = tournamentEntries.filter((e) => e.status === "approved");
  const pendingTournaments = tournamentEntries.filter((e) => e.status === "pending_approval");

  const QUICK_LINKS = [
    { label: "Squad",       sub: `${players.length} players`,            href: "/tm/squad",       icon: Users },
    { label: "Tournaments", sub: `${approvedTournaments.length} active`, href: "/tm/tournaments", icon: Trophy },
    { label: "Attendance",  sub: "Scan QR",                              href: "/tm/attendance",  icon: QrCode },
    { label: "Lineups",     sub: "Set lineup",                           href: "/tm/lineups",     icon: ClipboardList },
  ] as const;

  return (
    <div className="max-w-3xl space-y-6 p-4 md:p-8">
      <ClubCard
        name={dbTeam.name}
        origin={dbTeam.origin ?? null}
        playerCount={players.length}
        activeTournamentCount={approvedTournaments.length}
        pastMatches={pastMatches}
        teamId={cardTeamId}
      />

      {nextMatch && (
        <section>
          <h2 className="mb-3 font-[family-name:var(--font-lexend)] text-sm font-bold uppercase tracking-widest text-muted-foreground">
            {isLive ? "Live Now" : "Next Match"}
          </h2>
          <div className={`rounded-sm border-2 bg-card p-4 ${isLive ? "border-red-card shadow-brutalist-red" : "border-border shadow-brutalist"}`}>
            <div className="flex items-center justify-between gap-3">
              <div>
                {isLive && (
                  <span className="mb-1.5 inline-block bg-red-card text-white px-2 py-0.5 rounded-sm animate-pulse text-[10px] font-bold tracking-[0.1em]">● LIVE</span>
                )}
                <p className="font-[family-name:var(--font-lexend)] font-bold text-foreground">
                  {nextMatch.homeTeam.name} vs {nextMatch.awayTeam.name}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">{nextMatch.tournament.name}</p>
                {isLive ? (
                  <p className="mt-0.5 font-[family-name:var(--font-lexend)] text-lg font-extrabold tabular-nums text-red-card">
                    {nextMatch.homeScore} – {nextMatch.awayScore}
                  </p>
                ) : (
                  <p className="mt-0.5 text-xs text-muted-foreground">{fmtDate(nextMatch.scheduledAt)}</p>
                )}
              </div>
              {!isLive && (
                <Link href={"/tm/lineups" as Route} className="shrink-0 rounded-sm border-2 border-border bg-accent px-3 py-1.5 text-xs font-bold text-primary shadow-brutalist-sm">
                  Set Lineup
                </Link>
              )}
            </div>
          </div>
        </section>
      )}

      {pendingTournaments.length > 0 && (
        <div className="rounded-sm border-2 border-accent/40 bg-accent/10 p-3 text-sm text-foreground">
          <span className="font-semibold">{pendingTournaments.length} tournament{pendingTournaments.length !== 1 ? "s" : ""} pending approval</span>
          <span className="text-muted-foreground"> — waiting for organizer.</span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        {QUICK_LINKS.map(({ label, sub, href, icon: Icon }) => (
          <Link key={href} href={href as Route} className="flex items-center gap-3 rounded-sm border-2 border-border bg-card p-4 shadow-brutalist transition-shadow hover:shadow-brutalist-lg">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm bg-primary text-white">
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">{label}</p>
              <p className="text-xs text-muted-foreground">{sub}</p>
            </div>
            <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-muted-foreground" />
          </Link>
        ))}
      </div>
    </div>
  );
}
