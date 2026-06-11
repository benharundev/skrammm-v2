import { notFound } from "next/navigation";
import { requireOrgAuth } from "@lib/auth/server";
import { getTeamById } from "@modules/team";
import { getOrganizerWithTeams } from "@modules/tournament";
import { TeamDetailClient } from "./_client";

export default async function TeamDetailPage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = await params;
  const session = await requireOrgAuth();

  const [org, team] = await Promise.all([
    getOrganizerWithTeams(session.user.id),
    getTeamById(teamId),
  ]);

  if (!team) notFound();

  const tt = org?.teams.find((t) => t.team.id === teamId);

  return (
    <TeamDetailClient
      team={{
        id: team.id,
        name: team.name,
        shortName: team.name.slice(0, 3).toUpperCase(),
        group: tt?.groupLabel ?? "—",
        manager: team.staff[0]?.user.name ?? "—",
        managerEmail: team.staff[0]?.user.email ?? "—",
        origin: team.origin ?? "—",
        rosterCount: team.players.length,
        joinedAt: (tt?.createdAt ?? team.createdAt).toISOString(),
        status: tt?.status === "approved" ? "approved" : "pending",
      }}
      roster={team.players.map((p) => ({
        id: p.id,
        number: p.jerseyNumber,
        name: p.fullName,
        position: p.position,
      }))}
    />
  );
}
