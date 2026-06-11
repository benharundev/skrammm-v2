import { requireAuth } from "@lib/auth/server";
import { getManagerTeam } from "@modules/team";
import { getUpcomingMatchesForTeam } from "@modules/match";
import { AttendanceClient } from "./_client";

export default async function AttendancePage() {
  const session = await requireAuth();
  const dbTeam = await getManagerTeam(session.user.id);

  const upcomingMatches = dbTeam ? await getUpcomingMatchesForTeam(dbTeam.id) : [];
  const squadPlayers = dbTeam?.players ?? [];

  const matchOptions = upcomingMatches.map((m) => ({
    id: m.id,
    label: `${m.homeTeam.name} vs ${m.awayTeam.name}`,
    scheduledAt: m.scheduledAt.toISOString(),
    tournamentName: m.tournament.name,
  }));

  const squadOptions = squadPlayers.map((p) => ({
    id: p.id,
    fullName: p.fullName,
    jerseyNumber: p.jerseyNumber,
    playerIdCode: p.playerIdCode,
  }));

  return (
    <AttendanceClient
      teamId={dbTeam?.id ?? ""}
      matches={matchOptions}
      squad={squadOptions}
    />
  );
}
