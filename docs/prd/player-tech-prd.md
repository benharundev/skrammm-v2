# Player Portal — Technical PRD

**Version:** 1.0  
**Date:** July 2026  
**Phase:** MVP  
**Audience:** Engineering team

---

## 1. Route Map

All player routes are in `src/app/(app)/player/`. Routes marked as RSC render primarily as Server Components with `getClaimedPlayerForUser` called in the page RSC to hydrate data. Client Components are used for interactivity (forms, photo upload, QR display).

| Route | File | Rendering | Auth | Key Data Calls |
|---|---|---|---|---|
| `/player` | `page.tsx` | RSC + CC | `requireAuth()` | `getClaimedPlayerForUser`, `getPlayerStats`, `computeRrsV2`, `getUpcomingMatchesForTeam` |
| `/player/profile` | `profile/page.tsx` | RSC + CC | `requireAuth()` | `getClaimedPlayerForUser`, `getPlayerStats`, `computeRrsV2`, `getMedicalProfile` |
| `/player/profile/edit` | `profile/edit/page.tsx` | CC | `requireAuth()` | `getClaimedPlayerForUser` (initial data), then server actions on submit |
| `/player/matches` | `matches/page.tsx` | RSC + CC | `requireAuth()` | `getClaimedPlayerForUser`, `getPlayerTournamentHistory`, `getPlayerStats` |
| `/player/tournaments/[tournamentId]` | `tournaments/[tournamentId]/page.tsx` | RSC + CC | `requireAuth()` | `getPlayerStatsByTournament`, `getPlayerMatchesInTournament` |
| `/player/teams` | `teams/page.tsx` | RSC + CC | `requireAuth()` | `getClaimedPlayerForUser`, `getTeamsByManager`, `hasTeamTournaments` |
| `/player/settings` | `settings/page.tsx` | CC | `requireAuth()` | Session only |
| `/player/settings/medical` | `settings/medical/page.tsx` | RSC + CC | `requireAuth()` | `getMedicalProfile` |

**API Routes**:

| Route | File | Purpose |
|---|---|---|
| `GET /player/qr/token` | `qr/token/route.ts` | Issues or rotates a `PlayerQrToken` for the QR display |
| `GET /player/share/card` | `share/card/route.ts` | Generates the career performance PNG card |
| `GET /player/share/tournament/[tournamentId]` | `share/tournament/[tournamentId]/route.ts` | Generates the tournament-specific PNG card |

---

## 2. Data Architecture

### 2.1 `getClaimedPlayerForUser` — The Player Data Entry Point

`getClaimedPlayerForUser(userId)` is the primary data-loading function for the player portal. It is wrapped in React's `cache()`, which means that within a single RSC render tree, multiple server components can call it without triggering multiple DB queries.

```typescript
// From src/modules/player/service.ts
export const getClaimedPlayerForUser = cache(async (userId: string) => {
  return db.player.findFirst({
    where: { userId, claimStatus: "claimed" },
    include: { team: true, teamMember: true }
  });
});
```

The implication is important: pages that need to load multiple pieces of player data (profile page, dashboard) call `getClaimedPlayerForUser` in multiple child server components without a "props drilling" pattern. Each call is deduplicated to one DB round-trip for the request.

If this function returns `null`, the player has not yet claimed their record. Pages that depend on a claimed player should redirect to `/player/teams` with an appropriate prompt.

### 2.2 Module Layer

The player portal depends on the following modules:

| Module | Functions Used |
|---|---|
| `player` | `getClaimedPlayerForUser`, `getPlayerStats`, `getPlayerStatsByTournament`, `getPlayerMatchesInTournament`, `getPlayerTournamentHistory`, `updatePlayerProfile`, `updatePlayerPhoto`, `claimPlayer`, `generatePlayerQrToken`, `upsertMedicalProfile`, `getMedicalProfile` |
| `reliability` | `computeRrsV2`, `computeTeamRrs`, `getRrsV2WarningLevel` |
| `team` | `getTeamsByManager`, `hasTeamTournaments` |
| `match` | `getUpcomingMatchesForTeam`, `getPastMatchesForTeam` |
| `medical` | `upsertMedicalProfile`, `getMedicalProfile` |

Cross-module calls all go through the respective module's `index.ts` public surface. No direct imports from `service.ts` or `types.ts` of another module are permitted.

---

## 3. RRS v2 in the Player Portal

