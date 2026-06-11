"use server";

import { redirect } from "next/navigation";
import { requireOrgAuth } from "@lib/auth/server";
import { createTournament, CreateTournamentSchema, inferFormat } from "@modules/tournament";
import type { Route } from "next";

export async function launchTournamentAction(
  formData: FormData
): Promise<{ error: string } | undefined> {
  const session = await requireOrgAuth();
  // No can() check: tournament does not exist yet. Creator becomes organizer via createTournament().

  const teamCount = Number(formData.get("teamCount") ?? 16);
  const rawFormat = formData.get("format");

  const parsed = CreateTournamentSchema.safeParse({
    name: formData.get("name"),
    code: formData.get("code"),
    format: rawFormat ?? inferFormat(teamCount),
    startsAt: formData.get("startsAt") ? new Date(formData.get("startsAt") as string) : undefined,
    endsAt: formData.get("endsAt") ? new Date(formData.get("endsAt") as string) : undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Invalid input" };
  }

  try {
    await createTournament(session.user.id, parsed.data);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to create tournament" };
  }

  redirect("/organizer" as Route);
}
