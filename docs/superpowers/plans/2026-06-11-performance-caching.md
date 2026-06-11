# Performance: Layered Caching Infrastructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Redis + React.cache() caching with eager invalidation, fix unbounded queries, add missing DB indexes, and enable Nginx gzip across all three portals.

**Architecture:** Three-layer cache — React.cache() deduplicates within a single request (0ms), Redis caches cross-request with 5-min TTL and falls through silently if down, fixed queries eliminate unbounded fetches. Mutations call cache.del() before revalidatePath so stale data is never served.

**Tech Stack:** ioredis, React.cache(), Next.js Server Actions, Prisma, Docker Compose, Nginx

---

## File Map

**Create:**
- `src/lib/cache/client.ts` — ioredis singleton
- `src/lib/cache/keys.ts` — typed cache key builders
- `src/lib/cache/ttl.ts` — TTL constants
- `src/lib/cache/index.ts` — exports cachedFn and cache
- `src/lib/cache/cache.test.ts` — unit tests

**Modify:**
- `docker/docker-compose.local.yml` — add Redis service + REDIS_URL env
- `docker/docker-compose.yml` — same (production mirror)
- `prisma/schema.prisma` — add 6 @@index declarations
- `src/modules/reliability/service.ts` — wrap computeTeamRrs + computeRrsV2 with cachedFn; invalidate on card events and match lock
- `src/modules/player/service.ts` — wrap getPlayerStats with cachedFn; limit getPlayerTournamentHistory
- `src/modules/player/index.ts` — re-export getClaimedPlayerForUser wrapped in React.cache()
- `src/modules/team/index.ts` — re-export getManagerTeam wrapped in React.cache()
- `src/modules/match/service.ts` — invalidate player RRS cache on card events; invalidate team RRS cache on match lock
- `src/app/(app)/tm/lineups/actions.ts` — invalidate teamRrs on lineup save
- `src/app/(app)/tm/squad/[playerId]/actions.ts` — invalidate managerTeam on player mutations
- `docker/nginx.conf` — add gzip block
- `docker/nginx.local.conf` — add gzip block

---

### Task 1: Add Redis to Docker Compose + install ioredis

**Files:**
- Modify: `docker/docker-compose.local.yml`
- Modify: `docker/docker-compose.yml`

- [ ] **Step 1: Add Redis service to docker-compose.local.yml**

The file currently ends with `volumes:\n  postgres_local:`. Replace that entire `volumes:` section with the content below (keep everything above it intact):

```yaml
  redis:
    image: redis:7-alpine
    restart: unless-stopped
    ports:
      - "6379:6379"
    volumes:
      - redis_local:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 3

volumes:
  postgres_local:
  redis_local:
```

Also add `REDIS_URL: redis://redis:6379` under the `environment:` block of the `nextjs` service.

- [ ] **Step 2: Add Redis to docker-compose.yml (production mirror)**

In `docker/docker-compose.yml`, add the redis service before the `networks:` section:

```yaml
  redis:
    image: redis:7-alpine
    restart: unless-stopped
    volumes:
      - redis_data:/data
    networks:
      - internal
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 3
```

Add `REDIS_URL: redis://redis:6379` under the `environment:` of the `nextjs` service. Add `redis_data:` under `volumes:` at the bottom. Add `depends_on: redis` condition to nextjs service (alongside the existing postgres dependency):

```yaml
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
```

- [ ] **Step 3: Install ioredis**

```bash
pnpm add ioredis
```

Expected: `"ioredis"` appears in `package.json` dependencies section.

- [ ] **Step 4: Typecheck**

```bash
pnpm typecheck 2>&1 | head -5
```

Expected: exit 0, no ioredis type errors.

- [ ] **Step 5: Commit**

```bash
git add docker/docker-compose.local.yml docker/docker-compose.yml package.json pnpm-lock.yaml
git commit -m "feat(infra): add Redis 7 service to Docker Compose local and production"
```

---

### Task 2: Create src/lib/cache/ module

