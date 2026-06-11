import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";
import { db } from "@lib/db";

// ---------------------------------------------------------------------------
// QR token security model (TECH_PRD §8)
// - Token encodes a rotating opaque value, NOT the player ID
// - HMAC-SHA256 signed so Nginx / edge can do offline verification if needed
// - Rotates every 60 seconds; old token immediately invalidated on rotation
// - Server checks: valid + unexpired, player on team in match, scan window
//   open (±2 h), no prior scan for player+match
// ---------------------------------------------------------------------------

const HMAC_SECRET = process.env.QR_HMAC_SECRET ?? "";
const TOKEN_TTL_SECONDS = 60;
const SCAN_WINDOW_HOURS = 2;

// ---------------------------------------------------------------------------
// Signing helpers
// ---------------------------------------------------------------------------

function sign(value: string): string {
  return crypto
    .createHmac("sha256", HMAC_SECRET)
    .update(value)
    .digest("hex");
}

function buildSignedToken(rawToken: string): string {
  const sig = sign(rawToken);
  return `${rawToken}.${sig}`;
}

function verifySignature(signedToken: string): string | null {
  const lastDot = signedToken.lastIndexOf(".");
  if (lastDot === -1) return null;
  const rawToken = signedToken.slice(0, lastDot);
  const providedSig = signedToken.slice(lastDot + 1);
  const expectedSig = sign(rawToken);
  const match = crypto.timingSafeEqual(
    Buffer.from(providedSig, "hex"),
    Buffer.from(expectedSig, "hex")
  );
  return match ? rawToken : null;
}

// ---------------------------------------------------------------------------
// Generate a new QR token for a player (writes to DB)
// ---------------------------------------------------------------------------

export async function generateToken(playerId: string): Promise<string> {
  const rawToken = uuidv4().replace(/-/g, "");
  const signedToken = buildSignedToken(rawToken);
  const expiresAt = new Date(Date.now() + TOKEN_TTL_SECONDS * 1000);

  await db.playerQrToken.create({
    data: {
      id: uuidv4(),
      playerId,
      token: signedToken,
      expiresAt,
    },
  });

  return signedToken;
}

// ---------------------------------------------------------------------------
// Rotate: invalidate the current token, issue a new one
// ---------------------------------------------------------------------------

export async function rotateToken(playerId: string): Promise<string> {
  // Delete all expired tokens for this player first (housekeeping)
  // Exclude tokens already referenced by an attendance scan (via qrTokenId)
  const linkedTokenIds = (
    await db.attendanceScan.findMany({
      where: { playerId },
      select: { qrTokenId: true },
    })
  )
    .map((s) => s.qrTokenId)
    .filter((id): id is string => id !== null);
  await db.playerQrToken.deleteMany({
    where: {
      playerId,
      expiresAt: { lt: new Date() },
      ...(linkedTokenIds.length > 0 ? { id: { notIn: linkedTokenIds } } : {}),
    },
  });

  const rawToken = uuidv4().replace(/-/g, "");
  const signedToken = buildSignedToken(rawToken);
  const expiresAt = new Date(Date.now() + TOKEN_TTL_SECONDS * 1000);

  const existing = await db.playerQrToken.findFirst({
    where: { playerId, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });

  await db.playerQrToken.create({
    data: {
      id: uuidv4(),
      playerId,
      token: signedToken,
      expiresAt,
      rotatedFromId: existing?.id ?? null,
    },
  });

  return signedToken;
}

// ---------------------------------------------------------------------------
// Validation result
// ---------------------------------------------------------------------------

export type TokenValidationResult =
  | { valid: true; playerId: string; tokenId: string }
  | { valid: false; reason: string };

// ---------------------------------------------------------------------------
// Validate a scanned token for a given match
// ---------------------------------------------------------------------------

export async function validateToken(
  signedToken: string,
  matchId: string
): Promise<TokenValidationResult> {
  // 1. Verify HMAC signature
  const rawToken = verifySignature(signedToken);
  if (!rawToken) {
    return { valid: false, reason: "invalid_signature" };
  }

  // 2. Look up token in DB
  const qrToken = await db.playerQrToken.findUnique({
    where: { token: signedToken },
    include: {
      player: {
        include: {
          team: {
            include: {
              homeMatches: { where: { id: matchId } },
              awayMatches: { where: { id: matchId } },
            },
          },
        },
      },
    },
  });

  if (!qrToken) {
    return { valid: false, reason: "token_not_found" };
  }

  // 3. Check expiry
  if (qrToken.expiresAt < new Date()) {
    return { valid: false, reason: "token_expired" };
  }

  // 4. Verify player is on a team in this match
  const { player } = qrToken;
  const isInMatch =
    player.team.homeMatches.length > 0 || player.team.awayMatches.length > 0;
  if (!isInMatch) {
    return { valid: false, reason: "player_not_in_match" };
  }

  // 5. Check scan window (±2 h around kickoff)
  const match = await db.match.findUnique({ where: { id: matchId } });
  if (!match) {
    return { valid: false, reason: "match_not_found" };
  }
  const kickoff = match.scheduledAt.getTime();
  const now = Date.now();
  const windowMs = SCAN_WINDOW_HOURS * 60 * 60 * 1000;
  if (now < kickoff - windowMs || now > kickoff + windowMs) {
    return { valid: false, reason: "outside_scan_window" };
  }

  // 6. Prevent duplicate scan for player+match
  const existingScan = await db.attendanceScan.findUnique({
    where: { matchId_playerId: { matchId, playerId: player.id } },
  });
  if (existingScan) {
    return { valid: false, reason: "already_scanned" };
  }

  return { valid: true, playerId: player.id, tokenId: qrToken.id };
}
