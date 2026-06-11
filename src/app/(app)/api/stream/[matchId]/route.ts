import type { NextRequest } from "next/server";
import { getMatchBasic, getMatchEventsSince, getMatchForStream } from "@modules/match";
import { subscribe, type MatchEventPayload } from "@lib/realtime/bus";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// SSE endpoint — real-time scoreboard (TECH_PRD §7)
//
// Headers set per §7.4 to survive Cloudflare + Nginx:
//   Content-Type: text/event-stream
//   Cache-Control: no-cache, no-store, no-transform
//   X-Accel-Buffering: no   ← tells Nginx not to buffer this stream
//
// Heartbeat: `: ping` every 30s beats Cloudflare's ~100s idle close.
//
// Catch-up: reads Last-Event-ID header on connect and replays
// match_events with id > lastEventId. uuid v7 ids are time-ordered.
// ---------------------------------------------------------------------------

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  const { matchId } = await params;

  // Verify the match exists and is accessible
  const match = await getMatchBasic(matchId);

  if (!match) {
    return new Response("Match not found", { status: 404 });
  }

  const lastEventId = request.headers.get("last-event-id") ?? null;

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      const send = (data: string, id?: string) => {
        let chunk = "";
        if (id) chunk += `id: ${id}\n`;
        chunk += `data: ${data}\n\n`;
        controller.enqueue(encoder.encode(chunk));
      };

      const sendComment = (comment: string) => {
        controller.enqueue(encoder.encode(`: ${comment}\n\n`));
      };

      // -----------------------------------------------------------------------
      // Catch-up: replay events since last-event-id
      // -----------------------------------------------------------------------
      if (lastEventId) {
        const missedEvents = await getMatchEventsSince(matchId, lastEventId);
        for (const event of missedEvents) {
          send(JSON.stringify(event), event.id);
        }
      }

      // Send initial match state
      const currentMatch = await getMatchForStream(matchId);
      if (currentMatch) {
        send(JSON.stringify({ type: "state", homeScore: currentMatch.homeScore, awayScore: currentMatch.awayScore, status: currentMatch.status }));
      }

      // -----------------------------------------------------------------------
      // Live events via in-process bus
      // -----------------------------------------------------------------------
      const unsubscribe = subscribe(matchId, (event: MatchEventPayload) => {
        // Only scoring events carry an SSE event id; phase/delete events omit it.
        const eventId = "id" in event ? event.id : undefined;
        send(JSON.stringify(event), eventId);
      });

      // -----------------------------------------------------------------------
      // Heartbeat — every 30s to beat Cloudflare's ~100s idle close
      // -----------------------------------------------------------------------
      const heartbeat = setInterval(() => {
        try {
          sendComment("ping");
        } catch {
          clearInterval(heartbeat);
        }
      }, 30_000);

      // -----------------------------------------------------------------------
      // Cleanup on client disconnect
      // -----------------------------------------------------------------------
      request.signal.addEventListener("abort", () => {
        clearInterval(heartbeat);
        unsubscribe();
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-store, no-transform",
      "X-Accel-Buffering": "no",
      Connection: "keep-alive",
    },
  });
}
