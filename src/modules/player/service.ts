import { db } from "@lib/db";
import { cachedFn, keys, ttl } from "@lib/cache";
import { v4 as uuidv4, v7 as uuidv7 } from "uuid";
import { ReliabilityComponentsSchema } from "@modules/reliability";
import type { ReliabilityComponents } from "@modules/reliability";
import type { CreatePlayerInput, PlayerStats, TournamentHistoryItem, ReliabilityDataPoint, UpdateProfileInput, UpdateMedicalProfileInput } from "./types";

// Generate a short human-readable player ID code
function generatePlayerIdCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from(
    { length: 8 },
    () => chars[Math.floor(Math.random() * chars.length)]
  ).join("");
}

export async function createPlayer(
  input: CreatePlayerInput
): Promise<{ id: string; playerIdCode: string }> {
  let playerIdCode: string;
  // Ensure uniqueness
  do {
    playerIdCode = generatePlayerIdCode();
  } while (await db.player.findUnique({ where: { playerIdCode } }));

  const player = await db.player.create({
    data: {
      id: uuidv4(),
      teamId: input.teamId,
      fullName: input.fullName,
      dob: input.dob ?? null,
      jerseyNumber: input.jerseyNumber ?? null,
      position: input.position ?? null,
      claimContact: input.claimContact ?? null,
      isMinor: input.isMinor,
      guardianName: input.guardianName ?? null,
      guardianContact: input.guardianContact ?? null,
      playerIdCode,
      claimStatus: "unclaimed",
    },
    select: { id: true, playerIdCode: true },
  });

  return player;
}

export async function claimPlayer(
  userId: string,
  playerIdCode: string
): Promise<void> {
  const player = await db.player.findUnique({ where: { playerIdCode } });
  if (!player) throw new Error("Player not found");
  if (player.claimStatus === "claimed") throw new Error("Already claimed");

  await db.$transaction([
    db.player.update({
      where: { id: player.id },
      data: { userId, claimStatus: "claimed" },
    }),
    // Transfer medical profile ownership
    db.playerMedicalProfile.updateMany({
      where: { playerId: player.id },
      data: { ownerIsClaimed: true },
    }),
  ]);
}

export async function getPlayerById(playerId: string) {
  const [player, medicalProfile] = await Promise.all([
    db.player.findUnique({ where: { id: playerId }, include: { team: true } }),
    db.playerMedicalProfile.findUnique({ where: { playerId } }),
  ]);
  if (!player) return null;
  return { ...player, medicalProfile: medicalProfile ?? null };
}

export async function getPlayersByTeam(teamId: string) {
  return db.player.findMany({
    where: { teamId },
    orderBy: { jerseyNumber: "asc" },
  });
}

export async function getClaimedPlayerForUser(userId: string) {
  const player = await db.player.findFirst({
    where: { userId, claimStatus: "claimed" },
    include: {
      team: { select: { id: true, name: true, slug: true, logoUrl: true } },
    },
  });
  if (!player) return null;
  const medicalProfile = await db.playerMedicalProfile.findUnique({
    where: { playerId: player.id },
    select: {
      fitnessStatus: true,
      bloodType: true,
      emergencyContactName: true,
      emergencyContactPhone: true,
      allergies: true,
      note: true,
    },
  });
  return { ...player, medicalProfile: medicalProfile ?? null };
}

export async function getPlayerStats(playerId: string): Promise<PlayerStats> {
  return cachedFn(keys.playerStats(playerId), ttl.COMPUTED, async () => {
    const [events, matchCount, startCount] = await Promise.all([
      db.matchEvent.groupBy({
        by: ["eventType"],
        where: { playerId, deletedAt: null },
        _count: { eventType: true },
      }),
      db.matchLineup.count({ where: { playerId } }),
      db.matchLineup.count({ where: { playerId, isStarter: true } }),
    ]);

    const byType = Object.fromEntries(events.map((e) => [e.eventType, e._count.eventType]));

    return {
      tries:         byType["try"]          ?? 0,
      conversions:   byType["conversion"]   ?? 0,
      penalties:     byType["penalty"]      ?? 0,
      dropGoals:     byType["drop_goal"]    ?? 0,
      yellowCards:   byType["yellow_card"]  ?? 0,
      redCards:      byType["red_card"]     ?? 0,
      matchesPlayed: matchCount,
      startersCount: startCount,
    };
  });
}

export async function getPlayerTournamentHistory(playerId: string): Promise<TournamentHistoryItem[]> {
  const lineups = await db.matchLineup.findMany({
    where: { playerId },
    include: {
      match: {
        include: {
          tournament: {
            select: { id: true, name: true, code: true, startsAt: true, endsAt: true, status: true },
          },
        },
      },
      team: { select: { name: true } },
    },
    orderBy: { match: { scheduledAt: "desc" } },
    take: 200,
  });

  const map = new Map<string, TournamentHistoryItem>();
  for (const lineup of lineups) {
    const t = lineup.match.tournament;
    const entry = map.get(t.id);
    if (entry) {
      entry.matchCount += 1;
    } else {
      map.set(t.id, { tournament: t, matchCount: 1, teamName: lineup.team?.name ?? null });
    }
  }
  return Array.from(map.values());
}

export async function getPlayerReliabilityHistory(playerId: string): Promise<ReliabilityDataPoint[]> {
  return db.reliabilitySnapshot.findMany({
    where: { playerId },
    orderBy: { computedAt: "asc" },
    select: { score: true, computedAt: true },
  });
}

