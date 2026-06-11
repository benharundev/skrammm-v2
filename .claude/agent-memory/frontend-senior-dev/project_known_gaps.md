---
name: project-known-gaps
description: Pre-existing typecheck failures in modules/**, sw.ts, og — not caused by frontend work
metadata:
  type: project
---

As of the Phase-1 frontend boilerplate work, `pnpm typecheck` fails ONLY in pre-existing backend/boilerplate files, never in app/components/lib frontend code:
- `src/modules/**/service.ts` (match, medical, attendance, tournament, team, sponsor, player) — Prisma create/update inputs pass `string | undefined` where Prisma wants `string | null`, tripping exactOptionalPropertyTypes.
- `src/lib/og/index.ts` — satori JSX object not assignable to ReactNode.
- `src/app/sw.ts` — `ServiceWorkerGlobalScope` missing (needs `webworker` lib in tsconfig).
- `playwright.config.ts` — one error.

**Why:** These are stubbed boilerplate generated before the frontend layer; they were failing independent of any UI work.

**How to apply:** When validating frontend changes, filter typecheck to `src/app|components|lib` and exclude `src/modules/`. Don't attribute these to your changes. They need a separate backend pass (likely a Prisma null-vs-undefined normalization helper).
