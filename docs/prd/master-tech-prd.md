# Skrammm — Master Technical PRD

**Version:** 1.0  
**Date:** July 2026  
**Status:** Living Document  
**Audience:** Engineering team, technical leads

---

## 1. Architecture Overview

Skrammm is built as a modular monolith on Next.js 15. The architecture is deliberately layered, with strict one-directional dependency rules enforced at the ESLint level:

```
src/app/          → thin Next.js routes only — no business logic lives here
  (marketing)/    → skrammm.com routes (spectator, join wizard)
  (app)/          → app.skrammm.com routes (organizer/, tm/, player/, api/)

src/modules/      → all domain logic — owns DB tables, exposes public index.ts
  tournament/ team/ player/ match/ attendance/
  reliability/ sponsor/ payment/ medical/ shared/

src/lib/          → infrastructure adapters — leaf layer, imports nothing from modules
  auth/  cache/  constants/  db/  email/  og/  qr/  realtime/  storage/  utils.ts

src/components/   → shared UI components (shadcn/ui lives in components/ui/)
src/styles/       → globals.css + theme.css (design tokens)
```

The rules are:
1. `app/` may import from `modules/*` and `lib/*` — never the reverse.
2. A module imports from another module **only via its public `index.ts`** — never from `service.ts` or `types.ts` directly.
3. `lib/` is leaf-level — it must not import from `modules/`.
4. Each module owns its DB tables; cross-module reads go through the owning module's service.

These rules are enforced by `eslint-plugin-import` in `eslint.config.mjs`. Violations surface as lint errors in CI.

The rationale for this structure is two-fold. First, clean domain ownership: if the `match` module breaks, the blast radius is contained. Second, future service extraction: the `match` scoring module and the `reliability` computation module are the most likely candidates for extraction into standalone services as load grows. Because they communicate today through `index.ts` boundaries and plain UUID references (not Prisma cross-module `@relation` constraints), extracting them in the future requires no schema migration.

---

## 2. Technology Stack

### 2.1 Next.js 15 + React 19

Next.js 15 with the App Router is the full-stack framework. Server Components render the default, with Client Components used only where interactivity or browser APIs are required. `experimental.typedRoutes` is enabled — `href` string literals must match a real route, catching dead links at compile time.

React 19's `cache()` wrapper is used to deduplicate expensive DB queries within a single render tree. `getManagerTeam` and `getClaimedPlayerForUser` are both wrapped in `cache()`, meaning multiple server components on the same page can call them independently without triggering multiple DB round-trips.

### 2.2 TypeScript

TypeScript is configured with the strictest possible settings: `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitReturns`. `no-explicit-any` is a lint error. `@typescript-eslint/consistent-type-imports` enforces `import type` for type-only imports throughout. These settings are not optional — they prevent an entire class of runtime errors that are common in less strict codebases, and they make Prisma's generated types maximally useful.

### 2.3 Prisma + PostgreSQL

Prisma is the ORM. The schema lives in `prisma/schema.prisma`. All IDs are UUID v7, generated in application code via the `uuid` package — not database-generated — because UUID v7 is time-ordered, which gives Postgres B-tree index performance close to sequential IDs while remaining globally unique.

Cross-module relationships are expressed as plain string UUID fields rather than Prisma `@relation` directives. For example, `Match.homeTeamId` is a `String` that references a `Team`, not a Prisma relation. This is intentional: it keeps modules independent at the DB level and removes the constraint that all related models must be in the same Prisma schema when services are eventually extracted.

After any schema change: `pnpm db:generate` to regenerate the Prisma client, then `pnpm db:migrate` to create and apply the migration. `pnpm db:push` is for prototyping only and is never used in a production workflow.

### 2.4 Redis (Optional Layer)

Redis provides an optional caching layer on top of the DB. The `lib/cache/` adapter falls through to the DB transparently when `REDIS_URL` is unset or when Redis is unavailable. This means the application runs correctly in a development environment with no Redis installed.

