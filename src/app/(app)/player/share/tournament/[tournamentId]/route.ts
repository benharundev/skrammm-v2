import type { NextRequest } from "next/server";
import { requireAuth } from "@lib/auth/server";
import { getClaimedPlayerForUser, getPlayerStatsByTournament } from "@modules/player";
import { getTournamentById } from "@modules/tournament";
import { generatePerformanceCard } from "@lib/og";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ tournamentId: string }> }
) {
  const { tournamentId } = await params;
  const session = await requireAuth();
  const player = await getClaimedPlayerForUser(session.user.id);

  if (!player) {
    return new Response("No player profile", { status: 404 });
  }

  const tournament = await getTournamentById(tournamentId);

  if (!tournament) {
    return new Response("Tournament not found", { status: 404 });
  }

  const stats = await getPlayerStatsByTournament(player.id, tournamentId);

  const cardTitle =
    tournament.name.length > 25 ? tournament.code : tournament.name;

  const png = await generatePerformanceCard({
    playerId: player.id,
    playerName: player.fullName,
    teamName: player.team?.name ?? "Independent",
    stats: {
      matchesPlayed: stats.matchesPlayed,
      tries: stats.tries,
      reliability: 0,
      jerseyNumber: player.jerseyNumber ?? null,
      playerIdCode: player.playerIdCode,
    },
    statsHash: String(Date.now()),
    cardTitle,
    statItems: [
      { label: "Matches",     value: stats.matchesPlayed },
      { label: "Tries",       value: stats.tries },
      { label: "Penalties",   value: stats.penalties },
      { label: "Starting XV", value: stats.startersCount },
    ],
  });

  return new Response(png, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "no-store",
      "Content-Disposition": `inline; filename="tournament-${tournamentId}.png"`,
    },
  });
}
