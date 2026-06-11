import { notFound } from "next/navigation";
import { getTournamentByCode } from "@modules/tournament";
import { getMatchesPublic, computeStandings } from "@modules/match";
import { SpectatorShell } from "./_components/spectator-shell";

export const revalidate = 30;

interface SpectatorPageProps {
  params: Promise<{ tournamentCode: string }>;
}

export default async function SpectatorPage({ params }: SpectatorPageProps) {
  const { tournamentCode } = await params;

  const tournament = await getTournamentByCode(tournamentCode);
  if (!tournament || tournament.status === "draft") notFound();

  const matches = await getMatchesPublic(tournament.id);
  const standings = computeStandings(matches);

  const live = matches.filter((m) => m.status === "live");
  const upcoming = matches.filter(
    (m) => m.status === "scheduled" || m.status === "suspended"
  );
  const results = matches.filter(
    (m) => m.status === "completed" || m.status === "locked"
  );

  const isCompleted = tournament.status === "completed";
  const isNotStarted =
    tournament.status === "paid" &&
    new Date(tournament.startsAt) > new Date();

  let championName: string | null = null;
  if (isCompleted) {
    if (tournament.format === "elimination") {
      const finalMatch = results.find(
        (m) =>
          m.round?.toLowerCase().includes("final") === true &&
          m.round?.toLowerCase().includes("semi") === false &&
          m.round?.toLowerCase().includes("third") === false
      );
      if (finalMatch) {
        championName =
          finalMatch.homeScore >= finalMatch.awayScore
            ? finalMatch.homeTeam.name
            : finalMatch.awayTeam.name;
      }
    } else {
      const allRows = Object.values(standings).flat();
      const top = allRows.sort((a, b) => b.pts - a.pts || b.pf - a.pf)[0];
      championName = top?.teamName ?? null;
    }
  }

  const nextUpMatch = live.length === 0 ? (upcoming[0] ?? null) : null;
  const hasLiveMatches = live.length > 0;

  const startDateFormatted = new Date(tournament.startsAt).toLocaleDateString(
    "en-MY",
    {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }
  );

  return (
    <SpectatorShell
      tournament={tournament}
      hasLiveMatches={hasLiveMatches}
      live={live}
      upcoming={upcoming}
      results={results}
      standings={standings}
      allMatches={matches}
      isCompleted={isCompleted}
      isNotStarted={isNotStarted}
      championName={championName}
      nextUpMatch={nextUpMatch}
      startDateFormatted={startDateFormatted}
    />
  );
}
