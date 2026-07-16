# Team Manager Portal — Technical PRD

**Version:** 1.0  
**Date:** July 2026  
**Phase:** MVP  
**Audience:** Engineering team

---

## 1. Route Map

All TM routes are in `src/app/(app)/tm/`. Every route is protected by `requireAuth()`, which validates the `skrammm.session_token` cookie. `getManagerTeam` is the primary data-loading function, wrapped in React's `cache()` to deduplicate DB calls across server components on the same page.

| Route | File | Rendering | Auth | Key Data Calls |
|---|---|---|---|---|
| `/tm` | `page.tsx` | RSC + CC | `requireAuth()` | `getManagerTeam`, `getUpcomingMatchesForTeam`, `getPastMatchesForTeam` |
| `/tm/create-team` | `create-team/page.tsx` | CC | `requireAuth()` | Server action: `createTeam` |
| `/tm/squad` | `squad/page.tsx` | RSC + CC | `requireAuth()` | `getManagerTeam` (includes `players`), `computeTeamRrs` |
| `/tm/squad/add` | `squad/add/page.tsx` | CC | `requireAuth()` | Server action: `createPlayer` |
| `/tm/squad/[playerId]` | `squad/[playerId]/page.tsx` | RSC + CC | `requireAuth()` | `getPlayerById`, `getPlayerStats` |
| `/tm/squad/[playerId]/edit` | `squad/[playerId]/edit/page.tsx` | RSC + CC | `requireAuth()` | `getPlayerById`, then server actions |
| `/tm/tournaments` | `tournaments/page.tsx` | RSC + CC | `requireAuth()` | `getManagerTeam` (includes tournament entries), `getPastMatchesForTeam` |
| `/tm/lineups` | `lineups/page.tsx` | RSC + CC | `requireAuth()` | `getManagerTeam`, `getUpcomingMatchesForTeam`, `getMatchWithRoster` |
| `/tm/attendance` | `attendance/page.tsx` | RSC + CC | `requireAuth()` | `getManagerTeam`, `getUpcomingMatchesForTeam` |
| `/tm/settings` | `settings/page.tsx` | RSC + CC | `requireAuth()` | `getManagerTeam`, `getClaimedPlayerForUser` |

RSC = React Server Component (default). CC = Client Component.

**API Routes** (REST, used by the attendance scanner):

| Route | File | Purpose |
|---|---|---|
| `POST /api/tm/attendance/scan` | `api/tm/attendance/scan/route.ts` | Validate QR token, write `AttendanceScan` |
| `POST /api/tm/attendance/override` | `api/tm/attendance/override/route.ts` | Manual check-in, write `AttendanceScan` with `isManualOverride = true` |

---

## 2. Data Architecture

### 2.1 `getManagerTeam` — The TM Data Entry Point

`getManagerTeam(userId)` is the TM portal's equivalent of `getClaimedPlayerForUser`. It is wrapped in React's `cache()` and returns the full `Team` record including players, tournament entries, and staff. The cache deduplication ensures that multiple server components on the same page (e.g. squad page sidebar + squad list) share one DB round-trip.

```typescript
// From src/modules/team/service.ts
export const getManagerTeam = cache(async (userId: string) => {
  return db.team.findFirst({
    where: {
      staff: { some: { userId, isPrimaryManager: true } }
    },
    include: {
      players: { where: { deletedAt: null }, orderBy: { jerseyNumber: "asc" } },
      staff: true,
      tournamentTeams: { include: { tournament: true } },
    }
  });
});
```

Note: the `players` include must filter `deletedAt: null` after the soft-delete migration is applied (see bug fix section 6.1). Until the migration is applied, this filter does not exist and hard-deleted players simply do not appear (they are gone entirely).

If `getManagerTeam` returns `null`, the user has no team. The portal directs them to `/tm/create-team`.

### 2.2 Module Dependencies

| Module | Functions Used |
|---|---|
| `team` | `getManagerTeam`, `createTeam`, `joinTournamentByCode`, `updateTeamSettings`, `hasTeamTournaments`, `updateTeamLogo`, `getTeamLogoPresignedUrl`, `saveTeamLogo` |
| `player` | `createPlayer`, `getPlayerById`, `updatePlayerByManager`, `updatePlayerProfile`, `removePlayerFromSquad`, `getPlayerStats`, `generatePlayerQrToken` |
| `match` | `getUpcomingMatchesForTeam`, `getPastMatchesForTeam`, `getMatchWithRoster`, `saveMatchLineup` |
| `attendance` | `getAttendanceForMatch` (not yet used in TM pages — bug fix), `scanPlayerQr` (via API route), `manualOverrideScan` (via API route) |
| `reliability` | `computeTeamRrs`, `computeRrsV2` (for individual player RRS pills on squad page) |
| `tournament` | `getTournamentByCode` (implicit via `joinTournamentByCode`) |
| `shared/auth/can` | All server actions: `team:manage`, `team:set_lineup`, `team:scan`, `player:edit_self` |

