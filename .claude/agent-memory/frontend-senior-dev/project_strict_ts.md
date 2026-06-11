---
name: project-strict-ts
description: This repo runs exactOptionalPropertyTypes + noUncheckedIndexedAccess + typedRoutes — affects component patterns
metadata:
  type: project
---

tsconfig has `exactOptionalPropertyTypes: true`, `noUncheckedIndexedAccess: true`, and next.config has `experimental.typedRoutes: true`.

**Why:** Strict module-boundary + type-safety posture for the project.

**How to apply:**
- Do NOT pass `prop={maybeUndefined}` to an optional prop. Spread conditionally instead: `{...(next ? { next } : {})}`. Plain `next={next}` where next is `string | undefined` fails to compile.
- shadcn-generated components can fail typecheck under exactOptionalPropertyTypes (e.g. `dropdown-menu.tsx` CheckboxItem `checked`, `sonner.tsx` `theme`). Fix by defaulting (`checked = false`) or `?? "system"` + `NonNullable<...>` cast.
- typedRoutes rejects `<Link href="/foo">` for routes that don't exist yet. For nav to not-yet-created sub-routes, cast: `href={x as Parameters<typeof Link>[0]["href"]}` and `router.push(x as Parameters<typeof router.push>[0])`.
- ESLint enforces `@typescript-eslint/consistent-type-imports` (error) — type-only imports must use `import type`. `pnpm lint:fix` handles it.
- The `eslint-plugin-react-hooks` plugin is NOT registered in `eslint.config.mjs`. Do not add `// eslint-disable-next-line react-hooks/exhaustive-deps` — an unknown-rule disable comment is itself a lint error (`--max-warnings 0` fails). Just write a correct deps array instead; there is no exhaustive-deps linting to suppress.
- ESLint also enforces `no-console` (only `error`/`warn` allowed) — pre-existing violations live in `src/app/actions.ts`.
