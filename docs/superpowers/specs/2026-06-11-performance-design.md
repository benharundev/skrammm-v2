# Performance: Layered Caching Infrastructure — Design Spec

## Context

All three portals (TM, player, organizer) are slow locally. The root cause is three compounding problems: expensive queries with no caching, N+1 and unbounded patterns that shouldn't exist, and missing DB indexes. The goal is production-grade caching infrastructure (Redis + React.cache) that mirrors local → production, with underlying query fixes so the cache is caching good work, not bad work.

Data freshness requirement: within 5 minutes for computed data (RRS scores, stats). Eager invalidation on mutation keeps most paths fresh immediately; TTL is the safety net.

---

## Architecture

```
Browser request
  → Next.js RSC
      → React.cache()       [within-request dedup, 0ms]
          → Redis            [cross-request cache, ~1ms, 5-min TTL]
              → Fixed query  [DB, only on cache miss]
```

---

## 1. Infrastructure — Redis in Docker

**Files:** `docker/docker-compose.local.yml`, `docker/docker-compose.yml`

Add `redis:7-alpine` service to both files (local first, production mirrors exactly). Add `REDIS_URL=redis://redis:6379` to Next.js environment. Add `ioredis` to `package.json`.

## 2. Cache Layer — `src/lib/cache/`

```
src/lib/cache/
  client.ts    — ioredis singleton, silently falls through if Redis unreachable
  keys.ts      — typed key builders: keys.teamRrs(teamId), keys.managerTeam(userId), etc.
  ttl.ts       — TTL constants: COMPUTED = 300s, REFERENCE = 300s
  index.ts     — exports cachedFn<T>(key, ttl, fn) and cache.del(key)
```

`cachedFn`: Redis GET on hit → JSON deserialize; on miss run `fn()` + Redis SET. Silent fallthrough if Redis is down.

## 3. React.cache() Wrapping

Wrap per-request hot paths in `React.cache()` at the module `index.ts` re-export — no logic changes, one line per function:

- `getManagerTeam` (called on 10+ TM pages per request)
- `getClaimedPlayerForUser` (called on player portal pages)

## 4. DB Indexes

Add `@@index` to `prisma/schema.prisma`:

| Model | Field(s) |
|---|---|
| `Session` | `expiresAt` |
| `Verification` | `expiresAt` |
| `Team` | `createdAt` |
| `TournamentTeam` | `status` |
| `Match` | `status` |
| `Tournament` | `[status, createdAt]` (replace existing `[status]`) |

## 5. Query Limit Fixes

`getPlayerTournamentHistory` — add `take: 100` (no limit currently means all lineups ever).

`getMatchesPublic` — already fine for typical tournament sizes; add `take: 100` guard on events include as safety net.

## 6. Redis Caching Targets

Apply `cachedFn` with 5-min TTL:

| Function | Key | File |
|---|---|---|
| `computeTeamRrs(teamId)` | `keys.teamRrs(teamId)` | `modules/reliability/service.ts` |
| `computeRrsV2(playerId)` | `keys.playerRrs(playerId)` | `modules/reliability/service.ts` |
| `getPlayerStats(playerId)` | `keys.playerStats(playerId)` | `modules/player/service.ts` |

## 7. Cache Invalidation

Eager invalidation at mutation points (before `revalidatePath`):

| Mutation point | Keys invalidated |
|---|---|
| `saveLineupAction` (tm/lineups) | `keys.teamRrs(team.id)` |
| `deletePlayerAction` / `updatePlayerAction` (tm/squad) | `keys.managerTeam(userId)` |
| `addMatchEvent` — card events (match/service.ts) | `keys.playerRrs(playerId)`, `keys.playerStats(playerId)` |
| `transitionMatchPhase` → locked (match/service.ts) | `keys.teamRrs(homeTeamId)`, `keys.teamRrs(awayTeamId)` |

TTL (5 min) is the safety net for any path that misses explicit invalidation.

## 8. Nginx Gzip

Add inside `http {}` block in both `nginx.conf` and `nginx.local.conf`:

```nginx
gzip on;
gzip_vary on;
gzip_types text/plain text/css application/javascript application/json image/svg+xml;
gzip_min_length 1024;
```