---

## 3. Attendance API Architecture

The attendance scanner uses REST API routes rather than Server Actions. This is because QR scanning happens inside a camera callback in the `_client.tsx` component — an imperative `fetch` call triggered by the QR decoder library when it reads a code. Server Actions are form-based and would require constructing a `FormData` object inside the camera callback, which is awkward and adds unnecessary latency.

### 3.1 `POST /api/tm/attendance/scan`

**Auth**: `requireAuth()` + `can(userId, "team:scan", { teamId, matchId })`

The `team:scan` permission check is strict: it verifies that (a) the user has a `TeamStaff` entry for the team, (b) the match is scheduled for today (compared against `match.scheduledAt` date), and (c) the team is a participant in that match (either `homeTeamId` or `awayTeamId`).

**Body**:
```typescript
{
  token: string;   // the QR token UUID scanned from the player's QR code
  matchId: string;
  teamId: string;
}
```

**Behaviour**: calls `scanPlayerQr(token, matchId, teamId, userId)` in the attendance module, which:
1. Looks up `PlayerQrToken` by `token`.
2. Validates `expiresAt > now()` and `player.teamId === teamId`.
3. Writes an `AttendanceScan` row with `isManualOverride = false`.
4. Soft-rotates the token (creates a new token, sets `rotatedFromId` to the current token's ID).
5. Returns the player's name, jersey number, and check-in time.

**Response**: `200 OK` with `{ playerName, jerseyNumber, checkedInAt }`. `404 Not Found` if token is invalid or expired. `409 Conflict` if the player is already checked in for this match. `403 Forbidden` on permission failure.

### 3.2 `POST /api/tm/attendance/override`

**Auth**: `requireAuth()` + `can(userId, "team:scan", { teamId, matchId })`

**Body**:
```typescript
{
  playerId: string;
  matchId: string;
  teamId: string;
  reason: string;  // required for audit trail
}
```

**Behaviour**: calls `manualOverrideScan(playerId, matchId, teamId, userId, reason)`, which writes an `AttendanceScan` row with `isManualOverride = true` and `ip`/`userAgent` from the request headers.

**Response**: `200 OK` with `{ playerName, jerseyNumber, checkedInAt }`. `403 Forbidden` on permission failure. `409 Conflict` if already checked in.

---

## 4. Lineup Architecture

The lineup setter at `/tm/lineups` uses `saveMatchLineup` from the match module to persist lineup choices.

```typescript
// saveMatchLineup signature
saveMatchLineup(matchId: string, teamId: string, players: {
  playerId: string;
  isStarter: boolean;
  jerseyNumber: number;
}[]): Promise<void>
```

`saveMatchLineup` uses Prisma's `upsert` with `(matchId, teamId, playerId)` as the composite key, meaning it can be called multiple times for the same match and will update existing rows rather than creating duplicates. This allows the TM to adjust the lineup multiple times before kick-off.

The lineup data flows downstream to the commentator view. When the organizer opens the match center, `getMatchWithRoster` loads the current lineup and passes it to the three-column commentator layout. The lineup panels show players in jersey number order, with starters and bench separated.

The `team:set_lineup` permission allows any `TeamStaff` member (not just the primary manager) to set lineups. This is intentional — a head coach may set the tactical lineup while the primary manager handles registration and payments.

---

## 5. Server Action Pattern

All TM server actions follow the standard five-step sequence:

```typescript
"use server";

// 1. Authenticate
const session = await requireAuth();

// 2. Load team (establishes entity context)
const team = await getManagerTeam(session.user.id);
if (!team) return;

// 3. Authorize
const allowed = await can(session.user.id, "team:manage", { teamId: team.id });
if (!allowed) return;

// 4. Validate input
const parsed = UpdateTeamSchema.safeParse(rawFormData);
if (!parsed.success) return;

// 5. Execute + revalidate
await updateTeamSettings(team.id, parsed.data);
revalidatePath("/tm/settings");
```

The `getManagerTeam` call in step 2 establishes the `teamId` for the permission check in step 3. Never pass `teamId` from the form body directly to the permission check — always derive it from the authenticated session.

---

## 6. Bug Fix Implementation Notes

### 6.1 Soft-Delete Player — Critical Migration

**File**: `prisma/schema.prisma` + `src/modules/player/service.ts`

This is a two-part change: a schema migration and a service function update.

**Step 1 — Schema change** in `prisma/schema.prisma`:
```prisma
model Player {
  // ... existing fields ...
  deletedAt DateTime? // add this field
}
```

After adding the field, run:
```bash
pnpm db:migrate
pnpm db:generate
```

**Step 2 — Update `removePlayerFromSquad`** in `src/modules/player/service.ts`:
```typescript
// Before (hard delete — data loss)
await db.player.delete({ where: { id: playerId } });

// After (soft delete — data preserved)
await db.player.update({
  where: { id: playerId },
  data: { deletedAt: new Date() },
});
```

**Step 3 — Add `deletedAt: null` filter** to all `db.player.findMany`, `db.player.findFirst`, and `db.player.findUnique` calls in `src/modules/player/service.ts`. Every query that retrieves active players must exclude soft-deleted ones.

**Step 4 — Update `getManagerTeam` include** in `src/modules/team/service.ts` to add `where: { deletedAt: null }` to the `players` include.

**Step 5 — Update the delete confirmation dialog** in the squad edit UI to say: "This will remove [name] from your active squad. Their match history and stats will be preserved."

### 6.2 Attendance Roster — Load from DB on Mount

**File**: `src/app/(app)/tm/attendance/_client.tsx`

The client component currently initialises the scan log with an empty array:
```typescript
const [scanLog, setScanLog] = useState<ScanEntry[]>([]);
```

This state resets on every page load.

**Fix**: When the active match is selected from the dropdown, call `getAttendanceForMatch(matchId)` (already exported from the attendance module) via a server action and populate the initial scan log from the DB result. This ensures the scan log persists across page refreshes.

The implementation requires either:
- A server action `loadAttendanceForMatch(matchId: string)` that calls `getAttendanceForMatch` and returns the results, invoked via `useEffect` when the active match changes.
- Or rendering the initial attendance data server-side in the RSC page and passing it as props to the client component (preferred — avoids client-side waterfall).

**Acceptance criteria**: On page load with an active match selected, the scan log shows all previously recorded scans from the DB. New scans append to the log in real time as before.

### 6.3 Delete Orphaned File

**File**: `src/app/(app)/tm/attendance/_client 2.tsx`

```bash
# Delete the file
rm "src/app/(app)/tm/attendance/_client 2.tsx"
```

No other changes required — the file is not imported anywhere.

### 6.4 Fix Misleading Squad Banner

**File**: `src/app/(app)/tm/squad/page.tsx`

When `isMock = true` (user has no team), replace the misleading banner with an empty state that drives the user toward the correct action:

```typescript
// Before (misleading)
{isMock && (
  <Banner>Showing sample squad — create your club to manage real players.</Banner>
)}

// After (correct empty state)
{!dbTeam && (
  <EmptyState
    title="No club yet"
    description="Create your club to start building your squad."
    action={<Link href="/tm/create-team">Create Club</Link>}
  />
)}
```

If the `dbTeam` exists but `players.length === 0`, show a different empty state: "Your squad is empty. Add your first player to get started."

---

## 7. Planned Post-MVP Technical Work

### 7.1 Attendance Roster Screen

A new route or drawer at `/tm/attendance` that loads `getAttendanceForMatch(matchId)` for the selected match and displays three grouped lists: checked in, late, and absent. The component should poll every 30 seconds during the check-in window to show real-time updates.

The attendance module already exports `getAttendanceForMatch`. The only required work is:
1. Building the UI component with three player groups.
2. Adding the polling / manual refresh behaviour.
3. Wiring it into the existing attendance page as a tab or an expandable section.

### 7.2 Fitness Badges on Squad Page

Add a batch query for `PlayerMedicalProfile` fitness statuses alongside the player list. In `getManagerTeam`, add an `include` for medical profiles:

```typescript
players: {
  where: { deletedAt: null },
  include: { medicalProfile: { select: { fitnessStatus: true } } },
  orderBy: { jerseyNumber: "asc" }
}
```

Render a `FitnessBadge` component next to each player's name on the squad list. The badge is a coloured chip with the status label. Players with no medical profile show nothing.

### 7.3 Match-Day Assistant Checklist

A new component on the TM dashboard (or `/tm/attendance`) that appears only on days with a scheduled match. The checklist reads:
- **Lineup set**: check `MatchLineup` table for any rows with `matchId` and `teamId`.
- **Minimum attendance**: count `AttendanceScan` rows where `matchId` and `teamId` match; show X/7 (minimum 7 for a 7s match).
- **Starters all fit**: check that all players in the lineup with `isStarter = true` have `fitnessStatus = "fit"` or `null` (no profile).

No new service functions are needed — all three checks use data already queryable through existing module functions.

### 7.4 Push Notification Triggers

The TM portal needs two notification triggers:
1. When `TournamentTeam.status` changes from `pending_approval` to `approved` — notify the primary manager.
2. When the first `Match` records for a tournament are created with `scheduledAt` values — notify the primary manager that the schedule is available.

Both triggers should be fire-and-forget calls to the notification adapter after the DB write succeeds. They must not block the main operation (team approval, match creation) if the notification fails.
