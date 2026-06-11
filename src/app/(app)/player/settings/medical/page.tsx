import { requireAuth } from "@lib/auth/server";
import {
  getClaimedPlayerForUser,
  upsertMedicalProfile,
  UpdateMedicalProfileSchema,
} from "@modules/player";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Heart, ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";

async function saveMedical(formData: FormData) {
  "use server";
  const session = await requireAuth();
  const player = await getClaimedPlayerForUser(session.user.id);
  if (!player) return;

  const raw = {
    fitnessStatus: (formData.get("fitnessStatus") as string) || undefined,
    bloodType: (formData.get("bloodType") as string) || undefined,
    allergies: (formData.get("allergies") as string) || undefined,
    emergencyContactName: (formData.get("emergencyContactName") as string) || undefined,
    emergencyContactPhone: (formData.get("emergencyContactPhone") as string) || undefined,
    note: (formData.get("note") as string) || undefined,
  };
  const parsed = UpdateMedicalProfileSchema.safeParse(raw);
  if (!parsed.success) return;

  await upsertMedicalProfile(player.id, parsed.data);
  redirect("/player/settings/medical");
}

export default async function MedicalSettingsPage() {
  const session = await requireAuth();
  const player = await getClaimedPlayerForUser(session.user.id);

  const medical = player?.medicalProfile;

  return (
    <div className="max-w-2xl space-y-6 p-4 md:p-8">
      <div className="flex items-center gap-3">
        <Link
          href={"/player/settings" as Route}
          className="flex h-8 w-8 items-center justify-center rounded-sm border-2 border-border bg-card shadow-brutalist-sm transition-shadow hover:shadow-brutalist"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="font-[family-name:var(--font-lexend)] text-2xl font-extrabold tracking-tight text-foreground">
          Medical &amp; Emergency
        </h1>
      </div>

      {!player ? (
        <div className="rounded-sm border-2 border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Claim your player profile first to manage medical information.
        </div>
      ) : (
        <section className="overflow-hidden rounded-sm border-2 border-border bg-card shadow-brutalist">
          <div className="flex items-center gap-3 border-b border-border p-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm bg-destructive text-white">
              <Heart className="h-4 w-4" />
            </div>
            <h2 className="font-[family-name:var(--font-lexend)] font-bold text-foreground">
              Medical Profile
            </h2>
          </div>

          <form action={saveMedical} className="space-y-5 p-4">
            {/* Fitness status — native select to keep this a server component */}
            <div className="space-y-1.5">
              <Label htmlFor="fitnessStatus">Fitness Status</Label>
              <select
                id="fitnessStatus"
                name="fitnessStatus"
                defaultValue={medical?.fitnessStatus ?? "fit"}
                className="flex h-11 w-full rounded-sm border-2 border-border bg-card px-3 py-1 text-sm shadow-brutalist-sm focus:border-fair-play-gold focus:outline-none focus:ring-0"
              >
                <option value="fit">Fit</option>
                <option value="doubtful">Doubtful</option>
                <option value="out">Out</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="bloodType">Blood Type</Label>
                <Input
                  id="bloodType"
                  name="bloodType"
                  defaultValue={medical?.bloodType ?? ""}
                  placeholder="e.g. O+"
                  maxLength={10}
                  className="shadow-brutalist-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="allergies">Allergies</Label>
                <Input
                  id="allergies"
                  name="allergies"
                  defaultValue={medical?.allergies ?? ""}
                  placeholder="e.g. Penicillin"
                  className="shadow-brutalist-sm"
                />
              </div>
            </div>

            <div className="space-y-2 border-t border-border pt-4">
              <p className="font-[family-name:var(--font-lexend)] text-sm font-bold text-foreground">
                Emergency Contact
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="emergencyContactName">Name</Label>
                  <Input
                    id="emergencyContactName"
                    name="emergencyContactName"
                    defaultValue={medical?.emergencyContactName ?? ""}
                    placeholder="Full name"
                    className="shadow-brutalist-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="emergencyContactPhone">Phone</Label>
                  <Input
                    id="emergencyContactPhone"
                    name="emergencyContactPhone"
                    type="tel"
                    defaultValue={medical?.emergencyContactPhone ?? ""}
                    placeholder="+601x-xxxxxxx"
                    className="shadow-brutalist-sm"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="note">Notes</Label>
              <Textarea
                id="note"
                name="note"
                defaultValue={medical?.note ?? ""}
                placeholder="Any other medical notes for the team manager…"
                rows={3}
                className="resize-none shadow-brutalist-sm"
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-primary text-primary-foreground shadow-brutalist-sm"
            >
              Save Medical Info
            </Button>
          </form>
        </section>
      )}
    </div>
  );
}
