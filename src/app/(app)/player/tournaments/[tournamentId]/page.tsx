import { requireAuth } from "@lib/auth/server";
import {
  getClaimedPlayerForUser,
  getPlayerTournamentHistory,
  getPlayerStatsByTournament,
  getPlayerMatchesInTournament,
} from "@modules/player";
import { notFound } from "next/navigation";
import { TournamentShareButton } from "../../_components/tournament-share-button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Trophy, Calendar, Hash } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";

const EVENT_ICONS: Record<string, string> = {
  try: "⚡",
  yellow_card: "🟨",
  red_card: "🟥",
  conversion: "✓",
  penalty: "P",
};

const STATUS_BADGE: Record<string, string> = {
  completed: "bg-primary text-white",
  live: "bg-destructive text-white",
  draft: "bg-secondary text-white",
  paid: "bg-secondary text-white",
  cancelled: "bg-muted text-muted-foreground",
};

function fmt(d: Date) {
  return new Intl.DateTimeFormat("en-MY", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(d);
}

export default async function TournamentDetailPage({
  params,
}: {
  params: Promise<{ tournamentId: string }>;
}) {
  const { tournamentId } = await params;
  const session = await requireAuth();
  const dbPlayer = await getClaimedPlayerForUser(session.user.id);

  const history = dbPlayer ? await getPlayerTournamentHistory(dbPlayer.id) : null;
  const historyItem = history?.find((h) => h.tournament.id === tournamentId);

  if (!historyItem) notFound();

  const [stats, matchesInTournament] = await Promise.all([
    dbPlayer ? getPlayerStatsByTournament(dbPlayer.id, tournamentId) : null,
    dbPlayer ? getPlayerMatchesInTournament(dbPlayer.id, tournamentId) : [],
  ]);

  const detail = historyItem;
  const resolvedStats = stats ?? { matchesPlayed: 0, tries: 0, conversions: 0, penalties: 0, dropGoals: 0, yellowCards: 0, redCards: 0, startersCount: 0 };

  const STAT_ITEMS = [
    { label: "Matches",      value: resolvedStats.matchesPlayed },
    { label: "Tries",        value: resolvedStats.tries },
    { label: "Conversions",  value: resolvedStats.conversions },
    { label: "Penalties",    value: resolvedStats.penalties },
    { label: "Drop Goals",   value: resolvedStats.dropGoals },
    { label: "Yellow Cards", value: resolvedStats.yellowCards },
  ];

  return (
    <div className="max-w-2xl space-y-6 p-4 md:p-8">
      <div className="flex items-center gap-3">
        <Link
          href={"/player/matches" as Route}
          className="flex h-8 w-8 items-center justify-center rounded-sm border-2 border-border bg-card shadow-brutalist-sm transition-shadow hover:shadow-brutalist"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="truncate font-[family-name:var(--font-lexend)] text-xl font-extrabold tracking-tight text-foreground">
          {detail.tournament.name}
        </h1>
        <TournamentShareButton
          tournamentId={tournamentId}
          tournamentName={detail.tournament.name}
          playerName={dbPlayer?.fullName ?? ""}
          className="ml-auto shrink-0"
        />
      </div>

      <div className="rounded-sm border-2 border-border bg-card p-4 shadow-brutalist">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm bg-primary text-white">
              <Trophy className="h-5 w-5" />
            </div>
            <div>
              <p className="font-[family-name:var(--font-lexend)] font-bold text-foreground">
                {detail.tournament.name}
              </p>
              <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {fmt(detail.tournament.startsAt)} – {fmt(detail.tournament.endsAt)}
                </span>
                <span className="flex items-center gap-1">
                  <Hash className="h-3 w-3" />
                  {detail.tournament.code}
                </span>
              </div>
              {detail.teamName && (
                <p className="mt-0.5 text-xs text-muted-foreground">{detail.teamName}</p>
              )}
            </div>
          </div>
          <Badge
            className={
              STATUS_BADGE[detail.tournament.status] ?? "bg-muted text-muted-foreground"
            }
          >
            {detail.tournament.status}
          </Badge>
        </div>
      </div>

      <section>
        <h2 className="mb-3 font-[family-name:var(--font-lexend)] text-sm font-bold uppercase tracking-widest text-muted-foreground">
          My Performance
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

      {matchesInTournament.length > 0 && (
        <section>
          <h2 className="mb-3 font-[family-name:var(--font-lexend)] text-sm font-bold uppercase tracking-widest text-muted-foreground">
            My Matches
          </h2>
          <div className="space-y-2">
            {matchesInTournament.map((m) => {
              const tries = m.events.filter((e) => e.eventType === "try").length;
              return (
                <div
                  key={m.matchId}
                  className="rounded-sm border-2 border-border bg-card p-3 shadow-brutalist"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-foreground">
                        {m.homeTeam}{" "}
                        <span className="font-black">
                          {m.homeScore}–{m.awayScore}
                        </span>{" "}
                        {m.awayTeam}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {m.isStarter ? "Started" : "Sub"}
                        {tries > 0
                          ? ` · ${tries} tr${tries === 1 ? "y" : "ies"}`
                          : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      {m.events.slice(0, 4).map((ev, i) => (
                        <span key={i} className="text-xs" title={ev.eventType}>
                          {EVENT_ICONS[ev.eventType] ?? "·"}
                        </span>
                      ))}
                      <span
                        className={`ml-1 rounded-sm px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                          m.status === "completed"
                            ? "bg-primary text-white"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {m.status === "completed" ? "FT" : m.status}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
