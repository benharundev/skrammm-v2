import type { NextRequest } from "next/server";
import { requireAuth } from "@lib/auth/server";
import { addMatchEvent, deleteMatchEvent, getMatchTournamentId } from "@modules/match";
import { can } from "@modules/shared";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  try {
    const { matchId } = await params;
    const session = await requireAuth();

    const tournamentId = await getMatchTournamentId(matchId);
    if (!tournamentId) return Response.json({ error: "Not found" }, { status: 404 });

    const allowed = await can(session.user.id, "tournament:score", { tournamentId });
    if (!allowed) return Response.json({ error: "Forbidden" }, { status: 403 });

    const body = (await request.json()) as {
      teamId?: unknown;
      eventType?: unknown;
      minute?: unknown;
      playerId?: unknown;
    };
    if (typeof body.teamId !== "string" || typeof body.eventType !== "string") {
      return Response.json({ error: "Missing fields" }, { status: 400 });
    }

    const result = await addMatchEvent(session.user.id, {
      matchId,
      teamId: body.teamId,
      eventType: body.eventType as Parameters<typeof addMatchEvent>[1]["eventType"],
      minute: typeof body.minute === "number" ? body.minute : undefined,
      playerId: typeof body.playerId === "string" ? body.playerId : undefined,
    });

    return Response.json({ ok: true, eventId: result.eventId });

  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 400 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  try {
    const { matchId } = await params;
    const session = await requireAuth();

    const tournamentId = await getMatchTournamentId(matchId);
    if (!tournamentId) return Response.json({ error: "Not found" }, { status: 404 });

    const allowed = await can(session.user.id, "tournament:score", { tournamentId });
    if (!allowed) return Response.json({ error: "Forbidden" }, { status: 403 });

    const body = (await request.json()) as { eventId?: unknown };
    if (typeof body.eventId !== "string") {
      return Response.json({ error: "Missing eventId" }, { status: 400 });
    }

    await deleteMatchEvent(matchId, body.eventId);
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 400 }
    );
  }
}