export async function updatePlayerProfile(playerId: string, userId: string, data: UpdateProfileInput) {
  return db.player.update({
    where: { id: playerId, userId },
    data: {
      fullName: data.fullName,
      ...(data.jerseyNumber !== undefined && { jerseyNumber: data.jerseyNumber }),
      ...(data.position !== undefined && { position: data.position }),
    },
  });
}

export async function generatePlayerQrToken(
  playerId: string
): Promise<{ token: string; expiresAt: Date }> {
  const token = uuidv7(); // unique per rotation
  const expiresAt = new Date(Date.now() + 60_000);
  await db.playerQrToken.create({
    data: { id: uuidv7(), playerId, token, expiresAt },
  });
  return { token, expiresAt };
}

export async function getLatestReliabilityComponents(playerId: string): Promise<ReliabilityComponents | null> {
  const snap = await db.reliabilitySnapshot.findFirst({
    where: { playerId },
    orderBy: { computedAt: "desc" },
    select: { components: true },
  });
  if (!snap) return null;
  const parsed = ReliabilityComponentsSchema.safeParse(snap.components);
  return parsed.success ? parsed.data : null;
}

export async function updatePlayerByManager(playerId: string, teamId: string, data: UpdateProfileInput) {
  const player = await db.player.findFirst({ where: { id: playerId, teamId }, select: { id: true } });
  if (!player) throw new Error("Player not found in this squad");
  return db.player.update({
    where: { id: playerId },
    data: {
      fullName: data.fullName,
      ...(data.jerseyNumber !== undefined && { jerseyNumber: data.jerseyNumber }),
      ...(data.position !== undefined && { position: data.position }),
    },
  });
}

export async function removePlayerFromSquad(playerId: string, teamId: string): Promise<void> {
  const player = await db.player.findFirst({ where: { id: playerId, teamId }, select: { id: true } });
  if (!player) throw new Error("Player not found in this squad");
  await db.player.delete({ where: { id: playerId } });
}

export async function upsertMedicalProfile(playerId: string, data: UpdateMedicalProfileInput) {
  return db.playerMedicalProfile.upsert({
    where: { playerId },
    create: {
      id: uuidv7(),
      playerId,
      ...(data.fitnessStatus !== undefined && { fitnessStatus: data.fitnessStatus }),
      ...(data.bloodType !== undefined && { bloodType: data.bloodType }),
      ...(data.allergies !== undefined && { allergies: data.allergies }),
      ...(data.emergencyContactName !== undefined && {
        emergencyContactName: data.emergencyContactName,
      }),
      ...(data.emergencyContactPhone !== undefined && {
        emergencyContactPhone: data.emergencyContactPhone,
      }),
      ...(data.note !== undefined && { note: data.note }),
    },
    update: {
      ...(data.fitnessStatus !== undefined && { fitnessStatus: data.fitnessStatus }),
      ...(data.bloodType !== undefined && { bloodType: data.bloodType }),
      ...(data.allergies !== undefined && { allergies: data.allergies }),
      ...(data.emergencyContactName !== undefined && {
        emergencyContactName: data.emergencyContactName,
      }),
      ...(data.emergencyContactPhone !== undefined && {
        emergencyContactPhone: data.emergencyContactPhone,
      }),
      ...(data.note !== undefined && { note: data.note }),
    },
  });
}

export async function getPlayerMatchesInTournament(
  playerId: string,
  tournamentId: string
) {
  const lineups = await db.matchLineup.findMany({
    where: { playerId, match: { tournamentId, deletedAt: null } },
    include: {
      match: {
        include: {
          homeTeam: { select: { name: true } },
          awayTeam: { select: { name: true } },
          events: {
            where: { playerId, deletedAt: null },
            select: { eventType: true, minute: true },
          },
        },
      },
    },
    orderBy: [{ match: { scheduledAt: "asc" } }],
  });
  return lineups.map((l) => ({
    matchId: l.matchId,
    isStarter: l.isStarter,
    homeTeam: l.match.homeTeam.name,
    awayTeam: l.match.awayTeam.name,
    homeScore: l.match.homeScore,
    awayScore: l.match.awayScore,
    status: l.match.status,
    scheduledAt: l.match.scheduledAt,
    events: l.match.events,
  }));
}

export async function getPlayerStatsByTournament(
  playerId: string,
  tournamentId: string
): Promise<PlayerStats> {
  const [events, matchCount, startCount] = await Promise.all([
    db.matchEvent.groupBy({
      by: ["eventType"],
      where: { playerId, deletedAt: null, match: { tournamentId } },
      _count: { eventType: true },
    }),
    db.matchLineup.count({
      where: { playerId, match: { tournamentId } },
    }),
    db.matchLineup.count({
      where: { playerId, isStarter: true, match: { tournamentId } },
    }),
  ]);
  const byType = Object.fromEntries(events.map((e) => [e.eventType, e._count.eventType]));
  return {
    tries:         byType["try"]          ?? 0,
    conversions:   byType["conversion"]   ?? 0,
    penalties:     byType["penalty"]      ?? 0,
    dropGoals:     byType["drop_goal"]    ?? 0,
    yellowCards:   byType["yellow_card"]  ?? 0,
    redCards:      byType["red_card"]     ?? 0,
    matchesPlayed: matchCount,
    startersCount: startCount,
  };
}


export async function getPlayerName(playerId: string): Promise<string | null> {
  const row = await db.player.findUnique({ where: { id: playerId }, select: { fullName: true } });
  return row?.fullName ?? null;
}

export async function updatePlayerPhoto(playerId: string, userId: string, url: string): Promise<void> {
  await db.$transaction([
    db.player.update({ where: { id: playerId }, data: { photoUrl: url } }),
    db.user.update({ where: { id: userId }, data: { image: url } }),
  ]);
}
