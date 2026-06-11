import { db } from "@lib/db";
import { cachedFn, keys, ttl } from "@lib/cache";
import { v4 as uuidv4 } from "uuid";
import { WEIGHTS, THRESHOLDS, RRS_V2_THRESHOLDS } from "./types";
import type { ReliabilityComponents } from "./types";
import {
  computeMatchScore,
  computeTournamentRating,
  computeCareerRrs,
  computeLast30DaysRrs,
} from "./rrs-engine";
import type { MatchRawData, RrsV2Payload, TeamRrsPayload } from "./types";

// ---------------------------------------------------------------------------
// Reliability score computation (TECH_PRD §10A)
//
// Score = attendance(50%) + punctuality(25%) + discipline(25%)
// NOTE: Only player attendance scans feed this. Team attendance does NOT.
// ---------------------------------------------------------------------------

const LOOKBACK_MONTHS = 12;
const MAX_LATE_MINUTES = 30; // cap for punctuality inversion
const YELLOW_CARD_PENALTY = 2;
const RED_CARD_PENALTY = 10;

export async function computeReliabilityScore(
  playerId: string
): Promise<{ score: number; components: ReliabilityComponents }> {
  const since = new Date();
  since.setMonth(since.getMonth() - LOOKBACK_MONTHS);

  const [scans, cardEvents] = await Promise.all([
    db.attendanceScan.findMany({
      where: { playerId, scannedAt: { gte: since } },
      select: { minutesLate: true },
    }),
    db.matchEvent.findMany({
      where: {
        playerId,
        eventType: { in: ["yellow_card", "red_card"] },
        createdAt: { gte: since },
        deletedAt: null,
      },
      select: { eventType: true },
    }),
  ]);

  // Attendance rate (0–100)
  // Simplified: scans / expected appearances. Without schedule data we use
  // scans as proxy — replace with scheduled appearances count pre-Alpha.
  const attendanceRate = scans.length > 0 ? 100 : 0;

  // Punctuality: mean minutes late, capped, inverted
  const avgLate =
    scans.length > 0
      ? scans.reduce((sum, s) => sum + (s.minutesLate ?? 0), 0) / scans.length
      : 0;
  const punctuality = Math.max(0, 100 - (avgLate / MAX_LATE_MINUTES) * 100);

  // Discipline: yellow × -2, red × -10, floored at 0
  const yellowCount = cardEvents.filter((e) => e.eventType === "yellow_card").length;
  const redCount = cardEvents.filter((e) => e.eventType === "red_card").length;
  const disciplineRaw =
    100 - yellowCount * YELLOW_CARD_PENALTY - redCount * RED_CARD_PENALTY;
  const discipline = Math.max(0, disciplineRaw);

  const components: ReliabilityComponents = {
    attendance: Math.round(attendanceRate),
    punctuality: Math.round(punctuality),
    discipline: Math.round(discipline),
  };

  const score = Math.round(
    components.attendance * WEIGHTS.attendance +
      components.punctuality * WEIGHTS.punctuality +
      components.discipline * WEIGHTS.discipline
  );

  return { score, components };
}

export async function persistReliabilitySnapshot(playerId: string): Promise<number> {
  const { score, components } = await computeReliabilityScore(playerId);

  await db.reliabilitySnapshot.create({
    data: { id: uuidv4(), playerId, score, components },
  });

  return score;
}

export async function getLatestReliabilityScore(playerId: string) {
  return db.reliabilitySnapshot.findFirst({
    where: { playerId },
    orderBy: { computedAt: "desc" },
  });
}

export async function getLatestReliabilityScores(
  playerIds: string[]
): Promise<{ playerId: string; score: number }[]> {
  if (playerIds.length === 0) return [];
  return db.reliabilitySnapshot.findMany({
    where: { playerId: { in: playerIds } },
    orderBy: [{ playerId: "asc" }, { computedAt: "desc" }],
    distinct: ["playerId"],
    select: { playerId: true, score: true },
  });
}

export function getScoreWarningLevel(score: number): "green" | "yellow" | "red" {
  if (score < THRESHOLDS.red) return "red";
  if (score < THRESHOLDS.yellow) return "yellow";
  return "green";
}

