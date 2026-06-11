# Skrammm

Rugby tournament management platform — organizer, team manager, and player portals in a single modular Next.js monolith.

![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-15-000000?logo=nextdotjs&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-6-2D3748?logo=prisma&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-06B6D4?logo=tailwindcss&logoColor=white)

## What It Is

Skrammm is a full-featured tournament platform for rugby. It serves two domains from a single codebase: a public marketing/spectator site (`skrammm.com`) and an authenticated app portal (`app.skrammm.com`) with three role-specific portals. Key capabilities include live match scoring via Server-Sent Events, QR-based player attendance, medical profiles, team management, and email OTP authentication (no passwords).

## Portals

| Portal | Path | Key Features |
|---|---|---|
| **Organizer** | `/organizer/*` | Tournament setup, match schedule, live scoring, standings, team management, settings |
| **Team Manager** | `/tm/*` | Squad management, lineups, attendance scanning, tournaments, settings |
| **Player** | `/player/*` | Profile, teams, tournaments, match history, QR token, share |

The marketing site (`skrammm.com`) serves public tournament pages and a spectator view — no auth required.

## Tech Stack

| Category | Library / Tool |
|---|---|
| Framework | Next.js 15.3 / React 19 (App Router, Server Actions, RSC) |
| Language | TypeScript 5 — `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` |
| Database | PostgreSQL 16 via Prisma 6 |
| Auth | Better Auth 1.2 — email OTP only (AWS SES), no passwords |
| UI | shadcn/ui + Radix UI primitives + Tailwind CSS v4 |
| Real-time | Server-Sent Events (`/api/stream/[matchId]`) |
| Storage | AWS S3 + Cloudflare CDN |
| Email | AWS SES (OTP codes + invitations) |
| Cache / PubSub | Redis (ioredis) |
| Testing | Vitest (unit) + Playwright (E2E) |
| Infra | Docker, Nginx, Sentry, Axiom |

## Architecture

### Two-host routing

| Host | Maps to | Auth |
|---|---|---|
| `skrammm.com` | `src/app/_marketing/` | None (public) |
| `app.skrammm.com` | `src/app/_app/` | Session required → `/login` |

Routing is split across two files that must stay in sync: `next.config.ts` (rewrites) and `src/middleware.ts` (auth guard). Locally, `localhost` is treated as the app host.

### Layers

```
src/
  app/          # Next.js routes — thin layer, no business logic
  modules/      # Domain logic — owns DB tables, exposes public index.ts
  lib/          # Infrastructure adapters — leaf layer, no module imports
  components/   # Shared UI (shadcn/ui → components/ui/)
  styles/       # globals.css + theme.css (design tokens)
```

**Strict import boundaries** (enforced by ESLint):
- `app/` may import `modules/*` and `lib/*` — never the reverse
- A module imports another module **only via its `index.ts`** — never from `service.ts` or `types.ts` directly
- `lib/` must not import from `modules/`

### Modules

`tournament` · `team` · `player` · `match` · `attendance` · `reliability` · `sponsor` · `payment` · `medical` · `shared`

### Authorization

Entity-scoped, not role-global. Every Server Action and route handler calls `can(userId, permission, scope)` from `@modules/shared/auth/can.ts` before acting.

Key permissions: `tournament:edit` · `team:manage` · `team:set_lineup` · `team:scan` · `medical:view_profile` · `player:edit_self`

### Server Action pattern

```ts
"use server";
const session = await requireAuth();                          // 1. auth
const team = await getManagerTeam(session.user.id);          // 2. load entity
if (!team) return;
const allowed = await can(session.user.id, "team:manage", { teamId: team.id }); // 3. authorize
if (!allowed) return;
const parsed = MySchema.safeParse(rawFormData);              // 4. validate
if (!parsed.success) return;
await myModuleService(parsed.data);                          // 5. call module
revalidatePath("/tm/...");                                    // 6. revalidate
```

## Prerequisites

- Node ≥ 20
- pnpm ≥ 9 — `npm i -g pnpm`
- Docker (runs local Postgres + Nginx + Redis)
- AWS credentials with SES and S3 access

## Local Setup

