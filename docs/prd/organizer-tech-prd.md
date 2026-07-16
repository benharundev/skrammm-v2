# Organizer Portal — Technical PRD

**Version:** 1.0  
**Date:** July 2026  
**Phase:** Alpha  
**Audience:** Engineering team

---

## 1. Route Map

All organizer routes are in `src/app/(app)/organizer/`. Every route is protected by `requireOrgAuth()` in the layout, which validates the `skrammm.org_session_token` cookie and redirects unauthenticated requests to `/login`.

| Route | File | Rendering | Purpose |
|---|---|---|---|
| `/organizer` | `page.tsx` + `_client.tsx` | RSC + CC | Dashboard: KPI cards, today's fixtures, pending approvals |
| `/organizer/schedule` | `schedule/page.tsx` + `_client.tsx` | RSC + CC | Fixture manager: inline edit, bulk save/discard |
| `/organizer/match/[matchId]` | `match/[matchId]/page.tsx` + `_client.tsx` | RSC + CC | Live match center: scoring, stats, phase control |
| `/organizer/match/[matchId]/commentator` | `commentator/page.tsx` + `_client.tsx` | RSC + CC | SSE-connected broadcast view (new tab) |
| `/organizer/match/[matchId]/report` | `report/page.tsx` + `_client.tsx` | RSC + CC | Post-match report: full stats, scorer breakdown |
| `/organizer/teams` | `teams/page.tsx` + `_client.tsx` | RSC + CC | Team list: approve/reject, groups editor |
| `/organizer/teams/[teamId]` | `teams/[teamId]/page.tsx` + `_client.tsx` | RSC + CC | Team detail: info card, paginated roster |
| `/organizer/standings` | `standings/page.tsx` + `_client.tsx` | RSC + CC | Group standings + knockout bracket |
| `/organizer/settings` | `settings/page.tsx` | CC (full page) | Tournament settings (currently local-state only) |
| `/organizer/settings/setup` | `settings/setup/page.tsx` | CC | 4-step tournament creation wizard |
| `/organizer/setup` | `setup/page.tsx` | RSC | Redirect to `/organizer/settings/setup` |
| `/organizer/users` | `users/page.tsx` | CC | Create user + OTP relay |

RSC = React Server Component (default). CC = Client Component (`"use client"`).

The RSC pages hydrate their initial data via service calls before rendering. The `_client.tsx` files receive this data as props and manage interactive state, optimistic updates, and event handlers. This split keeps the initial page load fast (no JS waterfall for data) while keeping the interactive layer clean.

---

## 2. API Route Architecture

The organizer portal uses REST API routes (not Server Actions) for the three match scoring endpoints. This is an intentional architectural decision with specific justification.

Server Actions use the POST + revalidation model: the action runs on the server, updates the DB, and then `revalidatePath` causes the relevant RSC to re-fetch and re-render. This is excellent for forms and mutations where the round-trip latency is acceptable. It is not acceptable for live match scoring.

During a match, the organizer may tap the "Try" button 20–30 times per half. Each event must:
1. Update the scoreboard immediately (optimistic UI, ~0ms perceived latency)
2. Send the event to the server (POST request, ~50–100ms)
3. Publish the event to the SSE bus synchronously within the same HTTP handler (so spectators receive the update in the same round-trip)
4. If the server rejects the event, roll back the optimistic update

This pattern requires explicit fetch control from the client and synchronous SSE publication from the route handler. Server Actions would require `revalidatePath` to trigger a re-render, which would re-fetch all match data from the DB — creating a polling pattern instead of a push pattern for the SSE bus.

### 2.1 POST `/api/organizer/match/[matchId]/event`

**Auth**: `requireOrgAuth()` + `can(userId, "tournament:score", { tournamentId })`

**Body**:
```typescript
{
  eventType: MatchEventType;   // from MatchEventTypeSchema enum
  teamId: string;              // home or away team ID
  playerId?: string;           // optional — free text fallback for unknown players
  minute: number;              // match minute (0–80+)
  payload?: Record<string, unknown>; // for stat events with magnitude (e.g. metres_run: 15)
}
```