**Files:**
- Create: `src/lib/cache/client.ts`
- Create: `src/lib/cache/keys.ts`
- Create: `src/lib/cache/ttl.ts`
- Create: `src/lib/cache/index.ts`
- Create: `src/lib/cache/cache.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/cache/cache.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

const store = new Map<string, string>();
const mockGet = vi.fn(async (key: string) => store.get(key) ?? null);
const mockSet = vi.fn(async (key: string, value: string, _ex: string, _ttl: number) => {
  store.set(key, value);
  return "OK" as const;
});
const mockDel = vi.fn(async (key: string) => {
  store.delete(key);
  return 1;
});

vi.mock("ioredis", () => ({
  default: vi.fn(() => ({
    get: mockGet,
    set: mockSet,
    del: mockDel,
    on: vi.fn(),
  })),
}));

describe("cachedFn", () => {
  beforeEach(() => {
    store.clear();
    vi.clearAllMocks();
  });

  it("calls fn on cache miss and stores result", async () => {
    const { cachedFn } = await import("./index");
    const fn = vi.fn(async () => ({ score: 42 }));
    const result = await cachedFn("miss-key", 300, fn);
    expect(result).toEqual({ score: 42 });
    expect(fn).toHaveBeenCalledOnce();
    expect(mockSet).toHaveBeenCalledWith("miss-key", JSON.stringify({ score: 42 }), "EX", 300);
  });

  it("returns cached value on hit without calling fn", async () => {
    const { cachedFn } = await import("./index");
    const fn = vi.fn(async () => ({ score: 99 }));
    await cachedFn("hit-key", 300, fn);
    const second = await cachedFn("hit-key", 300, fn);
    expect(second).toEqual({ score: 99 });
    expect(fn).toHaveBeenCalledOnce();
    expect(mockGet).toHaveBeenCalledTimes(2);
  });

  it("falls through to fn when Redis get throws", async () => {
    const { cachedFn } = await import("./index");
    mockGet.mockRejectedValueOnce(new Error("Redis down"));
    const fn = vi.fn(async () => 777);
    const result = await cachedFn("error-key", 300, fn);
    expect(result).toBe(777);
    expect(fn).toHaveBeenCalledOnce();
  });
});

describe("cache.del", () => {
  beforeEach(() => {
    store.clear();
    vi.clearAllMocks();
  });

  it("removes key so next cachedFn call misses", async () => {
    const { cachedFn, cache } = await import("./index");
    const fn = vi.fn(async () => "value");
    await cachedFn("del-key", 300, fn);
    await cache.del("del-key");
    expect(mockDel).toHaveBeenCalledWith("del-key");
    await cachedFn("del-key", 300, fn);
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
pnpm vitest run src/lib/cache/cache.test.ts
```

Expected: FAIL — `Cannot find module './index'`.

- [ ] **Step 3: Create src/lib/cache/client.ts**

```typescript
import Redis from "ioredis";

let _client: Redis | null = null;

export function getRedisClient(): Redis | null {
  if (!process.env.REDIS_URL) return null;
  if (_client) return _client;
  _client = new Redis(process.env.REDIS_URL, {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    enableReadyCheck: false,
  });
  _client.on("error", () => {
    // intentional: fall-through handled in cachedFn
  });
  return _client;
}
```

- [ ] **Step 4: Create src/lib/cache/keys.ts**

```typescript
export const keys = {
  managerTeam:  (userId: string)   => `team:manager:${userId}`,
  teamRrs:      (teamId: string)   => `rrs:team:${teamId}`,
  playerRrs:    (playerId: string) => `rrs:player:${playerId}`,
  playerStats:  (playerId: string) => `stats:player:${playerId}`,
} as const;
```

- [ ] **Step 5: Create src/lib/cache/ttl.ts**

```typescript
export const ttl = {
  COMPUTED:  300,
  REFERENCE: 300,
} as const;
```

- [ ] **Step 6: Create src/lib/cache/index.ts**

