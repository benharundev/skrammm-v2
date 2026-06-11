# Skrammm API Reference

## Overview

Skrammm is a modular monolith serving two distinct hosts:

| Host | Purpose |
|------|---------|
| `app.skrammm.com` | App — organizer, team manager, and player portals |
| `skrammm.com` | Marketing / public-facing pages |

**Base URL (production):** `https://app.skrammm.com`  
**Base URL (local dev):** `http://localhost:3000`

All REST endpoints accept and return JSON unless noted otherwise. POST/DELETE request bodies must include `Content-Type: application/json`.

---

## Authentication

Skrammm uses **email OTP** — no passwords, no OAuth.

### OTP Flow

1. `POST /api/auth/send-otp` with `{ "email": "user@example.com" }` — sends a 6-digit code via email (expires in 10 minutes).
2. `POST /api/auth/verify-otp` with `{ "email": "...", "otp": "123456" }` — verifies the code and creates a session.

The session is backed by a database row. On success, the server sets:

```
Set-Cookie: __Secure-skrammm.session_token=<token>; Domain=.skrammm.com; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000
```

The cookie rolls on every request (30-day rolling window). All subsequent requests must carry this cookie. There is no Bearer token mechanism.

**Local dev cookie name:** `skrammm.session_token` (no `__Secure-` prefix).

### Ending a Session

`POST /api/auth/sign-out` — clears the session cookie and deletes the DB session row.

---

## Authorization

Authorization is **entity-scoped**, not role-global. A user is not generically "an organizer" — they are the organizer of a specific tournament, or the primary manager of a specific team.

Every mutating endpoint and Server Action calls `can(userId, permission, scope)` before acting. Path prefix alone is never sufficient.

### Permissions Reference

| Permission | Who has it | Required scope |
|-----------|-----------|----------------|
| `tournament:edit` | Organizer of the tournament | `tournamentId` |
| `tournament:score` | Organizer of the tournament | `tournamentId` |
| `tournament:approve_team` | Organizer of the tournament | `tournamentId` |
| `tournament:check_in_team` | Organizer of the tournament | `tournamentId` |
| `team:manage` | Primary manager of the team | `teamId` |
| `team:approve_player` | Primary manager of the team | `teamId` |
| `team:set_lineup` | Any staff member of the team | `teamId` |
| `team:scan` | Any staff member of the team, match must be today | `teamId` + `matchId` |
| `medical:view_profile` | Claimed player (self) or any team staff | `playerId` |
| `medical:edit_profile` | Claimed player (self); primary manager only while player is unclaimed | `playerId` |
| `injury:create` | Organizer of the tournament containing the match | `matchId` |
| `injury:view` | Organizer, claimed player (self), or any team staff | `matchId` or `playerId` |
| `player:edit_self` | The player themselves (must be claimed) | `playerId` |
| `spectator:read` | Everyone when tournament is live or completed | `tournamentId` |

---

## REST API Reference

### Auth

#### `GET /api/auth/*` and `POST /api/auth/*`

Better Auth catch-all handler. Manages all auth operations including OTP send/verify, session retrieval, and sign-out.