export function getRrsV2WarningLevel(score: number): "green" | "yellow" | "red" {
  if (score >= RRS_V2_THRESHOLDS.green) return "green";
  if (score >= RRS_V2_THRESHOLDS.yellow) return "yellow";
  return "red";
}

// ─── RRS v2 data fetching ────────────────────────────────────────────────────

interface PlayerRrsMatchRow {
  matchId: string;
  matchDate: Date;
  tournamentId: string;
  tournamentFormat: "festival" | "tiered" | "elimination";
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number;
  awayScore: number;
  playerTeamId: string | null;
  tries: number;
  conversions: number;
  dropGoals: number;
  yellowCards: number;
  redCards: number;
}

async function getPlayerRrsMatchData(playerId: string): Promise<PlayerRrsMatchRow[]> {
  const player = await db.player.findUnique({
    where: { id: playerId },
    select: { teamId: true },
  });
  if (!player) return [];

  const matches = await db.match.findMany({
    where: {
      OR: [{ homeTeamId: player.teamId }, { awayTeamId: player.teamId }],
      status: { in: ["completed", "locked"] },
      deletedAt: null,
    },
    select: {
      id: true,
      scheduledAt: true,
      tournamentId: true,
      homeTeamId: true,
      awayTeamId: true,
      homeScore: true,
      awayScore: true,
      tournament: { select: { format: true } },
      lineups: {
        where: { playerId },
        select: { teamId: true },
      },
      events: {
        where: { playerId, deletedAt: null },
        select: { eventType: true },
      },
    },
    orderBy: { scheduledAt: "asc" },
  });

  return matches.map((m) => {
    const lineup = m.lineups[0];
    const countType = (type: string) =>
      m.events.filter((e) => e.eventType === type).length;

    return {
      matchId: m.id,
      matchDate: m.scheduledAt,
      tournamentId: m.tournamentId,
      tournamentFormat: m.tournament.format as "festival" | "tiered" | "elimination",
      homeTeamId: m.homeTeamId,
      awayTeamId: m.awayTeamId,
      homeScore: m.homeScore,
      awayScore: m.awayScore,
      playerTeamId: lineup?.teamId ?? null,
      tries: countType("try"),
      conversions: countType("conversion"),
      dropGoals: countType("drop_goal"),
      yellowCards: countType("yellow_card"),
      redCards: countType("red_card"),
    };
  });
}

export async function computeRrsV2(playerId: string): Promise<RrsV2Payload> {
  return cachedFn(keys.playerRrs(playerId), ttl.COMPUTED, async () => {
    const rows = await getPlayerRrsMatchData(playerId);
    const executionDate = new Date();

    const matchData: Array<MatchRawData & { date: Date }> = rows.map((row) => {
      const isPlaying = row.playerTeamId !== null;
      let outcome: "Win" | "Tie" | "Loss" = "Loss";

      if (isPlaying && row.playerTeamId !== null) {
        const isHome = row.playerTeamId === row.homeTeamId;
        const playerScore = isHome ? row.homeScore : row.awayScore;
        const opponentScore = isHome ? row.awayScore : row.homeScore;
        if (playerScore > opponentScore) outcome = "Win";
        else if (playerScore === opponentScore) outcome = "Tie";
      }

      return {
        matchId: row.matchId,
        matchDate: row.matchDate,
        date: row.matchDate,
        tournamentId: row.tournamentId,
        tournamentFormat: row.tournamentFormat,
        isPlaying,
        tries: row.tries,
        conversions: row.conversions,
        dropGoals: row.dropGoals,
        yellowCards: row.yellowCards,
        redCards: row.redCards,
        outcome,
      };
    });

    const allScores = matchData.map((m) => ({
      score: computeMatchScore(m),
      date: m.date,
      tournamentId: m.tournamentId,
    }));

    const careerLevel = computeCareerRrs(allScores.map((s) => s.score));

    const { rrs30Days, matchesPlayedWindow, lowRecentSample } = computeLast30DaysRrs(
      allScores.map((s) => ({ score: s.score, date: s.date })),
      executionDate
    );
    const trendDelta = rrs30Days - careerLevel.rrsCareer;
    const status =
      trendDelta > 5.0
        ? "Ascending Form"
        : trendDelta < -5.0
          ? "Slumping Form"
          : "Stable Form";

    const tournamentGroups = new Map<string, number[]>();
    const tournamentAppearances = new Map<string, number>();

    for (const s of allScores) {
      if (!tournamentGroups.has(s.tournamentId)) {
        tournamentGroups.set(s.tournamentId, []);
        tournamentAppearances.set(s.tournamentId, 0);
      }
      tournamentGroups.get(s.tournamentId)!.push(s.score);
      if (s.score > 0) {
        tournamentAppearances.set(
          s.tournamentId,
          (tournamentAppearances.get(s.tournamentId) ?? 0) + 1
        );
      }
    }

    const tournamentLevel = Array.from(tournamentGroups.entries()).map(([tournamentId, scores]) => ({
      tournamentId,
      tournamentRating: computeTournamentRating(scores),
      totalTeamMatches: scores.length,
      playerAppearances: tournamentAppearances.get(tournamentId) ?? 0,
    }));

    return {
      playerId,
      executionDate: executionDate.toISOString().split("T")[0]!,
      careerLevel,
      last30DaysLevel: {
        rrs30Days,
        trendDelta,
        status,
        lowRecentSample,
        matchesPlayedWindow,
      },
      tournamentLevel,
    };
  });
}