`computeRrsV2(playerId)` returns an `RrsV2Payload` object with three levels of score, each with its component breakdown:

```typescript
type RrsV2Payload = {
  career: {
    score: number;       // mean − 0.5×stddev across all matches
    level: RrsCareerLevel;     // "green" | "yellow" | "red"
    components: { participation, scoring, outcome, discipline }
    matchCount: number;
  };
  last30Days: {
    score: number;
    level: RrsLast30DaysLevel;
    trendDelta: number;  // career.score − last30Days.score
    formLabel: "Ascending Form" | "Stable Form" | "Slumping Form";
    matchCount: number;
  };
  tournaments: Array<{
    tournamentId: string;
    tournamentName: string;
    score: number;       // mean across matches in this tournament
    level: RrsTournamentLevel;
    matchCount: number;
  }>;
}
```

The player portal maps these levels to visual indicators:
- `"green"` → green ring or badge, displayed without a warning
- `"yellow"` → amber ring, displayed with a "Room for improvement" label
- `"red"` → red ring, displayed with an "At risk" label

The `trendDelta` drives the form label on the dashboard and profile page. Positive delta (career > last-30) means the player is trending down; negative delta means they are trending up. The direction is deliberately from the reader's perspective: "My recent score is higher than my career average, so I'm in Ascending Form."

RRS computation is Redis-cached under `keys.playerRrs(playerId)` with a 300-second TTL. The cache is invalidated synchronously on card events (in the `addMatchEvent` transaction) and asynchronously on match lock (as part of the batch recalculation triggered by `transitionMatchPhase → "lock"`).

---

## 4. QR Token Architecture

The match-day QR code displayed on the player profile and teams page is backed by the `PlayerQrToken` table.

**Token structure**: Each `PlayerQrToken` has a `token` UUID, an `expiresAt` timestamp (typically 2 hours from issuance), and a nullable `rotatedFromId` that chains to the previous token. The chain enables audit: even after rotation, the history of tokens issued for a player is queryable.

**Issuance flow**: `GET /player/qr/token` calls `generatePlayerQrToken(playerId)`:
1. If a non-expired token exists for this player, return it.
2. Otherwise, create a new token, set `rotatedFromId` to the last token's ID, and return the new token.

The QR code displayed in the UI encodes the raw token UUID. The `RotatingQr` client component polls this endpoint every 60 seconds to keep the displayed token fresh. This prevents a token that was photographed at a previous match from being used for check-in at a future one.

**Validation at scan time**: when the TM's attendance scanner submits a QR token via `POST /api/tm/attendance/scan`, the attendance module calls `scanPlayerQr`, which:
1. Looks up the `PlayerQrToken` by the submitted token UUID.
2. Validates that `expiresAt > now()`.
3. Validates the `team:scan` permission (match must be today, team must be in the match).
4. Writes an `AttendanceScan` row.
5. Soft-rotates the token by creating a new one linked via `rotatedFromId`.

The rotation on scan ensures that the same QR code cannot be scanned twice for the same match.

---

## 5. Share Card Generation

Both share card routes are edge-compatible Next.js route handlers that return PNG images using the `@lib/og` module (built on `@vercel/og`).

**Career card** (`GET /player/share/card`):
1. Load player data via `getClaimedPlayerForUser`.
2. Load career stats via `getPlayerStats`.
3. Compute RRS via `computeRrsV2`.
4. Render a 1200×630 PNG with: name, jersey, position, club, try count, match count, cards, RRS score and level, Skrammm logo.

**Tournament card** (`GET /player/share/tournament/[tournamentId]`):
1. Load player data and tournament-specific stats.
2. Compute tournament RRS via `computeRrsV2` and extract the tournament-level score from `payload.tournaments`.
3. Render a 1200×630 PNG with tournament-specific stats and the tournament-level RRS.

**Known bug**: step 2 of the tournament card currently passes `reliability: 0` instead of calling `computeRrsV2`. This must be fixed as part of the MVP bug-fix milestone.

---

## 6. Bug Fix Implementation Notes

### 6.1 Fix: Tournament Share Card `reliability: 0`

**File**: `src/app/(app)/player/share/tournament/[tournamentId]/route.ts`

**Change**: Replace the hardcoded `reliability: 0` with a real computation:

```typescript
// Before (broken)
reliability: 0,

// After (correct)
const rrsPayload = await computeRrsV2(player.id);
const tournamentRrs = rrsPayload.tournaments.find(
  (t) => t.tournamentId === params.tournamentId
);
const reliability = tournamentRrs?.score ?? 0;
```

