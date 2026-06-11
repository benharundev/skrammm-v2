import { requireAuth } from "@lib/auth/server";
import { getManagerTeam } from "@modules/team";
import { getPastMatchesForTeam } from "@modules/match";
import { Badge } from "@/components/ui/badge";
import { Trophy } from "lucide-react";
import { JoinTournamentForm } from "./_components/join-form";
import { FormStrip } from "./_components/form-strip";

const STATUS_BADGE: Record<string, string> = {
  approved:         "bg-primary text-white",
  pending_approval: "bg-accent/20 text-foreground",
  rejected:         "bg-destructive text-white",
  withdrawn:        "bg-muted text-muted-foreground",
};

const STATUS_LABEL: Record<string, string> = {
  approved:         "Approved",
  pending_approval: "Pending",
  rejected:         "Rejected",
  withdrawn:        "Withdrawn",
};

function fmt(d: Date) {
  return new Intl.DateTimeFormat("en-MY", { day: "numeric", month: "short", year: "numeric" }).format(d);
}

export default async function TournamentsPage() {
  const session = await requireAuth();
  const dbTeam = await getManagerTeam(session.user.id);
  const isMock = !dbTeam;
  const entries = dbTeam?.tournamentEntries ?? [];

  const pastMatches = dbTeam ? await getPastMatchesForTeam(dbTeam.id) : [];

  const stats = pastMatches.reduce((acc, m) => {
    acc.total++;
    const isHome = m.homeTeamId === dbTeam?.id;
    const teamScore = isHome ? m.homeScore : m.awayScore;
    const oppScore = isHome ? m.awayScore : m.homeScore;
    if (teamScore > oppScore) acc.w++;
    else if (teamScore < oppScore) acc.l++;
    else acc.d++;
    return acc;
  }, { total: 0, w: 0, d: 0, l: 0 });

  return (
    <div className="max-w-2xl space-y-6 p-4 md:p-8">
      {isMock && (
        <div className="rounded-sm border border-accent/30 bg-accent/10 px-3 py-2 text-xs text-muted-foreground">
          Showing sample tournaments — create your club to join real ones.
        </div>
      )}

      <header className="space-y-1">
        <h1 className="font-[family-name:var(--font-lexend)] text-2xl font-extrabold tracking-tight text-foreground">Tournaments</h1>
      </header>

      {dbTeam && <JoinTournamentForm />}

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Played", value: stats.total },
          { label: "W/D/L",  value: `${stats.w}-${stats.d}-${stats.l}` },
          { label: "Win Rate", value: stats.total ? `${Math.round((stats.w / stats.total) * 100)}%` : "0%" },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-sm border-2 border-border bg-card p-3 shadow-brutalist-navy-sm text-center">
            <p className="font-[family-name:var(--font-lexend)] text-xl font-black text-pitch-green">{value}</p>
            <p className="text-[9px] uppercase font-bold text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      {dbTeam && <FormStrip matches={pastMatches} teamId={dbTeam.id} />}

      <section className="space-y-3">
        <h2 className="font-[family-name:var(--font-lexend)] text-sm font-bold uppercase tracking-widest text-muted-foreground">Match History</h2>
        <div className="rounded-sm border-2 border-border bg-card overflow-hidden shadow-brutalist-navy-sm">
          {pastMatches.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">No past matches recorded yet.</p>
          ) : (
            <div className="divide-y divide-border">
              {pastMatches.map((m) => {
                const isHome = m.homeTeamId === dbTeam?.id;
                const won = isHome ? m.homeScore > m.awayScore : m.awayScore > m.homeScore;
                const draw = m.homeScore === m.awayScore;
                return (
                  <div key={m.id} className="flex items-center gap-4 p-3 text-sm">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${won ? "bg-pitch-green text-white" : draw ? "bg-muted text-muted-foreground" : "bg-red-card text-white"}`}>
                      {won ? "W" : draw ? "D" : "L"}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold truncate text-foreground">{isHome ? m.awayTeam.name : m.homeTeam.name}</p>
                      <p className="text-[10px] text-muted-foreground">{m.tournament.name}</p>
                    </div>
                    <p className="font-[family-name:var(--font-lexend)] font-black tabular-nums">{m.homeScore} - {m.awayScore}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-[family-name:var(--font-lexend)] text-sm font-bold uppercase tracking-widest text-muted-foreground">Your Tournaments</h2>
        {entries.length === 0 ? (
          <div className="rounded-sm border-2 border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            No tournaments yet. Enter a code above to join one.
          </div>
        ) : (
          entries.map((entry) => (
            <div key={entry.id} className="rounded-sm border-2 border-border bg-card p-4 shadow-brutalist">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm bg-primary text-white">
                    <Trophy className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-[family-name:var(--font-lexend)] font-bold text-foreground">{entry.tournament.name}</p>
                    <p className="font-mono text-xs text-muted-foreground">{entry.tournament.code}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {fmt(entry.tournament.startsAt)} – {fmt(entry.tournament.endsAt)}
                    </p>
                  </div>
                </div>
                <Badge className={STATUS_BADGE[entry.status] ?? "bg-muted"}>{STATUS_LABEL[entry.status] ?? entry.status}</Badge>
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