export async function computeTeamRrs(teamId: string): Promise<TeamRrsPayload> {
  return cachedFn(keys.teamRrs(teamId), ttl.COMPUTED, async () => {
    const players = await db.player.findMany({
      where: { teamId },
      select: { id: true },
    });

    if (players.length === 0) {
      return {
        teamId,
        executionDate: new Date().toISOString().split("T")[0]!,
        teamRrs: 0,
        squadSize: 0,
        playerBreakdown: [],
      };
    }

    const playerIds = players.map((p) => p.id);

    // Single batch query — 2 total DB round-trips regardless of squad size
    const matches = await db.match.findMany({
      where: {
        OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }],
        status: { in: ["completed", "locked"] },
        deletedAt: null,
      },
      select: {
        id: true,
        scheduledAt: true,
        tournamentId: true,
        homeTeamId: true,
        awayTeamId: true,
        homeScore: true,
        awayScore: true,
        tournament: { select: { format: true } },
        lineups: {
          where: { playerId: { in: playerIds } },
          select: { playerId: true, teamId: true },
        },
        events: {
          where: { playerId: { in: playerIds }, deletedAt: null },
          select: { playerId: true, eventType: true },
        },
      },
      orderBy: { scheduledAt: "asc" },
    });

    const breakdown: Array<{ playerId: string; rrsCareer: number }> = [];

    for (const player of players) {
      const allScores = matches.map((m) => {
        const lineup = m.lineups.find((l) => l.playerId === player.id);
        const playerEvents = m.events.filter((e) => e.playerId === player.id);
        const countType = (type: string) => playerEvents.filter((e) => e.eventType === type).length;

        const isPlaying = lineup !== undefined;
        let outcome: "Win" | "Tie" | "Loss" = "Loss";
        if (isPlaying && lineup !== undefined) {
          const isHome = lineup.teamId === m.homeTeamId;
          const playerScore = isHome ? m.homeScore : m.awayScore;
          const opponentScore = isHome ? m.awayScore : m.homeScore;
          if (playerScore > opponentScore) outcome = "Win";
          else if (playerScore === opponentScore) outcome = "Tie";
        }

        return computeMatchScore({
          matchId: m.id,
          matchDate: m.scheduledAt,
          tournamentId: m.tournamentId,
          tournamentFormat: m.tournament.format as "festival" | "tiered" | "elimination",
          isPlaying,
          tries: countType("try"),
          conversions: countType("conversion"),
          dropGoals: countType("drop_goal"),
          yellowCards: countType("yellow_card"),
          redCards: countType("red_card"),
          outcome,
        });
      });

      const careerLevel = computeCareerRrs(allScores);
      breakdown.push({ playerId: player.id, rrsCareer: careerLevel.rrsCareer });
    }

    const teamRrs = breakdown.reduce((sum, p) => sum + p.rrsCareer, 0) / breakdown.length;

    return {
      teamId,
      executionDate: new Date().toISOString().split("T")[0]!,
      teamRrs,
      squadSize: breakdown.length,
      playerBreakdown: breakdown,
    };
  });
}
