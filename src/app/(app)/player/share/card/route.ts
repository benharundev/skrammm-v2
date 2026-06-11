import type { NextRequest } from "next/server";
import { requireAuth } from "@lib/auth/server";
import {
  getClaimedPlayerForUser,
  getPlayerStats,
  getPlayerTournamentHistory,
} from "@modules/player";
import { computeRrsV2 } from "@modules/reliability";
import { generatePerformanceCard } from "@lib/og";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await requireAuth();
  const player = await getClaimedPlayerForUser(session.user.id);

  if (!player) {
    return new Response("No player profile", { status: 404 });
  }

  const [stats, rrsData] = await Promise.all([
    getPlayerStats(player.id),
    computeRrsV2(player.id),
  ]);

  const latestReliability = Math.round(rrsData.careerLevel.rrsCareer);

  const type = (request.nextUrl.searchParams.get("type") ?? "career") as
    | "career"
    | "last30"
    | "matches";

  let cardTitle: string | undefined;
  let statItems: { label: string; value: string | number }[] | undefined;

  if (type === "last30") {
    cardTitle = "Last 30 Days";
    statItems = [
      { label: "Matches", value: stats.matchesPlayed },
      { label: "Tries", value: stats.tries },
      { label: "Penalties", value: stats.penalties },
      { label: "YC", value: stats.yellowCards },
    ];
  } else if (type === "matches") {
    const history = await getPlayerTournamentHistory(player.id);
    cardTitle = "Match Statistics";
    statItems = [
      { label: "Tournaments", value: history.length },
      { label: "Matches", value: stats.matchesPlayed },
      { label: "Starting XV", value: stats.startersCount },
    ];
  }

  const png = await generatePerformanceCard({
    playerId: player.id,
    tournamentId: "",
    playerName: player.fullName,
    teamName: player.team?.name ?? "Independent",
    stats: {
      matchesPlayed: stats.matchesPlayed,
      tries: stats.tries,
      reliability: latestReliability,
      jerseyNumber: player.jerseyNumber ?? null,
      playerIdCode: player.playerIdCode,
    },
    statsHash: String(Date.now()),
    ...(cardTitle !== undefined && { cardTitle }),
    ...(statItems !== undefined && { statItems }),
  });

  return new Response(png, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "no-store",
      "Content-Disposition": `inline; filename="player-card-${player.playerIdCode}.png"`,
    },
  });
}