The cache is used for two high-value computed results: RRS scores (`keys.playerRrs(playerId)`, `keys.teamRrs(teamId)`) and match stats. Both are expensive to compute and rarely stale. The TTL for computed values is 300 seconds (`ttl.COMPUTED`). Cache invalidation is manual and triggered by domain events: card events and match lock invalidate player RRS, and match lock invalidates team RRS.

Direct `ioredis` imports are prohibited. All cache access goes through `lib/cache`, which provides `cachedFn`, `cache.del`, `keys.*`, and `ttl.*` as the complete public interface.

### 2.5 Better Auth

Two separate Better Auth instances run in parallel, sharing the same Postgres database but maintaining independent session stores.

The `auth` instance (in `lib/auth/server.ts`) handles player and team manager sessions. It uses the `skrammm.session_token` cookie and is the authentication layer for all `app.skrammm.com/tm/*` and `app.skrammm.com/player/*` routes.

The `orgAuth` instance (in `lib/auth/org.ts`) handles organizer sessions. It uses the `skrammm.org_session_token` cookie and is the authentication layer for all `app.skrammm.com/organizer/*` routes.

The reason for two instances is not technical complexity — it is trust level separation. Organizers have access to sensitive tournament operations (locking results, approving teams) that should never be accessible from a player or TM session, even if the same email address is used. Keeping them in separate instances with separate cookies enforces this at the session layer, not just at the permission check layer.

Both instances use an email OTP flow: the user enters their email, AWS SES sends a 6-digit code, the user enters the code, and a DB-backed session is created. Sessions roll for 30 days.

`lib/auth/dev.ts` provides `getRealOtpForMock(email)`, which reads an OTP from the in-memory Better Auth verification map or from the `Verification` table. This is used by E2E tests and the `/api/dev/` relay route, which is only active in development builds.

### 2.6 AWS SES

AWS SES handles all transactional email — currently used exclusively for OTP delivery. The SES account is in sandbox mode during development and early production, which means only verified email addresses receive mail. The organizer users page has a dedicated OTP relay UI (`/organizer/users`) that shows the generated OTP in-browser so it can be relayed manually via WhatsApp or other channels when SES sandbox restrictions apply.

### 2.7 S3

Amazon S3 stores player profile photos and team logos. Upload is handled via a presigned URL pattern: the client calls a server action to obtain a presigned PUT URL, uploads directly from the browser to S3, and then calls a second server action to save the resulting URL to the DB. This keeps binary data out of the Next.js request pipeline.

### 2.8 Billplz

Billplz is the Malaysian payment processor integrated for tournament plan upgrades. The `modules/payment/service.ts` contains `createPayment`, `handleBillplzWebhook`, and `verifyBillplzSignature`. The `PAYMENTS_ENABLED` flag controls whether the payment flow is active. Currency is always MYR. The payment UI in the organizer settings currently shows a "Free Plan" indicator and "Upgrade to Pro" button; the Billplz checkout integration is the next billing milestone.

### 2.9 Serwist (PWA)

`src/app/sw.ts` is the Serwist service worker source. It compiles to `public/sw.js` on production builds only. In development, the service worker is disabled to prevent stale cache interference with hot module replacement. The service worker is the foundation for future offline-capable QR scanning and lineup management on mobile devices.

---

## 3. Two-Host Routing

The application serves two distinct domains via `next.config.ts` rewrites and `src/middleware.ts`. Requests to `skrammm.com` are rewritten to routes in `src/app/(marketing)/`. Requests to `app.skrammm.com` are rewritten to routes in `src/app/(app)/`. Locally, `localhost` is treated as the app host.

This separation exists for two reasons. First, the caching strategy differs: spectator pages at `skrammm.com/[code]` use Incremental Static Regeneration with a 30-second revalidation period — they are designed to be cached at the edge by Cloudflare. The authenticated app routes at `app.skrammm.com` are never cached. Mixing these on the same host would require complex cache-control logic; separating them makes the rules trivially correct.

