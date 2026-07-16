"use server";
import { requireOrgAuth } from "@lib/auth/server";
import { getOrganizerTournament } from "@modules/tournament";
import { updateMatchMetadata, getMatchInTournament } from "@modules/match";
import { can } from "@modules/shared";
import { revalidatePath } from "next/cache";

export async function saveVideoUrlAction(matchId: string, videoUrl: string) {
  const session = await requireOrgAuth();
  const tournament = await getOrganizerTournament(session.user.id);
  if (!tournament) return;
  const allowed = await can(session.user.id, "tournament:score", { tournamentId: tournament.id });
  if (!allowed) return;
  const match = await getMatchInTournament(matchId, tournament.id);
  if (!match) return;

  await updateMatchMetadata(matchId, { videoUrl: videoUrl || null });
  revalidatePath(`/organizer/match/${matchId}`);
}
