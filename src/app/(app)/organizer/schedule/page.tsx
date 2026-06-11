import { requireOrgAuth } from "@lib/auth/server";
import { getOrganizerTournament } from "@modules/tournament";
import { getMatchesByTournament } from "@modules/match";
import type { UIScheduleMatch } from "../_components/ui-schedule-match";
import { ScheduleClient } from "./_client";

export default async function SchedulePage() {
  const session = await requireOrgAuth();
  const tournament = await getOrganizerTournament(session.user.id);
  const dbMatches = tournament ? await getMatchesByTournament(tournament.id) : [];

  const matches: UIScheduleMatch[] = dbMatches.map(m => ({
    id: m.id,
    homeName: m.homeTeam.name,
    awayName: m.awayTeam.name,
    homeScore: m.homeScore,
    awayScore: m.awayScore,
    status: m.status === "live" ? "live"
      : m.status === "completed" || m.status === "locked" ? "completed"
      : "upcoming",
    groupLabel: m.groupLabel ?? "",
    refereeName: m.refereeName ?? "",
    pitch: m.pitch ?? "",
    scheduledAt: m.scheduledAt.toISOString(),
  }));

  return <ScheduleClient matches={matches} />;
}
