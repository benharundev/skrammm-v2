import { db } from "@lib/db";
import { v7 as uuidv7 } from "uuid";
import { publish } from "@lib/realtime/bus";
import { persistReliabilitySnapshot } from "@modules/reliability";
import { cache as libCache, keys } from "@lib/cache";
import type { Prisma } from "@prisma/client";
import type {
  AddMatchEventInput,
  CreateMatchInput,
  UpdateMatchMetadataInput,
  MatchPhaseStatus,
} from "./types";
import { POINTS } from "./types";

export async function createMatch(input: CreateMatchInput) {
  return db.match.create({
    data: {
      id: uuidv7(),
      tournamentId: input.tournamentId,
      homeTeamId: input.homeTeamId,
      awayTeamId: input.awayTeamId,
      scheduledAt: input.scheduledAt,
      round: input.round ?? null,
      groupLabel: input.groupLabel ?? null,
      pitch: input.pitch ?? null,
      refereeName: input.refereeName ?? null,
    },
    select: { id: true },
  });
}

export async function addMatchEvent(
  recordedByUserId: string,
  input: AddMatchEventInput
): Promise<{ eventId: string }> {
  const match = await db.match.findUnique({
    where: { id: input.matchId },
    select: { id: true, status: true, homeTeamId: true, awayTeamId: true, homeScore: true, awayScore: true },
  });

  if (!match || match.status !== "live") {
    throw new Error("Match is not live");
  }

  const points = POINTS[input.eventType] ?? 0;
  const isHome = match.homeTeamId === input.teamId;

  const [event, updatedMatch] = await db.$transaction([
    db.matchEvent.create({
      data: {
        id: uuidv7(),
        matchId: input.matchId,
        teamId: input.teamId,
        playerId: input.playerId ?? null,
        eventType: input.eventType,
        minute: input.minute ?? null,
        ...(input.payload !== undefined ? { payload: input.payload as Prisma.InputJsonObject } : {}),
        recordedByUserId,
      },
    }),
    db.match.update({
      where: { id: input.matchId },
      data: {
        ...(isHome ? { homeScore: { increment: points } } : {}),
        ...(!isHome ? { awayScore: { increment: points } } : {}),
      },
      select: { homeScore: true, awayScore: true },
    }),
  ]);

  // Push to SSE subscribers
  publish(input.matchId, {
    id: event.id,
    matchId: input.matchId,
    eventType: input.eventType,
    teamId: input.teamId,
    playerId: input.playerId ?? null,
    minute: input.minute ?? null,
    payload: input.payload,
    homeScore: updatedMatch.homeScore,
    awayScore: updatedMatch.awayScore,
    createdAt: event.createdAt.toISOString(),
  });

  // Refresh reliability snapshot for the carded player without blocking the response
  if (
    input.playerId &&
    (input.eventType === "yellow_card" || input.eventType === "red_card")
  ) {
    void Promise.all([
      persistReliabilitySnapshot(input.playerId),
      libCache.del(keys.playerRrs(input.playerId)),
      libCache.del(keys.playerStats(input.playerId)),
    ]).catch((err: unknown) => {
      console.error("[reliability] snapshot/cache invalidation failed after card event:", err);
    });
  }

  return { eventId: event.id };
}

export async function lockMatch(matchId: string): Promise<void> {
  await db.match.update({
    where: { id: matchId },
    data: { status: "locked", lockedAt: new Date() },
  });
}

export async function getMatchForStream(matchId: string) {
  return db.match.findUnique({
    where: { id: matchId },
    select: {
      id: true, status: true, homeScore: true, awayScore: true,
      startedAt: true, secondHalfStartedAt: true, pausedAt: true, totalPausedMs: true,
      homeTeam: { select: { id: true, name: true, logoUrl: true } },
      awayTeam: { select: { id: true, name: true, logoUrl: true } },
      events: {
        where: { deletedAt: null },
        orderBy: { createdAt: "asc" },
        select: { id: true, eventType: true, teamId: true, minute: true, createdAt: true },
      },
    },
  });
}

export async function getMatchesByTournament(tournamentId: string) {
  return db.match.findMany({
    where: { tournamentId, deletedAt: null },
    orderBy: { scheduledAt: "asc" },
    include: {
      homeTeam: { select: { id: true, name: true } },
      awayTeam: { select: { id: true, name: true } },
    },
  });
}

