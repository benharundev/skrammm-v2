"use server";
import { requireOrgAuth } from "@lib/auth/server";
import { approveTournamentTeam, getOrganizerTournament, listPendingTeams } from "@modules/tournament";
import { can } from "@modules/shared";
import { revalidatePath } from "next/cache";

async function getVerifiedTournamentForTeam(userId: string, teamId: string) {
  const tournament = await getOrganizerTournament(userId);
  if (!tournament) return null;
  const allowed = await can(userId, "tournament:edit", { tournamentId: tournament.id });
  if (!allowed) return null;
  // Verify teamId belongs to this tournament — prevents BOLA on teamId
  const pending = await listPendingTeams(tournament.id);
  const isMember = pending.some(t => t.teamId === teamId);
  if (!isMember) return null;
  return tournament;
}

export async function approveTeamAction(teamId: string) {
  const session = await requireOrgAuth();
  const tournament = await getVerifiedTournamentForTeam(session.user.id, teamId);
  if (!tournament) return;
  await approveTournamentTeam({ tournamentId: tournament.id, teamId, approved: true });
  revalidatePath("/organizer/teams");
}

export async function rejectTeamAction(teamId: string) {
  const session = await requireOrgAuth();
  const tournament = await getVerifiedTournamentForTeam(session.user.id, teamId);
  if (!tournament) return;
  await approveTournamentTeam({ tournamentId: tournament.id, teamId, approved: false });
  revalidatePath("/organizer/teams");
}
