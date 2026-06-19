import { describe, it, expect } from "vitest";
import { computeLiveStats } from "./compute-live-stats";

const HOME_TEAM_ID = "home-team-uuid";
const AWAY_TEAM_ID = "away-team-uuid";
const PLAYER_A = "player-a-uuid";
const PLAYER_B = "player-b-uuid";

const players = new Map([
  [PLAYER_A, { fullName: "Alice Winger" }],
  [PLAYER_B, { fullName: "Bob Hooker" }],
]);

const makeEvent = (
  id: string,
  eventType: string,
  teamId: string,
  playerId: string | null = null,
  payload: unknown = null
) => ({ id, eventType, teamId, playerId, minute: 10, createdAt: new Date().toISOString(), payload });

describe("computeLiveStats", () => {
  it("returns zero counts with no events", () => {
    const stats = computeLiveStats([], HOME_TEAM_ID, players);
    expect(stats.breakdown.home.try).toBe(0);
    expect(stats.breakdown.away.try).toBe(0);
    expect(stats.topScorer).toBeNull();
    expect(stats.topTryScorer).toBeNull();
    expect(stats.cardedPlayers).toHaveLength(0);
  });

  it("counts home try correctly", () => {
    const events = [makeEvent("e1", "try", HOME_TEAM_ID, PLAYER_A)];
    const stats = computeLiveStats(events, HOME_TEAM_ID, players);
    expect(stats.breakdown.home.try).toBe(1);
    expect(stats.breakdown.away.try).toBe(0);
  });

  it("aggregates player points: try=5, conversion=2, penalty=3, drop_goal=3", () => {
    const events = [
      makeEvent("e1", "try", HOME_TEAM_ID, PLAYER_A),
      makeEvent("e2", "conversion", HOME_TEAM_ID, PLAYER_A),
    ];
    const stats = computeLiveStats(events, HOME_TEAM_ID, players);
    expect(stats.playerPoints.get(PLAYER_A)?.points).toBe(7);
  });

  it("identifies top scorer by points", () => {
    const events = [
      makeEvent("e1", "try", HOME_TEAM_ID, PLAYER_A),
      makeEvent("e2", "conversion", AWAY_TEAM_ID, PLAYER_B),
    ];
    const stats = computeLiveStats(events, HOME_TEAM_ID, players);
    expect(stats.topScorer?.playerId).toBe(PLAYER_A);
    expect(stats.topScorer?.points).toBe(5);
  });

  it("identifies top try scorer independently from points", () => {
    const events = [
      makeEvent("e1", "try", HOME_TEAM_ID, PLAYER_A),
      makeEvent("e2", "try", HOME_TEAM_ID, PLAYER_A),
      makeEvent("e3", "penalty", AWAY_TEAM_ID, PLAYER_B),
    ];
    const stats = computeLiveStats(events, HOME_TEAM_ID, players);
    expect(stats.topTryScorer?.playerId).toBe(PLAYER_A);
    expect(stats.topTryScorer?.tries).toBe(2);
  });

  it("tracks carded players", () => {
    const events = [makeEvent("e1", "yellow_card", HOME_TEAM_ID, PLAYER_A)];
    const stats = computeLiveStats(events, HOME_TEAM_ID, players);
    expect(stats.cardedPlayers).toHaveLength(1);
    expect(stats.cardedPlayers[0]?.cardType).toBe("yellow_card");
    expect(stats.cardedPlayers[0]?.team).toBe("home");
  });

  it("counts performance stats per team", () => {
    const events = [
      makeEvent("e1", "tackles_made", HOME_TEAM_ID),
      makeEvent("e2", "tackles_made", HOME_TEAM_ID),
      makeEvent("e3", "tackles_made", AWAY_TEAM_ID),
    ];
    const stats = computeLiveStats(events, HOME_TEAM_ID, players);
    expect(stats.performanceStats["tackles_made"]?.home).toBe(2);
    expect(stats.performanceStats["tackles_made"]?.away).toBe(1);
  });

  it("sums metres_run from payload.value", () => {
    const events = [
      makeEvent("e1", "metres_run", HOME_TEAM_ID, null, { value: 12 }),
      makeEvent("e2", "metres_run", HOME_TEAM_ID, null, { value: 8 }),
    ];
    const stats = computeLiveStats(events, HOME_TEAM_ID, players);
    expect(stats.performanceStats["metres_run"]?.home).toBe(20);
  });

  it("does not surface a card-only player as top scorer", () => {
    const events = [
      makeEvent("e1", "yellow_card", HOME_TEAM_ID, PLAYER_A),
    ];
    const stats = computeLiveStats(events, HOME_TEAM_ID, players);
    expect(stats.topScorer).toBeNull();
  });
});
