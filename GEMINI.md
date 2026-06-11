# Skrammm v2 - Project Instructions

## Overview
Skrammm v2 is a modular monolith rugby tournament management system serving four portals (Organizer, Team Manager, Player, Spectator). It is built for speed, scalability (single EC2 t3.large), and strict type safety.

## Core Tech Stack
- **Framework**: Next.js 15 (App Router, Server Actions)
- **Language**: TypeScript (Strict Mode)
- **ORM**: Prisma (PostgreSQL 16)
- **Auth**: [Better Auth](https://www.better-auth.com/) (Email OTP only)
- **Styling**: Tailwind CSS 4 (`@theme inline`) + shadcn/ui
- **PWA**: Serwist (Offline-tolerant QR scans)
- **Email**: AWS SES
- **Real-time**: Server-Sent Events (SSE) via in-process `EventEmitter`

## Architectural Standards

### 1. Modular Monolith
- **`src/app/`**: Thin routing layer. Contains layouts and pages. Logic belongs in modules.
- **`src/modules/`**: Domain logic. Each module (e.g., `tournament`, `match`, `player`) owns its tables and logic.
- **`src/lib/`**: Leaf-level infra adapters (DB, Auth, Email, Storage).

### 2. Import Rules (Enforced by ESLint)
- `app/` may import `modules/*` and `lib/*`.
- Modules import other modules **ONLY** via their public `index.ts`.
- `lib/` is leaf-level; it cannot import from `app/` or `modules/`.
- Cross-module data access must go through service calls, never shared DB queries.

### 3. Security & Authorization
- **Never** rely on path prefixes for authorization.
- **Always** call the `can()` guard from `src/modules/shared/auth/can.ts` at the top of every Server Action or Route Handler.

### 4. Strict TypeScript
The project uses `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`, and `typedRoutes`.
- **Optional Props**: Do not pass `prop={undefined}`. Use conditional spreading: `{...(val ? { val } : {})}`.
- **Index Access**: Always check for `undefined` when accessing arrays/objects by index.
- **Consistent Type Imports**: Always use `import type` for type-only imports.

## Development & Validation

### Commands
- `pnpm dev`: Start development server.
- `pnpm typecheck`: Run TypeScript compiler check.
- `pnpm lint`: Run ESLint.
- `pnpm test:unit`: Run unit tests (Vitest).

### Known Issues (Pre-existing)
- `pnpm typecheck` may fail in `src/modules/**/service.ts` due to Prisma `null` vs `undefined` mismatches.
- `src/app/sw.ts` has type errors due to missing `webworker` lib (experimental).
- When validating changes, focus on `src/app`, `src/components`, and `src/lib`.

## Styling Conventions
- **Design System**: "Rugby Pitch Utility".
- **Tokens**: Use Tailwind 4 CSS variables (e.g., `var(--pitch-green)`).
- **Brutalist Shadows**: Use utility classes like `shadow-brutalist` or `shadow-brutalist-green`.
- **Sidebar**: Has a distinct dark-green sub-theme.

## Memory & Documentation
- **Technical PRD**: `PRD_Skrammm/TECH_PRD.md` (Source of truth for architecture).
- **Private Memory**: Project-specific private notes are located in `~/.gemini/tmp/skrammm-v2/memory/MEMORY.md`.
