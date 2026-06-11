"use server";
import { requireAuth } from "@lib/auth/server";
import { getManagerTeam } from "@modules/team";
import { can } from "@modules/shared/auth/can";
import { updatePlayerByManager, removePlayerFromSquad } from "@modules/player";
import { UpdateProfileSchema } from "@modules/player";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function updatePlayerAction(playerId: string, formData: FormData): Promise<void> {
  const session = await requireAuth();
  const team = await getManagerTeam(session.user.id);
  if (!team) return;

  const allowed = await can(session.user.id, "team:manage", { teamId: team.id });
  if (!allowed) return;

  // verify player belongs to this team before mutating
  const player = team.players.find((p) => p.id === playerId);
  if (!player) return;

  const jerseyRaw = formData.get("jerseyNumber");
  const raw = {
    fullName: formData.get("fullName"),
    jerseyNumber: jerseyRaw ? Number(jerseyRaw) : undefined,
    position: (formData.get("position") as string) || undefined,
  };
  const parsed = UpdateProfileSchema.safeParse(raw);
  if (!parsed.success) return;

  await updatePlayerByManager(playerId, team.id, parsed.data);
  revalidatePath("/tm/squad");
  redirect(`/tm/squad/${playerId}`);
}

export async function deletePlayerAction(playerId: string): Promise<void> {
  const session = await requireAuth();
  const team = await getManagerTeam(session.user.id);
  if (!team) return;

  const allowed = await can(session.user.id, "team:manage", { teamId: team.id });
  if (!allowed) return;

  const player = team.players.find((p) => p.id === playerId);
  if (!player) return;

  try {
    await removePlayerFromSquad(playerId, team.id);
  } catch {
    return;
  }

  revalidatePath("/tm/squad");
  redirect("/tm/squad");
}