**Behaviour**: validates input via `AddMatchEventSchema`, calls `addMatchEvent` in the match module (Prisma transaction: inserts `MatchEvent` + increments team score), then calls `publish(matchId, event)` on the realtime bus. Returns the created event with `createdAt` timestamp.

**Response**: `201 Created` with the full `MatchEvent` record. `400 Bad Request` on validation failure. `403 Forbidden` if the user lacks `tournament:score`. `409 Conflict` if the match is not in `live` status.

### 2.2 DELETE `/api/organizer/match/[matchId]/event`

**Auth**: `requireOrgAuth()` + `can(userId, "tournament:score", { tournamentId })`

**Body**: `{ eventId: string }`

**Behaviour**: calls `deleteMatchEvent`, which soft-deletes the event (`deletedAt = now()`) and reverses the score change in a Prisma transaction. Publishes `{ type: "event_deleted", eventId }` to the bus. Only works when the match is not in `locked` status.

**Response**: `200 OK`. `403 Forbidden` on permission failure. `404 Not Found` if event doesn't exist or is already deleted. `409 Conflict` if match is locked.

### 2.3 POST `/api/organizer/match/[matchId]/phase`

**Auth**: `requireOrgAuth()` + `can(userId, "tournament:score", { tournamentId })`

**Body**:
```typescript
{
  action: "start_first_half" | "start_second_half" | "halftime" | 
          "complete" | "lock" | "pause" | "resume";
  pauseReason?: "water_break" | "team_timeout" | "suspend";
}
```

**Behaviour**: calls `transitionMatchPhase`, which enforces the state machine (see Master Tech PRD §6), updates clock fields (`startedAt`, `secondHalfStartedAt`, `pausedAt`, `totalPausedMs`), and publishes a `phase_change` event to the bus. The `lock` action triggers a batch RRS recalculation for all lineup players (fire-and-forget).

**State machine**:
```
scheduled → live (start_first_half)
live → live (start_second_half — only when startedAt already set)
live → suspended (pause with reason)
live → completed (complete)
suspended → live (resume)
suspended → completed (complete)
completed → locked (lock)
```

Invalid transitions return `409 Conflict` with a descriptive error message.

---

## 3. SSE Architecture

The Server-Sent Events endpoint is at `src/app/(app)/api/stream/[matchId]/route.ts`.

When a client connects, the handler:
1. Validates that the match exists (no auth required for SSE — spectators need access too).
2. Fetches the current match state (`getMatchForStream`) and sends it as the first event with `type: "state"`.
3. Calls `subscribe(matchId, handler)` on the realtime bus, returning an unsubscribe function.
4. Keeps the response stream open via a `ReadableStream` controller that flushes each event as a Server-Sent Event formatted string (`data: ${JSON.stringify(event)}\n\n`).
5. On `request.signal.addEventListener("abort")`, calls the unsubscribe function to remove the listener from the EventEmitter.

**Event format**:
```
data: {"type":"score","eventType":"try","teamId":"...","homeScore":5,"awayScore":0,...}\n\n
data: {"type":"phase_change","status":"halftime","startedAt":"...",...}\n\n
data: {"type":"event_deleted","eventId":"..."}\n\n
```

The commentator view at `/organizer/match/[matchId]/commentator` connects to this endpoint on mount and processes events through `computeLiveStats`. The client maintains a local event log in React state. Score events are appended; deleted events are removed by `eventId`; phase changes update the clock state.

**On disconnect/reconnect**: the commentator view re-fetches `GET /api/organizer/match/[matchId]` to get the full current event list before re-opening the SSE stream. This prevents the client from missing events that occurred during the disconnection window.

**Nginx requirement**: `proxy_buffering off` must be set for the `/api/stream/` path in the Nginx configuration. Without this, Nginx holds buffered chunks until the buffer fills, which delays event delivery by several seconds. Cloudflare's "Cache Everything" rule must explicitly exclude `/api/stream/*`.

---

## 4. Module Dependencies and Data Flow

The organizer portal depends on the following modules:

