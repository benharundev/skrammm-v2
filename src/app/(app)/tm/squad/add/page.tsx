import { requireAuth } from "@lib/auth/server";
import { getManagerTeam } from "@modules/team";
import { createPlayer, CreatePlayerSchema } from "@modules/player";
import { RUGBY_POSITIONS } from "@lib/constants/rugby-positions";
import { notFound, redirect } from "next/navigation";
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
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";

async function handleAddPlayer(formData: FormData) {
  "use server";
  const session = await requireAuth();
  const team = await getManagerTeam(session.user.id);
  if (!team) return;
  const parsed = CreatePlayerSchema.safeParse({
    teamId: team.id,
    fullName: formData.get("fullName") as string,
    jerseyNumber: formData.get("jerseyNumber") ? Number(formData.get("jerseyNumber")) : undefined,
    position: (formData.get("position") as string) || undefined,
    isMinor: formData.get("isMinor") === "on",
    claimContact: (formData.get("claimContact") as string) || undefined,
  });
  if (!parsed.success) return;
  await createPlayer(parsed.data);
  redirect("/tm/squad");
}

export default async function AddPlayerPage() {
  const session = await requireAuth();
  const team = await getManagerTeam(session.user.id);
  if (!team) notFound();

  return (
    <div className="max-w-lg space-y-6 p-4 md:p-8">
      <div className="flex items-center gap-3">
        <Link href={"/tm/squad" as Route} className="flex h-8 w-8 items-center justify-center rounded-sm border-2 border-border bg-card shadow-brutalist-sm transition-shadow hover:shadow-brutalist">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="font-[family-name:var(--font-lexend)] text-2xl font-extrabold tracking-tight text-foreground">Add Player</h1>
          <p className="text-sm text-muted-foreground">{team.name}</p>
        </div>
      </div>
      <section className="overflow-hidden rounded-sm border-2 border-border bg-card shadow-brutalist">
        <div className="border-b border-border p-4">
          <p className="text-sm text-muted-foreground">Creates a claimable player profile. The player can claim it with their Player ID Code.</p>
        </div>
        <form action={handleAddPlayer} className="space-y-4 p-4">
          <div className="space-y-1.5">
            <Label htmlFor="fullName">Full Name <span className="text-destructive">*</span></Label>
            <Input id="fullName" name="fullName" required minLength={2} maxLength={100} className="shadow-brutalist-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="jerseyNumber">Jersey #</Label>
              <Input id="jerseyNumber" name="jerseyNumber" type="number" min="1" max="99" className="shadow-brutalist-sm" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="position">Position</Label>
              <Select name="position">
                <SelectTrigger id="position">
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
          <div className="space-y-1.5">
            <Label htmlFor="claimContact">Claim Email</Label>
            <Input id="claimContact" name="claimContact" type="email" placeholder="player@email.com" className="shadow-brutalist-sm" />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="isMinor" name="isMinor" className="h-4 w-4 rounded border-border" />
            <Label htmlFor="isMinor" className="cursor-pointer">Under 17 (minor)</Label>
          </div>
          <Button type="submit" className="w-full bg-primary text-primary-foreground shadow-brutalist-sm">Create Player Profile</Button>
        </form>
      </section>
    </div>
  );
}
