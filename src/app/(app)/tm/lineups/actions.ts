"use server";
import { requireAuth } from "@lib/auth/server";
import { getManagerTeam } from "@modules/team";
import { can } from "@modules/shared";
import { getTeamMatch, saveMatchLineup } from "@modules/match";
import { cache as libCache, keys } from "@lib/cache";
import { redirect } from "next/navigation";

export async function saveLineupAction(formData: FormData): Promise<void> {
  const session = await requireAuth();
  const team = await getManagerTeam(session.user.id);
  if (!team) return;

  const matchId = formData.get("matchId");
  if (typeof matchId !== "string") return;

  const allowed = await can(session.user.id, "team:set_lineup", { teamId: team.id });
  if (!allowed) return;

  const match = await getTeamMatch(matchId, team.id);
  if (!match) return;

  const starterIds = formData.getAll("starters").filter((v): v is string => typeof v === "string");
  await saveMatchLineup(matchId, team.id, starterIds);
  await libCache.del(keys.teamRrs(team.id));
  redirect(`/tm/lineups?matchId=${matchId}`);
}
