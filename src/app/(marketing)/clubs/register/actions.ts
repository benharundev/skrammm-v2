"use server";

import { requireAuth } from "@lib/auth/server";
import { db } from "@lib/db";
import { createTeamWithSlots, CreatePublicTeamSchema } from "@modules/team";
import type { CreatePublicTeamInput } from "@modules/team";

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
    countrycodes: "my", // Malaysia-focused
  });

  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?${params}`,
    {
      headers: {
        "User-Agent": "Skrammm/1.0 (skrammm.com)",
        "Accept-Language": "en",
      },
      next: { revalidate: 0 }, // never cache geocode results
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
): Promise<{ ok: true; slug: string } | { ok: false; error: string }> {
  const session = await requireAuth();

  // Check if this user already has a team (prevent duplicate registrations)
  const existingTeam = await db.team.findFirst({
    where: {
      staff: { some: { userId: session.user.id, isPrimaryManager: true } },
    },
    select: { slug: true },
  });

  if (existingTeam) {
    // User already has a team — just return their slug so they can go to /tm
    return { ok: true, slug: existingTeam.slug };
  }

  const parsed = CreatePublicTeamSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid club data" };
  }

  try {
    const team = await createTeamWithSlots(session.user.id, parsed.data);
    return { ok: true, slug: team.slug };
  } catch {
    return { ok: false, error: "Failed to create club. Please try again." };
  }
}
