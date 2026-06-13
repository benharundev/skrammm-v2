import { notFound } from "next/navigation";
import { requireOrgAuth } from "@lib/auth/server";
import { getMatchPublicById } from "@modules/match";
import { MatchReportClient } from "./_client";
import type { NormalizedEvent, StatEvent } from "./_client";
import { EVENT_CONFIG, STAT_CONFIG } from "@/app/(app)/organizer/_lib/event-config";

export default async function MatchReportPage({
  params,
}: {
  params: Promise<{ matchId: string }>;
}) {
  const { matchId } = await params;
  await requireOrgAuth();

  const match = await getMatchPublicById(matchId);
  if (!match) notFound();

  const configKeys = Object.keys(EVENT_CONFIG) as (keyof typeof EVENT_CONFIG)[];
  const statKeys = Object.keys(STAT_CONFIG) as (keyof typeof STAT_CONFIG)[];

  const events: NormalizedEvent[] = match.events
    .filter((e) => configKeys.includes(e.eventType as keyof typeof EVENT_CONFIG))
    .map((e) => {
      const type = e.eventType as keyof typeof EVENT_CONFIG;
      return {
        id: e.id,
        minute: e.minute,
        isHome: e.teamId === match.homeTeam.id,
        type,
        playerName: e.player?.fullName ?? "—",
        points: EVENT_CONFIG[type]!.points,
      };
    });

  const statEvents: StatEvent[] = match.events
    .filter((e) => statKeys.includes(e.eventType as keyof typeof STAT_CONFIG))
    .map((e) => ({
      id: e.id,
      isHome: e.teamId === match.homeTeam.id,
      statType: e.eventType as keyof typeof STAT_CONFIG,
    }));

  return (
    <MatchReportClient
      matchId={match.id}
      status={match.status}
      homeScore={match.homeScore}
      awayScore={match.awayScore}
      group={match.groupLabel ?? "—"}
      venue={match.pitch}
      referee={null}
      scheduledTime={match.scheduledAt.toLocaleTimeString("en-MY", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })}
      homeName={match.homeTeam.name}
      awayName={match.awayTeam.name}
      homeShort={match.homeTeam.name.slice(0, 3).toUpperCase()}
      awayShort={match.awayTeam.name.slice(0, 3).toUpperCase()}
      events={events}
      statEvents={statEvents}
    />
  );
}