```typescript
import { getRedisClient } from "./client";

export { keys } from "./keys";
export { ttl } from "./ttl";

export async function cachedFn<T>(
  key: string,
  ttlSeconds: number,
  fn: () => Promise<T>
): Promise<T> {
  const redis = getRedisClient();
  if (redis) {
    try {
      const hit = await redis.get(key);
      if (hit !== null) return JSON.parse(hit) as T;
      const value = await fn();
      await redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
      return value;
    } catch {
      // Redis unreachable — fall through
    }
  }
  return fn();
}

export const cache = {
  del: async (key: string): Promise<void> => {
    const redis = getRedisClient();
    if (!redis) return;
    try {
      await redis.del(key);
    } catch {
      // silent
    }
  },
};
```

- [ ] **Step 7: Run tests**

```bash
pnpm vitest run src/lib/cache/cache.test.ts
```

Expected: 4 tests PASS.

- [ ] **Step 8: Typecheck**

```bash
pnpm typecheck 2>&1 | grep "lib/cache" | head -5
```

Expected: no errors.

- [ ] **Step 9: Commit**

```bash
git add src/lib/cache/
git commit -m "feat(cache): add Redis cachedFn + cache.del module with unit tests"
```

---

### Task 3: Add DB indexes to schema.prisma + migrate

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add index to Session model**

In the `Session` model block, add before `@@map("sessions")`:

```prisma
  @@index([expiresAt])
```

- [ ] **Step 2: Add index to Verification model**

In the `Verification` model block, add before `@@map("verifications")`:

```prisma
  @@index([expiresAt])
```

- [ ] **Step 3: Add index to Team model**

In the `Team` model block, add before `@@map("teams")`:

```prisma
  @@index([createdAt])
```

- [ ] **Step 4: Add index to TournamentTeam model**

In the `TournamentTeam` model block, add before `@@unique([tournamentId, teamId])`:

```prisma
  @@index([status])
```

- [ ] **Step 5: Add index to Match model**

In the `Match` model block, add before the existing `@@index([tournamentId, scheduledAt])`:

```prisma
  @@index([status])
```

- [ ] **Step 6: Upgrade Tournament index to compound**

In the `Tournament` model, replace:
```prisma
  @@index([status])
```
with:
```prisma
  @@index([status, createdAt])
```

- [ ] **Step 7: Generate Prisma client**

```bash
pnpm db:generate
```

Expected: `Generated Prisma Client` — no errors.

- [ ] **Step 8: Run migration**

```bash
pnpm db:migrate
```

When prompted for a migration name, enter: `perf_add_indexes`

Expected: Migration file created under `prisma/migrations/`, applied successfully.

- [ ] **Step 9: Typecheck**

```bash
pnpm typecheck 2>&1 | head -5
```

Expected: exit 0.

- [ ] **Step 10: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/ src/
git commit -m "feat(db): add performance indexes on status, expiresAt, createdAt fields"
```

---

### Task 4: Fix query limits in player and match services

**Files:**
- Modify: `src/modules/player/service.ts:130-157` (getPlayerTournamentHistory)
- Modify: `src/modules/match/service.ts:253-264` (getMatchesPublic events include)

- [ ] **Step 1: Add take limit to getPlayerTournamentHistory**

In `src/modules/player/service.ts`, in `getPlayerTournamentHistory`, the `db.matchLineup.findMany` call currently has no `take`. Add `take: 200` after `orderBy`:

```typescript
export async function getPlayerTournamentHistory(playerId: string): Promise<TournamentHistoryItem[]> {
  const lineups = await db.matchLineup.findMany({
    where: { playerId },
    include: {
      match: {
        include: {
          tournament: {
            select: { id: true, name: true, code: true, startsAt: true, endsAt: true, status: true },
          },
        },
      },
      team: { select: { name: true } },
    },
    orderBy: { match: { scheduledAt: "desc" } },
    take: 200,
  });

  const map = new Map<string, TournamentHistoryItem>();
  for (const lineup of lineups) {
    const t = lineup.match.tournament;
    const entry = map.get(t.id);
    if (entry) {
      entry.matchCount += 1;
    } else {
      map.set(t.id, { tournament: t, matchCount: 1, teamName: lineup.team?.name ?? null });
    }
  }
  return Array.from(map.values());
}
```

- [ ] **Step 2: Add take guard to getMatchesPublic events include**

In `src/modules/match/service.ts`, in `getMatchesPublic`, the `events` include has no limit. Add `take: 100`:

```typescript
      events: {
        where: { deletedAt: null },
        orderBy: { createdAt: "asc" },
        take: 100,
        select: {
          id: true,
          eventType: true,
          teamId: true,
          minute: true,
          player: { select: { fullName: true } },
        },
      },
