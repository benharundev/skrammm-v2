import { requireAuth } from "@lib/auth/server";
import { getManagerTeam } from "@modules/team";
import { RUGBY_POSITIONS } from "@lib/constants/rugby-positions";
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
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { updatePlayerAction } from "../actions";

export default async function EditPlayerPage({ params }: { params: Promise<{ playerId: string }> }) {
  const { playerId } = await params;
  const session = await requireAuth();
  const team = await getManagerTeam(session.user.id);
  if (!team) notFound();

  const player = team.players.find((p) => p.id === playerId);
  if (!player) notFound();

  const action = updatePlayerAction.bind(null, playerId);

  return (
    <div className="max-w-lg space-y-6 p-4 md:p-8">
      <div className="flex items-center gap-3">
        <Link
          href={`/tm/squad/${playerId}` as Route}
          className="flex h-8 w-8 items-center justify-center rounded-sm border-2 border-border bg-card shadow-brutalist-sm transition-shadow hover:shadow-brutalist"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="font-[family-name:var(--font-lexend)] text-2xl font-extrabold tracking-tight text-foreground">
            Edit Player
          </h1>
          <p className="text-sm text-muted-foreground">{team.name}</p>
        </div>
      </div>

      <section className="overflow-hidden rounded-sm border-2 border-border bg-card shadow-brutalist">
        <div className="border-b border-border p-4">
          <p className="text-sm text-muted-foreground">
            Update this player&apos;s profile details.
          </p>
        </div>
        <form action={action} className="space-y-4 p-4">
          <div className="space-y-1.5">
            <Label htmlFor="fullName">
              Full Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="fullName"
              name="fullName"
              required
              minLength={2}
              maxLength={100}
              defaultValue={player.fullName}
              className="shadow-brutalist-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="jerseyNumber">Jersey #</Label>
              <Input
                id="jerseyNumber"
                name="jerseyNumber"
                type="number"
                min="1"
                max="99"
                defaultValue={player.jerseyNumber ?? ""}
                className="shadow-brutalist-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="position">Position</Label>
              <Select name="position" defaultValue={player.position ?? ""}>
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