Second, the two-host structure makes it possible to evolve the spectator experience independently. In a future phase, `skrammm.com` could be a fully separate Next.js application or a static site, while `app.skrammm.com` continues as the full-featured SaaS app. Today they are one codebase for operational simplicity.

The middleware runs on Edge Runtime — it cannot import Prisma or any Node.js-only dependency. It performs cookie-presence checks only: app routes require `skrammm.session_token`, organizer routes require `skrammm.org_session_token`. Full session validation happens in Server Components and route handlers via `requireAuth()` and `requireOrgAuth()`.

---

## 4. Authorization Model

Skrammm uses entity-scoped RBAC with no global role strings. Every permission check is a database-backed assertion that a specific user has a specific capability on a specific entity. The guard is `can(userId, permission, scope)` in `src/modules/shared/auth/can.ts`.

```typescript
// Every mutation must call this before acting
const allowed = await can(session.user.id, "tournament:score", { tournamentId });
if (!allowed) return;
```

The complete permission set:

| Permission | What it checks |
|---|---|
| `tournament:edit` | User is the `organizerUserId` of the tournament |
| `tournament:score` | User is the `organizerUserId` of the tournament |
| `tournament:approve_team` | User is the `organizerUserId` of the tournament |
| `tournament:check_in_team` | User is the `organizerUserId` of the tournament |
| `team:manage` | User has `isPrimaryManager = true` in `TeamStaff` |
| `team:approve_player` | User has `isPrimaryManager = true` in `TeamStaff` |
| `team:set_lineup` | User has any `TeamStaff` entry for the team |
| `team:scan` | User has any `TeamStaff` entry, AND match is scheduled for today, AND team is in the match |
| `medical:view_profile` | User is the claimed player (self) OR any `TeamStaff` of the player's team |
| `medical:edit_profile` | Self if claimed, primary manager if unclaimed |
| `injury:create` | Tournament organizer (resolved via match → tournament) |
| `injury:view` | Self, team staff, or tournament organizer |
| `player:edit_self` | `player.userId === currentUserId` |
| `spectator:read` | Tournament status is `live` or `completed` |

The design rationale is to prevent horizontal privilege escalation without a rigid role hierarchy. An organizer cannot access another organizer's tournament by having the "organizer" role — they must be the `organizerUserId` of that specific tournament. A team manager cannot manage another team's players. Every check is a JOIN-level assertion, not a string comparison.

The middleware's cookie-presence check is the first line of defence. The `can()` call is the second. Path-prefix guards (e.g. "this route starts with /organizer/ therefore the user must be an organizer") are never used as the primary auth mechanism.

---

## 5. Real-Time Architecture

Live match scoring uses Server-Sent Events (SSE) rather than WebSockets. The choice reflects the access pattern: the browser needs to receive a stream of events from the server, but it never needs to send events over that same stream. SSE is strictly server-to-client, which maps perfectly to the use case and requires no special load balancer configuration beyond disabling response buffering.

The pub/sub bus lives in `src/lib/realtime/bus.ts`. It is an in-process Node.js `EventEmitter` keyed by `match:${matchId}`. `setMaxListeners(500)` allows up to 500 concurrent SSE connections per match ID — sufficient for a well-attended tournament.

Three event types flow through the bus:

- **`MatchScoreEvent`**: emitted by `addMatchEvent`. Carries `eventType`, `teamId`, `playerId`, `minute`, `payload`, `homeScore`, `awayScore`, and `createdAt`. This is the most frequent event type.
- **`MatchPhaseChangeEvent`**: emitted by `transitionMatchPhase`. Carries `type: "phase_change"`, `status`, `startedAt`, `secondHalfStartedAt`, `pausedAt`, and `totalPausedMs`. Allows the clock to sync across all connected clients.
- **`MatchEventDeletedEvent`**: emitted by `deleteMatchEvent`. Carries `type: "event_deleted"` and `eventId`. Allows clients to remove a score event that was entered incorrectly.

