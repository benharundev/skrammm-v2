import { db } from "@lib/db";
import { v4 as uuidv4 } from "uuid";
import type { CreateSponsorInput } from "./types";

export async function createSponsor(input: CreateSponsorInput) {
  return db.sponsor.create({
    data: {
      id: uuidv4(),
      tournamentId: input.tournamentId,
      name: input.name,
      logoUrl: input.logoUrl ?? null,
      clickUrl: input.clickUrl ?? null,
      tier: input.tier ?? null,
      startsAt: input.startsAt ?? null,
      endsAt: input.endsAt ?? null,
    },
    select: { id: true },
  });
}

export async function getSponsorsByTournament(tournamentId: string) {
  return db.sponsor.findMany({
    where: { tournamentId },
    orderBy: { tier: "asc" },
  });
}

export async function recordImpression(sponsorId: string): Promise<void> {
  await db.sponsor.update({
    where: { id: sponsorId },
    data: { impressions: { increment: 1 } },
  });
}

export async function recordClick(sponsorId: string): Promise<void> {
  await db.sponsor.update({
    where: { id: sponsorId },
    data: { clicks: { increment: 1 } },
  });
}
