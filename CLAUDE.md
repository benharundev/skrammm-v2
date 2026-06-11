# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
pnpm dev                    # Start Next.js dev server
pnpm build                  # Production build
pnpm typecheck              # TypeScript check (no emit)
pnpm lint                   # ESLint — zero warnings allowed
pnpm lint:fix               # ESLint with auto-fix

# Testing
pnpm test:unit              # Vitest (run once)
pnpm test:unit:watch        # Vitest (watch mode)
pnpm test:e2e               # Playwright (requires running dev server)
pnpm test:e2e:ui            # Playwright with UI

# Run a single Vitest test file
pnpm vitest run src/path/to/file.test.ts

# Database
pnpm db:generate            # Regenerate Prisma client after schema changes
pnpm db:migrate             # Create + apply a new migration (dev)
pnpm db:migrate:deploy      # Apply pending migrations (prod/CI)
pnpm db:push                # Push schema without migration (prototyping only)
pnpm db:studio              # Open Prisma Studio
pnpm db:seed                # Run prisma/seed.ts
```

The package manager is **pnpm** (v9). Always use pnpm, never npm or yarn.

## Architecture

### Two-host routing

The monolith serves two distinct hosts via `next.config.ts` rewrites and `src/app/middleware.ts`:

| Host | Rewritten to | Auth guard |
|---|---|---|
| `skrammm.com` | `src/app/_marketing/` | None — public |
| `app.skrammm.com` | `src/app/_app/` | Session required (→ `/login`) |

Locally, `localhost` is treated as the app host. Middleware handles the auth guard; `next.config.ts` handles the rewrite. The two-host logic is not in a single place — both files must stay in sync.

### Modular monolith layers

```
src/
  app/           # Next.js routes only — thin layer, no business logic
    _marketing/  # skrammm.com/*
    _app/        # app.skrammm.com/* (organizer/, tm/, player/, api/)
  modules/       # Domain logic — owns DB tables, exposes public index.ts
    tournament/ team/ player/ match/ attendance/
    reliability/ sponsor/ payment/ medical/ shared/
  lib/           # Infrastructure adapters — leaf layer, no module imports
    auth/  db/  email/  og/  qr/  realtime/  storage/  utils.ts
  components/    # Shared UI components (shadcn/ui lives in components/ui/)
  styles/        # globals.css + theme.css (design tokens)
```

**Module boundary rules** (enforced by `eslint-plugin-import` in `eslint.config.mjs`):
1. `app/` may import `modules/*` and `lib/*` — never the reverse.
2. A module imports another module **only via its public `index.ts`** — never from `service.ts` or `types.ts` directly.
3. `lib/` is leaf-level — it must not import from `modules/`.
4. Each module owns its DB tables; others read via the owning module's service.

Violations surface as lint errors in CI. A typical module looks like: `service.ts` (business logic) + `types.ts` + `index.ts` (re-exports the public surface).

### Authorization

Authorization is entity-scoped, not role-global. The guard is `@modules/shared/auth/can.ts`. Every Server Action and route handler must call `can(userId, permission, scope)` before acting — path prefix is never sufficient. Key permissions: `tournament:edit`, `team:manage`, `team:set_lineup`, `team:scan`, `medical:view_profile`, `player:edit_self`.

### Path aliases

```
@/*         → src/*
@lib/*      → src/lib/*
@modules/*  → src/modules/*
```

### Auth (Better Auth + email OTP)

- `lib/auth/server.ts` — Better Auth instance (server-side, used in Server Actions and middleware)
- `lib/auth/client.ts` — Better Auth client (used in Client Components)
- OTP flow: user enters email → AWS SES sends a code → user enters code → session created
- Sessions are DB-backed; cookie is `__Secure-skrammm.session_token`, domain `.skrammm.com`, 30-day rolling

### Real-time (SSE)

`lib/realtime/` contains the in-process pub/sub bus (`EventEmitter` keyed by `matchId`). The SSE endpoint is `src/app/_app/api/stream/[matchId]/`. Nginx must have `proxy_buffering off` for this route; Cloudflare must not cache it.

### Design system

Tokens live in `src/styles/theme.css` as CSS custom properties. Tailwind v4 picks them up via `@theme inline` — do not hardcode hex values in components. Use the Tailwind contract tokens (`primary`, `accent`, `secondary`, `destructive`, etc.). Brutalist offset shadows are utility classes `.shadow-brutalist*`. Full token reference: `TECH_PRD.md §2A`.

shadcn/ui components install to `src/components/ui/` via `pnpm dlx shadcn add <component>`.

### Database

Prisma schema: `prisma/schema.prisma`. All IDs are UUID v7 (generated in application code via the `uuid` package, not database-generated). After any schema change: `pnpm db:generate` to regenerate the client, then `pnpm db:migrate` to create the migration.

### Docker / local infra

`docker/docker-compose.local.yml` runs Postgres + Nginx locally. The app itself runs via `pnpm dev` outside Docker in development. Production uses `docker/docker-compose.yml` (Next.js standalone + Postgres + Nginx).

### TypeScript strictness

`tsconfig.json` enables `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitReturns`. Use `import type` for type-only imports (`@typescript-eslint/consistent-type-imports` is enforced). `no-explicit-any` is an error.

### E2E tests

Playwright tests live in `src/tests/e2e/`. Base URL is `http://app.localhost.skrammm.com:3000`. The `webServer` config in `playwright.config.ts` starts `pnpm dev` automatically unless `reuseExistingServer` is satisfied.

### Portals and mock data

Three portals share the same Next.js app: `organizer/`, `tm/` (team manager), `player/`. Each has:
- `_components/` — portal-specific UI components
- `_mock/data.ts` — typed fake data used as fallback when the DB returns nothing (preserves UI fidelity during development)

Pages fall back to mock data when `dbTeam` / `dbTournament` is null or the collection is empty. Never show empty states where full feature UI is the goal.

### Server Action pattern

Every Server Action follows this sequence:
```ts
"use server";
const session = await requireAuth();                          // 1. auth — redirects if no session
const team = await getManagerTeam(session.user.id);          // 2. load entity
if (!team) return;
const allowed = await can(session.user.id, "team:manage", { teamId: team.id }); // 3. authorize
if (!allowed) return;
const parsed = MySchema.safeParse(rawFormData);              // 4. validate
if (!parsed.success) return;
await myModuleService(parsed.data);                          // 5. call module
revalidatePath("/tm/...");                                   // 6. revalidate
```

### Middleware cookie guard

`src/middleware.ts` runs on Edge Runtime — it cannot import Prisma. It performs a cookie-presence check only (`skrammm.session_token` exists). Full session validation happens in RSCs via `requireAuth()` from `@lib/auth/server`.

### Typed routes

`next.config.ts` enables `experimental.typedRoutes`. String literals in `href` props must be cast: `href={"/tm/squad" as Route}`. Import `type { Route } from "next"`.

### Typography

The brand font is Lexend. Apply it with the Tailwind utility: `font-[family-name:var(--font-lexend)]`. Pair with `font-extrabold tracking-tight` for headings.

### PWA

`src/app/sw.ts` is the Serwist service worker source. It compiles to `public/sw.js` on production builds only (disabled in development). Do not import it directly.
