import { requireAuth } from "@lib/auth/server";
import {
  getClaimedPlayerForUser,
  getPlayerStats,
} from "@modules/player";
import { computeRrsV2 } from "@modules/reliability";
import { ReliabilityLineChart } from "../_components/stats-charts";
import { ShareButton } from "../_components/share-button";
import { PlayerCard } from "../_components/player-card";
import { RotatingQr } from "../_components/rotating-qr";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Heart, QrCode as QrCodeIcon, Pencil, ChevronRight, TrendingUp, Minus, TrendingDown } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";

const FORM_ICON = {
  "Ascending Form":  TrendingUp,
  "Stable Form":     Minus,
  "Slumping Form":   TrendingDown,
} as const;

const FORM_COLOR = {
  "Ascending Form":  "text-pitch-green",
  "Stable Form":     "text-muted-foreground",
  "Slumping Form":   "text-destructive",
} as const;

export default async function ProfilePage() {
  const session = await requireAuth();
  const player = await getClaimedPlayerForUser(session.user.id);

  const [stats, dbRrs] = player
    ? await Promise.all([
        getPlayerStats(player.id),
        computeRrsV2(player.id),
      ])
    : [null, null];

  if (!player) {
    return (
      <div className="max-w-2xl space-y-6 p-4 md:p-8">
        <header className="space-y-1">
          <h1 className="font-[family-name:var(--font-lexend)] text-2xl font-extrabold tracking-tight text-foreground">
            My Profile
          </h1>
          <p className="text-sm text-muted-foreground">Claim your player profile to get started.</p>
        </header>
        <div className="rounded-sm border-2 border-dashed border-border p-12 text-center text-sm text-muted-foreground">
          Go to <Link href={"/player/teams" as Route} className="underline text-foreground font-semibold">Teams</Link> to claim your player ID.
        </div>
      </div>
    );
  }

  const displayStats = stats ?? { matchesPlayed: 0, tries: 0, conversions: 0, penalties: 0, dropGoals: 0, yellowCards: 0, redCards: 0, startersCount: 0 };
  if (!dbRrs) return null;
  const rrsData = dbRrs;

  const rrsCareer = Math.round(rrsData.careerLevel.rrsCareer);
  const rrs30Days = Math.round(rrsData.last30DaysLevel.rrs30Days);
  const formStatus = rrsData.last30DaysLevel.status;
  const trendDelta = rrsData.last30DaysLevel.trendDelta;
  const FormIcon = FORM_ICON[formStatus];

  const reliabilityChartData = rrsData.tournamentLevel.map((t, i) => ({
    label: `T${i + 1}`,
    score: Math.round(t.tournamentRating),
  }));

  const STAT_ITEMS = [
    { label: "Matches",      value: displayStats.matchesPlayed },
    { label: "Tries",        value: displayStats.tries },
    { label: "Conversions",  value: displayStats.conversions },
    { label: "Penalties",    value: displayStats.penalties },
    { label: "Drop Goals",   value: displayStats.dropGoals },
    { label: "Yellow Cards", value: displayStats.yellowCards },
  ];

  return (
    <div className="max-w-2xl space-y-6 p-4 md:p-8">
      <header className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16 shrink-0 border-2 border-border shadow-brutalist-sm">
            <AvatarImage src={player.photoUrl ?? undefined} alt={player.fullName} />
            <AvatarFallback className="bg-primary text-primary-foreground font-bold text-lg">
              {player.fullName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="space-y-1">
            <h1 className="font-[family-name:var(--font-lexend)] text-2xl font-extrabold tracking-tight text-foreground">
              My Profile
            </h1>
            <p className="text-sm text-muted-foreground">Career, stats, and identity</p>
          </div>
        </div>
        <Link
          href={"/player/profile/edit" as Route}
          className="flex shrink-0 items-center gap-1.5 rounded-sm border-2 border-border bg-card px-3 py-1.5 text-xs font-semibold shadow-brutalist-sm transition-shadow hover:shadow-brutalist"
        >
          <Pencil className="h-3.5 w-3.5" />
          Edit Profile
        </Link>
      </header>

      <PlayerCard
        player={player}
        team={player.team}
        stats={{
          tries: displayStats.tries,
          matchesPlayed: displayStats.matchesPlayed,
          yellowCards: displayStats.yellowCards,
          redCards: displayStats.redCards,
        }}
        reliabilityScore={rrsCareer}
        shareAction={
          <ShareButton
            type="career"
            playerId={player.playerIdCode}
            compact
            className="flex items-center justify-center text-white/30 transition-colors hover:text-accent disabled:opacity-40"
          />
        }
      />

      {/* Career stats grid */}
      <section>
        <h2 className="mb-3 font-[family-name:var(--font-lexend)] text-sm font-bold uppercase tracking-widest text-muted-foreground">
          Career Stats
        </h2>
        <div className="grid grid-cols-3 gap-2">
          {STAT_ITEMS.map(({ label, value }) => (
            <div
              key={label}
              className="rounded-sm border-2 border-border bg-card p-3 shadow-brutalist text-center"
            >
              <p className="font-[family-name:var(--font-lexend)] text-2xl font-black text-foreground">
                {value}
              </p>
              <p className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                {label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* RRS v2 trend chart */}
      {reliabilityChartData.length > 1 && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-[family-name:var(--font-lexend)] text-sm font-bold uppercase tracking-widest text-muted-foreground">
              RRS — Reliability Rating Score
            </h2>
            <div className="flex items-center gap-2">
              <FormIcon className={`h-4 w-4 ${FORM_COLOR[formStatus]}`} />
              <span className="font-[family-name:var(--font-lexend)] text-lg font-black text-foreground">
                {rrsCareer}
              </span>
            </div>
          </div>
          <div className="rounded-sm border-2 border-border bg-card p-4 shadow-brutalist">
            <ReliabilityLineChart data={reliabilityChartData} />
          </div>
          <p className={`mt-2 text-right text-xs font-medium ${FORM_COLOR[formStatus]}`}>
            {formStatus}
          </p>
        </section>
      )}

      {/* RRS v2 breakdown */}
      <section>
        <h2 className="mb-3 font-[family-name:var(--font-lexend)] text-sm font-bold uppercase tracking-widest text-muted-foreground">
          RRS Breakdown
        </h2>
        <div className="space-y-3 rounded-sm border-2 border-border bg-card p-4 shadow-brutalist">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-sm bg-muted/50 p-3 text-center">
              <p className="font-[family-name:var(--font-lexend)] text-2xl font-black text-foreground">{rrsCareer}</p>
              <p className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">Career RRS</p>
            </div>
            <div className="rounded-sm bg-muted/50 p-3 text-center">
              <p className="font-[family-name:var(--font-lexend)] text-2xl font-black text-foreground">{rrs30Days}</p>
              <p className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">Last 30 Days</p>
            </div>
          </div>
          <div className="flex items-center justify-between border-t border-border pt-3">
            <span className="text-xs text-muted-foreground">Form</span>
            <span className={`text-xs font-semibold ${FORM_COLOR[formStatus]}`}>
              {formStatus}
              {Math.abs(trendDelta) >= 1 && (
                <span className="ml-1 font-normal">
                  ({trendDelta > 0 ? "+" : ""}{Math.round(trendDelta)})
                </span>
              )}
            </span>
          </div>
          {rrsData.tournamentLevel.length > 0 && (
            <div className="border-t border-border pt-3 space-y-2">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Per Tournament</p>
              {rrsData.tournamentLevel.map((t, i) => (
                <div key={t.tournamentId} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Tournament {i + 1}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground">{t.playerAppearances}/{t.totalTeamMatches} played</span>
                    <span className="font-[family-name:var(--font-lexend)] font-black text-foreground">
                      {Math.round(t.tournamentRating)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
          {rrsData.last30DaysLevel.lowRecentSample && (
            <p className="text-[10px] text-muted-foreground border-t border-border pt-2">
              * 30-day rating based on fewer than 2 matches — variance not applied.
            </p>
          )}
        </div>
      </section>

      {/* Match-day QR — only if player profile claimed */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 font-[family-name:var(--font-lexend)] text-sm font-bold uppercase tracking-widest text-muted-foreground">
          <QrCodeIcon className="h-4 w-4" />
          Match-day QR
        </h2>
        <div className="flex flex-col items-center gap-4 rounded-sm border-2 border-border bg-card p-6 shadow-brutalist">
          <RotatingQr />
          <div className="text-center">
            <p className="font-mono text-lg font-black tracking-widest text-foreground">
              {player.playerIdCode}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Show to your manager for attendance check-in. Rotates every 60s.
            </p>
          </div>
        </div>
      </section>

      {/* Medical summary */}
      {player.medicalProfile && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 font-[family-name:var(--font-lexend)] text-sm font-bold uppercase tracking-widest text-muted-foreground">
            <Heart className="h-4 w-4 text-destructive" />
            Medical Summary
          </h2>
          <div className="overflow-hidden rounded-sm border-2 border-border bg-card shadow-brutalist">
            <div className="divide-y divide-border">
              {player.medicalProfile.fitnessStatus && (
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-muted-foreground">Fitness</span>
                  <Badge
                    className={
                      player.medicalProfile.fitnessStatus === "fit"
                        ? "bg-primary text-white"
                        : "bg-destructive text-white"
                    }
                  >
                    {player.medicalProfile.fitnessStatus}
                  </Badge>
                </div>
              )}
              {player.medicalProfile.bloodType && (
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-muted-foreground">Blood Type</span>
                  <span className="font-mono font-bold text-foreground">
                    {player.medicalProfile.bloodType}
                  </span>
                </div>
              )}
              {player.medicalProfile.emergencyContactName && (
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-muted-foreground">Emergency Contact</span>
                  <span className="text-sm font-medium text-foreground">
                    {player.medicalProfile.emergencyContactName}
                  </span>
                </div>
              )}
            </div>
            <Link
              href={"/player/settings/medical" as Route}
              className="flex items-center justify-between border-t border-border px-4 py-3 text-xs text-muted-foreground transition-colors hover:bg-muted/50"
            >
              View full medical profile
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </section>
      )}

      {/* Account */}
      <section className="overflow-hidden rounded-sm border-2 border-border bg-card shadow-brutalist">
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-sm text-muted-foreground">Email</span>
          <span className="text-sm font-medium text-foreground">{session.user.email}</span>
        </div>
        <Link
          href={"/player/settings" as Route}
          className="flex items-center justify-between border-t border-border px-4 py-3 text-xs text-muted-foreground transition-colors hover:bg-muted/50"
        >
          Account &amp; Security
          <ChevronRight className="h-4 w-4" />
        </Link>
      </section>
    </div>
  );
}
