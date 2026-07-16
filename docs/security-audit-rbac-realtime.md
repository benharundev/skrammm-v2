# Security & Architecture Audit Report

**Date:** 2026-06-18  
**Scope:** Organizer Portal RBAC, TM Portal RBAC, Organizer Portal real-time architecture  
**Codebase:** Skrammm_v2

---

## 1. TL;DR

| Area | Status | Biggest Gap |
|---|---|---|
| Organizer portal — authentication | Fully enforced | — |
| Organizer portal — write RBAC | Fully enforced | — |
| Organizer portal — read RBAC | **Not enforced** | `teams/[teamId]` exposes any team's roster to any authenticated organizer |
| Organizer portal — role model | Incomplete | Only tournament creator; no multi-user staff |
| TM portal — write RBAC | Fully enforced | — |
| TM portal — read RBAC | Effectively enforced via `getManagerTeam()` | — |
| TM portal — role model | Partially enforced | `StaffRole` enum exists but `can()` ignores it; only `isPrimaryManager` matters |
| Organizer portal — real-time | Infrastructure ready, unused | Match center uses optimistic updates; SSE stream has no consumers |

---

## 2. Organizer Portal — RBAC

### 2.1 Authentication

All organizer routes are gated by `requireOrgAuth()` in `src/app/(app)/organizer/layout.tsx`. This checks for the `skrammm.org_session_token` cookie and redirects to `/login/organizer` if absent. **Fully enforced.**

### 2.2 Role Model

There is **one effective role**: the user whose `id` matches `Tournament.organizerUserId`. This is the tournament creator.

The settings page (`organizer/settings/page.tsx`) renders a UI for "admin / staff / viewer" organizer roles with invite and remove controls. This UI is **mock only** — there is no `OrganizerStaff` table in the database and no server actions backing these controls.

### 2.3 Permission Model

Defined in `src/modules/shared/auth/can.ts`. All four tournament permissions use identical logic — `Tournament.organizerUserId === userId`:

| Permission | Intended use | Actually called? |
|---|---|---|
| `tournament:edit` | Edit metadata, approve teams, start match | Yes |
| `tournament:score` | Record match events, transition phases | Yes |
| `tournament:approve_team` | Approve/reject team entries | No — `tournament:edit` is used instead |
| `tournament:check_in_team` | Check in teams at match day | No |

### 2.4 Enforced — Server Actions & API Routes

Every mutation in the organizer portal correctly calls `can()` before acting:

| Location | Action | Permission |
|---|---|---|
| `organizer/actions.ts` | `startMatchAction` | `tournament:edit` |
| `organizer/schedule/actions.ts` | `saveMatchMetadataAction` | `tournament:edit` |
| `organizer/teams/actions.ts` | `approveTeamAction`, `rejectTeamAction` | `tournament:edit` |
| `api/organizer/match/[matchId]/event` | POST (add event), DELETE (remove event) | `tournament:score` |
| `api/organizer/match/[matchId]/phase` | POST (transition phase) | `tournament:score` |
| `organizer/match/[matchId]/page.tsx` | Page render | `tournament:score` |

`teams/actions.ts` also calls `getVerifiedTournamentForTeam()` to prevent BOLA — it verifies the `teamId` belongs to the organizer's tournament before acting.

### 2.5 Not Enforced — Read Pages

These pages call `requireOrgAuth()` but perform no ownership or scope check:

| Page | Risk |
|---|---|
| `organizer/page.tsx` | Low — dashboard data is scoped by `getOrganizerWithTeams(userId)` |
| `organizer/schedule/page.tsx` | Low — schedule loaded via organizer's tournament |
| `organizer/standings/page.tsx` | Low — standings loaded via organizer's tournament |
| `organizer/teams/page.tsx` | Low — team list loaded via organizer's tournament |
| `organizer/teams/[teamId]/page.tsx` | **High** — see §2.6 |
| `organizer/match/[matchId]/report/page.tsx` | Medium — any organizer can read any match report |
| `organizer/users/page.tsx` | Low — no sensitive data exposed |
| `organizer/settings/page.tsx` | Low — settings UI is mostly mock |