The `computeRrsV2` call is already being made for the career card — the tournament card simply needs to use the tournament-filtered score from the same payload rather than the career average.

### 6.2 Fix: Tries Bar Chart Uses Loop Index

**File**: `src/app/(app)/player/matches/page.tsx`

**Option A (preferred — adds real data)**:

Extend `TournamentHistoryItem` in `src/modules/player/types.ts`:
```typescript
type TournamentHistoryItem = {
  // existing fields...
  tryCount: number; // add this
};
```

Update `getPlayerTournamentHistory` in `src/modules/player/service.ts` to compute `tryCount` by counting `MatchEvent` rows with `eventType = "try"` for this player in this tournament.

Then in the page:
```typescript
// Before (broken)
const chartData = history.map((item, i) => ({
  label: item.tournament.name.slice(0, 10),
  tries: i + 1,
}));

// After (correct)
const chartData = history.map((item) => ({
  label: item.tournament.name.slice(0, 10),
  tries: item.tryCount,
}));
```

**Option B (faster — uses existing data)**:
Change the chart to display `matchCount` per tournament. This avoids the type extension but makes the chart less informative.

### 6.3 Fix: Position Field Uses Free-Text Input

**File**: `src/app/(app)/player/profile/edit/page.tsx`

**Change**: Replace the `<Input>` with a `<Select>`:

```typescript
// Before (broken)
<Input name="position" placeholder="e.g. Flanker" defaultValue={player.position ?? ""} />

// After (correct)
<Select name="position" defaultValue={player.position ?? ""}>
  <SelectTrigger>
    <SelectValue placeholder="Select position" />
  </SelectTrigger>
  <SelectContent>
    {RUGBY_POSITIONS.map((pos) => (
      <SelectItem key={pos} value={pos}>{pos}</SelectItem>
    ))}
  </SelectContent>
</Select>
```

Import `RUGBY_POSITIONS` from `@lib/constants` (confirm exact path — also used in TM portal forms).

### 6.4 Fix: Dead OTP Field in ClaimPlayerSchema

**File**: `src/modules/player/types.ts`

**Change**: Remove the `otp` field from `ClaimPlayerSchema` since no OTP is sent or validated in the current claim flow:

```typescript
// Before (broken schema with dead field)
export const ClaimPlayerSchema = z.object({
  playerIdCode: z.string().min(1),
  otp: z.string().length(6), // remove this
});

// After (correct)
export const ClaimPlayerSchema = z.object({
  playerIdCode: z.string().min(1),
});
```

If an OTP claim flow is desired for security (to prevent a player from claiming someone else's record if they know their player ID), it should be implemented as a full feature: send an OTP to the manager's email, require the player to enter it. That is a separate tracked feature, not a dead code remnant.

---

## 7. Planned Post-MVP Technical Work

### 7.1 RRS Trend Chart

The RRS trend chart requires per-tournament scores in chronological order. The `computeRrsV2` response already includes the `tournaments` array with scores, which can be sorted by the `startsAt` of each tournament. No new backend function is required — the chart is a frontend addition.

Implementation: on the profile page, use `rrsPayload.tournaments` sorted by tournament start date as the chart data. The chart library is already in use in the TM portal (verify the exact library — likely Recharts).

### 7.2 Push Notifications

The notification system requires:
1. A `NotificationPreference` model in the schema: `{ id, userId, deviceToken, platform, enabled, createdAt }`.
2. A `lib/notifications/` adapter with a `sendNotification(userId, title, body, data)` interface.
3. Service worker `push` event handler in `src/app/sw.ts`.
4. Web push subscription flow in the player portal's settings page.
5. Notification trigger in `saveMatchLineup` (when a player is added as a starter) and in a scheduled job running at `matchScheduledAt - 60 minutes`.

### 7.3 Public Player Profile

A public player profile route at `src/app/(marketing)/player/[playerIdCode]/page.tsx`. Uses ISR with `revalidate = 60`. Reads from `getPlayerById`, `getPlayerStats`, and `computeRrsV2`. Does not require authentication. The `playerIdCode` is the URL slug — it is a unique identifier that is already indexed in the DB.

The public profile must never expose: date of birth, medical information, guardian contact, exact jersey number, or anything from `PlayerMedicalProfile`.
