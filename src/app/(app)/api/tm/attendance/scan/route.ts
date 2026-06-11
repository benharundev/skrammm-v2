import type { NextRequest } from "next/server";
import { requireAuth } from "@lib/auth/server";
import { scanPlayerQr } from "@modules/attendance";
import { getManagerTeam } from "@modules/team";
import { can } from "@modules/shared/auth/can";
import { getPlayerName } from "@modules/player";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const team = await getManagerTeam(session.user.id);
    if (!team) return Response.json({ error: "No team" }, { status: 403 });

    const body = (await request.json()) as { token?: unknown; matchId?: unknown; teamId?: unknown };
    if (typeof body.token !== "string" || typeof body.matchId !== "string" || typeof body.teamId !== "string") {
      return Response.json({ error: "Missing fields" }, { status: 400 });
    }
    if (body.teamId !== team.id) return Response.json({ error: "Unauthorized" }, { status: 403 });

    const allowed = await can(session.user.id, "team:scan", { teamId: team.id, matchId: body.matchId });
    if (!allowed) return Response.json({ error: "Scan not permitted for this match" }, { status: 403 });

    const ip = request.headers.get("x-forwarded-for");
    const userAgent = request.headers.get("user-agent");
    const meta = {
      ...(ip !== null && { ip }),
      ...(userAgent !== null && { userAgent }),
    };

    const { playerId } = await scanPlayerQr(
      session.user.id,
      { token: body.token, matchId: body.matchId, teamId: body.teamId, isManualOverride: false },
      meta
    );

    const playerName = await getPlayerName(playerId);
    return Response.json({ playerName: playerName ?? "Player" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Scan failed";
    return Response.json({ error: message }, { status: 400 });
  }
}
