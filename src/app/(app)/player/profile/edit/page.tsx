import { requireAuth } from "@lib/auth/server";
import { getClaimedPlayerForUser, updatePlayerProfile, updatePlayerPhoto, UpdateProfileSchema } from "@modules/player";
import { can } from "@modules/shared";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ImageUpload } from "@/components/image-upload";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { getUploadUrl, getPublicUrl, storageKeys } from "@lib/storage";

async function getPlayerPhotoPresignedUrl() {
  "use server";
  const session = await requireAuth();
  const player = await getClaimedPlayerForUser(session.user.id);
  if (!player) throw new Error("No player found");
  const allowed = await can(session.user.id, "player:edit_self", { playerId: player.id });
  if (!allowed) throw new Error("Unauthorized");
  const key = storageKeys.playerPhoto(player.id);
  const presignedUrl = await getUploadUrl(key, "image/webp");
  return { presignedUrl };
}

async function savePlayerPhoto() {
  "use server";
  const session = await requireAuth();
  const player = await getClaimedPlayerForUser(session.user.id);
  if (!player) throw new Error("No player found");
  const allowed = await can(session.user.id, "player:edit_self", { playerId: player.id });
  if (!allowed) throw new Error("Unauthorized");
  const key = storageKeys.playerPhoto(player.id);
  const url = getPublicUrl(key);
  await updatePlayerPhoto(player.id, session.user.id, url);
  revalidatePath("/player/profile");
  revalidatePath("/player/profile/edit");
}

async function saveProfile(formData: FormData) {
  "use server";
  const session = await requireAuth();
  const player = await getClaimedPlayerForUser(session.user.id);
  if (!player) return;
  const raw = {
    fullName: formData.get("fullName") as string,
    jerseyNumber: formData.get("jerseyNumber")
      ? Number(formData.get("jerseyNumber"))
      : undefined,
    position: (formData.get("position") as string) || undefined,
  };
  const parsed = UpdateProfileSchema.safeParse(raw);
  if (!parsed.success) return;
  await updatePlayerProfile(player.id, session.user.id, parsed.data);
  redirect("/player/profile");
}

export default async function EditProfilePage() {
  const session = await requireAuth();
  const player = await getClaimedPlayerForUser(session.user.id);
  if (!player) notFound();

  return (
    <div className="max-w-lg space-y-6 p-4 md:p-8">
      <div className="flex items-center gap-3">
        <Link
          href={"/player/profile" as Route}
          className="flex h-8 w-8 items-center justify-center rounded-sm border-2 border-border bg-card shadow-brutalist-sm transition-shadow hover:shadow-brutalist"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="font-[family-name:var(--font-lexend)] text-2xl font-extrabold tracking-tight text-foreground">
          Edit Profile
        </h1>
      </div>
      <section className="flex justify-center overflow-hidden rounded-sm border-2 border-border bg-card shadow-brutalist p-6">
        <ImageUpload
          currentUrl={player.photoUrl ?? null}
          shape="circle"
          size={96}
          ariaLabel="Upload profile photo"
          getPresignedUrl={getPlayerPhotoPresignedUrl}
          onSaveKey={savePlayerPhoto}
        />
      </section>
      <section className="overflow-hidden rounded-sm border-2 border-border bg-card shadow-brutalist">
        <form action={saveProfile} className="space-y-4 p-4">
          <div className="space-y-1.5">
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              name="fullName"
              defaultValue={player.fullName}
              required
              minLength={2}
              maxLength={100}
              className="shadow-brutalist-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="jerseyNumber">Jersey Number</Label>
              <Input
                id="jerseyNumber"
                name="jerseyNumber"
                type="number"
                min="1"
                max="99"
                defaultValue={player.jerseyNumber ?? undefined}
                className="shadow-brutalist-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="position">Position</Label>
              <Input
                id="position"
                name="position"
                defaultValue={player.position ?? ""}
                placeholder="e.g. Flanker"
                className="shadow-brutalist-sm"
              />
            </div>
          </div>
          <Button
            type="submit"
            className="w-full bg-primary text-primary-foreground shadow-brutalist-sm"
          >
            Save Changes
          </Button>
        </form>
      </section>
    </div>
  );
}
