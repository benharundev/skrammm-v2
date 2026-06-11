import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@lib/db", () => ({
  db: {
    player: { findFirst: vi.fn() },
    playerMedicalProfile: { findUnique: vi.fn() },
    matchEvent: { groupBy: vi.fn() },
    matchLineup: { count: vi.fn(), findMany: vi.fn() },
    reliabilitySnapshot: { findMany: vi.fn() },
  },
}));

import { db } from "@lib/db";
import {
  getClaimedPlayerForUser,
  getPlayerStats,
  getPlayerTournamentHistory,
  getPlayerReliabilityHistory,
} from "@modules/player";

beforeEach(() => { vi.clearAllMocks(); });

describe("getClaimedPlayerForUser", () => {
  it("returns player when user has claimed profile", async () => {
    const mockPlayer = { id: "p1", userId: "u1", claimStatus: "claimed", fullName: "Test Player", team: { id: "t1", name: "Lions" }, medicalProfile: null };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(db.player.findFirst).mockResolvedValue(mockPlayer as any);
    const result = await getClaimedPlayerForUser("u1");
    expect(db.player.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: "u1", claimStatus: "claimed" } }));
    expect(result).toEqual(mockPlayer);
  });

  it("returns null when no claimed profile", async () => {
    vi.mocked(db.player.findFirst).mockResolvedValue(null);
    expect(await getClaimedPlayerForUser("u1")).toBeNull();
  });
});

describe("getPlayerStats", () => {
  it("aggregates match events by type correctly", async () => {
    const mockEvents = [
      { eventType: "try", _count: { eventType: 5 } },
      { eventType: "yellow_card", _count: { eventType: 1 } },
    ];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(db.matchEvent.groupBy).mockResolvedValue(mockEvents as any);
    vi.mocked(db.matchLineup.count).mockResolvedValue(10);

    const stats = await getPlayerStats("p1");

    expect(stats).toEqual({
      tries: 5,
      conversions: 0,
      penalties: 0,
      dropGoals: 0,
      yellowCards: 1,
      redCards: 0,
      matchesPlayed: 10,
      startersCount: 10,
    });
  });

  it("returns all zeroes when player has no events", async () => {
    vi.mocked(db.matchEvent.groupBy).mockResolvedValue([]);
    vi.mocked(db.matchLineup.count).mockResolvedValue(0);
    const stats = await getPlayerStats("p1");
    expect(stats.tries).toBe(0);
    expect(stats.matchesPlayed).toBe(0);
  });
});

describe("getPlayerTournamentHistory", () => {
  it("groups multiple lineups by tournament", async () => {
    const t = { id: "t1", name: "Cup 2026", code: "cup26", startsAt: new Date(), endsAt: new Date(), status: "completed" };
    const mockLineups = [
      { playerId: "p1", match: { id: "m1", tournament: t }, team: { name: "Lions" } },
      { playerId: "p1", match: { id: "m2", tournament: t }, team: { name: "Lions" } },
    ];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(db.matchLineup.findMany).mockResolvedValue(mockLineups as any);
    const history = await getPlayerTournamentHistory("p1");
    expect(history).toHaveLength(1);
    expect(history[0]?.matchCount).toBe(2);
  });
});

describe("getPlayerReliabilityHistory", () => {
  it("queries with ascending computedAt order", async () => {
    vi.mocked(db.reliabilitySnapshot.findMany).mockResolvedValue([]);
    await getPlayerReliabilityHistory("p1");
    expect(db.reliabilitySnapshot.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { playerId: "p1" }, orderBy: { computedAt: "asc" } })
    );
  });
});
