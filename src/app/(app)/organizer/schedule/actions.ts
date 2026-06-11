"use server";
import { requireOrgAuth } from "@lib/auth/server";
import { getOrganizerTournament } from "@modules/tournament";
import { updateMatchMetadata, getMatchInTournament } from "@modules/match";
import { can } from "@modules/shared";
import { revalidatePath } from "next/cache";

export async function saveMatchMetadataAction(
  matchId: string,
  data: { referee: string; venue: string; scheduledTime: string }
) {
  const session = await requireOrgAuth();
  const tournament = await getOrganizerTournament(session.user.id);
  if (!tournament) return;
  const allowed = await can(session.user.id, "tournament:edit", { tournamentId: tournament.id });
  if (!allowed) return;
  const match = await getMatchInTournament(matchId, tournament.id);
  if (!match) return;

  const parsedDate = data.scheduledTime ? new Date(data.scheduledTime) : null;
  await updateMatchMetadata(matchId, {
    refereeName: data.referee || null,
    pitch: data.venue || null,
    ...(parsedDate && !isNaN(parsedDate.getTime()) ? { scheduledAt: parsedDate } : {}),
  });
  revalidatePath("/organizer/schedule");
}