```

- [ ] **Step 3: Typecheck + lint**

```bash
pnpm typecheck 2>&1 | head -5 && pnpm lint src/modules/player/service.ts src/modules/match/service.ts
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/modules/player/service.ts src/modules/match/service.ts
git commit -m "perf(queries): add take limits to getPlayerTournamentHistory and getMatchesPublic"
```

---

### Task 5: Wrap hot-path functions with React.cache()

**Files:**
- Modify: `src/modules/team/index.ts`
- Modify: `src/modules/player/index.ts`

- [ ] **Step 1: Wrap getManagerTeam in team/index.ts**

Replace the current `src/modules/team/index.ts` with:

```typescript
import { cache } from "react";
import {
  createTeam,
  getTeamById,
  joinTournament,
  getTeamsByManager,
  getManagerTeam as _getManagerTeam,
  joinTournamentByCode,
  updateTeamSettings,
  hasTeamTournaments,
} from "./service";

export { createTeam, getTeamById, joinTournament, getTeamsByManager, joinTournamentByCode, updateTeamSettings, hasTeamTournaments };
export const getManagerTeam = cache(_getManagerTeam);
export { CreateTeamSchema, JoinTournamentSchema, JoinByCodeSchema, UpdateTeamSettingsSchema } from "./types";
export type { CreateTeamInput, JoinTournamentInput, JoinByCodeInput, UpdateTeamSettingsInput } from "./types";
```

- [ ] **Step 2: Wrap getClaimedPlayerForUser in player/index.ts**

In `src/modules/player/index.ts`, add an import for `cache` from `react`, then change the `getClaimedPlayerForUser` export to a wrapped version:

```typescript
import { cache } from "react";
import {
  createPlayer,
  claimPlayer,
  getPlayerById,
  getPlayersByTeam,
  getClaimedPlayerForUser as _getClaimedPlayerForUser,
  getPlayerStats,
  getPlayerStatsByTournament,
  getPlayerMatchesInTournament,
  getPlayerTournamentHistory,
  getPlayerReliabilityHistory,
  getLatestReliabilityComponents,
  updatePlayerProfile,
  updatePlayerByManager,
  removePlayerFromSquad,
  generatePlayerQrToken,
  upsertMedicalProfile,
  getPlayerName,
} from "./service";

export {
  createPlayer, claimPlayer, getPlayerById, getPlayersByTeam,
  getPlayerStats, getPlayerStatsByTournament, getPlayerMatchesInTournament,
  getPlayerTournamentHistory, getPlayerReliabilityHistory, getLatestReliabilityComponents,
  updatePlayerProfile, updatePlayerByManager, removePlayerFromSquad,
  generatePlayerQrToken, upsertMedicalProfile, getPlayerName,
};
export const getClaimedPlayerForUser = cache(_getClaimedPlayerForUser);

export {
  CreatePlayerSchema, ClaimPlayerSchema, UpdateProfileSchema, UpdateMedicalProfileSchema,
} from "./types";
export type {
  CreatePlayerInput, ClaimPlayerInput, PlayerStats, TournamentHistoryItem,
  ReliabilityDataPoint, UpdateProfileInput, UpdateMedicalProfileInput,
} from "./types";
```

- [ ] **Step 3: Typecheck**

```bash
pnpm typecheck 2>&1 | grep "modules/team/index\|modules/player/index" | head -10
```

Expected: no errors from those files.

- [ ] **Step 4: Full typecheck**

```bash
pnpm typecheck 2>&1 | head -10
```

Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/modules/team/index.ts src/modules/player/index.ts
git commit -m "perf(cache): wrap getManagerTeam and getClaimedPlayerForUser with React.cache()"
```

