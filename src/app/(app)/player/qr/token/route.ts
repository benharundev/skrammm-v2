import { requireAuth } from "@lib/auth/server";
import { getClaimedPlayerForUser, generatePlayerQrToken } from "@modules/player";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await requireAuth();
  const player = await getClaimedPlayerForUser(session.user.id);
  if (!player) {
    return Response.json({ error: "No claimed player profile" }, { status: 404 });
  }
  const result = await generatePlayerQrToken(player.id);
  return Response.json(result);
}
