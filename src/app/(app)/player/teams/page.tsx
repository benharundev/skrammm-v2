import { requireAuth } from "@lib/auth/server";
import { getClaimedPlayerForUser, claimPlayer } from "@modules/player";
import { getTeamsByManager, hasTeamTournaments } from "@modules/team";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Users, Plus, ChevronRight, Shield, QrCode } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { Route } from "next";
import { RotatingQr } from "../_components/rotating-qr";

async function handleClaim(formData: FormData) {
  "use server";
  const session = await requireAuth();
  const code = ((formData.get("playerIdCode") as string | null) ?? "").trim().toUpperCase();
  if (!code) return;
  try {
    await claimPlayer(session.user.id, code);
  } catch {
    // player not found or already claimed — silent fail, redirect either way
  }
  redirect("/player/teams");
}

export default async function TeamsPage() {
  const session = await requireAuth();
  const dbPlayer = await getClaimedPlayerForUser(session.user.id);
  const [managedTeams, teamHasTournaments] = await Promise.all([
    getTeamsByManager(session.user.id),
    dbPlayer?.team ? hasTeamTournaments(dbPlayer.team.id) : Promise.resolve(false),
  ]);
  const showQr = dbPlayer !== null && teamHasTournaments;

  return (
    <div className="max-w-2xl space-y-6 p-4 md:p-8">
      <header className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="font-[family-name:var(--font-lexend)] text-2xl font-extrabold tracking-tight text-foreground">
            Teams
          </h1>
          <p className="text-sm text-muted-foreground">Your squad and clubs</p>
        </div>
        <Button
          asChild
          size="sm"
          className="shrink-0 bg-primary text-primary-foreground shadow-brutalist-sm"
        >
          <Link href={"/tm" as Route}>
            <Shield className="mr-1.5 h-4 w-4" />
            Manager Mode
          </Link>
        </Button>
      </header>

      {/* Current club */}
      <section className="space-y-3">
        <h2 className="font-[family-name:var(--font-lexend)] text-sm font-bold uppercase tracking-widest text-muted-foreground">
          Current Club
        </h2>
        {dbPlayer ? (
          <div className="rounded-sm border-2 border-border bg-card p-4 shadow-brutalist">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-sm bg-primary text-white">
                <Users className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-[family-name:var(--font-lexend)] font-bold text-foreground">
                  {dbPlayer.team.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {dbPlayer.fullName}
                  {dbPlayer.jerseyNumber !== null ? ` · Jersey #${dbPlayer.jerseyNumber}` : ""}
                  {dbPlayer.position ? ` · ${dbPlayer.position}` : ""}
                </p>
              </div>
              <span className="inline-flex items-center rounded-sm bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                Active
              </span>
            </div>
          </div>
        ) : (
          <div className="rounded-sm border-2 border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            You have not claimed a player profile yet.
          </div>
        )}
      </section>

      {/* Attendance QR */}
      {showQr && (
        <section className="overflow-hidden rounded-sm border-2 border-border bg-card shadow-brutalist">
          <div className="flex items-center gap-3 border-b border-border p-4">
            <QrCode className="h-4 w-4 text-muted-foreground" />
            <div>
              <h2 className="font-[family-name:var(--font-lexend)] font-bold text-foreground">
                Attendance QR
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Show this to your manager at match day
              </p>
            </div>
          </div>
          <div className="flex justify-center p-6">
            <RotatingQr />
          </div>
        </section>
      )}

      {/* Join a Club */}
      <section className="overflow-hidden rounded-sm border-2 border-border bg-card shadow-brutalist">
        <div className="border-b border-border p-4">
          <h2 className="font-[family-name:var(--font-lexend)] font-bold text-foreground">
            Join a Club
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Enter the Player ID Code your team manager gave you.
          </p>
        </div>
        <form action={handleClaim} className="flex gap-2 p-4">
          <Label htmlFor="playerIdCode" className="sr-only">
            Player ID Code
          </Label>
          <Input
            id="playerIdCode"
            name="playerIdCode"
            placeholder="e.g. AHM4R2F7"
            maxLength={8}
            className="flex-1 font-mono uppercase tracking-widest shadow-brutalist-sm"
          />
          <Button
            type="submit"
            size="sm"
            className="shrink-0 bg-primary text-primary-foreground shadow-brutalist-sm"
          >
            Claim
          </Button>
        </form>
      </section>

      {/* Managed clubs */}
      {managedTeams.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-[family-name:var(--font-lexend)] text-sm font-bold uppercase tracking-widest text-muted-foreground">
            Clubs You Manage
          </h2>
          {managedTeams.map((managedTeam) => (
            <Link
              key={managedTeam.id}
              href={"/tm" as Route}
              className="flex items-center gap-3 rounded-sm border-2 border-border bg-card p-4 shadow-brutalist transition-shadow hover:shadow-brutalist-lg"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm bg-primary text-white">
                <Shield className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-[family-name:var(--font-lexend)] font-bold text-foreground">
                  {managedTeam.name}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </Link>
          ))}
        </section>
      )}

      {/* Create club CTA */}
      <section>
        <div className="flex flex-col items-center gap-3 rounded-sm border-2 border-dashed border-border p-6 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-sm bg-muted">
            <Plus className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">
              Create a Club
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Become a team manager and register in tournaments
            </p>
          </div>
          <Button
            asChild
            size="sm"
            variant="outline"
            className="shadow-brutalist-sm"
          >
            <Link href={"/tm" as Route}>Go to Manager Portal</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
