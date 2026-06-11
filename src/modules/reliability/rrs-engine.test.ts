import { describe, it, expect } from "vitest";
import {
  computeMatchScore,
  computeTournamentRating,
  computeCareerRrs,
  computeLast30DaysRrs,
} from "./rrs-engine";
import type { MatchRawData } from "./types";

// Helper to build a MatchRawData with sensible defaults
function match(overrides: Partial<MatchRawData> = {}): MatchRawData {
  return {
    matchId: "m1",
    matchDate: new Date("2026-05-01"),
    tournamentId: "t1",
    tournamentFormat: "tiered",
    isPlaying: true,
    tries: 0,
    conversions: 0,
    dropGoals: 0,
    yellowCards: 0,
    redCards: 0,
    outcome: "Loss",
    ...overrides,
  };
}

describe("computeMatchScore", () => {
  it("returns 0.0 when player did not play", () => {
    expect(computeMatchScore(match({ isPlaying: false }))).toBe(0.0);
  });

  it("base score: played, loss, no events, tiered (1.0×)", () => {
    // (50 + 0 + 0) * 1.0 = 50.0
    expect(computeMatchScore(match())).toBe(50.0);
  });

  it("played, win, no events, elimination (1.5×)", () => {
    // (50 + 10) * 1.5 = 90.0
    expect(computeMatchScore(match({ outcome: "Win", tournamentFormat: "elimination" }))).toBe(90.0);
  });

  it("played, tie, festival (0.7×)", () => {
    // (50 + 5) * 0.7 = 38.5
    expect(computeMatchScore(match({ outcome: "Tie", tournamentFormat: "festival" }))).toBeCloseTo(38.5);
  });

  it("scored: 1 try + 1 conversion, win, tiered", () => {
    // (50 + 10 + 3 + 10) * 1.0 = 73.0
    expect(computeMatchScore(match({ tries: 1, conversions: 1, outcome: "Win" }))).toBe(73.0);
  });

  it("discipline penalty: 1 yellow card, loss, tiered", () => {
    // (50 - 15) * 1.0 = 35.0
    expect(computeMatchScore(match({ yellowCards: 1 }))).toBe(35.0);
  });

  it("discipline penalty: 1 red card, loss, tiered", () => {
    // (50 - 40) * 1.0 = 10.0
    expect(computeMatchScore(match({ redCards: 1 }))).toBe(10.0);
  });

  it("clamps to 0 when raw score is negative (2 red cards, loss)", () => {
    // (50 - 80) * 1.0 = -30 → clamp to 0
    expect(computeMatchScore(match({ redCards: 2 }))).toBe(0.0);
  });

  it("full scenario: 2 tries, 1 drop goal, 1 yellow card, win, elimination", () => {
    // (50 + 20 + 4 + 10 - 15) * 1.5 = 69 * 1.5 = 103.5
    expect(
      computeMatchScore(
        match({ tries: 2, dropGoals: 1, yellowCards: 1, outcome: "Win", tournamentFormat: "elimination" })
      )
    ).toBeCloseTo(103.5);
  });
});

describe("computeTournamentRating", () => {
  it("averages all N match scores (including 0 for non-appearances)", () => {
    // [60, 70, 0, 80, 0] with N=5 → sum=210 / 5 = 42.0
    expect(computeTournamentRating([60, 70, 0, 80, 0])).toBeCloseTo(42.0);
  });

  it("full attendance, consistent scores", () => {
    expect(computeTournamentRating([60, 70, 50, 80, 65])).toBeCloseTo(65.0);
  });

  it("returns 0 for empty array", () => {
    expect(computeTournamentRating([])).toBe(0);
  });
});

describe("computeCareerRrs", () => {
  it("returns 0 for empty match history", () => {
    const result = computeCareerRrs([]);
    expect(result.rrsCareer).toBe(0);
    expect(result.totalCareerMatches).toBe(0);
  });

  it("zero sigma when all scores equal (steady player)", () => {
    const result = computeCareerRrs([60, 60, 60]);
    expect(result.metricsMean).toBeCloseTo(60.0);
    expect(result.varianceSigma).toBeCloseTo(0.0);
    expect(result.rrsCareer).toBeCloseTo(60.0); // 60 - 0.5*0 = 60
  });

  it("penalises high volatility (gamma=0.5)", () => {
    // scores [50, 70, 60] → mean=60, sigma=√(200/3)≈8.165
    // rrsCareer = 60 - 0.5 * 8.165 ≈ 55.92
    const result = computeCareerRrs([50, 70, 60]);
    expect(result.metricsMean).toBeCloseTo(60.0);
    expect(result.varianceSigma).toBeCloseTo(8.165, 2);
    expect(result.rrsCareer).toBeCloseTo(55.917, 1);
  });

  it("reports totalCareerMatches correctly (includes 0-score absences)", () => {
    const result = computeCareerRrs([60, 0, 70, 0, 80]);
    expect(result.totalCareerMatches).toBe(5);
  });
});

describe("computeLast30DaysRrs", () => {
  const now = new Date("2026-06-08");

  it("low_recent_sample=true and rrs30Days=mean when fewer than 2 recent matches", () => {
    const data = [{ score: 80, date: new Date("2026-05-25") }];
    const result = computeLast30DaysRrs(data, now);
    expect(result.lowRecentSample).toBe(true);
    expect(result.rrs30Days).toBeCloseTo(80.0);
    expect(result.matchesPlayedWindow).toBe(1);
  });

  it("excludes matches older than 30 days", () => {
    const data = [
      { score: 90, date: new Date("2026-04-01") }, // outside window
      { score: 70, date: new Date("2026-05-25") }, // inside window
      { score: 80, date: new Date("2026-06-01") }, // inside window
    ];
    const result = computeLast30DaysRrs(data, now);
    expect(result.matchesPlayedWindow).toBe(2);
  });

  it("applies variance penalty when 2+ matches in window", () => {
    // scores [60, 100] → mean=80, sigma=20, rrs30 = 80 - 0.5*20 = 70
    const data = [
      { score: 60, date: new Date("2026-05-20") },
      { score: 100, date: new Date("2026-06-01") },
    ];
    const result = computeLast30DaysRrs(data, now);
    expect(result.rrs30Days).toBeCloseTo(70.0);
    expect(result.lowRecentSample).toBe(false);
  });

  it("returns 0 and low_recent_sample=true when no recent matches", () => {
    const data = [{ score: 90, date: new Date("2025-01-01") }];
    const result = computeLast30DaysRrs(data, now);
    expect(result.matchesPlayedWindow).toBe(0);
    expect(result.lowRecentSample).toBe(true);
    expect(result.rrs30Days).toBe(0);
  });
});
