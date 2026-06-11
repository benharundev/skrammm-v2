import { requireOrgAuth } from "@lib/auth/server";
import { getOrganizerTournament } from "@modules/tournament";
import { getMatchesPublic, computeStandings, POINTS } from "@modules/match";
import type { PublicMatch } from "@modules/match";
import { StandingsClient } from "./_client";
import type { TournamentStats, BracketMatch, KnockoutBracketData } from "./_client";

function computeTournamentStats(matches: PublicMatch[]): TournamentStats {
  const playerStats = new Map<string, { points: number; tries: number }>();
  let yellowCards = 0;
  let redCards = 0;

  for (const match of matches) {
    for (const event of match.events) {
      const playerName = event.player?.fullName;
      if (!playerName) continue;

      const existing = playerStats.get(playerName) ?? { points: 0, tries: 0 };
      const eventType = event.eventType as keyof typeof POINTS;
      const pts = POINTS[eventType] ?? 0;
      existing.points += pts;
      if (event.eventType === "try") existing.tries += 1;
      playerStats.set(playerName, existing);

      if (event.eventType === "yellow_card") yellowCards += 1;
      if (event.eventType === "red_card") redCards += 1;
    }
  }

  const statsArray = Array.from(playerStats.entries());

  const topScorerEntry = statsArray
    .filter(([, s]) => s.points > 0)
    .reduce<[string, { points: number; tries: number }] | null>(
      (best, current) => (best === null || current[1].points > best[1].points ? current : best),
      null
    );

  const topTryEntry = statsArray
    .filter(([, s]) => s.tries > 0)
    .reduce<[string, { points: number; tries: number }] | null>(
      (best, current) => (best === null || current[1].tries > best[1].tries ? current : best),
      null
    );

  return {
    topScorer: topScorerEntry !== null
      ? { name: topScorerEntry[0], points: topScorerEntry[1].points }
      : null,
    topTry: topTryEntry !== null
      ? { name: topTryEntry[0], tries: topTryEntry[1].tries }
      : null,
    yellowCards,
    redCards,
  };
}

const TBD_MATCH: BracketMatch = { id: "tbd", home: "TBD", away: "TBD", homeScore: 0, awayScore: 0, status: "tbd" };

function computeKnockoutBracket(matches: PublicMatch[]): KnockoutBracketData {
  const toB = (m: PublicMatch): BracketMatch => ({
    id: m.id,
    home: m.homeTeam.name,
    away: m.awayTeam.name,
    homeScore: m.homeScore,
    awayScore: m.awayScore,
    status: m.status === "completed" || m.status === "locked" ? "completed"
          : m.status === "live" ? "live"
          : "upcoming",
    ...(m.pitch ? { venue: m.pitch } : {}),
    time: m.scheduledAt.toLocaleTimeString("en-MY", { hour: "2-digit", minute: "2-digit", hour12: false }),
  });

  const find = (round: string): BracketMatch => {
    const m = matches.find(x => x.round === round);
    return m ? toB(m) : { ...TBD_MATCH, id: round };
  };

  const tbd = (round: string): BracketMatch => ({ ...TBD_MATCH, id: round });

  return {
    qf:    ["QF1", "QF2", "QF3", "QF4"].map(find),
    sf:    ["SF1", "SF2"].map(tbd),
    final: tbd("FINAL"),
    third: tbd("3RD/4TH"),
  };
}

export default async function StandingsPage() {
  const session = await requireOrgAuth();
  const tournament = await getOrganizerTournament(session.user.id);

  const matches = tournament ? await getMatchesPublic(tournament.id) : [];
  const standings = computeStandings(matches);
  const stats = computeTournamentStats(matches);
  const bracket = computeKnockoutBracket(matches);

  return <StandingsClient standings={standings} stats={stats} bracket={bracket} />;
}