---

### Task 6: Apply Redis cachedFn to expensive computations

**Files:**
- Modify: `src/modules/reliability/service.ts`
- Modify: `src/modules/player/service.ts`

- [ ] **Step 1: Add cachedFn to computeTeamRrs**

In `src/modules/reliability/service.ts`, add the import at the top (after existing imports):

```typescript
import { cachedFn, keys, ttl } from "@lib/cache";
```

Then wrap `computeTeamRrs` — replace its function body with a `cachedFn` call. The existing logic (lines 291–382) becomes the inner `async () => { ... }`:

```typescript
export async function computeTeamRrs(teamId: string): Promise<TeamRrsPayload> {
  return cachedFn(keys.teamRrs(teamId), ttl.COMPUTED, async () => {
    const players = await db.player.findMany({
      where: { teamId },
      select: { id: true },
    });

    if (players.length === 0) {
      return {
        teamId,
        executionDate: new Date().toISOString().split("T")[0]!,
        teamRrs: 0,
        squadSize: 0,
        playerBreakdown: [],
      };
    }

    const playerIds = players.map((p) => p.id);

    const matches = await db.match.findMany({
      where: {
        OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }],
        status: { in: ["completed", "locked"] },
        deletedAt: null,
      },
      select: {
        id: true,
        scheduledAt: true,
        tournamentId: true,
        homeTeamId: true,
        awayTeamId: true,
        homeScore: true,
        awayScore: true,
        tournament: { select: { format: true } },
        lineups: {
          where: { playerId: { in: playerIds } },
          select: { playerId: true, teamId: true },
        },
        events: {
          where: { playerId: { in: playerIds }, deletedAt: null },
          select: { playerId: true, eventType: true },
        },
      },
      orderBy: { scheduledAt: "asc" },
    });

    const breakdown: Array<{ playerId: string; rrsCareer: number }> = [];

    for (const player of players) {
      const allScores = matches.map((m) => {
        const lineup = m.lineups.find((l) => l.playerId === player.id);
        const playerEvents = m.events.filter((e) => e.playerId === player.id);
        const countType = (type: string) => playerEvents.filter((e) => e.eventType === type).length;

        const isPlaying = lineup !== undefined;
        let outcome: "Win" | "Tie" | "Loss" = "Loss";
        if (isPlaying && lineup !== undefined) {
          const isHome = lineup.teamId === m.homeTeamId;
          const playerScore = isHome ? m.homeScore : m.awayScore;
          const opponentScore = isHome ? m.awayScore : m.homeScore;
          if (playerScore > opponentScore) outcome = "Win";
          else if (playerScore === opponentScore) outcome = "Tie";
        }

        return computeMatchScore({
          matchId: m.id,
          matchDate: m.scheduledAt,
          tournamentId: m.tournamentId,
          tournamentFormat: m.tournament.format as "festival" | "tiered" | "elimination",
          isPlaying,
          tries: countType("try"),
          conversions: countType("conversion"),
          dropGoals: countType("drop_goal"),
          yellowCards: countType("yellow_card"),
          redCards: countType("red_card"),
          outcome,
        });
      });

      const careerLevel = computeCareerRrs(allScores);
      breakdown.push({ playerId: player.id, rrsCareer: careerLevel.rrsCareer });
    }

    const teamRrs = breakdown.reduce((sum, p) => sum + p.rrsCareer, 0) / breakdown.length;

    return {
      teamId,
      executionDate: new Date().toISOString().split("T")[0]!,
      teamRrs,
      squadSize: breakdown.length,
      playerBreakdown: breakdown,
    };
  });
}
```

- [ ] **Step 2: Add cachedFn to computeRrsV2**