### 2.6 Critical Gap: Team Detail Page (BOLA)

**File:** `src/app/(app)/organizer/teams/[teamId]/page.tsx`

```ts
const session = await requireOrgAuth();
const [org, team] = await Promise.all([
  getOrganizerWithTeams(session.user.id),  // organizer's own teams
  getTeamById(teamId),                      // any team, no ownership check
]);
if (!team) notFound();
// page renders even if org is null or team doesn't belong to org's tournament
```

An authenticated organizer can substitute any team's UUID in the URL and view its full roster, player details, and primary manager info. There is a partial check (`org?.teams.find(...)`) but the page still renders team data when this returns `undefined`.

**Fix:** Add `if (!org || !org.teams.find(t => t.id === teamId)) notFound();` before rendering.

---

## 3. TM Portal — RBAC

### 3.1 Role Model

Defined in `prisma/schema.prisma`:

```prisma
enum StaffRole { manager  coach  physio }

model TeamStaff {
  teamId           String
  userId           String
  role             StaffRole  @default(manager)
  isPrimaryManager Boolean    @default(false)
}
```

`can()` ignores `StaffRole` entirely. The only distinction that matters is `isPrimaryManager`. A team can have multiple staff members (coaches, physios), but only the primary manager can access the TM portal — `getManagerTeam()` filters by `isPrimaryManager: true`.

### 3.2 Permission Model

| Permission | Who | Logic |
|---|---|---|
| `team:manage` | Primary manager only | `isPrimaryManager: true` |
| `team:approve_player` | Primary manager only | `isPrimaryManager: true` (defined, no TM UI) |
| `team:set_lineup` | Any team staff | staff exists in `TeamStaff` |
| `team:scan` | Any staff + match is today | staff check + `match.scheduledAt.toDateString() === today` + team in match |
| `medical:view_profile` | Any staff OR claimed player (self) | two-branch check |
| `medical:edit_profile` | Claimed player (self); primary manager if unclaimed | two-branch check |
| `injury:create` | Tournament organizer only | `match.tournament.organizerUserId === userId` |
| `injury:view` | Organizer + claimed player + any staff | three-branch check |
| `player:edit_self` | Self only | `player.userId === userId` |

### 3.3 Enforced — Server Actions & API Routes

| Location | Action | Permission |
|---|---|---|
| `tm/settings/actions.ts` | `updateTeamSettingsAction` | `team:manage` |
| `tm/settings/actions.ts` | `getTeamLogoPresignedUrl`, `saveTeamLogo` | `team:manage` |
| `tm/tournaments/actions.ts` | `joinTournamentAction` | `team:manage` |
| `tm/squad/[playerId]/actions.ts` | `updatePlayerAction`, `deletePlayerAction` | `team:manage` |
| `tm/lineups/actions.ts` | `saveLineupAction` | `team:set_lineup` |
| `api/tm/attendance/scan` | POST | `team:scan` |
| `api/tm/attendance/override` | POST | `team:scan` |

### 3.4 Page-Level Authorization

The TM layout only calls `requireAuth()`. However, all TM pages call `getManagerTeam(session.user.id)`, which queries `TeamStaff` for `{ userId, isPrimaryManager: true }`. If the user is not a primary manager, this returns `null` and the page either redirects, returns `notFound()`, or shows an empty state. This provides effective scope enforcement at the read level without explicit `can()` calls.

### 3.5 Gaps

**`updatePersonalInfoAction`** (`tm/settings/actions.ts`) — No `can()` call. Relies on `getClaimedPlayerForUser()` returning a player for the session user. Low risk (only edits your own claimed player profile), but the permission gate should be explicit.

**Player portal inline actions** — `saveMedical()` and `saveProfile()` in the player portal have no `can()` call. They rely on `getClaimedPlayerForUser()` for scoping. `savePlayerPhoto()` correctly calls `can(userId, "player:edit_self", ...)` — the other two should match this pattern.

