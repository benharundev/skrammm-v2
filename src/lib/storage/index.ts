import { Storage } from "@google-cloud/storage";

// On GCP Compute Engine, authentication is automatic via the attached service account.
// For local dev, set GOOGLE_APPLICATION_CREDENTIALS=/path/to/sa-key.json
const storage = new Storage();

const ASSETS_BUCKET = process.env.GCS_BUCKET_ASSETS ?? "skram-assets";
const CDN_URL = process.env.CLOUDFLARE_CDN_URL ?? "https://assets.skrammm.com";

// ---------------------------------------------------------------------------
// Pre-signed upload URL (15-minute TTL) — client uploads directly to GCS
// ---------------------------------------------------------------------------

export async function getUploadUrl(
  key: string,
  contentType: string
): Promise<string> {
  const [url] = await storage.bucket(ASSETS_BUCKET).file(key).getSignedUrl({
    version: "v4",
    action: "write",
    expires: Date.now() + 15 * 60 * 1000,
    contentType,
  });
  return url;
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
  await storage.bucket(ASSETS_BUCKET).file(key).delete();
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
