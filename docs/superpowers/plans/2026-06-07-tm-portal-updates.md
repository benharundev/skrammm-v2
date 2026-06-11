# TM Portal UI Sync & Tournament Enhancements Implementation Plan

> **For agentic workers**: REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal**: Synchronize dropdown styles in the Team Manager portal with the Organizer portal and enhance the tournaments page with a "Join Tournament" card and past match statistics.

**Architecture**: Add server-side data fetching for past matches in the `match` module, and update the TM portal pages to use consistent brutalist-style UI components.

**Tech Stack**: Next.js, Tailwind CSS 4, Prisma, Lucide Icons.

---

### Task 1: Update Match Module for Team Stats

**Files**:
- Modify: `src/modules/match/service.ts`

- [x] **Step 1: Add `getPastMatchesForTeam` function**

```typescript
export async function getPastMatchesForTeam(teamId: string) {
  return db.match.findMany({
    where: {
      OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }],
      status: { in: ["completed", "locked"] },
      deletedAt: null,
    },
    include: {
      homeTeam: { select: { id: true, name: true } },
      awayTeam: { select: { id: true, name: true } },
      tournament: { select: { id: true, name: true } },
    },
    orderBy: { scheduledAt: "desc" },
    take: 20,
  });
}
```

- [x] **Step 2: Commit changes**

```bash
git add src/modules/match/service.ts
git commit -m "feat(match): add getPastMatchesForTeam service"
```

---

### Task 2: Sync Attendance Dropdown UI

**Files**:
- Modify: `src/app/(app)/tm/attendance/_client.tsx`

- [ ] **Step 1: Update `<select>` class names to match Organizer style**

```tsx
// Find match-select and player select
className="flex h-11 w-full rounded-sm border-2 border-border bg-card px-3 py-1 text-sm shadow-brutalist-sm focus:border-fair-play-gold focus:outline-none focus:ring-0"
```

- [ ] **Step 2: Verify UI in browser (if possible) or visually inspect code**

- [ ] **Step 3: Commit changes**

```bash
git add src/app/(app)/tm/attendance/_client.tsx
git commit -m "style(tm): sync attendance dropdown UI with organizer portal"
```

---

### Task 3: Enhance Tournaments Page - Join Card

**Files**:
- Modify: `src/app/(app)/tm/tournaments/page.tsx`

- [ ] **Step 1: Refactor "Join Tournament" section with new brutalist styles**

```tsx
// Use shadow-brutalist and border-fair-play-gold
// Ensure input is h-11 and font-mono
<section className="overflow-hidden rounded-sm border-2 border-fair-play-gold bg-card shadow-brutalist">
  <div className="flex items-center gap-3 border-b-2 border-fair-play-gold p-4">
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm bg-pitch-green text-fair-play-gold border-2 border-pitch-green">
      <Link2 className="h-4 w-4" />
    </div>
    <div>
      <h2 className="font-[family-name:var(--font-lexend)] font-bold text-foreground">Join Tournament</h2>
      <p className="text-[11px] text-muted-foreground uppercase font-bold tracking-tight">Enter code from organizer</p>
    </div>
  </div>
  <form action={handleJoin} className="flex flex-col sm:flex-row gap-3 p-4">
    <div className="flex-1 space-y-1.5">
      <Label htmlFor="code" className="sr-only">Tournament Code</Label>
      <Input id="code" name="code" placeholder="KLTOUR2026" className="h-11 font-mono uppercase border-2 border-border focus:border-fair-play-gold focus:ring-0 shadow-brutalist-sm" />
    </div>
    <Button type="submit" className="h-11 px-6 bg-pitch-green text-white font-bold border-2 border-pitch-green shadow-brutalist-navy-sm hover:shadow-none transition-all">Join</Button>
  </form>
</section>
```

- [ ] **Step 2: Commit changes**

```bash
git add src/app/(app)/tm/tournaments/page.tsx
git commit -m "feat(tm): enhance join tournament UI"
```

---

### Task 4: Enhance Tournaments Page - Match History & Stats

**Files**:
- Modify: `src/app/(app)/tm/tournaments/page.tsx`

- [ ] **Step 1: Import `getPastMatchesForTeam` and fetch data**

```typescript
import { getPastMatchesForTeam } from "@modules/match/service";

// Inside TournamentsPage component
const pastMatches = dbTeam ? await getPastMatchesForTeam(dbTeam.id) : [];

// Compute stats
const stats = pastMatches.reduce((acc, m) => {
  acc.total++;
  const isHome = m.homeTeamId === dbTeam?.id;
  const teamScore = isHome ? m.homeScore : m.awayScore;
  const oppScore = isHome ? m.awayScore : m.homeScore;
  if (teamScore > oppScore) acc.w++;
  else if (teamScore < oppScore) acc.l++;
  else acc.d++;
  return acc;
}, { total: 0, w: 0, d: 0, l: 0 });
```

- [ ] **Step 2: Add Stats Summary UI**

```tsx
<div className="grid grid-cols-3 gap-3">
  {[
    { label: "Played", value: stats.total },
    { label: "W/D/L",  value: `${stats.w}-${stats.d}-${stats.l}` },
    { label: "Win Rate", value: stats.total ? `${Math.round((stats.w / stats.total) * 100)}%` : "0%" },
  ].map(({ label, value }) => (
    <div key={label} className="rounded-sm border-2 border-border bg-card p-3 shadow-brutalist-navy-sm text-center">
      <p className="font-lexend text-xl font-black text-pitch-green">{value}</p>
      <p className="text-[9px] uppercase font-bold text-muted-foreground">{label}</p>
    </div>
  ))}
</div>
```

- [ ] **Step 3: Add Match History UI**

```tsx
<section className="space-y-3">
  <h2 className="font-lexend text-sm font-bold uppercase tracking-widest text-muted-foreground">Match History</h2>
  <div className="rounded-sm border-2 border-border bg-card overflow-hidden shadow-brutalist-navy-sm">
    {pastMatches.length === 0 ? (
      <p className="p-8 text-center text-sm text-muted-foreground">No past matches recorded yet.</p>
    ) : (
      <div className="divide-y divide-border">
        {pastMatches.map((m) => {
          const isHome = m.homeTeamId === dbTeam?.id;
          const won = isHome ? m.homeScore > m.awayScore : m.awayScore > m.homeScore;
          const draw = m.homeScore === m.awayScore;
          return (
            <div key={m.id} className="flex items-center gap-4 p-3 text-sm">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${won ? "bg-pitch-green text-white" : draw ? "bg-muted text-muted-foreground" : "bg-red-card text-white"}`}>
                {won ? "W" : draw ? "D" : "L"}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-bold truncate text-foreground">{isHome ? m.awayTeam.name : m.homeTeam.name}</p>
                <p className="text-[10px] text-muted-foreground">{m.tournament.name}</p>
              </div>
              <p className="font-lexend font-black tabular-nums">{m.homeScore} - {m.awayScore}</p>
            </div>
          );
        })}
      </div>
    )}
  </div>
</section>
```

- [ ] **Step 4: Commit changes**

```bash
git add src/app/(app)/tm/tournaments/page.tsx
git commit -m "feat(tm): add match stats and history to tournaments page"
```
