---
name: project-stack
description: Core tech stack, architectural decisions, and module structure for Skrammm v2 backend boilerplate
metadata:
  type: project
---

Skrammm v2 boilerplate scaffolded (2026-06-06). Full walking skeleton is in place.

**Stack (all locked, TECH_PRD v2.1):**
- Next.js 15 App Router (full-stack monolith) · TypeScript strict
- PostgreSQL 16 + Prisma ORM
- Better Auth — email OTP only (no password, no OAuth)
- AWS SES (transactional: OTP, invites, claim codes) — in sandbox, prod access needed before Alpha
- AWS S3 + Cloudflare CDN (assets, performance cards)
- SSE via in-process EventEmitter (`src/lib/realtime/bus.ts`) — no Redis, no WebSockets
- Nginx reverse proxy + Cloudflare Origin Cert (Full/Strict TLS)
- Docker Compose (Next + Postgres + Nginx) on single EC2 t3.large
- Serwist PWA (player QR offline tolerance)

**Module layout:**
```
src/
  app/          → thin routes only; /_marketing (apex) and /_app (app.skrammm.com)
  modules/      → tournament | team | player | match | attendance | medical | reliability | sponsor | payment | shared
  lib/          → db | auth | email | storage | realtime | og | qr
```

**Critical patterns:**
- Every module exposes only `index.ts` as its public surface — cross-module imports must go through it
- `modules/shared/auth/can.ts` is the RBAC guard — called at the top of every server action and route handler. Path prefix is never sufficient for auth.
- ESLint `no-restricted-paths` enforces module boundaries in CI
- Payments (Billplz) dormant — gated behind `PAYMENTS_ENABLED=false`
- Team-level attendance (`team_attendance`) does NOT feed the reliability score — player-level scans only

**Why:** To prepare a production-ready modular monolith for one-week UAT → Alpha (2 tournaments × 24 teams × ~720 players). All decisions locked per TECH_PRD v2.1.

**How to apply:** When implementing features, always call `can()` first, import modules via `index.ts`, and keep all domain logic in `modules/*/service.ts` — never in `app/` route handlers.