| Module | Why |
|---|---|
| `tournament` | `getOrganizerWithTeams`, `getOrganizerTournament`, `approveTournamentTeam`, `listPendingTeams`, `getApprovedTeams`, `createTournament`, `updateTournamentSettings` |
| `match` | `getMatchesByTournament`, `getMatchWithRoster`, `addMatchEvent`, `deleteMatchEvent`, `transitionMatchPhase`, `computeStandings`, `lockMatch`, `saveMatchLineup`, `updateMatchMetadata`, `getMatchForStream` |
| `team` | `getTeamById` (team detail page) |
| `player` | `getPlayersByTeam` (roster view in team detail) |
| `attendance` | `getAttendanceForMatch` (not yet used — Alpha backlog) |
| `payment` | `createPayment`, `handleBillplzWebhook` (not yet connected — Alpha backlog) |
| `shared/auth/can` | All mutation routes and server actions |

**Complete data flow for a try scored in the match center**:
1. Organizer taps "Try — Home — Player 7" in the match center.
2. Client immediately updates `homeScore` in React state (+5) and adds the event to the local event log (optimistic update).
3. Client fires `POST /api/organizer/match/[matchId]/event` with `{ eventType: "try", teamId: homeTeamId, playerId: "...", minute: 23 }`.
4. Route handler calls `requireOrgAuth()` then `can(userId, "tournament:score", { tournamentId })`.
5. Route handler calls `addMatchEvent(matchId, eventData)` in the match module.
6. `addMatchEvent` runs a Prisma transaction: inserts `MatchEvent` row, increments `Match.homeScore` by 5.
7. On transaction success, `addMatchEvent` calls `publish(matchId, { type: "score", eventType: "try", homeScore: newScore, ... })`.
8. The SSE bus delivers the event to all connected clients (commentator view, spectator page).
9. Commentator view receives the event, calls `computeLiveStats` on the updated event list, re-renders.
10. Public spectator page receives the same event, updates its live score display.
11. Route handler returns `201 Created` with the full event record.
12. Match center client receives the confirmation and marks the optimistic update as committed.

If step 4–8 fails (DB error, auth failure), the route returns an error status and the match center client rolls back the optimistic update.

---

## 5. Known Technical Debt

The following items represent non-functional code or local-state-only UI that must be addressed in the Alpha milestone.

### 5.1 Settings Page — No DB Writes

**File**: `src/app/(app)/organizer/settings/page.tsx`

Every section's save handler (`handleSaveTournamentInfo`, `handleSaveFormat`, `handleSavePitches`, etc.) calls `setTimeout(() => setFlashState(section, null), 2000)` — a pure UI animation. No server action is called. The entire settings page is local-state only.

**Fix**: Wire each section's save to `updateTournamentSettings` (already exported from the `tournament` module). The `branding` JSON field on the `Tournament` model can absorb format rules, pitches, visibility settings, and organizer profile without a schema migration. Tournament name, dates, and code require writing to top-level `Tournament` fields.

### 5.2 Groups Editor — Local-State Save

**File**: `src/app/(app)/organizer/teams/_components/groups-editor.tsx`

The `saveChanges` function called by the "Save" button updates only the `setGroups` React state. The `TournamentTeam.groupLabel` fields in the DB are never touched.

**Fix**: Add a `saveGroupAssignmentsAction` server action in `src/app/(app)/organizer/teams/actions.ts` that calls a new `updateTeamGroupLabels(tournamentId, assignments: { teamId: string; groupLabel: string }[])` function in the `tournament` module. The function should run a Prisma `updateMany` in a transaction.

### 5.3 Dead `[launched]` State in Setup Wizard

**File**: `src/app/(app)/organizer/settings/setup/page.tsx`

```typescript
const [launched] = useState(false); // No setter — launched can never become true
```

The component renders a "Tournament is Live!" completion screen when `launched === true`, but this screen is unreachable because the setter is never called. The `launchTournamentAction` redirects server-side to `/organizer`, bypassing the client-rendered completion screen entirely.

**Fix**: Either remove the `[launched]` state and the unreachable completion screen (the server-side redirect is the correct behaviour), or replace the server-side redirect with a client-side state update that shows the completion screen before navigating.

### 5.4 Hardcoded Group Filters in Schedule

