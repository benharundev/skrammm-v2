import { requireAuth } from "@lib/auth/server";
import { getManagerTeam } from "@modules/team";
import { getMedicalProfile } from "@modules/medical";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Heart } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { deletePlayerAction } from "./actions";

const FITNESS_BADGE: Record<string, string> = {
  fit:      "bg-primary text-white",
  doubtful: "bg-accent text-primary",
  out:      "bg-destructive text-white",
};

export default async function PlayerDetailPage({ params }: { params: Promise<{ playerId: string }> }) {
  const { playerId } = await params;
  const session = await requireAuth();
  const team = await getManagerTeam(session.user.id);
  if (!team) notFound();

  const player = team.players.find((p) => p.id === playerId);
  if (!player) notFound();

  const medical = await getMedicalProfile(playerId);

  return (
    <div className="max-w-lg space-y-6 p-4 md:p-8">
      <div className="flex items-center gap-3">
        <Link href={"/tm/squad" as Route} className="flex h-8 w-8 items-center justify-center rounded-sm border-2 border-border bg-card shadow-brutalist-sm transition-shadow hover:shadow-brutalist">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="font-[family-name:var(--font-lexend)] text-2xl font-extrabold tracking-tight text-foreground">{player.fullName}</h1>
      </div>

      <section className="overflow-hidden rounded-sm border-2 border-border bg-card shadow-brutalist">
        <div className="flex items-center gap-4 p-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-sm bg-primary text-white">
            <span className="font-[family-name:var(--font-lexend)] text-2xl font-black">{player.jerseyNumber ?? "—"}</span>
          </div>
          <div className="min-w-0">
            <p className="font-[family-name:var(--font-lexend)] text-xl font-black text-foreground">{player.fullName}</p>
            <p className="text-sm text-muted-foreground">{player.position ?? "No position"}</p>
            <p className="mt-1 font-mono text-xs text-accent">{player.playerIdCode}</p>
          </div>
          <Badge className={player.claimStatus === "claimed" ? "ml-auto bg-primary text-white" : "ml-auto bg-muted text-muted-foreground"}>
            {player.claimStatus}
          </Badge>
        </div>
      </section>

      <div className="flex gap-2">
        <Link
          href={`/tm/squad/${playerId}/edit` as Route}
          className="inline-flex h-9 items-center justify-center rounded-sm border-2 border-border bg-card px-4 text-sm font-semibold shadow-brutalist-sm transition-shadow hover:shadow-brutalist"
        >
          Edit
        </Link>
        <form action={deletePlayerAction.bind(null, playerId)}>
          <button
            type="submit"
            className="inline-flex h-9 items-center justify-center rounded-sm border-2 border-destructive bg-destructive px-4 text-sm font-semibold text-white shadow-brutalist-sm transition-shadow hover:shadow-brutalist"
          >
            Remove from Squad
          </button>
        </form>
      </div>

      <section>
        <h2 className="mb-3 flex items-center gap-2 font-[family-name:var(--font-lexend)] text-sm font-bold uppercase tracking-widest text-muted-foreground">
          <Heart className="h-4 w-4 text-destructive" />
          Medical &amp; Fitness
        </h2>
        {!medical ? (
          <div className="rounded-sm border-2 border-dashed border-border p-6 text-center text-sm text-muted-foreground">No medical profile on file.</div>
        ) : (
          <div className="divide-y divide-border rounded-sm border-2 border-border bg-card shadow-brutalist">
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-sm text-muted-foreground">Fitness</span>
              <Badge className={FITNESS_BADGE[medical.fitnessStatus] ?? "bg-muted"}>{medical.fitnessStatus}</Badge>
            </div>
            {medical.bloodType && (
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-sm text-muted-foreground">Blood Type</span>
                <span className="font-mono font-bold text-foreground">{medical.bloodType}</span>
              </div>
            )}
            {medical.allergies && (
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-sm text-muted-foreground">Allergies</span>
                <span className="text-sm text-foreground">{medical.allergies}</span>
              </div>
            )}
            {medical.emergencyContactName && (
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-sm text-muted-foreground">Emergency</span>
                <div className="text-right">
                  <p className="text-sm font-medium text-foreground">{medical.emergencyContactName}</p>
                  {medical.emergencyContactPhone && <p className="text-xs text-muted-foreground">{medical.emergencyContactPhone}</p>}
                </div>
              </div>
            )}
            {medical.note && (
              <div className="px-4 py-3">
                <p className="mb-1 text-xs text-muted-foreground">Notes</p>
                <p className="text-sm text-foreground">{medical.note}</p>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