**No staff management UI** — Coaches and physios can only be added via direct database operations. The TM portal exposes no route for managing team staff. The permissions (`team:set_lineup`, `team:scan`) are defined and enforced, but there is no way to grant them without touching the DB.

**Injury reporting unimplemented** — `injury:create` and `injury:view` are defined in `can.ts` and the service layer (`src/modules/medical/service.ts`) has `createInjuryReport()`. No server action or UI exposes this in any portal.

---

## 4. Organizer Portal — Real-time Architecture

### 4.1 SSE Infrastructure

**Bus** (`src/lib/realtime/bus.ts`) — In-process Node.js `EventEmitter`, keyed by `matchId`, max 500 listeners per match. Designed for a single-server deployment.

**Stream endpoint** (`GET /api/stream/[matchId]`) — Properly implemented SSE with:
- Initial state frame (`{ type: "state", homeScore, awayScore, status }`) on connect
- Catch-up replay using `Last-Event-ID` header (works because UUIDv7 IDs are time-ordered)
- Heartbeat (`: ping` every 30s) to survive Cloudflare's idle timeout
- `X-Accel-Buffering: no` header to prevent Nginx buffering

**Publishing** happens in `src/modules/match/service.ts` after every DB write:

| Trigger | Event published |
|---|---|
| `addMatchEvent()` | `{ id, matchId, eventType, teamId, playerId, minute, homeScore, awayScore, createdAt }` |
| `transitionMatchPhase()` | `{ type: "phase_change", status }` |
| `deleteMatchEvent()` | `{ type: "event_deleted", eventId }` |

### 4.2 What the Match Center Actually Does

`src/app/(app)/organizer/match/[matchId]/_client.tsx` (MatchCenterClient) uses **optimistic updates**, not SSE:

1. Scorer taps a scoring action → local state updates immediately (score increments, event prepended)
2. `POST /api/organizer/match/[matchId]/event` fires in the background
3. On success, optimistic placeholder ID is replaced with the server-issued ID
4. On failure, the optimistic update is rolled back

The component **does not open an SSE connection**. Two organizers on the same match will diverge — each sees only their own changes unless they reload.

### 4.3 What Consumes the SSE Stream

Nothing currently subscribes to `/api/stream/[matchId]`.

The public spectator page (`src/app/(marketing)/[tournamentCode]/_components/live-refresh.tsx`) uses `router.refresh()` on a 10-second interval rather than subscribing to the stream.

The TM and player portals are static SSR with no real-time updates.

### 4.4 Layer Summary

| Layer | Event-driven? | Notes |
|---|---|---|
| DB write → bus publish | Yes | `match/service.ts` always publishes after mutations |
| SSE endpoint | Yes | Built correctly, handles reconnects and catch-up |
| Organizer match center | No | Optimistic updates only |
| Spectator page | No | 10s polling via `router.refresh()` |
| TM portal | No | Static SSR |
| Player portal | No | Static SSR |

---

## 5. Recommended Next Steps

Priority-ordered:

1. **Fix BOLA on `organizer/teams/[teamId]/page.tsx`** — Add an ownership check before rendering team data. One line fix.

2. **Add `can()` to organizer read pages** — Particularly `match/[matchId]/report` (any organizer can read any match report). Add `tournament:score` or `tournament:edit` check with the match's `tournamentId`.

3. **Add explicit `can()` to `updatePersonalInfoAction`, `saveMedical()`, `saveProfile()`** — Replace implicit service-layer scoping with `can(userId, "player:edit_self", { playerId })` to match the pattern used by `savePlayerPhoto()`.

4. **Wire a consumer to the SSE stream** — The spectator live view is the natural first target. Replace the 10s polling in `live-refresh.tsx` with an `EventSource` subscription to `/api/stream/[matchId]`.

5. **Implement `OrganizerStaff` table** — Required before multi-user organizer staff can be supported. Update `can()` to check `OrganizerStaff` in addition to `Tournament.organizerUserId`.

6. **Expose injury reporting UI** — The service layer is ready (`createInjuryReport()`). Wire a server action and organizer UI to expose it.
