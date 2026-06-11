import type { NextRequest } from "next/server";
import { notFound } from "next/navigation";
import { getTournamentByCode } from "@modules/tournament";
import { getMatchPublicById } from "@modules/match";
import { generateMatchStoryCard } from "@lib/og";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ tournamentCode: string; matchId: string }> }
) {
  const { tournamentCode, matchId } = await params;

  const tournament = await getTournamentByCode(tournamentCode);
  if (!tournament || tournament.status === "draft") notFound();

  const match = await getMatchPublicById(matchId);
  if (!match) notFound();

  const isCompleted = match.status === "completed" || match.status === "locked";

  const png = await generateMatchStoryCard({
    tournamentName: tournament.name,
    tournamentCode: tournament.code,
    homeTeam: match.homeTeam.name,
    homeTeamId: match.homeTeam.id,
    awayTeam: match.awayTeam.name,
    homeScore: match.homeScore,
    awayScore: match.awayScore,
    status: isCompleted ? "completed" : match.status === "live" ? "live" : "scheduled",
    pitch: match.pitch,
    groupLabel: match.groupLabel,
    events: match.events.map((e) => ({
      eventType: e.eventType,
      playerName: e.player?.fullName ?? null,
      minute: e.minute,
      teamId: e.teamId,
    })),
  });

  return new Response(png, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": isCompleted
        ? "public, max-age=3600, stale-while-revalidate=86400"
        : "no-store",
      "Content-Disposition": `inline; filename="match-${matchId}.png"`,
    },
  });
}
