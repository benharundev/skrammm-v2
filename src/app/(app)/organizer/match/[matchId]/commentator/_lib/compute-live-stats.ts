// Inlined to keep this file browser-safe — @modules/match re-exports Prisma service code
const POINTS: Partial<Record<string, number>> = {
  try: 5,
  conversion: 2,
  penalty: 3,
  drop_goal: 3,
};

const CARD_EVENTS = new Set(["yellow_card", "red_card"]);

export interface ScoringCounts {
  try: number;
  conversion: number;
  penalty: number;
  drop_goal: number;
  yellow_card: number;
  red_card: number;
}

type ScoringKey = keyof ScoringCounts;

export interface PlayerStat {
  points: number;
  tries: number;
  conversions: number;
  penalties: number;
  drop_goals: number;
  yellow_cards: number;
  red_cards: number;
  name: string;
}

export interface CardedPlayer {
  playerId: string;
  name: string;
  team: "home" | "away";
  cardType: "yellow_card" | "red_card";
  minute: number | null;
}

export interface LiveStats {
  breakdown: { home: ScoringCounts; away: ScoringCounts };
  performanceStats: Record<string, { home: number; away: number }>;
  playerPoints: Map<string, PlayerStat>;
  topScorer: { playerId: string; name: string; points: number } | null;
  topTryScorer: { playerId: string; name: string; tries: number } | null;
  cardedPlayers: CardedPlayer[];
}

type RawEvent = {
  id: string;
  eventType: string;
  teamId: string;
  playerId: string | null;
  minute: number | null;
  payload: unknown;
};

const emptyScoringCounts = (): ScoringCounts => ({
  try: 0, conversion: 0, penalty: 0, drop_goal: 0, yellow_card: 0, red_card: 0,
});

export function computeLiveStats(
  events: RawEvent[],
  homeTeamId: string,
  playerMap: Map<string, { fullName: string }>
): LiveStats {
  const breakdown = { home: emptyScoringCounts(), away: emptyScoringCounts() };
  const performanceStats: Record<string, { home: number; away: number }> = {};
  const playerPoints = new Map<string, PlayerStat>();
  const cardedPlayers: CardedPlayer[] = [];

  for (const ev of events) {
    const side = ev.teamId === homeTeamId ? "home" : "away";

    if (ev.eventType in POINTS) {
      breakdown[side][ev.eventType as ScoringKey] = breakdown[side][ev.eventType as ScoringKey] + 1;

      if (ev.playerId) {
        const pts = POINTS[ev.eventType as keyof typeof POINTS] ?? 0;
        const name = playerMap.get(ev.playerId)?.fullName ?? "Unknown";
        const existing = playerPoints.get(ev.playerId) ?? {
          points: 0, tries: 0, conversions: 0, penalties: 0,
          drop_goals: 0, yellow_cards: 0, red_cards: 0, name,
        };
        playerPoints.set(ev.playerId, {
          ...existing,
          points: existing.points + pts,
          tries: existing.tries + (ev.eventType === "try" ? 1 : 0),
          conversions: existing.conversions + (ev.eventType === "conversion" ? 1 : 0),
          penalties: existing.penalties + (ev.eventType === "penalty" ? 1 : 0),
          drop_goals: existing.drop_goals + (ev.eventType === "drop_goal" ? 1 : 0),
        });
      }
    } else if (CARD_EVENTS.has(ev.eventType)) {
      breakdown[side][ev.eventType as ScoringKey] = breakdown[side][ev.eventType as ScoringKey] + 1;

      if (ev.playerId) {
        const name = playerMap.get(ev.playerId)?.fullName ?? "Unknown";
        cardedPlayers.push({
          playerId: ev.playerId,
          name,
          team: side,
          cardType: ev.eventType as "yellow_card" | "red_card",
          minute: ev.minute,
        });

        const existing = playerPoints.get(ev.playerId) ?? {
          points: 0, tries: 0, conversions: 0, penalties: 0,
          drop_goals: 0, yellow_cards: 0, red_cards: 0, name,
        };
        playerPoints.set(ev.playerId, {
          ...existing,
          yellow_cards: existing.yellow_cards + (ev.eventType === "yellow_card" ? 1 : 0),
          red_cards: existing.red_cards + (ev.eventType === "red_card" ? 1 : 0),
        });
      }
    } else {
      const existing = performanceStats[ev.eventType] ?? { home: 0, away: 0 };
      let increment = 1;
      if (
        ev.eventType === "metres_run" &&
        ev.payload !== null &&
        typeof ev.payload === "object" &&
        "value" in ev.payload &&
        typeof (ev.payload as Record<string, unknown>)["value"] === "number"
      ) {
        increment = (ev.payload as Record<string, number>)["value"] as number;
      }
      performanceStats[ev.eventType] = {
        ...existing,
        [side]: existing[side] + increment,
      };
    }
  }

  let topScorer: LiveStats["topScorer"] = null;
  let topTryScorer: LiveStats["topTryScorer"] = null;

  for (const [playerId, stat] of playerPoints) {
    if (stat.points > 0 && (!topScorer || stat.points > topScorer.points)) {
      topScorer = { playerId, name: stat.name, points: stat.points };
    }
    if (stat.tries > 0 && (!topTryScorer || stat.tries > topTryScorer.tries)) {
      topTryScorer = { playerId, name: stat.name, tries: stat.tries };
    }
  }

  return { breakdown, performanceStats, playerPoints, topScorer, topTryScorer, cardedPlayers };
}
