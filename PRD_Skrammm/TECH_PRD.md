# Skrammm — Technical PRD (v2.2)

> Companion to **Skrammm MVP PRD v1.3** (scope/stories) and **Skrammm Master PRD v4.1** (vision).
> Supersedes Tech PRD v1.4. Engineering blueprint for the modular monolith: stack, module boundaries, data model, infra, security, deployment.

| Field | Value |
|---|---|
| Document | Skrammm Technical PRD v2.2 |
| Supersedes | Tech PRD v1.4 |
| Companion docs | MVP PRD v1.3 (scope/stories), Master PRD v4.1 (vision) |
| Targets | One-week UAT (4 portals) → end-July Alpha (1 real event, 2 tournaments × 24 teams, ~720 players) |

> **v2.0 CHANGELOG (from v1.4) —** Auth reversed from Google-OAuth-only to email OTP (Better Auth). Reverse proxy changed Caddy → Nginx with Cloudflare Origin Cert (Full/Strict TLS). Registration unified (player baseline, manager as later role) via two front-door links. New: medical data model (two entities), referee, two-level attendance, team-join approval, player-claim flow for minors. Tournament format gate corrected to non-overlapping bands. Pricing tiers changed (free for UAT+Alpha). Terminology: "Pilot" → "Alpha". Full detail in §21.

> **v2.1 DELTA —** Email provider changed Resend → AWS SES (domain identity + DKIM, same region as EC2). NOTE: SES starts in sandbox — production access + rate increase REQUIRED BEFORE ALPHA (OTP to ~720 players). See §19 Q8.

> **v2.2 DELTA —** New §2A Design System: full token documentation extracted from `src/styles/theme.css`. Covers brand primitives, Tailwind contract tokens, border radius scale, typography, brutalist utility classes, sidebar sub-theme, and chart tokens. No code changes — documentation only.

---

## 1. Goals & Non-Goals

### 1.1 Engineering goals
- Single Next.js codebase serving four portals (Organizer, Team Manager, Player, Spectator) via path-based routing under two hosts, with strict module isolation.
- Boring, proven stack. Optimize for shipping speed and a small ops surface in the one-week UAT window.
- Real-time scoreboard with sub-second-feel latency for spectators.
- Tamper-resistant attendance via short-lived rotating QR tokens.
- Cleanly separable modules — if a portal later needs extraction into its own service, the seams already exist.
- Handle the Alpha load (2 tournaments × 24 teams, ~720 players, concurrent live scoring) on a single instance, with a documented scale path.

### 1.2 Non-goals (MVP / UAT)
- Native mobile apps. PWA only; players install to home screen.
- Self-hosted video streaming. We link to FB/YouTube; we don't host.
- Multi-language. English only at launch.
- Offline-first manager scanner. Connectivity assumed pitch-side; only the player QR surface is offline-tolerant.
- Public REST/GraphQL API for third parties.
- Separate Coach / S&C / Medical staff accounts — the team manager fills all those roles in MVP.
- Redis, multi-instance, ALB/ASG — deferred to the scale path (§15.2).

---

## 2. Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 15 (App Router, RSC, Server Actions) | Single deployable unit; SSR for SEO on spectator pages. |
| Language | TypeScript (strict) | Non-negotiable for a monolith with module boundaries. |
| DB | PostgreSQL 16 | Transactions, JSONB for flexible event payloads, mature. |
| ORM | Prisma | Schema-first, generated client, mature migrations. Pairs with Better Auth's Prisma adapter. |
| Auth | Better Auth — email OTP | One-time code to email. DB-backed sessions, Prisma adapter. No password, no Google-OAuth-only, no magic link. **(CHANGED v2.0)** |
| Email | AWS SES | Transactional: OTP codes, invitations, claim codes, receipts, reminders. Carries login OTP. **(CHANGED v2.1 — was Resend.)** Domain identity + DKIM; same region as EC2. |
| Storage | AWS S3 | Logos, generated cards, sponsor assets. Cloudflare in front for CDN/egress. |
| Real-time | Server-Sent Events (native) | One-way push (scoreboard → spectators). Single EC2 → in-process EventEmitter. |
| Image gen | Satori + @resvg/resvg-js | 9:16 performance cards. Runtime-agnostic. |
| QR | qrcode (gen) + zxing-js (scan) | Scanner runs in-browser via getUserMedia. |
| Payments | Billplz (FPX, cards, e-wallet) | Dormant for UAT + Alpha (all free). Wired but disabled. |
| PWA | Serwist | Service worker + manifest + offline shell for the player QR surface. |
| Validation | Zod | Shared client/server schemas. |
| State (client) | TanStack Query + URL state | No Redux. RSC handles most reads. |
| Styling | Tailwind CSS + shadcn/ui | Themable dark green / yellow "Rugby Pitch Utility". |
| Testing | Vitest (unit) + Playwright (e2e) | Critical paths only at MVP. |
| Hosting | AWS EC2 (Docker) | Single t3.large running Next.js + Postgres + Nginx via Docker Compose. |
| DB host | Postgres in Docker on the EC2, data on dedicated EBS gp3 | Cheaper than RDS at MVP. Backups on us. |
| CDN / Edge | Cloudflare (proxied) | DNS, SSL, WAF, DDoS, caching. Full (Strict) TLS to origin. |
| Reverse proxy | Nginx (on EC2) | Reverse proxy to Next.js; TLS via Cloudflare Origin Cert. **(CHANGED v2.0 — was Caddy.)** |
| TLS | Cloudflare Origin Certificate + Full (Strict) | CF terminates public TLS; re-encrypts to origin; Nginx serves the CF origin cert. No Certbot. **(CHANGED v2.0)** |
| Cache (future) | Redis / ElastiCache | NOT in MVP. Added only when in-process bus / session load demands it. |
| Secrets | AWS Parameter Store (SecureString) | Free, fine for MVP. |
| Observability | Sentry + Axiom (logs) | Errors + structured logs. CloudWatch for infra metrics. |
| CI/CD | GitHub Actions → ECR → SSM | Build image, push to ECR, SSM Run Command on EC2 to pull + restart. |

