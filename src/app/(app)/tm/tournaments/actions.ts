"use server";

import { requireAuth } from "@lib/auth/server";
import { getManagerTeam, joinTournamentByCode, JoinByCodeSchema } from "@modules/team";
import { can } from "@modules/shared/auth/can";
import { revalidatePath } from "next/cache";

export async function joinTournamentAction(formData: FormData) {
  const session = await requireAuth();
  const team = await getManagerTeam(session.user.id);
  if (!team) return { ok: false, reason: "Team not found" };

  const allowed = await can(session.user.id, "team:manage", { teamId: team.id });
  if (!allowed) return { ok: false, reason: "Forbidden" };

  const parsed = JoinByCodeSchema.safeParse({ code: formData.get("code") });
  if (!parsed.success) return { ok: false, reason: "Invalid code format" };

  const result = await joinTournamentByCode(team.id, parsed.data.code);
  if (result.ok) {
    revalidatePath("/tm/tournaments");
  }
  return result;
}