export async function getUpcomingMatchesForTeam(teamId: string) {
  return db.match.findMany({
    where: {
      OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }],
      status: { in: ["scheduled", "live"] },
      deletedAt: null,
    },
    include: {
      homeTeam: { select: { id: true, name: true } },
      awayTeam: { select: { id: true, name: true } },
      tournament: { select: { id: true, name: true, code: true } },
      lineups: {
        where: { teamId },
        include: { player: { select: { id: true, fullName: true, jerseyNumber: true } } },
      },
    },
    orderBy: { scheduledAt: "asc" },
    take: 10,
  });
}

export async function getPastMatchesForTeam(teamId: string) {
  return db.match.findMany({
    where: {
      OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }],
      status: { in: ["completed", "locked"] },
      deletedAt: null,
    },
    include: {
      homeTeam: { select: { id: true, name: true } },
      awayTeam: { select: { id: true, name: true } },
      tournament: { select: { id: true, name: true } },
    },
    orderBy: { scheduledAt: "desc" },
    take: 20,
  });
}

import type { PublicMatch, StandingRow } from "./types";

export function computeStandings(matches: PublicMatch[]): Record<string, StandingRow[]> {
  const played = matches.filter(
    (m) => m.status === "completed" || m.status === "locked"
  );

  const groups: Record<string, PublicMatch[]> = {};
  for (const match of played) {
    if (!match.groupLabel) continue;
    groups[match.groupLabel] ??= [];
    groups[match.groupLabel]!.push(match);
  }

  const result: Record<string, StandingRow[]> = {};

  for (const [group, groupMatches] of Object.entries(groups)) {
    const teamMap = new Map<
      string,
      { name: string; p: number; w: number; d: number; l: number; pf: number; pa: number; pts: number }
    >();

    const ensure = (id: string, name: string) => {
      if (!teamMap.has(id)) {
        teamMap.set(id, { name, p: 0, w: 0, d: 0, l: 0, pf: 0, pa: 0, pts: 0 });
      }
    };

    for (const match of groupMatches) {
      ensure(match.homeTeam.id, match.homeTeam.name);
      ensure(match.awayTeam.id, match.awayTeam.name);

      const home = teamMap.get(match.homeTeam.id)!;
      const away = teamMap.get(match.awayTeam.id)!;

      home.p += 1;
      away.p += 1;
      home.pf += match.homeScore;
      home.pa += match.awayScore;
      away.pf += match.awayScore;
      away.pa += match.homeScore;

      if (match.homeScore > match.awayScore) {
        home.w += 1;
        home.pts += 3;
        away.l += 1;
      } else if (match.homeScore < match.awayScore) {
        away.w += 1;
        away.pts += 3;
        home.l += 1;
      } else {
        home.d += 1;
        home.pts += 1;
        away.d += 1;
        away.pts += 1;
      }
    }

    const rows: StandingRow[] = Array.from(teamMap.entries())
      .map(([teamId, s]) => ({ teamId, teamName: s.name, pos: 0, p: s.p, w: s.w, d: s.d, l: s.l, pf: s.pf, pa: s.pa, pts: s.pts }))
      .sort((a, b) => b.pts - a.pts || b.pf - a.pf)
      .map((row, i) => ({ ...row, pos: i + 1 }));

    result[group] = rows;
  }

  return result;
}

export async function getMatchesPublic(tournamentId: string): Promise<PublicMatch[]> {
  const rows = await db.match.findMany({
    where: { tournamentId, deletedAt: null },
    orderBy: { scheduledAt: "asc" },
    select: {
      id: true,
      status: true,
      homeScore: true,
      awayScore: true,
      scheduledAt: true,
      pitch: true,
      groupLabel: true,
      round: true,
      homeTeam: { select: { id: true, name: true, logoUrl: true } },
      awayTeam: { select: { id: true, name: true, logoUrl: true } },
      events: {
        where: { deletedAt: null },
        orderBy: { createdAt: "asc" },
        take: 100,
        select: {
          id: true,
          eventType: true,
          teamId: true,
          minute: true,
          payload: true,
          player: { select: { fullName: true } },
        },
      },
    },
  });

  return rows.map((r) => ({
    ...r,
    status: r.status as PublicMatch["status"],
    events: r.events.map((e) => ({
      ...e,
      minute: e.minute ?? 0,
      payload: e.payload as Record<string, unknown> | null,
    })),
  }));
}

