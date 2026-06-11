import { db } from "@lib/db";
import { v4 as uuidv4 } from "uuid";
import type { UpsertMedicalProfileInput, CreateInjuryReportInput } from "./types";

export async function upsertMedicalProfile(
  input: UpsertMedicalProfileInput
): Promise<void> {
  await db.playerMedicalProfile.upsert({
    where: { playerId: input.playerId },
    create: {
      id: uuidv4(),
      playerId: input.playerId,
      ...(input.fitnessStatus !== undefined ? { fitnessStatus: input.fitnessStatus } : {}),
      injuryType: input.injuryType ?? null,
      bodyPart: input.bodyPart ?? null,
      expectedReturnAt: input.expectedReturnAt ?? null,
      allergies: input.allergies ?? null,
      bloodType: input.bloodType ?? null,
      emergencyContactName: input.emergencyContactName ?? null,
      emergencyContactPhone: input.emergencyContactPhone ?? null,
      note: input.note ?? null,
    },
    update: {
      ...(input.fitnessStatus !== undefined ? { fitnessStatus: input.fitnessStatus } : {}),
      injuryType: input.injuryType ?? null,
      bodyPart: input.bodyPart ?? null,
      expectedReturnAt: input.expectedReturnAt ?? null,
      allergies: input.allergies ?? null,
      bloodType: input.bloodType ?? null,
      emergencyContactName: input.emergencyContactName ?? null,
      emergencyContactPhone: input.emergencyContactPhone ?? null,
      note: input.note ?? null,
    },
  });
}

export async function getMedicalProfile(playerId: string) {
  return db.playerMedicalProfile.findUnique({ where: { playerId } });
}

export async function createInjuryReport(
  recordedByUserId: string,
  input: CreateInjuryReportInput
) {
  return db.matchInjuryReport.create({
    data: {
      id: uuidv4(),
      matchId: input.matchId,
      playerId: input.playerId,
      injuryType: input.injuryType,
      bodyPart: input.bodyPart ?? null,
      severity: input.severity,
      actionTaken: input.actionTaken ?? null,
      note: input.note ?? null,
      recordedByUserId,
    },
    select: { id: true },
  });
}

export async function getInjuryReportsForMatch(matchId: string) {
  const reports = await db.matchInjuryReport.findMany({
    where: { matchId },
    orderBy: { createdAt: "asc" },
  });
  const playerIds = [...new Set(reports.map((r) => r.playerId))];
  const players = await db.player.findMany({
    where: { id: { in: playerIds } },
    select: { id: true, fullName: true },
  });
  const byId = new Map(players.map((p) => [p.id, p]));
  return reports.map((r) => ({ ...r, player: byId.get(r.playerId) ?? null }));
}
