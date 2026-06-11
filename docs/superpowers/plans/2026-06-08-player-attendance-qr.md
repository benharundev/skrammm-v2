# Player Attendance QR Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Surface the existing `RotatingQr` component on the `player/teams` page, visible only when the player's team has joined at least one tournament.

**Architecture:** Add a `hasTeamTournaments(teamId)` boolean query to the team module, export it, then conditionally fetch + render the QR section in the teams Server Component. No schema changes, no new routes.

**Tech Stack:** Next.js 14 Server Components, Prisma, Vitest for unit tests

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `src/modules/team/service.ts` | Modify | Add `hasTeamTournaments` |
| `src/modules/team/index.ts` | Modify | Export `hasTeamTournaments` |
| `src/tests/unit/team-tournaments.test.ts` | Create | Unit test for `hasTeamTournaments` |
| `src/app/(app)/player/teams/page.tsx` | Modify | Import + conditionally render QR section |

---

### Task 1: Add and test `hasTeamTournaments` in team module

**Files:**
- Modify: `src/modules/team/service.ts`
- Modify: `src/modules/team/index.ts`
- Create: `src/tests/unit/team-tournaments.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/tests/unit/team-tournaments.test.ts`:

```ts
import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@lib/db", () => ({
  db: {
    tournamentTeam: { count: vi.fn() },
  },
}));

import { db } from "@lib/db";
import { hasTeamTournaments } from "@modules/team";

beforeEach(() => { vi.clearAllMocks(); });

describe("hasTeamTournaments", () => {
  it("returns true when team has at least one tournament entry", async () => {
    vi.mocked(db.tournamentTeam.count).mockResolvedValue(2);
    const result = await hasTeamTournaments("team-1");
    expect(db.tournamentTeam.count).toHaveBeenCalledWith({ where: { teamId: "team-1" } });
    expect(result).toBe(true);
  });

  it("returns false when team has no tournament entries", async () => {
    vi.mocked(db.tournamentTeam.count).mockResolvedValue(0);
    expect(await hasTeamTournaments("team-1")).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm vitest run src/tests/unit/team-tournaments.test.ts
```

Expected: FAIL — `hasTeamTournaments is not a function` (or similar import error)

- [ ] **Step 3: Add `hasTeamTournaments` to team service**

Open `src/modules/team/service.ts`. Append at the end of the file:

```ts
export async function hasTeamTournaments(teamId: string): Promise<boolean> {
  const count = await db.tournamentTeam.count({ where: { teamId } });
  return count > 0;
}
```

- [ ] **Step 4: Export from team module index**

Open `src/modules/team/index.ts`. The current line 1 is:
```ts
export { createTeam, getTeamById, joinTournament, getTeamsByManager, getManagerTeam, joinTournamentByCode, updateTeamSettings } from "./service";
```

Change it to:
```ts
export { createTeam, getTeamById, joinTournament, getTeamsByManager, getManagerTeam, joinTournamentByCode, updateTeamSettings, hasTeamTournaments } from "./service";
```

- [ ] **Step 5: Run test to verify it passes**

```bash
pnpm vitest run src/tests/unit/team-tournaments.test.ts
```

Expected: PASS — 2 tests passing

- [ ] **Step 6: Run typecheck**

```bash
pnpm typecheck
```

Expected: no errors

- [ ] **Step 7: Commit**

```bash
git add src/modules/team/service.ts src/modules/team/index.ts src/tests/unit/team-tournaments.test.ts
git commit -m "feat(team): add hasTeamTournaments query"
```

---

### Task 2: Add QR section to player/teams page

**Files:**
- Modify: `src/app/(app)/player/teams/page.tsx`

- [ ] **Step 1: Update imports**

Open `src/app/(app)/player/teams/page.tsx`. The current import block is:

```ts
import { requireAuth } from "@lib/auth/server";
import { getClaimedPlayerForUser, claimPlayer } from "@modules/player";
import { getTeamsByManager } from "@modules/team";
import { mockPlayer, mockTeam } from "../_mock/data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Users, Plus, ChevronRight, Shield } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { Route } from "next";
```

Replace with:

```ts
import { requireAuth } from "@lib/auth/server";
import { getClaimedPlayerForUser, claimPlayer } from "@modules/player";
import { getTeamsByManager, hasTeamTournaments } from "@modules/team";
import { mockPlayer, mockTeam } from "../_mock/data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Users, Plus, ChevronRight, Shield, QrCode } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { Route } from "next";
import { RotatingQr } from "../_components/rotating-qr";
```

- [ ] **Step 2: Update the data-fetching block**

The current data fetching in `TeamsPage` is:

```ts
  const session = await requireAuth();
  const dbPlayer = await getClaimedPlayerForUser(session.user.id);
  const player = dbPlayer ?? mockPlayer;
  const team = dbPlayer?.team ?? mockTeam;
  const managedTeams = await getTeamsByManager(session.user.id);
```

Replace with:

```ts
  const session = await requireAuth();
  const dbPlayer = await getClaimedPlayerForUser(session.user.id);
  const player = dbPlayer ?? mockPlayer;
  const team = dbPlayer?.team ?? mockTeam;
  const [managedTeams, teamHasTournaments] = await Promise.all([
    getTeamsByManager(session.user.id),
    dbPlayer?.team ? hasTeamTournaments(dbPlayer.team.id) : Promise.resolve(false),
  ]);
  const showQr = dbPlayer !== null && teamHasTournaments;
```

- [ ] **Step 3: Add the QR section to the JSX**

The current JSX has this comment between "Current Club" and "Join a Club" sections:

```tsx
      {/* Join a Club */}
```

Insert the following block immediately before that comment (after the closing `</section>` of "Current Club"):

```tsx
      {/* Attendance QR */}
      {showQr && (
        <section className="overflow-hidden rounded-sm border-2 border-border bg-card shadow-brutalist">
          <div className="flex items-center gap-3 border-b border-border p-4">
            <QrCode className="h-4 w-4 text-muted-foreground" />
            <div>
              <h2 className="font-[family-name:var(--font-lexend)] font-bold text-foreground">
                Attendance QR
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Show this to your manager at match day
              </p>
            </div>
          </div>
          <div className="flex justify-center p-6">
            <RotatingQr />
          </div>
        </section>
      )}
```

- [ ] **Step 4: Run typecheck**

```bash
pnpm typecheck
```

Expected: no errors

- [ ] **Step 5: Run lint**

```bash
pnpm lint
```

Expected: no warnings or errors

- [ ] **Step 6: Commit**

```bash
git add src/app/(app)/player/teams/page.tsx
git commit -m "feat(player/teams): add conditional attendance QR section"
```

---

## Verification

After both tasks are complete:

1. Start the dev server: `pnpm dev`
2. Log in as a player whose team is enrolled in a tournament → navigate to `/player/teams` → QR section should appear with a countdown ring
3. Log in as a player whose team has no tournaments → QR section should be absent
4. Log in as a player with no claimed profile → QR section should be absent