Wrap `computeRrsV2` the same way. Replace `export async function computeRrsV2(playerId: string): Promise<RrsV2Payload> {` and its body to:

```typescript
export async function computeRrsV2(playerId: string): Promise<RrsV2Payload> {
  return cachedFn(keys.playerRrs(playerId), ttl.COMPUTED, async () => {
    const rows = await getPlayerRrsMatchData(playerId);
    const executionDate = new Date();

    const matchData: Array<MatchRawData & { date: Date }> = rows.map((row) => {
      const isPlaying = row.playerTeamId !== null;
      let outcome: "Win" | "Tie" | "Loss" = "Loss";

      if (isPlaying && row.playerTeamId !== null) {
        const isHome = row.playerTeamId === row.homeTeamId;
        const playerScore = isHome ? row.homeScore : row.awayScore;
        const opponentScore = isHome ? row.awayScore : row.homeScore;
        if (playerScore > opponentScore) outcome = "Win";
        else if (playerScore === opponentScore) outcome = "Tie";
      }

      return {
        matchId: row.matchId,
        matchDate: row.matchDate,
        date: row.matchDate,
        tournamentId: row.tournamentId,
        tournamentFormat: row.tournamentFormat,
        isPlaying,
        tries: row.tries,
        conversions: row.conversions,
        dropGoals: row.dropGoals,
        yellowCards: row.yellowCards,
        redCards: row.redCards,
        outcome,
      };
    });

    const allScores = matchData.map((m) => ({
      score: computeMatchScore(m),
      date: m.date,
      tournamentId: m.tournamentId,
    }));

    const careerLevel = computeCareerRrs(allScores.map((s) => s.score));

    const { rrs30Days, matchesPlayedWindow, lowRecentSample } = computeLast30DaysRrs(
      allScores.map((s) => ({ score: s.score, date: s.date })),
      executionDate
    );
    const trendDelta = rrs30Days - careerLevel.rrsCareer;
    const status =
      trendDelta > 5.0
        ? "Ascending Form"
        : trendDelta < -5.0
          ? "Slumping Form"
          : "Stable Form";

    const tournamentGroups = new Map<string, number[]>();
    const tournamentAppearances = new Map<string, number>();

    for (const s of allScores) {
      if (!tournamentGroups.has(s.tournamentId)) {
        tournamentGroups.set(s.tournamentId, []);
        tournamentAppearances.set(s.tournamentId, 0);
      }
      tournamentGroups.get(s.tournamentId)!.push(s.score);
      if (s.score > 0) {
        tournamentAppearances.set(
          s.tournamentId,
          (tournamentAppearances.get(s.tournamentId) ?? 0) + 1
        );
      }
    }

    const tournamentLevel = Array.from(tournamentGroups.entries()).map(([tournamentId, scores]) => ({
      tournamentId,
      tournamentRating: computeTournamentRating(scores),
      totalTeamMatches: scores.length,
      playerAppearances: tournamentAppearances.get(tournamentId) ?? 0,
    }));

    return {
      playerId,
      executionDate: executionDate.toISOString().split("T")[0]!,
      careerLevel,
      last30DaysLevel: {
        rrs30Days,
        trendDelta,
        status,
        lowRecentSample,
        matchesPlayedWindow,
      },
      tournamentLevel,
    };
  });
}
```

- [ ] **Step 3: Add cachedFn to getPlayerStats in player/service.ts**

In `src/modules/player/service.ts`, add the import at the top:

```typescript
import { cachedFn, keys, ttl } from "@lib/cache";
```

Replace `getPlayerStats`:

