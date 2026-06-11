import { requireOrgAuth } from "@lib/auth/server";
import { getOrganizerWithTeams } from "@modules/tournament";
import { getMatchesByTournament } from "@modules/match";
import { OrganizerDashboard } from "./_client";
import type { Team } from "./_client";

function formatDateRange(start: Date, end: Date): string {
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-MY", { day: "numeric", month: "short" });
  return `${fmt(start)} – ${fmt(end)} ${end.getFullYear()}`;
}

export default async function DashboardPage() {
  const session = await requireOrgAuth();
  const data = await getOrganizerWithTeams(session.user.id);

  if (!data) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8">
        <p className="text-muted-foreground text-sm">No tournament found for your account.</p>
      </div>
    );
  }

  // Map real data to the shapes the dashboard expects.
  const dbMatches = await getMatchesByTournament(data.id);

  const allTeams = data.teams.map((tt): Team => ({
    id: tt.team.id,
    name: tt.team.name,
    shortName: tt.team.name.slice(0, 3).toUpperCase(),
    group: tt.groupLabel ?? "—",
    manager: tt.team.staff[0]?.user.name ?? "—",
    managerEmail: tt.team.staff[0]?.user.email ?? "—",
    origin: tt.team.origin ?? "—",
    rosterCount: tt.team._count.players,
    joinedAt: tt.createdAt.toISOString().slice(0, 10),
    status:
      tt.status === "approved"
        ? "approved"
        : tt.status === "rejected"
          ? "rejected"
          : "pending",
  }));

  const mappedMatches = dbMatches.map(m => ({
    id: m.id,
    homeTeamName: m.homeTeam.name,
    awayTeamName: m.awayTeam.name,
    homeTeamShort: m.homeTeam.name.slice(0, 3).toUpperCase(),
    awayTeamShort: m.awayTeam.name.slice(0, 3).toUpperCase(),
    homeScore: m.homeScore,
    awayScore: m.awayScore,
    status: (m.status === "live"
      ? "live"
      : m.status === "completed" || m.status === "locked"
        ? "completed"
        : "upcoming") as "live" | "completed" | "upcoming",
    group: m.groupLabel ?? "—",
    venue: m.pitch ?? "—",
    scheduledTime: m.scheduledAt.toLocaleTimeString("en-MY", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }),
    referee: m.refereeName ?? null,
  }));

  const pendingTeams = allTeams.filter(t => t.status === "pending");
  const approvedTeams = allTeams.filter(t => t.status === "approved");
  const liveMatches = mappedMatches.filter(m => m.status === "live");
  const groups = [
    ...new Set(allTeams.map(t => t.group).filter(g => g !== "—")),
  ].sort();

  const tournamentSummary = {
    name: data.name,
    code: data.code,
    dates: formatDateRange(data.startsAt, data.endsAt),
    venue: "—",
    totalTeams: allTeams.length,
    approvedTeams: approvedTeams.length,
    pendingTeams: pendingTeams.length,
  };

  return (
    <OrganizerDashboard
      tournament={tournamentSummary}
      matches={mappedMatches}
      teams={allTeams}
      pendingTeams={pendingTeams}
      liveMatches={liveMatches}
      groups={groups}
    />
  );
}
