import { EventEmitter } from "events";

// ---------------------------------------------------------------------------
// In-process pub/sub keyed by matchId
// Single EC2 = single Node process = no fanout problem.
// Interface is swap-safe: replace body with Postgres LISTEN/NOTIFY or Redis
// Pub/Sub at scale without changing any caller.
// ---------------------------------------------------------------------------

// A scoring event — emitted when a match event is recorded (try, penalty, etc.)
export interface MatchScoreEvent {
  id: string;
  matchId: string;
  eventType: string;
  teamId: string;
  playerId?: string | null;
  minute?: number | null;
  payload?: unknown;
  homeScore: number;
  awayScore: number;
  createdAt: string;
}

// A match phase transition (scheduled -> live -> locked, etc.)
export interface MatchPhaseChangeEvent {
  type: "phase_change";
  status: string;
  startedAt: string | null;
  secondHalfStartedAt: string | null;
  pausedAt: string | null;
  totalPausedMs: number;
}

// A match event that was soft-deleted (its score contribution reversed)
export interface MatchEventDeletedEvent {
  type: "event_deleted";
  eventId: string;
}

export type MatchEventPayload =
  | MatchScoreEvent
  | MatchPhaseChangeEvent
  | MatchEventDeletedEvent;

const bus = new EventEmitter();
// Raise the limit — one match can have many concurrent spectator connections
bus.setMaxListeners(500);

const channelKey = (matchId: string) => `match:${matchId}`;

export function publish(matchId: string, event: MatchEventPayload): void {
  bus.emit(channelKey(matchId), event);
}

export function subscribe(
  matchId: string,
  handler: (event: MatchEventPayload) => void
): () => void {
  const channel = channelKey(matchId);
  bus.on(channel, handler);
  return () => {
    bus.off(channel, handler);
  };
}