export async function getMatchPublicById(matchId: string): Promise<PublicMatch | null> {
  const row = await db.match.findUnique({
    where: { id: matchId, deletedAt: null },
    select: {
      id: true,
      status: true,
      homeScore: true,
      awayScore: true,
      scheduledAt: true,
      pitch: true,
      groupLabel: true,
      round: true,
      homeTeam: { select: { id: true, name: true, logoUrl: true } },
      awayTeam: { select: { id: true, name: true, logoUrl: true } },
      events: {
        where: { deletedAt: null },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          eventType: true,
          teamId: true,
          minute: true,
          payload: true,
          player: { select: { fullName: true } },
        },
      },
    },
  });

  if (!row) return null;

  return {
    ...row,
    status: row.status as PublicMatch["status"],
    events: row.events.map((e) => ({
      ...e,
      minute: e.minute ?? 0,
      payload: e.payload as Record<string, unknown> | null,
    })),
  };
}

const VALID_TRANSITIONS: Partial<Record<MatchPhaseStatus, MatchPhaseStatus[]>> = {
  scheduled: ["live", "suspended"],
  live: ["suspended", "completed"],
  suspended: ["live", "completed"],
  completed: ["locked"],
};

async function refreshMatchPlayersReliability(matchId: string): Promise<void> {
  const lineups = await db.matchLineup.findMany({
    where: { matchId },
    select: { playerId: true },
  });
  const playerIds = [...new Set(lineups.map((l) => l.playerId))];
  await Promise.allSettled(playerIds.map((id) => persistReliabilitySnapshot(id)));
}

// Transition match to a new status phase; publishes phase_change event over SSE
export async function transitionMatchPhase(matchId: string, toStatus: MatchPhaseStatus): Promise<void> {
  const match = await db.match.findUnique({
    where: { id: matchId },
    select: { status: true, homeTeamId: true, awayTeamId: true, startedAt: true, pausedAt: true, totalPausedMs: true },
  });
  if (!match) throw new Error("Match not found");

  // live → live is valid only as a second-half kickoff (match already started)
  const isSecondHalfKickoff = toStatus === "live" && match.status === "live" && match.startedAt !== null;

  if (!isSecondHalfKickoff) {
    const allowed = VALID_TRANSITIONS[match.status as MatchPhaseStatus] ?? [];
    if (!allowed.includes(toStatus)) {
      throw new Error(`Cannot transition match from ${match.status} to ${toStatus}`);
    }
  }

  const now = new Date();
  const isFirstKickoff    = toStatus === "live"      && !match.startedAt;
  const isEnteringPause   = toStatus === "suspended" && match.status === "live";
  const isResumingPause   = toStatus === "live"      && match.status === "suspended";

  const newTotalPausedMs = isResumingPause && match.pausedAt
    ? match.totalPausedMs + (now.getTime() - match.pausedAt.getTime())
    : isSecondHalfKickoff
    ? 0
    : match.totalPausedMs;

  await db.match.update({
    where: { id: matchId },
    data: {
      status: toStatus,
      ...(toStatus === "locked"  ? { lockedAt: now }                                                        : {}),
      ...(isFirstKickoff         ? { startedAt: now }                                                       : {}),
      ...(isSecondHalfKickoff    ? { secondHalfStartedAt: now, totalPausedMs: 0, pausedAt: null }           : {}),
      ...(isEnteringPause        ? { pausedAt: now }                                                        : {}),
      ...(isResumingPause && match.pausedAt ? { totalPausedMs: newTotalPausedMs, pausedAt: null }           : {}),
    },
  });

  const publishedStartedAt = isFirstKickoff ? now : match.startedAt;

  publish(matchId, {
    type: "phase_change",
    status: toStatus,
    startedAt: publishedStartedAt?.toISOString() ?? null,
    secondHalfStartedAt: isSecondHalfKickoff ? now.toISOString() : null,
    pausedAt: isEnteringPause ? now.toISOString() : null,
    totalPausedMs: newTotalPausedMs,
  });

  // Batch-refresh reliability snapshots for all lineup players without blocking
  if (toStatus === "locked") {
    void Promise.all([
      refreshMatchPlayersReliability(matchId),
      libCache.del(keys.teamRrs(match.homeTeamId)),
      libCache.del(keys.teamRrs(match.awayTeamId)),
    ]).catch((err: unknown) => {
      console.error("[reliability] batch snapshot/cache invalidation failed on match lock:", err);
    });
  }
}

