import { requireOrgAuth } from "@lib/auth/server";
import { getOrganizerWithTeams } from "@modules/tournament";
import type { UITeam } from "../_components/ui-team";
import { TeamsClient } from "./_client";

export default async function TeamsPage() {
  const session = await requireOrgAuth();
  const data = await getOrganizerWithTeams(session.user.id);

  const teams: UITeam[] = (data?.teams ?? []).flatMap(t => {
    if (t.status === "withdrawn") return [];
    return [{
      id: t.team.id,
      name: t.team.name,
      shortName: t.team.slug.toUpperCase().slice(0, 4),
      manager: t.team.staff[0]?.user.name ?? t.team.staff[0]?.user.email ?? "—",
      managerEmail: t.team.staff[0]?.user.email ?? "—",
      rosterCount: t.team._count.players,
      group: t.groupLabel ?? "",
      status: t.status === "pending_approval" ? "pending" : t.status,
    }];
  });

  return <TeamsClient teams={teams} />;
}
