import { describe, it, expect } from "vitest";
import { computeStandings } from "./service";
import type { PublicMatch } from "./types";

function makeMatch(opts: {
  id?: string;
  homeTeamId: string;
  homeTeamName: string;
  awayTeamId: string;
  awayTeamName: string;
  homeScore: number;
  awayScore: number;
  groupLabel: string | null;
  status?: PublicMatch["status"];
}): PublicMatch {
  return {
    id: opts.id ?? "m1",
    status: opts.status ?? "completed",
    homeScore: opts.homeScore,
    awayScore: opts.awayScore,
    scheduledAt: new Date("2025-01-01T09:00:00Z"),
    pitch: "Pitch 1",
    groupLabel: opts.groupLabel,
    round: null,
    homeTeam: { id: opts.homeTeamId, name: opts.homeTeamName, logoUrl: null },
    awayTeam: { id: opts.awayTeamId, name: opts.awayTeamName, logoUrl: null },
    events: [],
  };
}

describe("computeStandings", () => {
  it("returns empty object when no matches", () => {
    expect(computeStandings([])).toEqual({});
  });

  it("returns empty object when all matches have null groupLabel (elimination)", () => {
    const match = makeMatch({ homeTeamId: "t1", homeTeamName: "A", awayTeamId: "t2", awayTeamName: "B", homeScore: 7, awayScore: 0, groupLabel: null });
    expect(computeStandings([match])).toEqual({});
  });

  it("ignores live/scheduled matches — only counts completed and locked", () => {
    const liveMatch = makeMatch({ homeTeamId: "t1", homeTeamName: "A", awayTeamId: "t2", awayTeamName: "B", homeScore: 7, awayScore: 0, groupLabel: "A", status: "live" });
    expect(computeStandings([liveMatch])).toEqual({});
  });

  it("awards 3 pts to winner, 0 to loser", () => {
    const match = makeMatch({ homeTeamId: "t1", homeTeamName: "Team1", awayTeamId: "t2", awayTeamName: "Team2", homeScore: 14, awayScore: 7, groupLabel: "A" });
    const standings = computeStandings([match]);
    const groupA = standings["A"];
    expect(groupA).toBeDefined();
    const winner = groupA!.find(r => r.teamId === "t1");
    const loser = groupA!.find(r => r.teamId === "t2");
    expect(winner?.pts).toBe(3);
    expect(winner?.w).toBe(1);
    expect(winner?.l).toBe(0);
    expect(loser?.pts).toBe(0);
    expect(loser?.w).toBe(0);
    expect(loser?.l).toBe(1);
  });

  it("awards 1 pt each for a draw", () => {
    const match = makeMatch({ homeTeamId: "t1", homeTeamName: "Team1", awayTeamId: "t2", awayTeamName: "Team2", homeScore: 7, awayScore: 7, groupLabel: "A" });
    const standings = computeStandings([match]);
    const groupA = standings["A"]!;
    expect(groupA.every(r => r.pts === 1 && r.d === 1)).toBe(true);
  });

  it("sorts by pts desc, then pf desc", () => {
    const matches = [
      makeMatch({ id: "m1", homeTeamId: "t1", homeTeamName: "Alpha", awayTeamId: "t2", awayTeamName: "Beta", homeScore: 21, awayScore: 0, groupLabel: "A" }),
      makeMatch({ id: "m2", homeTeamId: "t3", homeTeamName: "Gamma", awayTeamId: "t2", awayTeamName: "Beta", homeScore: 14, awayScore: 0, groupLabel: "A" }),
    ];
    const standings = computeStandings(matches);
    const groupA = standings["A"]!;
    expect(groupA[0]!.teamId).toBe("t1"); // Alpha: 3pts, pf=21
    expect(groupA[1]!.teamId).toBe("t3"); // Gamma: 3pts, pf=14
    expect(groupA[2]!.teamId).toBe("t2"); // Beta:  0pts
  });

  it("assigns correct pos numbers starting from 1", () => {
    const match = makeMatch({ homeTeamId: "t1", homeTeamName: "A", awayTeamId: "t2", awayTeamName: "B", homeScore: 7, awayScore: 0, groupLabel: "A" });
    const standings = computeStandings([match]);
    const groupA = standings["A"]!;
    expect(groupA.map(r => r.pos)).toEqual([1, 2]);
  });

  it("keeps separate groups when matches have different groupLabels", () => {
    const matchA = makeMatch({ homeTeamId: "t1", homeTeamName: "A", awayTeamId: "t2", awayTeamName: "B", homeScore: 7, awayScore: 0, groupLabel: "A" });
    const matchB = makeMatch({ id: "m2", homeTeamId: "t3", homeTeamName: "C", awayTeamId: "t4", awayTeamName: "D", homeScore: 14, awayScore: 7, groupLabel: "B" });
    const standings = computeStandings([matchA, matchB]);
    expect(Object.keys(standings).sort()).toEqual(["A", "B"]);
  });

  it("also counts locked matches as completed", () => {
    const match = makeMatch({ homeTeamId: "t1", homeTeamName: "A", awayTeamId: "t2", awayTeamName: "B", homeScore: 7, awayScore: 0, groupLabel: "A", status: "locked" });
    const standings = computeStandings([match]);
    expect(standings["A"]).toBeDefined();
  });
});