The SSE endpoint is at `src/app/(app)/api/stream/[matchId]/route.ts`. It calls `subscribe(matchId, handler)` on the bus and keeps the response stream open until the client disconnects. The `unsubscribeFn` is called in the `request.signal.addEventListener("abort")` handler to prevent memory leaks.

**The critical deployment constraint**: the bus is in-process. All SSE connections to a given match must reach the same Node.js process. This means the current architecture supports only single-process (single EC2 or single container) deployment. Horizontal scaling requires replacing the in-process bus with a shared message broker.

The bus interface (`publish` and `subscribe`) is designed to be swap-safe. Replacing the EventEmitter with Redis Pub/Sub or Postgres `LISTEN/NOTIFY` changes only `lib/realtime/bus.ts` — all callers remain unchanged. This is the intended migration path when the first horizontal scaling event occurs.

Nginx must be configured with `proxy_buffering off` for the SSE route. Cloudflare must not cache it. Both of these are documented in the infrastructure config.

---

## 6. Reliability Rating System (RRS)

The RRS is the platform's core analytical capability. It exists in two versions, both in `src/modules/reliability/`.

### 6.1 RRS v1 (Legacy)

RRS v1 is a simple 0–100 composite score computed over a 12-month lookback window. It has three equally weighted components:
- **Attendance** (weight 0.50): 100 if any attendance scan exists for the match, else 0.
- **Punctuality** (weight 0.25): `100 − (avgMinutesLate / 30) × 100`, floored at 0.
- **Discipline** (weight 0.25): `100 − (yellowCards × 2) − (redCards × 10)`, floored at 0.

Warning thresholds: red < 40, yellow 40–59, green ≥ 60. RRS v1 is being sunset in favour of v2 but remains in the codebase for backwards compatibility.

### 6.2 RRS v2 (Active)

RRS v2 is a performance-adjusted reliability score computed from raw match events. The per-match score formula is:

```
matchScore = (50 + tries×10 + conversions×3 + dropGoals×4 + outcomebonus − yellowCards×15 − redCards×40) × formatWeight
```

Where:
- Base participation: 50 (awarded for appearing in the match)
- Outcome bonus: win = 10, draw = 5, loss = 0
- Format weight: elimination = 1.5, tiered = 1.0, festival = 0.7
- Non-appearances score 0 regardless of the formula

The **career RRS** is not a simple mean. It applies a risk-aversion adjustment using a variance penalty:
```
careerRrs = mean(matchScores) − 0.5 × stddev(matchScores)
```

The gamma coefficient (0.5) reflects the value that teams place on consistency over brilliance. A player averaging 60 with zero variance is a better reliability signal than one alternating between 90 and 30, even though the naive average is the same.

The **last-30-days RRS** applies the same formula to only the rolling 30-day window. The difference between the career score and the last-30-days score produces `trendDelta`, which drives the form label: "Ascending Form" (delta > +5), "Stable Form" (−5 to +5), or "Slumping Form" (delta < −5).

The **tournament RRS** is the mean of all match scores within a specific tournament, including 0s for missed matches.

**Caching**: `computeRrsV2` results are cached under `keys.playerRrs(playerId)` in Redis. `computeTeamRrs` results are cached under `keys.teamRrs(teamId)`. Both are invalidated on card events (immediate, per-player) and on match lock (batch for all lineup players). The batch invalidation on lock runs fire-and-forget to avoid blocking the lock operation itself.

**Pure function design**: `rrs-engine.ts` contains only pure functions with no DB access. All DB reads happen in `service.ts`. This makes the engine fully unit-testable without mocking the database.

---

## 7. Database Design Principles