These endpoints are managed by the [Better Auth](https://better-auth.com) library. Key sub-routes:

| Sub-route | Method | Description |
|-----------|--------|-------------|
| `/api/auth/send-otp` | POST | Send OTP to email |
| `/api/auth/verify-otp` | POST | Verify OTP and create session |
| `/api/auth/get-session` | GET | Get current session |
| `/api/auth/sign-out` | POST | Invalidate session |

**Auth required:** No (these are the auth endpoints themselves)

---

### Health

#### `GET /api/health`

Returns the health status of the application and database connection.

**Auth required:** No

**Response `200`:**
```json
{
  "status": "ok",
  "db": "ok",
  "ts": 1718000000000
}
```

**Response `200` (degraded):**
```json
{
  "status": "error",
  "db": "unreachable",
  "ts": 1718000000000
}
```

| Field | Type | Description |
|-------|------|-------------|
| `status` | `"ok"` \| `"error"` | Overall health status |
| `db` | `"ok"` \| `"unreachable"` | Database connectivity |
| `ts` | `number` | Unix timestamp (milliseconds) |

---

### Real-time

#### `GET /api/stream/{matchId}`

Server-Sent Events (SSE) stream for a live match. Delivers real-time match events including score updates, cards, and substitutions. Includes a catch-up mechanism: if a `Last-Event-ID` header is sent, the server replays all events since that ID before resuming live streaming.

**Auth required:** No (match must exist)

**Path parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `matchId` | UUID | The match to stream |

**Request headers:**

| Header | Required | Description |
|--------|----------|-------------|
| `Last-Event-ID` | No | UUID of the last received event; triggers catch-up replay |

**Response headers:**
```
Content-Type: text/event-stream
Cache-Control: no-cache, no-store, no-transform
X-Accel-Buffering: no
```

**Event format:**
```
id: 01900000-0000-7000-0000-000000000000
event: match_event
data: {"eventType":"try","teamId":"...","minute":12,"player":{"fullName":"Ahmad Razif"}}

: heartbeat
```

Event types streamed: `match_state` (initial snapshot), `match_event` (live events), heartbeat comments every 30 seconds.

> **Infrastructure note:** Nginx must have `proxy_buffering off` for this route. Cloudflare must not cache it (set Cache Rule to bypass).

---

### Organizer

#### `POST /api/organizer/match/{matchId}/event`

Add a scoring or disciplinary event to a live match.

**Auth required:** Yes — `tournament:score` permission for the match's tournament

**Path parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `matchId` | UUID | The match to add the event to |

**Request body:**
```json
{
  "teamId": "01900000-0000-7000-0000-000000000001",
  "eventType": "try",
  "minute": 12,
  "playerId": "01900000-0000-7000-0000-000000000002"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `teamId` | UUID | Yes | Team that scored / committed the event |
| `eventType` | `MatchEventType` | Yes | See [MatchEventType](#matcheventtype) |
| `minute` | integer (0–120) | No | Match minute |
| `playerId` | UUID | No | Player involved |

**Response `200`:**
```json
{
  "ok": true,
  "eventId": "01900000-0000-7000-0000-000000000003"
}
```

**Error responses:**

| Code | Description |
|------|-------------|
| `400` | Invalid request body |
| `401` | No session |
| `403` | Not authorized for this tournament |
| `404` | Match not found |

---

#### `DELETE /api/organizer/match/{matchId}/event`

Remove a previously added match event (undo).

**Auth required:** Yes — `tournament:score` permission for the match's tournament

**Path parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `matchId` | UUID | The match the event belongs to |

**Request body:**
```json
{
  "eventId": "01900000-0000-7000-0000-000000000003"
}
```

**Response `200`:**
```json
{ "ok": true }
```

**Error responses:** Same as POST above.

---

#### `POST /api/organizer/match/{matchId}/phase`

Transition a match to a new lifecycle phase.

**Auth required:** Yes — `tournament:score` permission for the match's tournament

**Path parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `matchId` | UUID | The match to transition |

**Request body:**
```json
{
  "status": "live"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `status` | `MatchStatus` | Target phase — see [MatchStatus](#matchstatus) |

**Response `200`:**
```json
{ "ok": true }
```

**Error responses:**

| Code | Description |
|------|-------------|
| `400` | Invalid or disallowed phase transition |
| `401` | No session |
| `403` | Not authorized |
| `404` | Match not found |

---

### Team Manager

#### `POST /api/tm/attendance/scan`

Record a player's match attendance by scanning their QR code.

**Auth required:** Yes — `team:scan` permission (staff of the team; match must be today)

**Request body:**
```json
{
  "token": "<qr-token>",
  "matchId": "01900000-0000-7000-0000-000000000001",
  "teamId": "01900000-0000-7000-0000-000000000002"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `token` | string | Yes | QR token from the player's `GET /player/qr/token` |
| `matchId` | UUID | Yes | Match being attended |
| `teamId` | UUID | Yes | Team the player is being checked in for |

**Response `200`:**
```json
{
  "playerName": "Ahmad Razif bin Azman"
}
```

**Error responses:**

| Code | Description |
|------|-------------|
| `400` | Missing fields, invalid token, or scan failure |
| `401` | No session |
| `403` | No team found for user, or unauthorized |

---

#### `POST /api/tm/attendance/override`

Manually mark a player as attended (bypass QR scan).

**Auth required:** Yes — `team:scan` permission (staff of the team; match must be today)

**Request body:**
```json
{
  "playerId": "01900000-0000-7000-0000-000000000001",
  "matchId": "01900000-0000-7000-0000-000000000002",
  "teamId": "01900000-0000-7000-0000-000000000003"
}
```

**Response `200`:**
```json
{ "ok": true }
```

**Error responses:** Same as scan endpoint.

---

### Player

#### `GET /player/qr/token`

Generate a time-limited QR token for the authenticated player. Used for attendance scanning.

**Auth required:** Yes — must have a claimed player profile

**Response `200`:** QR token payload (format determined by `generatePlayerQrToken`)

**Error responses:**

| Code | Description |
|------|-------------|
| `401` | No session |
| `404` | No claimed player profile found |

---

#### `GET /player/share/card`

Generate a player performance card as a PNG image.

**Auth required:** Yes

**Query parameters:**

| Param | Values | Default | Description |
|-------|--------|---------|-------------|
| `type` | `career` \| `last30` \| `matches` | `career` | Stats window for the card |

**Response:** PNG image

**Response headers:**
```
Content-Type: image/png
Cache-Control: no-store
```

**Error responses:**

| Code | Description |
|------|-------------|
| `401` | No session |
| `404` | No player profile |

---

#### `GET /player/share/tournament/{tournamentId}`

Generate a player performance card for a specific tournament as a PNG image.

**Auth required:** Yes

**Path parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `tournamentId` | UUID | Tournament to generate stats for |

**Response:** PNG image

**Response headers:**
```
Content-Type: image/png
Cache-Control: no-store
```

**Error responses:**

| Code | Description |
|------|-------------|
| `401` | No session |
| `404` | No player profile or tournament not found |

---

### Webhooks

#### `POST /api/webhooks/billplz`

Receives payment event notifications from [Billplz](https://www.billplz.com). Protected by HMAC signature verification.

> **Note:** The payments feature is currently gated behind the `PAYMENTS_ENABLED` environment variable and is dormant (all tournaments are free). This endpoint is present but will not trigger payment flows unless the flag is set.

**Auth required:** No — uses `X-Signature` header instead

**Request headers:**

| Header | Required | Description |
|--------|----------|-------------|
| `X-Signature` | Yes | HMAC-SHA256 signature of the payload |

**Request body:**
```json
{
  "id": "BILL_ID",
  "collection_id": "COLLECTION_ID",
  "paid": true,
  "state": "due",
  "amount": 10000,
  "paid_amount": 10000,
  "due_at": "2026-01-01",
  "email": "user@example.com",
  "mobile": "+60123456789",
  "name": "Ahmad Razif",
  "url": "https://www.billplz.com/bills/BILL_ID",
  "paid_at": "2026-01-01T12:00:00+08:00",
  "transaction_id": "TXN_ID",
  "transaction_status": "success"
}
```

**Response `200`:**
```json
{ "ok": true }
```

**Error responses:**

| Code | Description |
|------|-------------|
| `400` | Invalid payload shape |
| `401` | Invalid or missing signature |

---

### Public (Marketing Host)

#### `GET /{tournamentCode}/share/{matchId}` — `skrammm.com`

Generate a shareable match story card as a PNG image. Public endpoint — no auth required. Tournament must be live or completed (draft tournaments return 404).

**Host:** `skrammm.com` (marketing host, not `app.skrammm.com`)

**Path parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `tournamentCode` | string | Tournament short code (e.g., `rughero-2026`) |
| `matchId` | UUID | Match to generate the card for |

**Response:** PNG image

**Response headers (completed match):**
```
Content-Type: image/png
Cache-Control: public, max-age=3600, stale-while-revalidate=86400
```

**Response headers (live/scheduled match):**
```
Content-Type: image/png
Cache-Control: no-store
```

**Error responses:**

| Code | Description |
|------|-------------|
| `404` | Tournament not found, tournament is in draft, or match not found |

---

## Server Actions Reference

Server Actions are Next.js-specific RPC functions — they are not REST endpoints and cannot be called directly over HTTP. They are invoked from React forms and client components via the Next.js Action protocol.

### Organizer Portal

#### `launchTournamentAction(formData)`

Create and launch a new tournament. The calling user becomes the organizer.

**File:** `src/app/_app/organizer/settings/setup/actions.ts`  
**Auth:** Session required (no explicit permission — creator becomes organizer)

**FormData fields:**

| Field | Type | Constraints | Required |
|-------|------|-------------|----------|
| `name` | string | 3–100 chars | Yes |
| `code` | string | 3–20 chars, lowercase alphanumeric + hyphens, no consecutive hyphens | Yes |
| `format` | `TournamentFormat` | Auto-inferred from `teamCount` if omitted | No |
| `teamCount` | number | Default 16 | No |
| `startsAt` | ISO date string | | No |
| `endsAt` | ISO date string | | No |

**Returns:** `{ error: string }` on validation failure; redirects to `/organizer` on success.

---

#### `approveTeamAction(teamId)`

Approve a team's registration for the organizer's tournament.

**File:** `src/app/_app/organizer/teams/actions.ts`  
**Auth:** `tournament:edit`

**Parameters:** `teamId: string (UUID)`  
**Returns:** void (revalidates page)

---

#### `rejectTeamAction(teamId)`

Reject a team's registration.

**File:** `src/app/_app/organizer/teams/actions.ts`  
**Auth:** `tournament:edit`

**Parameters:** `teamId: string (UUID)`  
**Returns:** void (revalidates page)

---

#### `saveMatchMetadataAction(matchId, data)`

Update match scheduling details.

**File:** `src/app/_app/organizer/schedule/actions.ts`  
**Auth:** `tournament:edit`

**Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `matchId` | UUID | Match to update |
| `data.referee` | string | Referee name |
| `data.venue` | string | Venue / pitch name |
| `data.scheduledTime` | ISO date string | Kickoff time |

**Returns:** void (revalidates schedule page)

---

### Team Manager Portal

#### `updateTeamSettingsAction(formData)`

Update team profile information.

**File:** `src/app/_app/tm/settings/actions.ts`  
**Auth:** `team:manage`

**FormData fields:**

| Field | Type | Constraints | Required |
|-------|------|-------------|----------|
| `name` | string | 2–100 chars | Yes |
| `origin` | string | max 200 chars | No |
| `trainingGround` | string | max 200 chars | No |
| `contactEmail` | string | valid email or empty | No |
| `contactPhone` | string | max 30 chars | No |

**Returns:** void (revalidates `/tm/settings` and `/tm`)

---

#### `updatePersonalInfoAction(formData)`

Update the calling user's claimed player profile.

**File:** `src/app/_app/tm/settings/actions.ts`  
**Auth:** Session required (player identity derived from session)

**FormData fields:**

| Field | Type | Constraints | Required |
|-------|------|-------------|----------|
| `fullName` | string | 2–100 chars | Yes |
| `jerseyNumber` | number | 1–99 | No |
| `position` | string | | No |

**Returns:** void (revalidates `/tm/settings`)

---

#### `saveLineupAction(formData)`

Submit the starting lineup for a match.

**File:** `src/app/_app/tm/lineups/actions.ts`  
**Auth:** `team:set_lineup`

**FormData fields:**

| Field | Type | Description |
|-------|------|-------------|
| `matchId` | UUID | Match to set lineup for |
| `starters` | UUID[] | Array of player IDs in the starting XV |

**Returns:** void (redirects to `/tm/lineups?matchId={matchId}`)

---

#### `joinTournamentAction(formData)`

Join a tournament by its join code.

**File:** `src/app/_app/tm/tournaments/actions.ts`  
**Auth:** `team:manage`

**FormData fields:**

| Field | Type | Constraints |
|-------|------|-------------|
| `code` | string | 4–20 chars |

**Returns:** `{ ok: boolean, reason?: string }` (revalidates `/tm/tournaments` on success)

---

#### `updatePlayerAction(playerId, formData)`

Update a player's profile as team manager.

**File:** `src/app/_app/tm/squad/[playerId]/actions.ts`  
**Auth:** `team:manage` (player must belong to manager's team)

**Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `playerId` | UUID | Player to update |
| `fullName` | string | 2–100 chars |
| `jerseyNumber` | number | 1–99 (optional) |
| `position` | string | Optional |

**Returns:** void (redirects to `/tm/squad/{playerId}`, revalidates `/tm/squad`)

---

#### `deletePlayerAction(playerId)`

Remove a player from the squad.

**File:** `src/app/_app/tm/squad/[playerId]/actions.ts`  
**Auth:** `team:manage` (player must belong to manager's team)

**Parameters:** `playerId: UUID`  
**Returns:** void (redirects to `/tm/squad`, revalidates `/tm/squad`)

---

### Development Only

#### `getRealOtpForMock(email)` ⚠️ Dev only

Retrieve the actual OTP for a given email without going through email delivery. Used for mock authentication in development and tests.

**File:** `src/app/actions.ts`  
**Auth:** None  
**Available in:** Development environment only. Never exposed in production.

---

## Types & Enums

### MatchEventType

```
"try" | "conversion" | "penalty" | "drop_goal" |
"yellow_card" | "red_card" | "sub_in" | "sub_out"
```

Point values: `try` = 5, `conversion` = 2, `penalty` = 3, `drop_goal` = 3. Card and substitution events do not affect score.

### MatchStatus

```
"scheduled" | "live" | "suspended" | "locked" | "completed"
```

| Status | Description |
|--------|-------------|
| `scheduled` | Not yet started |
| `live` | Clock running |
| `suspended` | Temporarily halted |
| `locked` | Final score confirmed, awaiting review |
| `completed` | Fully closed |

### TournamentFormat

```
"festival" | "tiered" | "elimination"
```

### TournamentStatus

```
"draft" | "paid" | "live" | "completed" | "cancelled"
```

### PlayerPosition

Free-text string (e.g., `"Loosehead Prop"`, `"Fly-half"`, `"Fullback"`).

### ClaimStatus

```
"unclaimed" | "pending" | "claimed"
```

---

## Error Format

All REST endpoints return errors in this shape:

```json
{
  "error": "Human-readable description"
}
```

Standard HTTP status codes apply: `400` bad request, `401` unauthenticated, `403` forbidden, `404` not found, `500` server error.
