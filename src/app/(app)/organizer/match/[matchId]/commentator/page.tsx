import { requireOrgAuth } from "@lib/auth/server";
import { getMatchWithRoster } from "@modules/match";
import { can } from "@modules/shared";
import { notFound } from "next/navigation";
import { CommentatorClient } from "./_client";

export default async function CommentatorPage({
  params,
}: {
  params: Promise<{ matchId: string }>;
}) {
  const { matchId } = await params;
  const session = await requireOrgAuth();
  const match = await getMatchWithRoster(matchId);
  if (!match) notFound();
  const allowed = await can(session.user.id, "tournament:score", {
    tournamentId: match.tournament.id,
  });
  if (!allowed) notFound();
  return <CommentatorClient match={match} />;
}
