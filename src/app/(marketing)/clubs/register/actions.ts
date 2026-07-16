"use server";

import { requireAuth } from "@lib/auth/server";
import { db } from "@lib/db";
import { createTeamWithSlots, CreatePublicTeamSchema } from "@modules/team";
import type { CreatePublicTeamInput } from "@modules/team";
import { getUploadUrl, getPublicUrl, storageKeys } from "@lib/storage";

export async function geocodeAddressAction(query: string): Promise<
  Array<{
    display_name: string;
    lat: string;
    lon: string;
  }>
> {
  if (!query.trim()) return [];

  const params = new URLSearchParams({
    q: query,
    format: "json",
    limit: "5",
    countrycodes: "my",
  });

  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?${params}`,
    {
      headers: {
        "User-Agent": "Skrammm/1.0 (skrammm.com)",
        "Accept-Language": "en",
      },
      next: { revalidate: 0 },
    }
  );

  if (!response.ok) return [];

  const results = (await response.json()) as Array<{
    display_name: string;
    lat: string;
    lon: string;
  }>;
  return results.map((r) => ({
    display_name: r.display_name,
    lat: r.lat,
    lon: r.lon,
  }));
}

export async function submitRegistrationAction(
  input: CreatePublicTeamInput
): Promise<{ ok: true; slug: string; teamId: string } | { ok: false; error: string }> {
  const session = await requireAuth();

  const existingTeam = await db.team.findFirst({
    where: {
      staff: { some: { userId: session.user.id, isPrimaryManager: true } },
    },
    select: { slug: true, id: true },
  });

  if (existingTeam) {
    return { ok: true, slug: existingTeam.slug, teamId: existingTeam.id };
  }

  const parsed = CreatePublicTeamSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid club data" };
  }

  try {
    const team = await createTeamWithSlots(session.user.id, parsed.data);
    return { ok: true, slug: team.slug, teamId: team.id };
  } catch {
    return { ok: false, error: "Failed to create club. Please try again." };
  }
}

export async function getRegistrationLogoUploadUrl(
  teamId: string,
  contentType: string
): Promise<string> {
  const session = await requireAuth();
  const team = await db.team.findFirst({
    where: { id: teamId, staff: { some: { userId: session.user.id } } },
    select: { id: true },
  });
  if (!team) throw new Error("Unauthorized");
  const ext =
    contentType === "image/png"
      ? "png"
      : contentType === "image/webp"
      ? "webp"
      : contentType === "image/gif"
      ? "gif"
      : "jpg";
  const key = storageKeys.teamLogo(teamId, ext);
  return getUploadUrl(key, contentType);
}

export async function confirmLogoUploadAction(
  teamId: string,
  contentType: string
): Promise<void> {
  const session = await requireAuth();
  const team = await db.team.findFirst({
    where: { id: teamId, staff: { some: { userId: session.user.id } } },
    select: { id: true },
  });
  if (!team) return;
  const ext =
    contentType === "image/png"
      ? "png"
      : contentType === "image/webp"
      ? "webp"
      : contentType === "image/gif"
      ? "gif"
      : "jpg";
  const key = storageKeys.teamLogo(teamId, ext);
  const url = getPublicUrl(key);
  await db.team.update({ where: { id: teamId }, data: { logoUrl: url } });
}
