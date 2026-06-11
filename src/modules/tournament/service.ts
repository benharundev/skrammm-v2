import { db } from "@lib/db";
import { v4 as uuidv4 } from "uuid";
import type { Prisma } from "@prisma/client";
import type {
  CreateTournamentInput,
  ApproveTournamentTeamInput,
  UpdateTournamentSettingsInput,
} from "./types";
import { RESERVED_CODES } from "./types";

export async function createTournament(
  organizerUserId: string,
  input: CreateTournamentInput
): Promise<{ id: string; code: string }> {
  const code = input.code.toLowerCase();

  if (RESERVED_CODES.has(code)) {
    throw new Error("Tournament code is reserved");
  }

  const existing = await db.tournament.findUnique({ where: { code } });
  if (existing) {
    throw new Error("Tournament code already taken");
  }

  const slug = `${code}-${Date.now()}`;
  const tournament = await db.tournament.create({
    data: {
      id: uuidv4(),
      name: input.name,
      code,
      slug,
      organizerUserId,
      format: input.format,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      dailyStartTime: input.dailyStartTime ?? null,
      dailyEndTime: input.dailyEndTime ?? null,
      ...(input.branding !== undefined ? { branding: input.branding as Prisma.InputJsonObject } : {}),
    },
    select: { id: true, code: true },
  });

  return tournament;
}

export async function getTournamentByCode(code: string) {
  return db.tournament.findUnique({
    where: { code: code.toLowerCase() },
    include: {
      teams: {
        where: { status: "approved" },
        include: { team: true },
      },
    },
  });
}

export async function getTournamentPublic(tournamentId: string) {
  return db.tournament.findUnique({
    where: { id: tournamentId },
    select: {
      id: true,
      code: true,
      name: true,
      format: true,
      status: true,
      startsAt: true,
      endsAt: true,
      branding: true,
      teams: {
        where: { status: "approved" },
        select: { team: { select: { id: true, name: true, logoUrl: true } } },
      },
    },
  });
}

export async function approveTournamentTeam(
  input: ApproveTournamentTeamInput
): Promise<void> {
  await db.tournamentTeam.update({
    where: {
      tournamentId_teamId: {
        tournamentId: input.tournamentId,
        teamId: input.teamId,
      },
    },
    data: { status: input.approved ? "approved" : "rejected" },
  });
}

export async function listPendingTeams(tournamentId: string) {
  return db.tournamentTeam.findMany({
    where: { tournamentId, status: "pending_approval" },
    include: { team: true },
  });
}

// Returns the organizer's most recent tournament (newest first)
export async function getOrganizerTournament(userId: string) {
  return db.tournament.findFirst({
    where: { organizerUserId: userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      code: true,
      format: true,
      status: true,
      startsAt: true,
      endsAt: true,
      dailyStartTime: true,
      dailyEndTime: true,
      branding: true,
    },
  });
}

// Returns tournament + all teams (pending + approved) for organizer views
export async function getOrganizerWithTeams(userId: string) {
  return db.tournament.findFirst({
    where: { organizerUserId: userId },
    orderBy: { createdAt: "desc" },
    include: {
      teams: {
        include: {
          team: {
            include: {
              staff: {
                where: { isPrimaryManager: true },
                include: { user: { select: { name: true, email: true } } },
              },
              _count: { select: { players: true } },
            },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });
}

// Returns approved teams for a tournament
export async function getApprovedTeams(tournamentId: string) {
  return db.tournamentTeam.findMany({
    where: { tournamentId, status: "approved" },
    include: {
      team: {
        include: {
          staff: {
            where: { isPrimaryManager: true },
            include: { user: { select: { name: true, email: true } } },
          },
          _count: { select: { players: true } },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });
}

// Updates tournament settings
export async function updateTournamentSettings(
  tournamentId: string,
  input: UpdateTournamentSettingsInput
): Promise<void> {
  await db.tournament.update({
    where: { id: tournamentId },
    data: {
      name: input.name,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      dailyStartTime: input.dailyStartTime,
      dailyEndTime: input.dailyEndTime,
    },
  });
}

export async function getTournamentById(id: string): Promise<{ id: string; name: string; code: string } | null> {
  return db.tournament.findUnique({ where: { id }, select: { id: true, name: true, code: true } });
}
