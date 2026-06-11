import { db } from "@lib/db";
import { v4 as uuidv4 } from "uuid";
import { validateToken } from "@lib/qr";
import type { ScanPlayerQrInput, TeamCheckInInput } from "./types";

// ---------------------------------------------------------------------------
// Player-level scan (manager pitch-side) — M-2
// ---------------------------------------------------------------------------

export async function scanPlayerQr(
  scannedByUserId: string,
  input: ScanPlayerQrInput,
  meta: { ip?: string; userAgent?: string }
): Promise<{ playerId: string }> {
  if (input.isManualOverride) {
    // Manual override path — requires a player ID passed differently; log it
    throw new Error("Manual override requires explicit player selection");
  }

  const result = await validateToken(input.token, input.matchId);
  if (!result.valid) {
    throw new Error(`QR validation failed: ${result.reason}`);
  }

  const match = await db.match.findUnique({
    where: { id: input.matchId },
    select: { scheduledAt: true },
  });

  const minutesLate = match
    ? Math.max(0, Math.floor((Date.now() - match.scheduledAt.getTime()) / 60_000))
    : null;

  await db.attendanceScan.create({
    data: {
      id: uuidv4(),
      matchId: input.matchId,
      playerId: result.playerId,
      teamId: input.teamId,
      scannedByUserId,
      scheduledArrivalAt: match?.scheduledAt ?? null,
      minutesLate,
      qrTokenId: result.tokenId,
      ip: meta.ip ?? null,
      userAgent: meta.userAgent ?? null,
      isManualOverride: false,
    },
  });

  return { playerId: result.playerId };
}

export async function manualOverrideScan(
  scannedByUserId: string,
  matchId: string,
  playerId: string,
  teamId: string,
  meta: { ip?: string; userAgent?: string }
): Promise<void> {
  const match = await db.match.findUnique({
    where: { id: matchId },
    select: { scheduledAt: true },
  });

  const minutesLate = match
    ? Math.max(0, Math.floor((Date.now() - match.scheduledAt.getTime()) / 60_000))
    : null;

  await db.attendanceScan.create({
    data: {
      id: uuidv4(),
      matchId,
      playerId,
      teamId,
      scannedByUserId,
      scheduledArrivalAt: match?.scheduledAt ?? null,
      minutesLate,
      isManualOverride: true,
      ip: meta.ip ?? null,
      userAgent: meta.userAgent ?? null,
    },
  });
}

// ---------------------------------------------------------------------------
// Team-level check-in (organizer desk) — O-7
// ATTENDANCE BOUNDARY: does NOT feed the reliability score
// ---------------------------------------------------------------------------

export async function teamCheckIn(
  checkedInByUserId: string,
  input: TeamCheckInInput
): Promise<void> {
  await db.teamAttendance.create({
    data: {
      id: uuidv4(),
      tournamentId: input.tournamentId,
      matchId: input.matchId,
      teamId: input.teamId,
      checkedInByUserId,
    },
  });
}

export async function getAttendanceForMatch(matchId: string) {
  const scans = await db.attendanceScan.findMany({
    where: { matchId },
    orderBy: { scannedAt: "asc" },
  });
  const playerIds = [...new Set(scans.map((s) => s.playerId))];
  const players = await db.player.findMany({
    where: { id: { in: playerIds } },
    select: {
      id: true,
      fullName: true,
      jerseyNumber: true,
      position: true,
      photoUrl: true,
      teamId: true,
    },
  });
  const byId = new Map(players.map((p) => [p.id, p]));
  return scans.map((scan) => ({ ...scan, player: byId.get(scan.playerId) ?? null }));
}