### 7.1 UUID v7

All primary keys are UUID v7, generated in application code via the `uuid` package. UUID v7 encodes a millisecond-precision timestamp in the high bits, making it monotonically increasing within a millisecond window. This gives Postgres B-tree index write performance close to sequential integer IDs while remaining globally unique — an important property for distributed ID generation without a central sequence.

### 7.2 Soft Deletes

`Match` and `MatchEvent` both carry a `deletedAt DateTime?` field. Soft-deleted matches are excluded from all queries by adding `deletedAt: null` to the Prisma `where` clause. Score reversal on event deletion happens atomically in a Prisma transaction alongside the soft-delete update.

**Known gap**: the `Player` model does not have `deletedAt`. The `removePlayerFromSquad` service function performs a hard delete, which destroys all match history, lineup records, medical profile, and QR tokens associated with the player. This is a data integrity risk that must be fixed before any TM at scale uses player deletion. Adding `deletedAt` to `Player` is the first item in the Alpha Completion technical backlog.

### 7.3 Cross-Module Independence

Foreign key relationships between modules are expressed as plain `String` fields rather than Prisma `@relation` directives. For example, `Match.homeTeamId` is typed as `String` and refers to a `Team.id`, but there is no Prisma relation between the `Match` model (owned by the `match` module) and the `Team` model (owned by the `team` module).

The benefit is that modules can be extracted into separate services without requiring a combined Prisma schema. The trade-off is that Prisma cannot enforce referential integrity between modules and cannot generate type-safe include queries across module boundaries. This is an acceptable trade-off given the extraction roadmap.

### 7.4 Audit Trail

The `AuditLog` model records actor, action, entity type, entity ID, and a JSON payload for significant mutations. This is the foundation for future compliance and access review requirements, and for the organizer's ability to dispute a score event that was incorrectly entered.

---

## 8. Server Action Pattern

Every Server Action follows a mandatory five-step sequence:

```typescript
"use server";

// 1. Authenticate — redirects if no session
const session = await requireAuth();

// 2. Load entity — establish scope context
const team = await getManagerTeam(session.user.id);
if (!team) return;

// 3. Authorize — entity-scoped permission check
const allowed = await can(session.user.id, "team:manage", { teamId: team.id });
if (!allowed) return;

// 4. Validate — parse and validate input
const parsed = MySchema.safeParse(rawFormData);
if (!parsed.success) return;

// 5. Execute + invalidate
await myModuleService(parsed.data);
revalidatePath("/tm/...");
```

Skipping any of these steps is a bug. The most common violation is skipping step 3 (authorization) when the developer assumes that step 2 (loading the entity) is sufficient proof of access. It is not — a user could load an entity they don't own by guessing an ID. Step 3 is always required.

---

## 9. Long-Term Technical Evolution

### 9.1 Soft-Delete Enforcement (Immediate)

Add `deletedAt DateTime?` to the `Player` model in `prisma/schema.prisma`. Update `removePlayerFromSquad` to set `deletedAt` instead of calling `db.player.delete`. Add `deletedAt: null` to all player queries. This is a non-breaking migration.

### 9.2 Real-Time Scaling (When First Horizontal Scale Occurs)

The in-process EventEmitter bus must be replaced when deploying to more than one process. The replacement path is:
1. **Postgres `LISTEN/NOTIFY`**: Lower operational overhead than Redis, no new infrastructure. Suitable for moderate concurrent connections (hundreds per match).
2. **Redis Pub/Sub**: Higher throughput, lower latency. Suitable when connections per match reach the thousands. Redis is already a dependency (for caching), so this requires no new infrastructure if Redis is present.

The swap changes only `lib/realtime/bus.ts`. No caller changes are required.

### 9.3 Standings and Bracket Computation

