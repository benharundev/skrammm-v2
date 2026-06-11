import { requireAuth } from "@lib/auth/server";
import { getManagerTeam } from "@modules/team";
import { computeTeamRrs, getRrsV2WarningLevel } from "@modules/reliability";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { UserPlus, ChevronRight, User } from "lucide-react";
import type { Route } from "next";

const FITNESS_BADGE: Record<string, string> = {
  fit:      "bg-primary text-white",
  doubtful: "bg-accent text-primary",
  out:      "bg-destructive text-white",
};

function scorePillClass(score: number): string {
  const level = getRrsV2WarningLevel(score);
  if (level === "green") return "bg-pitch-green/10 text-pitch-green";
  if (level === "yellow") return "bg-accent/20 text-foreground";
  return "bg-destructive/10 text-destructive";
}

export default async function SquadPage() {
  const session = await requireAuth();
  const dbTeam = await getManagerTeam(session.user.id);
  const isMock = !dbTeam;
  const players = dbTeam?.players ?? [];
  const usingRealPlayers = !!players.length;

  const unclaimed = players.filter((p) => p.claimStatus === "unclaimed");
  const claimed   = players.filter((p) => p.claimStatus === "claimed");

  // Fetch RRS v2 career scores only when there are claimed players to display (mock IDs are not valid UUIDs)
  const scoreMap = new Map<string, number>();
  if (usingRealPlayers && dbTeam && claimed.length > 0) {
    const teamRrs = await computeTeamRrs(dbTeam.id);
    for (const p of teamRrs.playerBreakdown) {
      scoreMap.set(p.playerId, p.rrsCareer);
    }
  }

  return (
    <div className="max-w-2xl space-y-6 p-4 md:p-8">
      {isMock && (
        <div className="rounded-sm border border-accent/30 bg-accent/10 px-3 py-2 text-xs text-muted-foreground">
          Showing sample squad — create your club to manage real players.
        </div>
      )}

      <header className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="font-[family-name:var(--font-lexend)] text-2xl font-extrabold tracking-tight text-foreground">Squad</h1>
          <p className="text-sm text-muted-foreground">{claimed.length} claimed · {unclaimed.length} unclaimed</p>
        </div>
        {dbTeam && (
          <Button asChild size="sm" className="shrink-0 bg-primary text-primary-foreground shadow-brutalist-sm">
            <Link href={"/tm/squad/add" as Route}>
              <UserPlus className="mr-1.5 h-4 w-4" />
              Add Player
            </Link>
          </Button>
        )}
      </header>

      {unclaimed.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-[family-name:var(--font-lexend)] text-sm font-bold uppercase tracking-widest text-muted-foreground">
            Unclaimed ({unclaimed.length})
          </h2>
          {unclaimed.map((player) => (
            <div key={player.id} className="flex items-center gap-3 rounded-sm border-2 border-dashed border-border bg-card p-3 shadow-brutalist-sm">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm bg-muted">
                <User className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-foreground">{player.fullName}</p>
                <p className="font-mono text-xs text-muted-foreground">{player.playerIdCode}</p>
              </div>
              {player.jerseyNumber !== null && (
                <span className="shrink-0 font-mono text-sm font-bold text-accent">#{player.jerseyNumber}</span>
              )}
            </div>
          ))}
        </section>
      )}

      <section className="space-y-2">
        <h2 className="font-[family-name:var(--font-lexend)] text-sm font-bold uppercase tracking-widest text-muted-foreground">
          {claimed.length > 0 ? `Active (${claimed.length})` : "No active players yet"}
        </h2>
        {claimed.length === 0 && unclaimed.length === 0 && (
          <div className="rounded-sm border-2 border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Add players to build your squad.
          </div>
        )}
        {claimed.map((player) => {
          const reliabilityScore = scoreMap.get(player.id);
          return (
            <div key={player.id} className="flex items-center gap-3 rounded-sm border-2 border-border bg-card p-3 shadow-brutalist">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm bg-primary text-white">
                <User className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-foreground">{player.fullName}</p>
                <p className="text-xs text-muted-foreground">
                  {player.position ?? "No position"}{player.jerseyNumber !== null ? ` · #${player.jerseyNumber}` : ""}
                </p>
              </div>
              {player.medicalProfile?.fitnessStatus && (
                <Badge className={FITNESS_BADGE[player.medicalProfile.fitnessStatus] ?? "bg-muted"}>
                  {player.medicalProfile.fitnessStatus}
                </Badge>
              )}
              {reliabilityScore !== undefined && (
                <span className={`font-mono text-xs font-bold px-1.5 py-0.5 rounded-sm ${scorePillClass(reliabilityScore)}`}>
                  {Math.round(reliabilityScore)}
                </span>
              )}
              {dbTeam && (
                <Link href={`/tm/squad/${player.id}` as Route}>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              )}
            </div>
          );
        })}
      </section>
    </div>
  );
}
