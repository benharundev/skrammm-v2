import type { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { requireOrgAuth } from "@lib/auth/server";
import { transitionMatchPhase, getMatchTournamentId } from "@modules/match";
import { can } from "@modules/shared";
import type { MatchPhaseStatus } from "@modules/match";

const VALID_PHASES: MatchPhaseStatus[] = [
  "scheduled",
  "live",
  "suspended",
  "locked",
  "completed",
];

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  try {
    const { matchId } = await params;
    const session = await requireOrgAuth();

    const tournamentId = await getMatchTournamentId(matchId);
    if (!tournamentId) return Response.json({ error: "Not found" }, { status: 404 });

    const allowed = await can(session.user.id, "tournament:score", { tournamentId });
    if (!allowed) return Response.json({ error: "Forbidden" }, { status: 403 });

    const body = (await request.json()) as { status?: unknown };
    if (
      typeof body.status !== "string" ||
      !VALID_PHASES.includes(body.status as MatchPhaseStatus)
    ) {
      return Response.json({ error: "Invalid phase" }, { status: 400 });
    }

    await transitionMatchPhase(matchId, body.status as MatchPhaseStatus);
    revalidatePath("/organizer");
    revalidatePath("/organizer/schedule");
    revalidatePath("/organizer/standings");
    revalidatePath(`/organizer/match/${matchId}/report`);
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 400 }
    );
  }
}