```typescript
export async function getPlayerStats(playerId: string): Promise<PlayerStats> {
  return cachedFn(keys.playerStats(playerId), ttl.COMPUTED, async () => {
    const [events, matchCount, startCount] = await Promise.all([
      db.matchEvent.groupBy({
        by: ["eventType"],
        where: { playerId, deletedAt: null },
        _count: { eventType: true },
      }),
      db.matchLineup.count({ where: { playerId } }),
      db.matchLineup.count({ where: { playerId, isStarter: true } }),
    ]);

    const byType = Object.fromEntries(events.map((e) => [e.eventType, e._count.eventType]));

    return {
      tries:         byType["try"]          ?? 0,
      conversions:   byType["conversion"]   ?? 0,
      penalties:     byType["penalty"]      ?? 0,
      dropGoals:     byType["drop_goal"]    ?? 0,
      yellowCards:   byType["yellow_card"]  ?? 0,
      redCards:      byType["red_card"]     ?? 0,
      matchesPlayed: matchCount,
      startersCount: startCount,
    };
  });
}
```

- [ ] **Step 4: Typecheck + lint**

```bash
pnpm typecheck 2>&1 | head -10
pnpm lint src/modules/reliability/service.ts src/modules/player/service.ts
```

Expected: exit 0 for both.

- [ ] **Step 5: Commit**

```bash
git add src/modules/reliability/service.ts src/modules/player/service.ts
git commit -m "perf(cache): wrap computeTeamRrs, computeRrsV2, getPlayerStats with Redis cachedFn"
```

---

### Task 7: Add cache.del() invalidation at mutation points

**Files:**
- Modify: `src/modules/match/service.ts` (addMatchEvent + transitionMatchPhase)
- Modify: `src/app/(app)/tm/lineups/actions.ts`
- Modify: `src/app/(app)/tm/squad/[playerId]/actions.ts`

- [ ] **Step 1: Invalidate player caches on card events in addMatchEvent**

In `src/modules/match/service.ts`, add the import at the top:

```typescript
import { cache, keys } from "@lib/cache";
```

Find the card event block inside `addMatchEvent` (currently at the end of the function):

```typescript
  if (
    input.playerId &&
    (input.eventType === "yellow_card" || input.eventType === "red_card")
  ) {
    void persistReliabilitySnapshot(input.playerId).catch((err: unknown) => {
      console.error("[reliability] snapshot failed after card event:", err);
    });
  }
```

Replace with:

```typescript
  if (
    input.playerId &&
    (input.eventType === "yellow_card" || input.eventType === "red_card")
  ) {
    void Promise.all([
      persistReliabilitySnapshot(input.playerId),
      cache.del(keys.playerRrs(input.playerId)),
      cache.del(keys.playerStats(input.playerId)),
    ]).catch((err: unknown) => {
      console.error("[reliability] snapshot/cache invalidation failed after card event:", err);
    });
  }
```

- [ ] **Step 2: Invalidate team RRS caches on match lock in transitionMatchPhase**

In `src/modules/match/service.ts`, update `transitionMatchPhase`. First, change the initial `findUnique` to also select team IDs:

```typescript
  const match = await db.match.findUnique({
    where: { id: matchId },
    select: { status: true, homeTeamId: true, awayTeamId: true },
  });
```

Then replace the existing `if (toStatus === "locked")` block:

```typescript
  if (toStatus === "locked") {
    void Promise.all([
      refreshMatchPlayersReliability(matchId),
      cache.del(keys.teamRrs(match.homeTeamId)),
      cache.del(keys.teamRrs(match.awayTeamId)),
    ]).catch((err: unknown) => {
      console.error("[reliability] batch snapshot/cache invalidation failed on match lock:", err);
    });
  }
```

- [ ] **Step 3: Invalidate teamRrs in saveLineupAction**

In `src/app/(app)/tm/lineups/actions.ts`, add the import at the top (after existing imports):

```typescript
import { cache, keys } from "@lib/cache";
```

After `await saveMatchLineup(matchId, team.id, starterIds);`, add:

```typescript
  await cache.del(keys.teamRrs(team.id));
```

The full updated function:

