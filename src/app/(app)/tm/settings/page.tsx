import { requireAuth } from "@lib/auth/server";
import { getManagerTeam } from "@modules/team";
import { getClaimedPlayerForUser } from "@modules/player";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, User } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { updateTeamSettingsAction, updatePersonalInfoAction, getTeamLogoPresignedUrl, saveTeamLogo } from "./actions";
import { RUGBY_POSITIONS } from "@lib/constants/rugby-positions";
import { ImageUpload } from "@/components/image-upload";

export default async function TeamSettingsPage() {
  const session = await requireAuth();
  const [team, playerProfile] = await Promise.all([
    getManagerTeam(session.user.id),
    getClaimedPlayerForUser(session.user.id),
  ]);
  if (!team) notFound();

  return (
    <div className="max-w-lg space-y-6 p-4 md:p-8">
      <div className="flex items-center gap-3">
        <Link
          href={"/tm" as Route}
          className="flex h-8 w-8 items-center justify-center rounded-sm border-2 border-border bg-card shadow-brutalist-sm transition-shadow hover:shadow-brutalist"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="font-[family-name:var(--font-lexend)] text-2xl font-extrabold tracking-tight text-foreground">
            Club Settings
          </h1>
          <p className="text-sm text-muted-foreground">{team.name}</p>
        </div>
      </div>

      <section className="space-y-4">
        <div className="space-y-1">
          <h2 className="font-[family-name:var(--font-lexend)] text-sm font-bold uppercase tracking-widest text-muted-foreground">
            Personal Info
          </h2>
          <p className="text-xs text-muted-foreground">Your player identity on the squad.</p>
        </div>

        {playerProfile ? (
          <form action={updatePersonalInfoAction} className="overflow-hidden rounded-sm border-2 border-border bg-card shadow-brutalist">
            <div className="divide-y divide-border">
              {/* Full Name */}
              <div className="flex items-center gap-4 p-4">
                <label className="w-32 shrink-0 text-sm font-medium text-foreground">Full Name</label>
                <input
                  name="fullName"
                  defaultValue={playerProfile.fullName}
                  required
                  className="flex-1 rounded-sm border-2 border-border bg-background px-3 py-1.5 text-sm shadow-brutalist-sm focus:outline-none"
                />
              </div>
              {/* Jersey # */}
              <div className="flex items-center gap-4 p-4">
                <label className="w-32 shrink-0 text-sm font-medium text-foreground">Jersey #</label>
                <input
                  name="jerseyNumber"
                  type="number"
                  min={1}
                  max={99}
                  defaultValue={playerProfile.jerseyNumber ?? ""}
                  className="flex-1 rounded-sm border-2 border-border bg-background px-3 py-1.5 text-sm shadow-brutalist-sm focus:outline-none"
                />
              </div>
              {/* Position */}
              <div className="flex items-center gap-4 p-4">
                <label className="w-32 shrink-0 text-sm font-medium text-foreground">Position</label>
                <Select name="position" defaultValue={playerProfile.position ?? ""}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select position" />
                  </SelectTrigger>
                  <SelectContent>
                    {RUGBY_POSITIONS.map((p) => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="border-t border-border p-4">
              <button type="submit" className="rounded-sm border-2 border-primary bg-primary px-4 py-2 text-sm font-bold text-primary-foreground shadow-brutalist-sm">
                Save Personal Info
              </button>
            </div>
          </form>
        ) : (
          <div className="rounded-sm border-2 border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No player profile linked to your account.
          </div>
        )}
      </section>

      <section className="overflow-hidden rounded-sm border-2 border-border bg-card shadow-brutalist">
        <div className="border-b border-border p-4">
          <p className="text-sm text-muted-foreground">
            Update your club's profile information.
          </p>
        </div>
        <div className="flex justify-center border-b border-border p-6">
          <ImageUpload
            currentUrl={team.logoUrl ?? null}
            shape="square"
            size={96}
            ariaLabel="Upload club logo"
            getPresignedUrl={getTeamLogoPresignedUrl}
            onSaveKey={saveTeamLogo}
          />
        </div>
        <form action={updateTeamSettingsAction} className="space-y-4 p-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">
              Club Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              name="name"
              required
              minLength={2}
              maxLength={100}
              defaultValue={team.name}
              className="shadow-brutalist-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="origin">Origin City</Label>
            <Input
              id="origin"
              name="origin"
              maxLength={200}
              defaultValue={team.origin ?? ""}
              placeholder="e.g. Kuala Lumpur"
              className="shadow-brutalist-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="trainingGround">Training Ground</Label>
            <Input
              id="trainingGround"
              name="trainingGround"
              maxLength={200}
              defaultValue={team.trainingGround ?? ""}
              placeholder="e.g. Stadium Merdeka"
              className="shadow-brutalist-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="contactEmail">Contact Email</Label>
            <Input
              id="contactEmail"
              name="contactEmail"
              type="email"
              defaultValue={team.contactEmail ?? ""}
              placeholder="club@email.com"
              className="shadow-brutalist-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="contactPhone">Contact Phone</Label>
            <Input
              id="contactPhone"
              name="contactPhone"
              type="tel"
              maxLength={30}
              defaultValue={team.contactPhone ?? ""}
              placeholder="+60 12-345 6789"
              className="shadow-brutalist-sm"
            />
          </div>

          <Button
            type="submit"
            className="w-full bg-primary text-primary-foreground shadow-brutalist-sm"
          >
            Save Changes
          </Button>
        </form>
      </section>

      {/* Mode toggle */}
      <section className="overflow-hidden rounded-sm border-2 border-border bg-card shadow-brutalist">
        <div className="border-b border-border p-4">
          <h2 className="font-[family-name:var(--font-lexend)] font-bold text-foreground">Switch Mode</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">Go back to your player view</p>
        </div>
        <div className="p-4">
          <Link
            href={"/player" as Route}
            className="flex items-center gap-3 rounded-sm border-2 border-border bg-background px-4 py-3 text-sm font-semibold text-foreground shadow-brutalist-sm transition-shadow hover:shadow-brutalist"
          >
            <User className="h-4 w-4 text-muted-foreground" />
            Switch to Player Mode
          </Link>
        </div>
      </section>
    </div>
  );
}