```bash
# 1. Install dependencies
pnpm install

# 2. Start local infrastructure (Postgres 16 + Nginx + Redis)
docker compose -f docker/docker-compose.local.yml up -d

# 3. Configure environment
cp .env.example .env.local
# Fill in BETTER_AUTH_SECRET, AWS_*, QR_HMAC_SECRET at minimum

# 4. Apply migrations and seed
pnpm db:migrate
pnpm db:seed

# 5. Start dev server
pnpm dev
# → http://localhost:3000  (treated as app.skrammm.com)
```

## Environment Variables

See `.env.example` for the full list. Key variables:

| Variable | Description |
|---|---|
| `DATABASE_URL` | Postgres connection string |
| `BETTER_AUTH_SECRET` | Session signing key — `openssl rand -base64 32` |
| `BETTER_AUTH_URL` | Full URL of the app host (e.g. `http://app.localhost.skrammm.com:3000`) |
| `AWS_REGION` | AWS region (default: `ap-southeast-1`) |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | AWS credentials (EC2 IAM role in prod) |
| `SES_FROM_ADDRESS` | Verified sender address for OTP emails |
| `S3_BUCKET_ASSETS` | S3 bucket for user-uploaded assets |
| `CLOUDFLARE_CDN_URL` | CDN prefix for serving S3 assets |
| `QR_HMAC_SECRET` | HMAC key for QR token signing — `openssl rand -base64 32` |
| `REDIS_URL` | Redis connection string (optional locally — falls back to DB) |
| `PAYMENTS_ENABLED` | Gate for Billplz payment integration (default: `false`) |

## Commands

### Dev / Build

| Command | Description |
|---|---|
| `pnpm dev` | Start Next.js development server |
| `pnpm build` | Production build |
| `pnpm start` | Start production server |

### Quality

| Command | Description |
|---|---|
| `pnpm typecheck` | TypeScript check (no emit) |
| `pnpm lint` | ESLint — zero warnings allowed |
| `pnpm lint:fix` | ESLint with auto-fix |

### Testing

| Command | Description |
|---|---|
| `pnpm test:unit` | Vitest — run once |
| `pnpm test:unit:watch` | Vitest — watch mode |
| `pnpm test:unit:coverage` | Vitest — with coverage report |
| `pnpm test:e2e` | Playwright (requires running dev server) |
| `pnpm test:e2e:ui` | Playwright with interactive UI |

E2E base URL: `http://app.localhost.skrammm.com:3000`. The `webServer` in `playwright.config.ts` auto-starts `pnpm dev` unless a server is already running.

### Database

| Command | Description |
|---|---|
| `pnpm db:generate` | Regenerate Prisma client after schema changes |
| `pnpm db:migrate` | Create + apply a new migration (dev) |
| `pnpm db:migrate:deploy` | Apply pending migrations (prod / CI) |
| `pnpm db:push` | Push schema without migration (prototyping only) |
| `pnpm db:studio` | Open Prisma Studio |
| `pnpm db:seed` | Run `prisma/seed.ts` |

### Infrastructure

| Command | Description |
|---|---|
| `pnpm cache:flush` | Flush local Redis DB |

## Project Structure

```
Skrammm_v2/
├── docker/                    # docker-compose files (local + production)
├── prisma/
│   ├── schema.prisma          # Database schema (PostgreSQL 16)
│   └── seed.ts                # Dev seed data
├── public/                    # Static assets + compiled service worker
├── src/
│   ├── app/
│   │   ├── _marketing/        # skrammm.com — public marketing + spectator
│   │   └── _app/
│   │       ├── organizer/     # Organizer portal
│   │       ├── tm/            # Team manager portal
│   │       ├── player/        # Player portal
│   │       └── api/           # API routes (auth, stream, upload, etc.)
│   ├── modules/               # Domain modules (each: service.ts + types.ts + index.ts)
│   │   ├── tournament/
│   │   ├── team/
│   │   ├── player/
│   │   ├── match/
│   │   ├── attendance/
│   │   ├── medical/
│   │   ├── reliability/
│   │   ├── sponsor/
│   │   ├── payment/
│   │   └── shared/            # User/Session + auth helpers (can.ts, requireAuth)
│   ├── lib/                   # Infrastructure adapters
│   │   ├── auth/              # Better Auth server + client instances
│   │   ├── db/                # Prisma client singleton
│   │   ├── email/             # SES wrapper
│   │   ├── storage/           # S3 upload helpers
│   │   ├── realtime/          # In-process SSE pub/sub bus
│   │   ├── qr/                # QR token generation + scanning
│   │   └── utils.ts
│   ├── components/
│   │   └── ui/                # shadcn/ui components
│   └── styles/
│       ├── globals.css
│       └── theme.css          # Design tokens (CSS custom properties → Tailwind v4)
├── CLAUDE.md                  # Dev guide for AI coding assistants
├── .env.example               # Environment variable reference
└── tsconfig.json
```

