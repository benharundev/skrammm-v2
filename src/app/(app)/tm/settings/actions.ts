"use server";

import { requireAuth } from "@lib/auth/server";
import { can } from "@modules/shared";
import {
  getManagerTeam,
  updateTeamSettings,
  UpdateTeamSettingsSchema,
  updateTeamLogo,
  updatePublicListing,
  UpdatePublicListingSchema,
  upsertTrainingSlots,
} from "@modules/team";
import type { TrainingSlotInput } from "@modules/team";
import { getClaimedPlayerForUser, updatePlayerProfile, UpdateProfileSchema } from "@modules/player";
import { revalidatePath } from "next/cache";
import { getUploadUrl, getPublicUrl, storageKeys } from "@lib/storage";

export async function updateTeamSettingsAction(formData: FormData): Promise<void> {
  const session = await requireAuth();
  const team = await getManagerTeam(session.user.id);
  if (!team) return;

  const allowed = await can(session.user.id, "team:manage", { teamId: team.id });
  if (!allowed) return;

  const raw = {
    name:           formData.get("name"),
    origin:         formData.get("origin"),
    trainingGround: formData.get("trainingGround"),
    contactEmail:   formData.get("contactEmail"),
    contactPhone:   formData.get("contactPhone"),
  };

  const parsed = UpdateTeamSettingsSchema.safeParse(raw);
  if (!parsed.success) return;

  await updateTeamSettings(team.id, parsed.data);
  revalidatePath("/tm/settings");
  revalidatePath("/tm");
}

export async function updatePersonalInfoAction(formData: FormData): Promise<void> {
  const session = await requireAuth();
  const player = await getClaimedPlayerForUser(session.user.id);
  if (!player) return;

  const raw = {
    fullName: formData.get("fullName"),
    jerseyNumber: formData.get("jerseyNumber") ? Number(formData.get("jerseyNumber")) : undefined,
    position: formData.get("position") || undefined,
  };

  const parsed = UpdateProfileSchema.safeParse(raw);
  if (!parsed.success) return;

  await updatePlayerProfile(player.id, session.user.id, parsed.data);
  revalidatePath("/tm/settings");
}

export async function getTeamLogoPresignedUrl(): Promise<{ presignedUrl: string }> {
  const session = await requireAuth();
  const team = await getManagerTeam(session.user.id);
  if (!team) throw new Error("No team found");
  const allowed = await can(session.user.id, "team:manage", { teamId: team.id });
  if (!allowed) throw new Error("Unauthorized");
  const key = storageKeys.teamLogo(team.id);
  const presignedUrl = await getUploadUrl(key, "image/webp");
  return { presignedUrl };
}

export async function saveTeamLogo(): Promise<void> {
  const session = await requireAuth();
  const team = await getManagerTeam(session.user.id);
  if (!team) throw new Error("No team found");
  const allowed = await can(session.user.id, "team:manage", { teamId: team.id });
  if (!allowed) throw new Error("Unauthorized");
  const key = storageKeys.teamLogo(team.id);
  const url = getPublicUrl(key);
  await updateTeamLogo(team.id, url);
  revalidatePath("/tm");
  revalidatePath("/tm/settings");
  revalidatePath("/organizer", "layout");
}

export async function updatePublicListingAction(formData: FormData): Promise<void> {
  const session = await requireAuth();
  const team = await getManagerTeam(session.user.id);
  if (!team) return;

  const allowed = await can(session.user.id, "team:manage", { teamId: team.id });
  if (!allowed) return;

  const raw = {
    isPublic: formData.get("isPublic") === "true",
    description: formData.get("description") || undefined,
  };

  const parsed = UpdatePublicListingSchema.safeParse(raw);
  if (!parsed.success) return;

  await updatePublicListing(team.id, parsed.data);
  revalidatePath("/tm/settings");
  revalidatePath("/clubs");
}

export async function upsertTrainingSlotsAction(slots: TrainingSlotInput[]): Promise<void> {
  const session = await requireAuth();
  const team = await getManagerTeam(session.user.id);
  if (!team) return;

  const allowed = await can(session.user.id, "team:manage", { teamId: team.id });
  if (!allowed) return;

  await upsertTrainingSlots(team.id, slots);
  revalidatePath("/tm/settings");
  revalidatePath("/clubs");
}
