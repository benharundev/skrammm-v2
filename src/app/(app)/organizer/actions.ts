"use server";
import { requireOrgAuth } from "@lib/auth/server";
import { getOrganizerTournament } from "@modules/tournament";
import { getMatchInTournament, transitionMatchPhase } from "@modules/match";
import { can } from "@modules/shared";
import { revalidatePath } from "next/cache";

export async function startMatchAction(matchId: string) {
  const session = await requireOrgAuth();
  const tournament = await getOrganizerTournament(session.user.id);
  if (!tournament) return;
  const allowed = await can(session.user.id, "tournament:edit", { tournamentId: tournament.id });
  if (!allowed) return;
  const match = await getMatchInTournament(matchId, tournament.id);
  if (!match) return;
  await transitionMatchPhase(matchId, "live");
  revalidatePath("/organizer");
  revalidatePath("/organizer/schedule");
}
