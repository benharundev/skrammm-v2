import { db } from "@lib/db";
import { v4 as uuidv4 } from "uuid";
import { v7 as uuidv7 } from "uuid";
import type { CreateTeamInput, JoinTournamentInput, UpdateTeamSettingsInput } from "./types";

export async function createTeam(
  createdByUserId: string,
  input: CreateTeamInput
): Promise<{ id: string; slug: string }> {
  const slug = input.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  const team = await db.team.create({
    data: {
      id: uuidv4(),
      name: input.name,
      origin: input.origin ?? null,
      trainingGround: input.trainingGround ?? null,
      slug: `${slug}-${Date.now()}`,
      createdByUserId,
      staff: {
        create: {
          id: uuidv4(),
          userId: createdByUserId,
          role: "manager",
          isPrimaryManager: true,
        },
      },
    },
    select: { id: true, slug: true },
  });

  return team;
}

export async function getTeamById(teamId: string) {
  return db.team.findUnique({
    where: { id: teamId },
    include: {
      staff: { include: { user: true } },
      players: true,
    },
  });
}

export async function joinTournament(input: JoinTournamentInput): Promise<void> {
  await db.tournamentTeam.create({
    data: {
      id: uuidv4(),
      tournamentId: input.tournamentId,
      teamId: input.teamId,
      status: "pending_approval",
    },
  });
}

export async function getTeamsByManager(userId: string) {
  return db.team.findMany({
    where: {
      staff: { some: { userId, isPrimaryManager: true } },
    },
    include: { players: true },
  });
}

export async function getManagerTeam(userId: string) {
  const team = await db.team.findFirst({
    where: { staff: { some: { userId, isPrimaryManager: true } } },
    include: {
      players: { orderBy: { jerseyNumber: "asc" } },
      tournamentEntries: {
        include: {
          tournament: {
            select: { id: true, name: true, code: true, startsAt: true, endsAt: true, status: true },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!team) return null;

  const playerIds = team.players.map((p) => p.id);
  const medicalProfiles = await db.playerMedicalProfile.findMany({
    where: { playerId: { in: playerIds } },
    select: {
      playerId: true,
      fitnessStatus: true,
      bloodType: true,
      emergencyContactName: true,
      emergencyContactPhone: true,
    },
  });
  const medByPlayer = new Map(medicalProfiles.map((m) => [m.playerId, m]));

  return {
    ...team,
    players: team.players.map((p) => ({
      ...p,
      medicalProfile: medByPlayer.get(p.id) ?? null,
    })),
  };
}

export async function updateTeamSettings(teamId: string, input: UpdateTeamSettingsInput): Promise<void> {
  await db.team.update({
    where: { id: teamId },
    data: {
      name:           input.name,
      origin:         input.origin || null,
      trainingGround: input.trainingGround || null,
      contactEmail:   input.contactEmail || null,
      contactPhone:   input.contactPhone || null,
    },
  });
}

export async function joinTournamentByCode(
  teamId: string,
  code: string
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const tournament = await db.tournament.findUnique({
    where: { code: code.toUpperCase() },
    select: { id: true, status: true },
  });
  if (!tournament) return { ok: false, reason: "Tournament not found" };
  if (tournament.status === "completed" || tournament.status === "cancelled") {
    return { ok: false, reason: "Tournament no longer accepting teams" };
  }
  const existing = await db.tournamentTeam.findFirst({
    where: { tournamentId: tournament.id, teamId },
    select: { id: true },
  });
  if (existing) return { ok: false, reason: "Already joined" };
  await db.tournamentTeam.create({
    data: { id: uuidv7(), tournamentId: tournament.id, teamId, status: "pending_approval" },
  });
  return { ok: true };
}

export async function hasTeamTournaments(teamId: string): Promise<boolean> {
  const count = await db.tournamentTeam.count({ where: { teamId } });
  return count > 0;
}

export async function updateTeamLogo(teamId: string, url: string): Promise<void> {
  await db.team.update({ where: { id: teamId }, data: { logoUrl: url } });
}