**File**: `src/app/(app)/organizer/schedule/_client.tsx`

```typescript
const groupOptions = ["All", "A", "B", "C", "D", "E", "F"];
```

This hardcodes the assumption that groups are always labelled A through F. A tournament with custom group labels (e.g. "Pool 1", "Pool 2") would show the wrong filters.

**Fix**: Derive the group filter options from the unique `groupLabel` values of `TournamentTeam` rows for the current tournament. Pass these as a prop from the RSC page.

### 5.5 Hardcoded Standings Advancement Text

**File**: `src/app/(app)/organizer/standings/_client.tsx`

```typescript
"9 Teams • 2 Pools"
"Road to Glory"
```

These strings are hardcoded promotional copy in the advancement graphic. They should be derived from the tournament's actual team count and format.

**Fix**: Pass team count and format from the RSC page to the client. Compute the advancement text from real data.

### 5.6 Knockout Bracket Always TBD

**File**: `src/app/(app)/organizer/standings/_client.tsx`

The knockout bracket component only shows real data for QF cards (where `round` matches `QF1`–`QF4`). SF, Final, and 3rd Place bracket cards always show placeholder content regardless of whether the preceding rounds are complete.

**Fix**: Add a `computeKnockoutBracket(matches: PublicMatch[])` function to the match module (or the standings client lib) that:
1. Identifies the QF winners by looking at locked QF matches.
2. Maps QF1 winner vs QF2 winner to SF1, QF3 winner vs QF4 winner to SF2.
3. Maps SF1 winner vs SF2 winner to Final, SF1 loser vs SF2 loser to 3rd Place.
4. Returns the seeded bracket structure for the view to render.

---

## 6. Alpha Technical Work Items

The following items are ordered by dependency and priority for the Alpha completion milestone.

**1. Organizer settings persistence** _(no schema change needed)_
- Add `saveSettingsAction` (or section-level actions) in `src/app/(app)/organizer/settings/actions.ts`
- Wire to `updateTournamentSettings` in the tournament module
- The `branding` JSON field absorbs non-standard config; top-level fields handle name/dates/code

**2. Groups editor server action** _(no schema change needed)_
- Add `saveGroupAssignmentsAction` in `src/app/(app)/organizer/teams/actions.ts`
- Add `updateTeamGroupLabels` in `src/modules/tournament/service.ts`
- Uses `db.tournamentTeam.updateMany` in a transaction

**3. Knockout bracket computation** _(no schema change needed)_
- Add `computeKnockoutBracket(matches: PublicMatch[])` in `src/modules/match/` or a `_lib/` file under standings
- Export from match module's `index.ts`
- Update `standings/_client.tsx` to use it

**4. Fix dead `[launched]` state** _(one-line change)_
- Remove `const [launched] = useState(false)` and the unreachable completion screen in `settings/setup/page.tsx`

**5. Derive schedule group filters from real data** _(small prop change)_
- Fetch unique group labels in the RSC page
- Pass as `availableGroups: string[]` prop to `_client.tsx`

**6. Derive standings advancement text from tournament data**
- Pass `teamCount` and `format` from the RSC page
- Compute advancement text in the client

**7. Billplz billing integration**
- Enable `PAYMENTS_ENABLED` flag
- Wire "Upgrade to Pro" button to `createPayment`
- Add `/api/webhooks/billplz` route handler calling `handleBillplzWebhook`
- Update settings billing section to show real plan status

**8. Team join wizard server action**
- Add `registerTeamAction` in `src/app/(marketing)/[tournamentCode]/join/actions.ts`
- Calls `joinTournamentByCode` in the team module with the collected team + player data
- Remove hardcoded `klsevens25` tournament code

**9. Attendance summary page**
- Add `/organizer/match/[matchId]/attendance` route or a tab in the match center
- Calls `getAttendanceForMatch(matchId)` from the attendance module
- Shows checked-in, late, and absent player lists

**10. Match lineup view in match center**
- Add a Lineup tab to the match center RSC page
- Calls `getMatchWithRoster` (already available) to load lineup data
- Allows organizer to set/view starters and bench
- Calls `saveMatchLineup` (already exported from match module)
