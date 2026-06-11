# Player Attendance QR — Design Spec

**Date:** 2026-06-08
**Scope:** Add rotating QR code to `player/teams` page for match-day attendance scanning by team managers.

---

## Problem

The `RotatingQr` component and the full token pipeline (`lib/qr`, `/player/qr/token` route, `modules/attendance`) are complete, but the QR is only surfaced on the profile page. Team managers scan player QR codes at tournaments to log attendance, so the QR must also live on the **Teams** page — the most contextually relevant location.

---

## Visibility Rules

Show the Attendance QR section only when ALL of:
1. Player has a claimed profile (`dbPlayer !== null`)
2. Player's team has joined at least one tournament (`TournamentTeam` count > 0)

Hide entirely otherwise — no placeholder, no empty state.

---

## Changes

### 1. `modules/team/service.ts`
Add:
```ts
export async function hasTeamTournaments(teamId: string): Promise<boolean> {
  const count = await db.tournamentTeam.count({ where: { teamId } });
  return count > 0;
}
```

### 2. `modules/team/index.ts`
Export `hasTeamTournaments`.

### 3. `src/app/(app)/player/teams/page.tsx`
- Import `hasTeamTournaments` from `@modules/team`
- Import `RotatingQr` from `../_components/rotating-qr`
- Fetch in parallel: `getTeamsByManager` + `hasTeamTournaments` (conditional on dbPlayer)
- Add "Attendance QR" section between "Current Club" and "Join a Club"

---

## UI Placement

```
[Current Club]
[Attendance QR]   ← new, conditional
[Join a Club]
[Clubs You Manage]
[Create club CTA]
```

The QR section is a brutalist card matching existing page design language, wrapping the `RotatingQr` component with a brief caption.

---

## Non-changes
- No schema changes
- No new routes
- `getClaimedPlayerForUser` signature unchanged
- `RotatingQr` component unchanged