// Soft-deletes a match event and reverses its score contribution
export async function deleteMatchEvent(matchId: string, eventId: string): Promise<void> {
  const event = await db.matchEvent.findUnique({
    where: { id: eventId },
    select: { matchId: true, teamId: true, eventType: true, deletedAt: true },
  });
  if (!event || event.matchId !== matchId || event.deletedAt !== null) {
    throw new Error("Event not found or already deleted");
  }
  const match = await db.match.findUnique({
    where: { id: matchId },
    select: { homeTeamId: true, awayTeamId: true, status: true },
  });
  if (!match || match.status === "locked") throw new Error("Match is locked");

  const points = POINTS[event.eventType as keyof typeof POINTS] ?? 0;
  const isHome = match.homeTeamId === event.teamId;

  await db.$transaction([
    db.matchEvent.update({ where: { id: eventId }, data: { deletedAt: new Date() } }),
    db.match.update({
      where: { id: matchId },
      data: {
        ...(isHome ? { homeScore: { decrement: points } } : { awayScore: { decrement: points } }),
      },
    }),
  ]);
  publish(matchId, { type: "event_deleted", eventId });
}

// Updates match metadata (referee, pitch, scheduled time) without affecting score or status
export async function updateMatchMetadata(matchId: string, input: UpdateMatchMetadataInput): Promise<void> {
  await db.match.update({
    where: { id: matchId },
    data: {
      ...(input.refereeName !== undefined ? { refereeName: input.refereeName } : {}),
      ...(input.pitch !== undefined ? { pitch: input.pitch } : {}),
      ...(input.scheduledAt !== undefined ? { scheduledAt: input.scheduledAt } : {}),
      ...(input.videoUrl !== undefined ? { videoUrl: input.videoUrl } : {}),
    },
  });
}

export async function getMatchInTournament(matchId: string, tournamentId: string) {
  return db.match.findFirst({
    where: { id: matchId, tournamentId, deletedAt: null },
    select: { id: true },
  });
}

export async function getMatchTournamentId(matchId: string): Promise<string | null> {
  const row = await db.match.findUnique({ where: { id: matchId }, select: { tournamentId: true } });
  return row?.tournamentId ?? null;
}

export async function getTeamMatch(matchId: string, teamId: string): Promise<{ id: string } | null> {
  return db.match.findFirst({
    where: {
      id: matchId,
      OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }],
      status: { in: ["scheduled", "live"] },
    },
    select: { id: true },
  });
}

export async function getMatchBasic(matchId: string): Promise<{ id: string; status: string; tournamentId: string } | null> {
  return db.match.findUnique({
    where: { id: matchId },
    select: { id: true, status: true, tournamentId: true },
  });
}

export async function getMatchEventsSince(matchId: string, afterId: string, limit = 100) {
  return db.matchEvent.findMany({
    where: { matchId, id: { gt: afterId }, deletedAt: null },
    orderBy: { id: "asc" },
    take: limit,
  });
}

export async function saveMatchLineup(matchId: string, teamId: string, playerIds: string[]): Promise<void> {
  await db.$transaction(async (tx) => {
    await tx.matchLineup.deleteMany({ where: { matchId, teamId } });
    if (playerIds.length > 0) {
      await tx.matchLineup.createMany({
        data: playerIds.map((playerId) => ({
          id: uuidv7(),
          matchId,
          teamId,
          playerId,
          isStarter: true,
        })),
      });
    }
  });
}

// Returns full match with team rosters and event log for the live match center
export async function getMatchWithRoster(matchId: string) {
  return db.match.findUnique({
    where: { id: matchId, deletedAt: null },
    include: {
      homeTeam: {
        include: {
          players: {
            select: { id: true, fullName: true, jerseyNumber: true, position: true },
            orderBy: { jerseyNumber: "asc" },
          },
        },
      },
      awayTeam: {
        include: {
          players: {
            select: { id: true, fullName: true, jerseyNumber: true, position: true },
            orderBy: { jerseyNumber: "asc" },
          },
        },
      },
      events: {
        where: { deletedAt: null },
        orderBy: { createdAt: "asc" },
        select: { id: true, eventType: true, teamId: true, playerId: true, minute: true, createdAt: true, payload: true },
      },
      tournament: { select: { id: true, name: true, organizerUserId: true } },
    },
  });
}