## Database

All IDs are UUID v7, generated in application code via the `uuid` package — not database-generated. After any schema change:

```bash
pnpm db:generate   # regenerate Prisma client
pnpm db:migrate    # create + apply migration
```

### Key entities

| Module | Models |
|---|---|
| shared | User, Session, Account, Verification, AuditLog |
| team | Team, TeamStaff, TeamMember |
| player | Player, PlayerQrToken, PlayerMedicalProfile |
| tournament | Tournament, TournamentTeam, TournamentInvitation |
| match | Match, MatchOfficial, MatchEvent, MatchLineup, MatchInjuryReport |
| attendance | AttendanceScan, TeamAttendance |
| payment | Payment |
| reliability | ReliabilitySnapshot |

## Auth

Email OTP flow via Better Auth + AWS SES:

1. User submits email
2. SES sends a 6-digit OTP code
3. User enters code → session created
4. Session cookie: `__Secure-skrammm.session_token`, domain `.skrammm.com`, 30-day rolling

Middleware (`src/middleware.ts`) runs on Edge Runtime and performs cookie-presence check only. Full session validation happens in RSCs and Server Actions via `requireAuth()` from `@lib/auth/server`.

## Real-time

Live match updates stream via SSE from `/api/stream/[matchId]`. The in-process pub/sub bus lives in `src/lib/realtime/`. Nginx must have `proxy_buffering off` for this route; Cloudflare must not cache it.

## Design System

Tokens live in `src/styles/theme.css` as CSS custom properties. Tailwind v4 picks them up via `@theme inline` — never hardcode hex values in components. Use contract tokens: `primary`, `accent`, `secondary`, `destructive`, etc. Brutalist offset shadows: `.shadow-brutalist*` utility classes. Brand font: Lexend via `font-[family-name:var(--font-lexend)]`.

## Deployment

Production runs on a **Shinjiru KVM VPS (Ubuntu)** with Docker Compose. Nginx runs natively on the host (not in Docker), managed by Ansible. Cloudflare sits in front for DNS, DDoS, WAF, and SSL termination.

### Stack

| Layer | Technology |
|---|---|
| Edge | Cloudflare (DNS, DDoS, WAF, Global SSL/TLS) |
| Host OS | Ubuntu VPS (Shinjiru KVM) |
| Firewall | UFW (ports 22, 80, 443 only) |
| Reverse proxy | Nginx (native, via `apt`) with Cloudflare Origin cert |
| App containers | Docker Compose — Next.js + PostgreSQL 16 + Redis 7 |
| File storage | AWS S3 + Cloudflare CDN |
| Email | AWS SES |
| Container registry | GitHub Container Registry (GHCR) |
| IaC | Ansible (`ansible/site.yml`) |

### Provisioning a new server

```bash
# Set target VPS IP
export GCP_VM_IP=<vps-ip>
export GCP_VM_USER=ubuntu

# Place Cloudflare Origin cert in docker/certs/ first
ansible-playbook -i ansible/inventory.yml ansible/site.yml
```

The playbook installs Docker, Nginx, UFW, and sets up the systemd service. After provisioning, create `/opt/skrammm/.env` on the server with all production secrets.

### CI/CD

Push to `main` → GitHub Actions builds the Docker image → pushes to GHCR → SSHs into the VPS, pulls the new image, runs `prisma migrate deploy`, and swaps the container.

Required GitHub secrets:

| Secret | Description |
|---|---|
| `VPS_IP` | Shinjiru VPS public IP |
| `VPS_USER` | SSH username (e.g. `ubuntu`) |
| `VPS_SSH_KEY` | Private SSH key for deploy user |
| `CR_PAT` | GitHub PAT with `read:packages` scope — lets VPS pull from GHCR |
| `APP_URL` | Production URL for health check verification |

### Manual deploy

```bash
# On the VPS
cd /opt/skrammm
IMAGE=ghcr.io/sysemy-tech/skrammm:<sha> docker compose up -d nextjs
```

Production database migrations: `pnpm db:migrate:deploy` (run inside the container via `docker compose run --rm nextjs`).
