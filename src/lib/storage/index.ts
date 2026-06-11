import {
  S3Client,
  DeleteObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3 = new S3Client({ region: process.env.AWS_REGION ?? "ap-southeast-1" });

const ASSETS_BUCKET = process.env.S3_BUCKET_ASSETS ?? "skram-assets";
const CDN_URL = process.env.CLOUDFLARE_CDN_URL ?? "https://assets.skrammm.com";

// ---------------------------------------------------------------------------
// Pre-signed upload URL (15-minute TTL) — client uploads directly to S3
// ---------------------------------------------------------------------------

export async function getUploadUrl(
  key: string,
  contentType: string
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: ASSETS_BUCKET,
    Key: key,
    ContentType: contentType,
    CacheControl: "public, max-age=0, must-revalidate",
  });
  return getSignedUrl(s3, command, { expiresIn: 900 });
}

// ---------------------------------------------------------------------------
// Public CDN URL — Cloudflare-fronted, no signing needed for public objects
// ---------------------------------------------------------------------------

export function getPublicUrl(key: string): string {
  return `${CDN_URL}/${key}`;
}

// ---------------------------------------------------------------------------
// Delete an object from the assets bucket
// ---------------------------------------------------------------------------

export async function deleteObject(key: string): Promise<void> {
  await s3.send(
    new DeleteObjectCommand({ Bucket: ASSETS_BUCKET, Key: key })
  );
}

// ---------------------------------------------------------------------------
// Canonical key helpers — keep key structure consistent across the app
// ---------------------------------------------------------------------------

export const storageKeys = {
  teamLogo: (teamId: string, ext = "webp") => `teams/${teamId}/logo.${ext}`,
  playerPhoto: (playerId: string, ext = "webp") =>
    `players/${playerId}/photo.${ext}`,
  performanceCard: (
    playerId: string,
    tournamentId: string,
    statsHash: string
  ) => `cards/${playerId}/${tournamentId}/${statsHash}.png`,
  sponsorLogo: (sponsorId: string, ext = "webp") =>
    `sponsors/${sponsorId}/logo.${ext}`,
};