> **STACK CHANGES v2.0 —** Three lines changed: Auth (Google-OAuth-only → email OTP), Reverse proxy (Caddy → Nginx), TLS (auto-Let's-Encrypt → Cloudflare Origin Cert / Full-Strict). Redis added only as an explicit future item, not MVP.

---

## 2A. Design System — "Rugby Pitch Utility"

Source file: `src/styles/theme.css`. No code changes in this section — documentation only.

- **Implementation**: Tailwind CSS v4 `@theme inline` — all tokens are CSS custom properties. No `tailwind.config.js` contract file is needed at runtime; `tailwind.config.ts` is retained for IDE type-checking only.
- **Component library**: shadcn/ui — themable via the Tailwind contract tokens below.

### 2A.1 Brand Primitives

Defined in `:root` in `theme.css`:

| CSS Token | Hex | Usage |
|---|---|---|
| `--pitch-green` | `#00241a` | Primary brand, sidebar background, primary nav |
| `--pitch-green-mid` | `#0d3b2e` | Sidebar accent hover |
| `--pitch-green-light` | `#234e40` | Sidebar border |
| `--pitch-green-container` | `#beedd9` | Light-mode tinted surfaces |
| `--fair-play-gold` | `#ffba20` | CTAs, highlights, scoring events, focus rings |
| `--fair-play-gold-dark` | `#463000` | Gold text on light backgrounds |
| `--navy` | `#4f5f77` | Secondary accents, data tables |
| `--navy-light` | `#d0e1fd` | Navy tinted surfaces |
| `--red-card` | `#ba1a1a` | Destructive actions, red-card events |
| `--yellow-card` | `#ffba20` | Yellow-card events (same value as gold) |
| `--surface-dim` | `#d9dadb` | Dividers, muted borders |

### 2A.2 Tailwind Contract Tokens

Mapped via `@theme inline` to the brand primitives above. Use these in components — never hardcode hex values.

| Token | Value |
|---|---|
| `--background` | `#f8f9fa` |
| `--foreground` | `#191c1d` |
| `--card` / `--card-foreground` | `#ffffff` / `#191c1d` |
| `--popover` / `--popover-foreground` | `#ffffff` / `#191c1d` |
| `--primary` / `--primary-foreground` | `#00241a` / `#ffffff` |
| `--secondary` / `--secondary-foreground` | `#4f5f77` / `#ffffff` |
| `--muted` / `--muted-foreground` | `#e1e3e4` / `#414845` |
| `--accent` / `--accent-foreground` | `#ffba20` / `#191c1d` |
| `--destructive` / `--destructive-foreground` | `#ba1a1a` / `#ffffff` |
| `--border` | `#c0c8c3` |
| `--input` / `--input-background` | `transparent` / `#f3f4f5` |
| `--ring` | `#ffba20` |
| `--radius` | `0.25rem` |

### 2A.3 Border Radius Scale

| Tailwind Variable | Value | Derived from |
|---|---|---|
| `--radius-sm` | `0.23rem` | `calc(var(--radius) - 2px)` |
| `--radius-md` | `0.25rem` | `var(--radius)` |
| `--radius-lg` | `0.5rem` | `calc(var(--radius) + 4px)` |
| `--radius-xl` | `0.75rem` | `calc(var(--radius) + 8px)` |

### 2A.4 Typography

| Role | Font | CSS Variable | Applied in |
|---|---|---|---|
| Headings (H1–H6) | Lexend (Bold / Black) | `--font-lexend` | `@layer base` — `h1..h6` |
| Body / UI | Inter | `--font-inter` | `@layer base` — `body` |

No per-component font overrides needed. The base layer applies both globally.

### 2A.5 Brutalist Utility Classes

Defined in `@layer utilities` in `theme.css` (lines 133–156). Hard offset shadows — no blur — replace ambient elevation:

| Class | CSS Value |
|---|---|
| `.shadow-brutalist-sm` | `box-shadow: 3px 3px 0 var(--fair-play-gold)` |
| `.shadow-brutalist` | `box-shadow: 4px 4px 0 var(--fair-play-gold)` |
| `.shadow-brutalist-lg` | `box-shadow: 6px 6px 0 var(--fair-play-gold)` |
| `.shadow-brutalist-green` | `box-shadow: 4px 4px 0 var(--pitch-green)` |
| `.shadow-brutalist-green-lg` | `box-shadow: 6px 6px 0 var(--pitch-green)` |
| `.shadow-brutalist-navy` | `box-shadow: 4px 4px 0 var(--navy)` |
| `.shadow-brutalist-dark` | `box-shadow: 4px 4px 0 var(--fair-play-gold-dark)` |

### 2A.6 Sidebar Sub-Theme

The sidebar carries its own dark-green sub-theme regardless of page background:

| Token | Value |
|---|---|
| `--sidebar` | `#00241a` |
| `--sidebar-foreground` | `#ffffff` |
| `--sidebar-primary` | `#ffba20` |
| `--sidebar-primary-foreground` | `#00241a` |
| `--sidebar-accent` | `#0d3b2e` |
| `--sidebar-accent-foreground` | `#ffffff` |
| `--sidebar-border` | `#234e40` |
| `--sidebar-ring` | `#ffba20` |

### 2A.7 Chart Tokens

| Token | Value | Colour |
|---|---|---|
| `--chart-1` | `#ffba20` | Fair-play gold |
| `--chart-2` | `#00241a` | Pitch green |
| `--chart-3` | `#4f5f77` | Navy |
| `--chart-4` | `#ba1a1a` | Red card |
| `--chart-5` | `#0d3b2e` | Pitch green mid |

---

## 3. Modular Monolith — Repository Layout

Domain logic lives in `modules/`, never in `app/`. Routes are a thin layer. Each module owns its tables and exposes a public `index.ts`; cross-module access goes through service calls, not shared queries.

```
skram/
  src/
    app/                      # Next.js routes ONLY (thin)
      _marketing/             # skrammm.com/* (host-rewritten)
      _app/                   # app.skrammm.com/* (host-rewritten)
        organizer/  tm/  player/   # path-based per role
        api/
          webhooks/billplz/
          stream/[matchId]/   # SSE endpoint
      middleware.ts           # Host -> _marketing or _app
    modules/                  # domain logic (owns tables)
      tournament/ team/ player/ match/ attendance/
      reliability/ sponsor/ payment/ medical/ shared/
    lib/                      # infra adapters (leaf)
      db/ auth/ email/ storage/ realtime/ og/ qr/
    components/  styles/
  prisma/ (schema.prisma, migrations/)
  public/ (manifest, icons, sw.js)
  docker/ (Dockerfile, compose, nginx.conf, postgres init)
```

### 3.1 Module boundary rules (ESLint no-restricted-imports)
1. `app/` may import `modules/*` and `lib/*`. Never the reverse.
2. A module imports another module only via its public `index.ts`.
3. `lib/` is leaf-level. No module imports.
4. Cross-module data access goes through service calls, not shared DB queries.
5. Each module owns its DB tables; others read via the owning module's service.

> **v2.0 —** New `medical/` module added (owns player_medical_profiles + match_injury_reports). `attendance/` now owns both attendance_scans (player) and team_attendance (team).

---

## 4. Routing & Domain Strategy

Two hosts, four logical portals via path prefixes.

```
skrammm.com                      -> marketing landing
skrammm.com/{tournament_code}    -> public spectator view
skrammm.com/about|legal|pricing  -> marketing
app.skrammm.com                  -> role selector / auto-redirect
app.skrammm.com/login            -> email OTP sign-in
app.skrammm.com/organizer/*      -> Skrammm-O
app.skrammm.com/tm/*             -> Skrammm-M
app.skrammm.com/player/*         -> Skrammm-P
app.skrammm.com/api/*            -> Server Actions + Route Handlers
```

### 4.1 Two registration front doors, one identity
> **v2.0 —** Registration uses two separate entry links — one for Organizer, one for Player/Team — routed to the same email-OTP identity system. "Manager" is NOT a signup type: a user registers as a player (baseline) and gains the manager role by creating a team. Two doors, one identity, manager-as-later-role.

### 4.2 Reserved tournament codes
Because `/{tournament_code}` lives at the apex, codes are validated (case-insensitive) against a reserved list: api, _next, _marketing, _app, login, logout, signup, oauth, about, legal, terms, privacy, pricing, app, admin, dashboard, robots.txt, sitemap.xml, favicon.ico, health, status, .well-known, and similar.

### 4.3 Tournament code rules
- Length 3–20, lowercase `[a-z0-9-]`, no leading/trailing `-`, no `--`, not reserved, globally unique.
- Organizer types desired code; server validates + suggests alternatives if taken.

### 4.4 Authorization at routing layer
Middleware short-circuits unauth'd `/_app/*` requests (except `/login` and public `/api/auth/*`) → 302 to `/login?next={path}`. Middleware does NOT check role — that happens server-side via the `can()` guard (§6).

---

## 5. Data Model (v2)

Every table has id (uuid v7), created_at, updated_at. Soft-delete via deleted_at on audit-bearing records (matches, events, payments).

### 5.1 shared
- **user** — id, email (unique), name, image, email_verified, timestamps (Better Auth).
- **session** — id, user_id, token (unique), expires_at, ip_address, user_agent, timestamps.
- **account** — Better Auth principal link. (OTP-based; no OAuth provider rows required.)
- **verification** — id, identifier, value, expires_at. (Now the OTP code store. **CHANGED v2.0**: central to login.)
- **audit_log** — id, actor_user_id, action, entity_type, entity_id, payload (jsonb), created_at.

### 5.2 team
- **teams** — id, name, slug, logo_url, origin, training_ground, created_by_user_id.
- **team_staff** — id, team_id, user_id, role (manager|coach|physio), is_primary_manager. (MVP populates manager only.)
- **players** — id, user_id (nullable until claimed), team_id, full_name, dob, jersey_number, position, photo_url, claim_status (unclaimed|claimed), player_id_code, claim_contact, is_minor, guardian_name (nullable), guardian_contact (nullable). **(CHANGED v2.0.)**
- **player_qr_tokens** — id, player_id, token (unique), expires_at, rotated_from_id. (Rotating, §8.)
- **team_members (membership status)** — club-code self-join is roster-pending until manager approval. **(CHANGED v2.0.)**

### 5.3 tournament
- **tournaments** — id, code (unique), name, slug, organizer_user_id, starts_at, ends_at, daily_start_time, daily_end_time, format (festival|tiered|elimination), status (draft|paid|live|completed|cancelled), branding (jsonb).
- **tournament_teams** — id, tournament_id, team_id, seed, group_label, status (pending_approval|approved|rejected|withdrawn). **(CHANGED v2.0**: public visibility requires approved.)
- **tournament_invitations** — id, tournament_id, team_id, email_sent_to, claim_token, accepted_at. (Claim token, not login token.)

### 5.4 match
- **matches** — id, tournament_id, round, group_label, home_team_id, away_team_id, scheduled_at, pitch, status (scheduled|live|suspended|locked|completed), home_score, away_score, locked_at, video_url, referee_name (nullable). **(CHANGED v2.0: referee_name.)**
- **match_officials (optional richer form)** — id, match_id, role (referee|assistant), name. MVP may use the single referee_name field instead.
- **match_events** — id, match_id, team_id, player_id (nullable), event_type (try|conversion|penalty|drop_goal|yellow_card|red_card|sub_in|sub_out), minute, payload (jsonb), recorded_by_user_id, created_at.
- **match_lineups** — id, match_id, team_id, player_id, is_starter, jersey_number. (Surfaced for M-7.)

### 5.5 attendance (two levels)
- **attendance_scans (player)** — id, match_id, player_id, scanned_by_user_id, scanned_at, scheduled_arrival_at, minutes_late (computed), qr_token_id, ip, user_agent. Written by the team manager (M-2).
- **team_attendance (team)** — id, tournament_id, match_id, team_id, checked_in_by_user_id (organizer), checked_in_at. Per-match team check-in (O-7). **(NEW v2.0.)**

> **ATTENDANCE BOUNDARY —** Player attendance feeds the reliability score; team attendance is operational only and does NOT feed any score.

### 5.6 medical (NEW module)
- **player_medical_profiles** — id, player_id, fitness_status (fit|doubtful|out), injury_type, body_part, expected_return_at, allergies, blood_type, emergency_contact_name, emergency_contact_phone, note, owner_is_claimed (derived), updated_at. Player-owned once claimed; manager-owned while unclaimed.
- **match_injury_reports** — id, match_id, player_id, injury_type, body_part, severity (minor|moderate|serious), action_taken, note, recorded_by_user_id, created_at. Organizer-created per incident.

### 5.7 reliability / sponsor / payment
- **reliability_snapshots** — id, player_id, score (0-100), components (jsonb: attendance, punctuality, discipline), computed_at.
- **sponsors** — id, tournament_id, name, logo_url, click_url, tier, starts_at, ends_at, impressions, clicks.
- **payments** — id, tournament_id, organizer_user_id, amount_cents, currency (MYR), processor, processor_ref, status, paid_at, raw (jsonb). Dormant for UAT+Alpha.

### 5.8 Notable indexes & constraints
- tournaments.code unique; matches (tournament_id, scheduled_at); match_events (match_id, created_at).
- attendance_scans (match_id, player_id) unique — prevents double player-scan.
- team_attendance (match_id, team_id) unique — prevents double team check-in. **(NEW v2.0.)**
- players.player_id_code unique; player_qr_tokens (token) unique partial where expires_at > now().

---

## 6. Authentication & Authorization

> **v2.0 — AUTH FULLY REVISED** Google-OAuth-only is removed. Auth is email OTP via Better Auth. This reverses Decision #7 and rewrites the entire invitation/claim flow.

### 6.1 Auth (Better Auth, email OTP)
- Mechanism: user enters email → server emails a one-time code (via AWS SES) → user enters code → session created. No password, no OAuth, no magic link.
- OTP store: the verification table holds code, identifier (email), expires_at. Short TTL (~10 min), single-use, rate-limited on the send endpoint.
- Sessions: database-backed (Better Auth default). Session token in cookie → DB lookup per request. Absolute revocation control.
- Cookie: `__Secure-skrammm.session_token`, Domain=.skrammm.com, SameSite=Lax, Secure, HttpOnly.
- Lifetime: 30-day rolling, refreshed on activity. Sign-out revokes the session row.
- First login creates the user row; subsequent logins match by email.

> **RATE LIMITING —** The OTP send endpoint must be rate-limited (per email + per IP) at Nginx and in-app. This is the main new abuse surface introduced by OTP.

### 6.2 Registration & roles
- Two front-door links (Organizer, Player/Team) → same OTP flow. Player is the baseline role on every account.
- A player gains the manager role by creating a team (team_staff row, is_primary_manager = true).
- Rule: every manager is also a player; a player need not be a manager.
- Role switcher in nav for multi-role users; one session, one login (ID-4).

### 6.3 Invitation & claim flows (rewritten for OTP)
**A. Team join via tournament code (M-5 / O-6)** — Manager joins with code/link → tournament_teams.status = pending_approval (hidden from public). Manager submits roster. Organizer approves/rejects from the pending queue → approved makes the team public.

**B. Player self-join via club code (P-5 / M-8)** — Player registers (OTP), optionally enters a club code at onboarding → roster-pending. Manager approves or removes.

**C. Manager-created claimable account (M-6 / P-6) — the minors case** — Manager creates a players row (user_id null until claimed) for a player who can't register (driver: under-17, no phone); sets claim_contact for the OTP. Player later claims with player_id_code + OTP to claim_contact. ID alone is insufficient. On claim: set user_id, claim_status = claimed; ownership of profile + medical profile transfers from manager to player.

> **MINORS / GUARDIAN —** Guardian consent capture (guardian_name, guardian_contact) is REQUIRED BEFORE ALPHA, not built for the UAT week. The product knowingly handles minors' data via manager-created accounts — the highest-sensitivity surface.

### 6.4 Authorization model — entity-scoped RBAC
A user is not globally "an organizer." They are organizer of tournament X, manager of team Y, player on team Z. Implemented as guard functions in `modules/shared/auth/can.ts`. EVERY server action and route handler calls `can(user, permission, scope)` first; path prefix is never sufficient.

| Permission | Granted to |
|---|---|
| tournament:edit / tournament:score | organizer_of(tournament_id) |
| tournament:approve_team | organizer_of(tournament_id) **(NEW)** |
| tournament:check_in_team | organizer_of(tournament_id) **(NEW — O-7)** |
| team:manage | primary_manager_of(team_id) |
| team:approve_player | primary_manager_of(team_id) **(NEW — P-5/M-8)** |
| team:set_lineup | staff_of(team_id) for that match **(NEW — M-7)** |
| team:scan (player attendance) | any_staff_of(team_id) && match_is_today |
| medical:view_profile | self (claimed) \| manager (own team) \| manager-edit while unclaimed |
| medical:edit_profile | player if claimed; manager only while unclaimed **(NEW conditional)** |
| injury:create / injury:view | organizer (create, own tournament) \| self \| manager (own team) |
| player:edit_self | player.user_id == current_user.id |
| spectator:read | tournament.status in (live, completed) && team approved |

---

## 7. Real-Time Scoreboard

### 7.1 Why SSE, not WebSockets
The scoreboard is one-way: organizer pushes events, everyone else reads. SSE is HTTP, streams natively from Next.js, needs no separate gateway. WebSockets only if bidirectional features (chat, collaborative scoring) arrive post-MVP.

### 7.2 Flow
1. Organizer hits "Add Try" → Server Action validates → writes match_events → publishes to in-process pub/sub keyed by matchId.
2. Spectator browser holds `GET /api/stream/{matchId}` (SSE). Server pushes `data: {...}`. Client patches local state.

### 7.3 Pub/sub mechanism
Single EC2 = single Node process = no fanout problem. In-process EventEmitter keyed by matchId (`lib/realtime/bus.ts` exposes publish/subscribe). At scale, swap behind the same interface to Postgres LISTEN/NOTIFY, then ElastiCache Redis if needed.

> **REDIS —** Redis is NOT in the MVP. The in-process bus is sufficient for a single EC2. Redis enters only on the multi-instance scale path (§15.2), when needed.

### 7.4 Cloudflare + SSE mitigations
- Set `Cache-Control: no-cache, no-store, no-transform`; `X-Accel-Buffering: no`; `Content-Type: text/event-stream` (Nginx must also not buffer the stream — see §9).
- Emit a heartbeat comment `: ping` every 30s to beat Cloudflare's ~100s idle close.
- Escape hatch: a DNS-only `stream.skrammm.com` (grey cloud) bypasses Cloudflare if proxied SSE misbehaves under load.

### 7.5 Reconnect & catch-up
SSE auto-reconnects with Last-Event-ID; server replays match_events with id > last_event_id. uuid v7 ids are time-ordered, safe as cursor. No event loss across brief disconnects.

---

## 8. QR Code Attendance — Security Model

### 8.1 Threat model
- Replay: player shares a QR screenshot for an unauthorized scan-in.
- Forgery: attacker generates a fake QR for another player.
- Cross-match abuse: yesterday's QR works today.

### 8.2 Design
- Player QR encodes a rotating token (not the player ID), stored in player_qr_tokens, rotating every 60s; old tokens invalidated.
- Token is HMAC-signed for offline verification fallback.
- Manager scan POSTs `{ token, match_id }` → server checks: token valid + unexpired, player on a team in this match, scan window open (±2h around kickoff), no prior scan for player+match.
- attendance_scans row written with manager identity, IP, UA — audit-grade.

### 8.3 Two-level attendance (NEW v2.0)

| Level | Scanner | Question | Record |
|---|---|---|---|
| Team | Organizer (desk) | Has the team arrived for this match? (O-7) | team_attendance (per match) |
| Player | Manager (pitch-side) | Has the player arrived for this match? (M-2) | attendance_scans (per player) |

### 8.4 Edge cases
- Player phone dead → manager manual override (logged, requires confirmation).
- No internet at pitch → out of MVP. v2: signed offline tokens with sync-later.

---

## 9. Reverse Proxy & TLS (Nginx + Cloudflare)

> **v2.0 — CADDY REPLACED BY NGINX** Reverse proxy is now Nginx. TLS uses a Cloudflare Origin Certificate with Cloudflare set to Full (Strict). This removes Caddy's auto-Let's-Encrypt; there is no Certbot.

### 9.1 Request path
Users → Cloudflare (DNS, DDoS, WAF, CDN, TLS 1.3 termination) → HTTPS Full(Strict) → EC2 Nginx (serves CF origin cert, re-encrypts) → reverse-proxy to Next.js on :3000. Postgres is reachable only on the Docker internal network.

### 9.2 Nginx responsibilities
- Terminate the origin TLS using the Cloudflare Origin Certificate.
- Reverse-proxy all traffic to Next.js (:3000). Optionally serve static fallback; Next.js + Cloudflare handle most static assets.
- Disable proxy buffering on the SSE route (`proxy_buffering off;` for `/api/stream/`) so events stream in real time.
- Apply rate limits (`limit_req`) on auth/OTP endpoints (§6.1).
- Load balancing across multiple Next.js upstreams: only on the scale path (§15.2); MVP has one upstream.

### 9.3 TLS specifics
- Cloudflare SSL/TLS mode: Full (Strict).
- Origin: Cloudflare Origin Certificate installed on Nginx (long-lived; no renewal cron).
- Security Group: inbound 80/443 from Cloudflare IP ranges only; no public SSH (AWS SSM Session Manager for shell).
- HSTS preload after 6 months stable.

---

## 10. Performance Cards

- 1080×1920 PNG via Satori (JSX→SVG) + @resvg/resvg-js (SVG→PNG).
- Endpoint: `GET /api/cards/player/{playerId}?tournament={code}&type=career|tournament`.
- Cached in S3 keyed by `cards/{player_id}/{tournament_id}/{stats_hash}.png`; CDN'd via Cloudflare; new key on stats change, old key GC'd weekly.
- Share via `navigator.share()`, fallback to download.

> **MVP NOTE —** Performance card is a UAT-STRETCH item (MVP PRD P-4) — first to cut if the week tightens.

### 10A. Reliability Score (0–100)

| Component | Weight | Source |
|---|---|---|
| Attendance rate | 50% | player scans / scheduled appearances (last 12 mo) |
| Punctuality | 25% | mean minutes_late, capped, inverted |
| Discipline | 25% | yellow × −2, red × −10, capped at 0 |

- Recompute on: new player attendance scan, new card event, nightly cron.
- Persisted in reliability_snapshots with component breakdown (explainable, halal-first).
- Warning thresholds: < 60 yellow banner; < 40 red banner + manager alert.

> **SCORING SOURCE —** Player attendance only. Team attendance (§8.3) is operational and never feeds this score.

---

## 11. Progressive Web App

Serwist (Workbox-based, App Router compatible). Installable to iOS/Android home screens; offline-tolerant on the surfaces that need it.

### 11.1 Caching strategy

| Resource | Strategy |
|---|---|
| App shell (HTML/CSS/JS) | StaleWhileRevalidate |
| Static assets (icons, fonts) | CacheFirst (1y, versioned URLs) |
| /api/stream/* (SSE) | NetworkOnly |
| /api/auth/* (OTP) | NetworkOnly |
| /api/cards/* | CacheFirst (stats hash in URL) |
| Player QR endpoint | StaleWhileRevalidate (60s max age) — critical |
| Spectator pages | NetworkFirst (5s timeout) |
| All other API | NetworkOnly |

### 11.2 Player QR offline tolerance
- Pre-fetch next QR token 15s before expiry, even in foreground.
- SW caches latest token up to 60s (one rotation).
- If offline at scan: show most recent token; server still rejects expired tokens. Manual override is the fallback.

### 11.3 Out of scope
- Push notifications (iOS PWA constraints) — v2.

---

## 12. Payments — Billplz (Dormant for UAT + Alpha)

> **v2.0 —** Everything is free for UAT and Alpha. Billplz is wired but disabled. Pricing tiers changed (see §20). FREE_TIER_TEAM_LIMIT default 8.

When enabled: one shared collection; a Bill created per payment via `POST /api/v3/bills`; redirect to bill.url; webhook to callback_url verified via x-signature HMAC-SHA256; idempotent on processor_ref (unique on (processor, processor_ref)). Trust-but-verify on the redirect; webhook is source of truth. Reconciliation cron polls `GET /bills/:id` for pending payments older than 1h.

---

## 13. Environments & Configuration

| Env | URLs | Infra |
|---|---|---|
| Local | localhost.skrammm.com, app.localhost.skrammm.com | Docker Compose: Next dev + Postgres + Nginx |
| Staging | staging.skrammm.com, app.staging.skrammm.com | 1× t3.small EC2 (Compose) |
| Production | skrammm.com, app.skrammm.com | 1× t3.large EC2 (Postgres on dedicated EBS gp3 + Next + Nginx); ALB+ASG past ~500 concurrent |

- Secrets: AWS Parameter Store (SecureString); EC2 IAM role read access; no .env on the box.
- DNS (Cloudflare): apex + app. proxied (orange); optional stream. DNS-only (grey) for SSE bypass.
- TLS: Cloudflare Origin Cert on Nginx; Full (Strict). No wildcard cert needed.

---

## 14. Infrastructure Topology

### 14.1 MVP topology (single instance)
```
            Cloudflare  (DNS, SSL, WAF, CDN, DDoS)
                 |  HTTPS Full(Strict)
                 v
  +------------------------------------------+
  |  AWS EC2 t3.large (8 GB)                 |
  |   Nginx (:443) -- reverse proxy / TLS    |
  |     |  (CF Origin Cert; SSE unbuffered)  |
  |     v                                    |
  |   Next.js (Docker, Node 20) :3000        |
  |     |  docker network                    |
  |     v                                    |
  |   Postgres 16 (Docker) -> EBS gp3 vol    |
  +------------------------------------------+
                 |
                 v
      S3: skram-assets / skram-backups
  External: AWS SES, Billplz(dormant), Sentry/Axiom
  (Redis: NOT present at MVP)
```

### 14.2 Cost estimate (MVP)
~RM 225–270/mo: EC2 t3.large ~$60, EBS gp3 50GB ~$4, S3 ~$2, Cloudflare $0, AWS SES ~$1–5 (volume-priced, far cheaper than Resend), Sentry/Axiom free tiers, domain ~$15/yr.

### 14.3 Scale path (when needed, not now)
1. Extract Postgres to RDS (biggest reliability win; managed backups, multi-AZ).
2. ALB + ASG for Next.js (2+ instances); Nginx upstream LB or hand off to ALB.
3. Pub/sub: in-process EventEmitter → Postgres LISTEN/NOTIFY → ElastiCache Redis.
4. S3 → CloudFront (or keep Cloudflare).

> **ALPHA LOAD RISK —** 2 tournaments × 24 teams × ~720 players with concurrent live scoring. The single t3.large is provisioned for ~500 concurrent users before ALB/ASG. Load-test before Alpha; contingency = t3.xlarge or early RDS extraction.

---

## 15. Deployment & DevOps

### 15.1 CI pipeline (GitHub Actions)
1. Install + cache deps (pnpm).
2. Lint (module-boundary rules) + typecheck.
3. prisma generate; Vitest unit; prisma migrate deploy dry-run on ephemeral Postgres.
4. Playwright e2e critical paths: OTP login, create tournament, join+approve team, score a try, scan player QR, team check-in.
5. Build multi-stage Docker image (distroless final).
6. On main: push to ECR (:sha, :latest).
7. SSM Run Command on EC2: pull image, prisma migrate deploy, docker compose up -d.
8. Health check /api/health; rollback to previous tag on fail.

### 15.2 Zero-downtime deploy (Nginx hot-swap)
> **v2.0 —** Hot-swap now uses Nginx, not Caddy: start new container on :3001, health-check, update the Nginx upstream and `nginx -s reload`, drain and stop the old container after 30s. SSE clients reconnect via Last-Event-ID.

### 15.3 DB migrations
- Prisma Migrate; backwards-compatible only; expand/contract for breaking changes; advisory-locked via _prisma_migrations.
- Migration runs before the new container takes traffic.

### 15.4 Backups & DR (self-hosted Postgres)
1. pg_dump -Fc every 6h → age-encrypted → s3://skram-backups (30/90-day lifecycle).
2. EBS snapshots nightly (AWS Backup), 7-day retention.
3. Manual pg_dump before any breaking migration.
- RPO 6h at MVP (tighten via WAL archiving pre-Alpha if warranted); RTO 4h.

### 15.5 Observability
- Sentry (errors/traces), Axiom (structured logs via Vector), CloudWatch (infra).
- Alarms: CPU>85%, mem>85%, EBS>70%, error rate>1%, last-pg_dump-age>12h.

### 15.6 Security baseline
- SG 80/443 from Cloudflare IPs only; no public SSH (SSM Session Manager, CloudTrail-audited).
- Postgres on Docker internal network only; no host port mapping.
- S3 private; pre-signed uploads; backups bucket object-locked.
- Secrets in Parameter Store (KMS); Postgres password rotated quarterly.
- Rate limiting at Nginx + per-route (OTP/auth especially).

---

## 16. Phased Build Plan (one-week UAT)

Compressed for the UAT window. Build the walking skeleton first (MVP PRD Appendix A), then thicken.

| Phase | Focus |
|---|---|
| 0 — Foundations | Repo, CI, Nginx+Cloudflare TLS, OTP auth, host middleware, design tokens, DB skeleton, deploy pipeline. |
| 1 — Identity & Teams | Two-door OTP registration, player baseline, create-team→manager, role switch, squad + claimable players (M-6/P-6). |
| 2 — Tournament & Join | Create tournament + format gate + code/link, team join + organizer approval, club-code self-join + manager approval. |
| 3 — Match-day | Lineups, player QR + manager scan, organizer team check-in, manual override, medical profile + injury report. |
| 4 — Live & Public | Scoreboard controller + SSE, referee, suspend/lock, public spectator page (approved teams), reliability score. |
| 5 — Polish & UAT | Empty/error states, e2e on critical paths, perf, accessibility, UAT. |

---

## 17. Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Single EC2 = SPOF for app + DB | High | EBS snapshots + 6h pg_dump + rebuild runbook; move Postgres to RDS before serious traffic. |
| Alpha load on single t3.large | High | Load-test before Alpha; t3.xlarge or RDS extraction contingency. |
| OTP abuse (email bombing / enumeration) | Med | Rate-limit send endpoint (Nginx + app); single-use short-TTL codes. |
| Minors + medical data handling | High | Narrow visibility (§6.4); ownership transfer on claim; guardian consent required before Alpha. |
| Cloudflare buffers/closes SSE | High | 30s heartbeat, no-transform headers, Nginx proxy_buffering off; DNS-only bypass. |
| Pre-match column overload (9 MUST stories) | High | Build walking skeleton first; manual override covers scanner gaps; cut P-4. |
| QR replay | Med | Rotating 60s tokens + scan-window + audit log. |
| Module boundary erosion | Med | ESLint no-restricted-imports in CI; PR checklist. |
| Billplz dormant code drift | Low | Keep disabled + sandbox-tested; reconciliation cron when enabled. |

---

## 18. Decisions Log

| # | Decision | Choice | Status |
|---|---|---|---|
| 1 | Hosting | EC2 t3.large (Docker Compose) + S3 + Cloudflare | Locked |
| 2 | DB host | Self-hosted Postgres 16 in Docker, dedicated EBS gp3 | Locked |
| 3 | Payment processor | Billplz (dormant for UAT+Alpha) | Locked |
| 4 | MVP scope | All 4 portals, one-week UAT | Locked |
| 5 | Real-time bus | In-process EventEmitter; Postgres LISTEN, then Redis at scale | Locked |
| 6 | Storage | S3 (Cloudflare-fronted) | Locked |
| 7 | Auth | Better Auth email OTP **(CHANGED — was Google-OAuth-only)** | Locked v2.0 |
| 8 | Domain/routing | skrammm.com apex + app.; path-based per role; two reg. doors | Locked v2.0 |
| 9 | ORM | Prisma | Locked |
| 10 | Email | AWS SES (transactional + OTP) **(CHANGED — was Resend)** | Locked v2.1 |
| 11 | Reverse proxy | Nginx + Cloudflare Origin Cert / Full(Strict) **(CHANGED — was Caddy)** | Locked v2.0 |
| 12 | Redis | Deferred; added only when needed (scale path) | Locked v2.0 |
| 13 | Delivery | PWA via Serwist | Locked |
| 14 | Format gate | ≤8 / 9–16 / 17–32 (non-overlapping) **(CHANGED)** | Locked v2.0 |
| 15 | Attendance | Two-level: organizer→team, manager→player **(NEW)** | Locked v2.0 |
| 16 | Staff roles | Manager = coach/S&C/medical in MVP; separate accounts post-Alpha | Locked v2.0 |
| 17 | Terminology | "Pilot" → "Alpha" | Locked v2.0 |
| 18 | Framework | Next.js 15 (monolith) — Nest/Nuxt split considered and declined for UAT/Alpha | Locked |

---

## 19. Open Questions

| # | Question | Owner | Blocking? |
|---|---|---|---|
| 1 | Corrected pricing ladder (finalised in Master v4.0) | Product | No (free now) |
| 2 | Referee: single referee_name vs match_officials table | Eng/Product | No (default field) |
| 3 | Load test plan for 720 players before Alpha | DevSecOps | Yes (before Alpha) |
| 4 | Guardian/parental consent capture for minors | Product/Legal | Yes (before Alpha) |
| 5 | Claim-OTP contact verification + wrong-contact recovery | Product/Eng | Confirm before Alpha |
| 6 | Medical data retention & access-log policy | Product/DevSecOps | Confirm before Alpha |
| 7 | WAL archiving (WAL-G) to tighten RPO before Alpha? | DevSecOps | No (decide pre-Alpha) |
| 8 | AWS SES production access + sending-rate increase — SES starts in sandbox (verified recipients only). Alpha sends OTP to ~720 real players; logins fail without prod access. | DevSecOps | Yes (before Alpha) |

---

## 20. Tournament Format Gate (corrected)

> **v2.0 —** Replaces the prior overlapping ranges (festival 4–8 / tiered 12–16 / elimination 20–24) with deterministic, non-overlapping bands. Validated at tournament creation; one team count → exactly one format.

| Teams | Format (enum) | Structure |
|---|---|---|
| ≤ 8 | festival | Single round-robin. Aligns with free-tier limit. |
| 9 – 16 | tiered | Grouping → Quarterfinal → Semifinal. |
| 17 – 32 | elimination | Grouping → Cup / Plate / Bowl / Shield. |

The 24-team Alpha categories fall in the 17–32 band (Cup/Plate/Bowl/Shield).

---

## 21. Full Changelog (v1.4 → v2.0, plus v2.1)

| Area | v1.4 | v2.0 / v2.1 |
|---|---|---|
| Auth | Google OAuth only | Email OTP (Better Auth) |
| Registration | Per-role | Two doors, one identity, manager-as-later-role |
| Reverse proxy | Caddy (auto Let's Encrypt) | Nginx (Cloudflare Origin Cert, Full/Strict) |
| Invitation flow | Google-email match | Claim token + OTP; three flows (§6.3) |
| Medical | Absent | Two entities + visibility matrix + minor handling |
| Referee | Absent | referee_name on matches (O-3) |
| Attendance | Player only | Two-level: team (organizer) + player (manager) |
| Team join | Organizer-invited | Self-service join + organizer approval |
| Player onboarding | — | Club-code self-join + manager-created claimable accounts |
| Format gate | Overlapping ranges | ≤8 / 9–16 / 17–32 |
| Pricing | RM200 + RM10/team | New tiers; free for UAT+Alpha |
| Redis | Mentioned at scale | Explicitly deferred; when-needed |
| Email | Resend | AWS SES (v2.1) |
| Staff roles | — | Manager = coach/S&C/medical in MVP |
| Terminology | "Pilot" | "Alpha" |
| Design system | Single Styling row in §2 | New §2A with full palette, typography, brutalist shadows, sidebar tokens, chart tokens, radius scale (v2.2 — docs only) |

---

*End of Skrammm Technical PRD v2.2 — Draft for review. Aligned with MVP PRD v1.3. Master PRD update done (v4.1).*