```typescript
export async function saveLineupAction(formData: FormData): Promise<void> {
  const session = await requireAuth();
  const team = await getManagerTeam(session.user.id);
  if (!team) return;

  const matchId = formData.get("matchId");
  if (typeof matchId !== "string") return;

  const allowed = await can(session.user.id, "team:set_lineup", { teamId: team.id });
  if (!allowed) return;

  const match = await getTeamMatch(matchId, team.id);
  if (!match) return;

  const starterIds = formData.getAll("starters").filter((v): v is string => typeof v === "string");
  await saveMatchLineup(matchId, team.id, starterIds);
  await cache.del(keys.teamRrs(team.id));
  redirect(`/tm/lineups?matchId=${matchId}`);
}
```

- [ ] **Step 4: Invalidate managerTeam in squad player actions**

In `src/app/(app)/tm/squad/[playerId]/actions.ts`, add the import:

```typescript
import { cache, keys } from "@lib/cache";
```

In `updatePlayerAction`, add `await cache.del(keys.managerTeam(session.user.id));` after `await updatePlayerByManager(...)`:

```typescript
  await updatePlayerByManager(playerId, team.id, parsed.data);
  await cache.del(keys.managerTeam(session.user.id));
  revalidatePath("/tm/squad");
  redirect(`/tm/squad/${playerId}`);
```

In `deletePlayerAction`, add `await cache.del(keys.managerTeam(session.user.id));` after `await removePlayerFromSquad(...)`:

```typescript
  try {
    await removePlayerFromSquad(playerId, team.id);
    await cache.del(keys.managerTeam(session.user.id));
  } catch {
    return;
  }
```

- [ ] **Step 5: Typecheck + lint**

```bash
pnpm typecheck 2>&1 | head -10
pnpm lint src/modules/match/service.ts src/app/\(app\)/tm/lineups/actions.ts src/app/\(app\)/tm/squad/
```

Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
git add src/modules/match/service.ts src/app/\(app\)/tm/lineups/actions.ts src/app/\(app\)/tm/squad/
git commit -m "perf(cache): invalidate Redis keys on lineup save, player mutations, and match lock"
```

---

### Task 8: Add gzip to Nginx configs

**Files:**
- Modify: `docker/nginx.conf`
- Modify: `docker/nginx.local.conf`

- [ ] **Step 1: Add gzip block to nginx.conf**

In `docker/nginx.conf`, inside the `http { ... }` block, add after `keepalive_timeout 65;`:

```nginx
    gzip on;
    gzip_vary on;
    gzip_types text/plain text/css application/javascript application/json image/svg+xml;
    gzip_min_length 1024;
```

- [ ] **Step 2: Add gzip block to nginx.local.conf**

In `docker/nginx.local.conf`, inside the `http { ... }` block, add after `default_type application/octet-stream;`:

```nginx
    gzip on;
    gzip_vary on;
    gzip_types text/plain text/css application/javascript application/json image/svg+xml;
    gzip_min_length 1024;
```

- [ ] **Step 3: Commit**

```bash
git add docker/nginx.conf docker/nginx.local.conf
git commit -m "perf(nginx): enable gzip compression for JS, CSS, JSON, SVG"
```

---

## Verification

- [ ] Start the local Docker stack:
  ```bash
  docker compose -f docker/docker-compose.local.yml up
  ```

- [ ] Verify Redis is up:
  ```bash
  docker exec skrammm_v2-redis-1 redis-cli ping
  ```
  Expected: `PONG`

- [ ] Open TM squad page in browser. Then run:
  ```bash
  docker exec skrammm_v2-redis-1 redis-cli keys '*'
  ```
  Expected: `rrs:team:<id>` key present.

- [ ] Reload squad page — response should be faster (cache hit). Check Prisma dev log shows no `computeTeamRrs` DB queries on second load.

- [ ] Save a lineup from TM portal. Then check Redis:
  ```bash
  docker exec skrammm_v2-redis-1 redis-cli keys 'rrs:team:*'
  ```
  Expected: key deleted (invalidated).

- [ ] Run full typecheck and lint:
  ```bash
  pnpm typecheck && pnpm lint
  ```
  Expected: exit 0.

- [ ] Run unit tests:
  ```bash
  pnpm test:unit
  ```
  Expected: all pass.