`computeStandings` is currently a pure in-memory function called on every dashboard and standings page load. For tournaments with more than 32 teams and hundreds of matches, this computation becomes expensive. Phase 2 should cache standings results in Redis (invalidated on match lock) and introduce a `computeKnockout` function for auto-seeding QF results into SF brackets.

### 9.4 Push Notifications

Push notifications require a notification adapter (`lib/notifications/`) that abstracts over Firebase Cloud Messaging (Android/web push) and APNs (iOS via Safari/PWA). The adapter's public interface should be `sendNotification(userId, title, body, data)`. The backing implementation is swappable. OneSignal is the simplest integration path for early-stage; switching to native FCM/APNs is a future optimization.

A `NotificationPreference` model will be needed to store per-user opt-in state and device tokens.

### 9.5 Service Extraction Candidates

The two modules most likely to need extraction into standalone services as load grows are:

- **Match scoring service**: handles `addMatchEvent`, `deleteMatchEvent`, `transitionMatchPhase`, and the SSE bus. This is the hottest code path during live matches. Extracting it allows it to scale independently of the rest of the app.
- **Reliability compute service**: `computeRrsV2` and `computeTeamRrs` can be expensive for large squads. Extracting this into a background job service (triggered by match lock) prevents it from blocking the match center during peak load.

Both modules have clean boundaries today. Extraction would require: (1) a message queue for async event delivery, (2) a dedicated API contract for the match scoring service, and (3) replacing the Redis cache invalidation with an event-driven invalidation pattern.

---

## 10. Testing Strategy

### 10.1 Unit Tests (Vitest)

Pure functions are unit-tested in Vitest. The test suite currently covers:
- `src/modules/reliability/rrs-engine.test.ts`: full coverage of the RRS v2 formula, variance penalty, edge cases (zero matches, all non-appearances, all wins).
- `src/app/(app)/organizer/match/[matchId]/commentator/_lib/computeLiveStats.test.ts`: full coverage of the client-side live stats computation for the commentator view.

Run with `pnpm test:unit`. The watch mode (`pnpm test:unit:watch`) is the recommended flow during development.

### 10.2 End-to-End Tests (Playwright)

Playwright tests live in `src/tests/e2e/`. The base URL is `http://app.localhost.skrammm.com:3000`. `playwright.config.ts` starts `pnpm dev` automatically via the `webServer` config unless a dev server is already running.

E2E tests use the `getRealOtpForMock(email)` helper to retrieve OTPs without an email client. This helper reads from the in-memory Better Auth verification store in development, making OTP-gated flows testable in CI.

No module-level DB mocks are used in integration tests. The principle: mock what you don't own (external APIs), but test your own DB code against a real database. This approach was chosen after a previous incident where mocked tests passed while a production migration silently failed.

---

## 11. Infrastructure

### 11.1 Local Development

`docker/docker-compose.local.yml` runs Postgres and Nginx locally. The Next.js app itself runs outside Docker via `pnpm dev`. This keeps hot module replacement fast and avoids the overhead of rebuilding a Docker image on every code change.

### 11.2 Production

`docker/docker-compose.yml` runs the full production stack: Next.js standalone build, Postgres, and Nginx. The Next.js standalone output is the most compact production build format — it bundles only the files needed to run the server without `node_modules`.

### 11.3 Nginx Configuration Requirements

Nginx must have `proxy_buffering off` for the SSE route at `/api/stream/*`. Without this, Nginx buffers the response and SSE clients receive events in batches or not at all. Cloudflare must be configured to pass-through (not cache) the same path. Both of these are critical production configuration requirements.

### 11.4 Scaling Considerations

The current infrastructure is single-process and appropriate for early-stage load. The first scaling lever is vertical (larger EC2 instance). The second lever is replacing the in-process SSE bus with Redis Pub/Sub (see section 9.2) and then deploying multiple app processes behind the same Nginx upstream. No Kubernetes is in the current roadmap — Docker Compose on a single host is the target production topology until the product reaches a load level that demands more.
