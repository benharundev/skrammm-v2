import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@lib/db", () => ({
  db: {
    tournamentTeam: { count: vi.fn() },
  },
}));

import { db } from "@lib/db";
import { hasTeamTournaments } from "@modules/team";

beforeEach(() => { vi.clearAllMocks(); });

describe("hasTeamTournaments", () => {
  it("returns true when team has at least one tournament entry", async () => {
    vi.mocked(db.tournamentTeam.count).mockResolvedValue(2);
    const result = await hasTeamTournaments("team-1");
    expect(db.tournamentTeam.count).toHaveBeenCalledWith({ where: { teamId: "team-1" } });
    expect(result).toBe(true);
  });

  it("returns false when team has no tournament entries", async () => {
    vi.mocked(db.tournamentTeam.count).mockResolvedValue(0);
    expect(await hasTeamTournaments("team-1")).toBe(false);
  });
});
