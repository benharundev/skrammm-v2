# Spectator Page — Design Spec
_2026-06-07_

## Context

Organizers share a public URL (`/{tournamentCode}`) so fans, players, and team managers can follow the tournament live without logging in. The page already exists at `src/app/(marketing)/[tournamentCode]/page.tsx` but runs entirely on hardcoded mock data and a `"use client"` model unsuited for public SSR. This spec replaces it with real data, the agreed visual design, and a near-real-time refresh mechanism.

---

## Decisions Made

| Topic | Decision |
|---|---|
| Page layout | Single scroll feed (no tabs) |
| Section order | Live → Standings → Upcoming → Results |
| Player names in events | Yes — `fullName` only (no PII beyond name) |
| Match card style | Dark / score-forward (pitch-green bg, gold score) |
| Standings layout | Stacked groups — all groups visible, gold left-border on top 2 |
| Live updates | Client-side `router.refresh()` every 10 s while live matches exist |
| Story card style | Option C — giant score hero + event log lower third |
| Story card trigger | "Share" button on every match card (live, result, upcoming) |

---

## PDPA Compliance

Public page exposes **only**:
- Tournament name, code, format, date range, status
- Team names and logos
- Match scores, status, scheduled time, pitch, group
- Match events: `eventType`, `minute`, `player.fullName` (no DOB, contact, guardian, IC, photo, email, attendance)

Player names on scoring events (try, conversion, card recipients) are public sporting information — equivalent to a printed match programme or PA announcement. All staff emails, roster contact details, medical data, and attendance records stay internal.

---

## Architecture

### Page model: RSC + thin client island

```
SpectatorPage (RSC, no auth required)
├── fetches tournament + matches + standings server-side
├── LiveSection (Client Component)
│   └── calls router.refresh() every 10 s while liveMatches.length > 0
├── StandingsSection (RSC fragment)
├── UpcomingSection (RSC fragment)
├── ResultsSection (RSC fragment)
└── MatchDetailOverlay (Client Component — exists today, keep & adapt)
```

The RSC approach means the initial HTML is fully rendered, SEO-friendly, and fast on mobile links. The client island only activates the refresh polling — it adds no bundle weight to the initial render.

### Middleware

`src/middleware.ts` must allow unauthenticated access to `/(marketing)` routes. Verify that `/[tournamentCode]` is in the public allowlist (or not caught by the session guard). If needed, add the pattern to `PUBLIC_PREFIXES`.

---

## New Data Functions

### 1. `getMatchesPublic(tournamentId)` — add to `src/modules/match/service.ts`

```ts
// Returns matches with team names + events with player fullName.
// No PII beyond fullName in events.
export async function getMatchesPublic(tournamentId: string)
```

Select:
- match: `id`, `status`, `homeScore`, `awayScore`, `scheduledAt`, `pitch`, `groupLabel`, `round`
- `homeTeam`: `{ id, name, logoUrl }`
- `awayTeam`: `{ id, name, logoUrl }`
- `events` (where `deletedAt: null`, ordered by `createdAt asc`):
  - `id`, `eventType`, `teamId`, `minute`
  - `player`: `{ select: { fullName: true } }` (nullable — sub_in/sub_out events may have no player)

Export from `src/modules/match/index.ts`.

### 2. `computeStandings(matches)` — add to `src/modules/match/service.ts`

Pure function. Takes the output of `getMatchesPublic`, groups completed matches by `groupLabel`, computes per-team: P, W, D, L, PF, PA, PTS (Win=3, Draw=1, Loss=0). Returns `Record<string, StandingRow[]>` sorted by PTS desc, PF desc.

Export from `src/modules/match/index.ts`.

### 3. `getTournamentByCode` (existing) — `src/modules/tournament/service.ts`

Already returns the correct public fields. Use as-is; the spectator page calls it by `code` from the URL param.

---

## Page File

**`src/app/(marketing)/[tournamentCode]/page.tsx`** — full rewrite

### Data fetching (RSC, top of file)

```ts
export default async function SpectatorPage({ params }) {
  const { tournamentCode } = await params;
  const tournament = await getTournamentByCode(tournamentCode);
  // Draft tournaments are not yet public — treat as not found
  if (!tournament || tournament.status === "draft") notFound();

  const matches = await getMatchesPublic(tournament.id);
  const standings = computeStandings(matches);

  const live     = matches.filter(m => m.status === "live");
  const upcoming = matches.filter(m => m.status === "scheduled" || m.status === "suspended");
  const results  = matches.filter(m => m.status === "completed" || m.status === "locked");

  return <SpectatorShell tournament={tournament} live={live} upcoming={upcoming} results={results} standings={standings} />;
}
```

### Section: Tournament Header

Sticky top bar (pitch-green, `border-b-2 border-navy`):
- Left: Skrammm wordmark
- Centre: tournament name (truncated on mobile)
- Right: status badge — `LIVE` (red, pulsing dot) / `UPCOMING` (navy) / `COMPLETED` (pitch-green)

Below sticky bar: a full-width hero strip (pitch-green-mid bg) with:
- Tournament name (Lexend 900)
- Date range + format tag
- Team count

### Section: Live Now

Visible only when `live.length > 0`. Background: pitch-green. Each match card:

```
┌─────────────────────────────────────┐  ← bg: pitch-green, border: 2px gold
│ [● LIVE 38']               Pitch 2  │  ← red pill + pitch label
│                                     │
│  Kota Belud RFC   14 · 7  Keningau  │  ← gold score (Lexend 900, 38px)
│                                     │
│  ⚡ Ahmad Faiz 8'  ⚡ Haziq 14'  🟨 Azri 11'  │  ← event chips
└─────────────────────────────────────┘
```

- Border: `2px solid var(--fair-play-gold)`, `box-shadow: 4px 4px 0 var(--fair-play-gold-dark)`
- Score: `color: var(--fair-play-gold)`, Lexend 900
- Event chips: small inline spans, try=gold, yellow=amber, red=red-card
- Tapping a card opens `MatchDetailOverlay`

Empty state (no live matches at page load but tournament is live): show a `"No matches live right now"` message with the next upcoming kickoff time prominently displayed.

### Section: Standings / Draw

Behaviour differs by tournament format.

**`festival` and `tiered`** — stacked group tables. For each group in `standings` (sorted by group label):

```
┌─────────────────────────────────────┐
│ GROUP A                             │  ← bg: pitch-green-mid, text: gold
├───┬────────────────┬──┬──┬──┬──────┤
│ # │ Team           │ P│ W│ L│  PTS │  ← header row, muted bg
├───┼────────────────┼──┼──┼──┼──────┤
│ 1 │ Kota Belud     │ 2│ 2│ 0│    6 │  ← gold left-border (top 2)
│ 2 │ Keningau RFC   │ 2│ 1│ 1│    3 │  ← gold left-border
│ 3 │ Ranau RFC      │ 2│ 0│ 2│    0 │
└───┴────────────────┴──┴──┴──┴──────┘
```

- `border-left: 3px solid var(--fair-play-gold)` on rows where `pos <= 2`
- PTS column: Lexend 800, pitch-green colour

**`elimination`** — no group tables. Replace the Standings section with a **Draw** section that groups matches by `round` label (e.g. `"Quarter-Final"`, `"Semi-Final"`, `"Final"`, `"3rd Place"`). Each round renders as a labelled block:

```
┌─────────────────────────────────────┐
│ QUARTER-FINALS                      │  ← bg: pitch-green-mid, text: gold
├─────────────────────────────────────┤
│  [match card]  Kota Belud  14–7 ... │  ← same dark card style as Live section
│  [match card]  Keningau    21–0 ... │
├─────────────────────────────────────┤
│ SEMI-FINALS                         │
│  [match card]  ...                  │
├─────────────────────────────────────┤
│ FINAL                               │
│  [match card]  ...                  │
└─────────────────────────────────────┘
```

- Rounds are sorted by match `scheduledAt` ascending so they appear in chronological order
- Unplayed elimination matches show `TBD vs TBD` when teams aren't yet determined (i.e. `homeTeamId` or `awayTeamId` is null in the DB)
- `computeStandings` returns an empty object for `elimination` format — the Draw section is driven directly from the `matches` array grouped by `round`

### Section: Upcoming

Light match cards (`bg-card`, `border-2 border-border`):
- Header strip: muted bg, showing `KO 10:00` + pitch + group
- Body: team names + `vs` separator (no score)
- Tapping opens overlay with "Match hasn't started yet"

### Section: Results

Same card style as Upcoming but header shows `FULL TIME` (pitch-green bg) and scores are shown in the body (foreground colour, not gold — the match is over).

### Match Detail Overlay

Keep existing overlay structure. Adapt event list to use real `player.fullName` from the new data shape. Event rows show: `minute'` | event badge | player name | team name | score-after.

### Live Refresh Client Island

A thin client component wrapping only the live section:

```tsx
"use client";
// Calls router.refresh() every 10 s when hasLiveMatches is true.
// No UI — invisible wrapper.
```

Pass `hasLiveMatches: boolean` as a prop from the RSC. When `false`, the interval doesn't run (no wasted requests when tournament is between rounds or completed).

---

## Social Story Card

### Design (Option C — Score Hero)

A 1080×1920 PNG generated server-side using the existing Satori + resvg pipeline in `src/lib/og/index.ts`. Layout:

```
┌──────────────────────────┐
│ [● LIVE] [Group A]       │  ← status + group pills
│ Skrammm                  │  ← brand
│ KL Sevens 2025           │  ← tournament name
│                          │
│       14 – 7             │  ← giant score (Lexend 900, ~200px equiv)
│   38'  ·  Pitch 2        │  ← minute + pitch
│ Kota Belud  Keningau     │  ← team names flanking
│                          │
│ ─ Match Events ──────    │
│ TRY  Ahmad Faiz      8'  │  ← event log rows
│ YC   Azri           11'  │
│ TRY  Haziq          14'  │
│                          │
│══════════════════════════│  ← 3px gold bottom border
│ skrammm.com  /klsevens25 │
└──────────────────────────┘
```

For upcoming fixtures: score replaced with `KO 10:00`, event log replaced with pitch + group info.
For results: "FULL TIME" badge instead of live pill, score is white (not gold).

### New function: `generateMatchStoryCard(opts)` — `src/lib/og/index.ts`

```ts
interface MatchStoryCardOptions {
  tournamentName: string;
  tournamentCode: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  status: "live" | "completed" | "scheduled";
  minute?: number;
  pitch?: string;
  groupLabel?: string;
  events: Array<{ eventType: string; playerName: string | null; minute: number; teamId: string; homeTeamId: string }>;
}
```

Same Satori → resvg pipeline as `generatePerformanceCard`. No S3 caching — generated on-demand per request (cards change every score event).

### New route: `src/app/(marketing)/[tournamentCode]/share/[matchId]/route.ts`

Public GET endpoint. Fetches the match using `getMatchesPublic` (filtered to the single matchId), calls `generateMatchStoryCard`, returns `image/png` with `Cache-Control: no-store` for live matches, `max-age=3600` for completed.

Add `/[tournamentCode]/share/` to middleware `PUBLIC_PREFIXES` so it's accessible without auth.

### Share button UX

Each match card gets a share icon button (top-right corner, `<Share2 size={14} />`). On tap:
1. If `navigator.share` is available (mobile): calls `navigator.share({ url: shareUrl, title: "KL Sevens · Kota Belud 14–7 Keningau" })` — lets the OS sheet handle IG/TikTok/WhatsApp
2. Fallback: direct download via `<a href={shareUrl} download="match.png">`

`shareUrl` = `/[tournamentCode]/share/[matchId]`

---

## Negative Flows

All states are handled in the RSC data layer — no client-side conditional logic needed.

### No live matches (between rounds)

Live section is hidden. A `NextUpBanner` component renders at the very top of the scroll (above Standings):

```
┌─────────────────────────────────────┐
│ ⏱  Next up · Pitch 1 · 10:00       │  ← amber bg, pitch-green border
│    Kota Belud RFC  vs  Keningau RFC │
└─────────────────────────────────────┘
```

Shows the earliest upcoming match. If no upcoming matches remain (all played), banner is hidden.

### Suspended match

`status === "suspended"` cards render in the Upcoming section (already included in the upcoming filter). The header strip uses an amber background with `⚠ Suspended` label instead of the kickoff time.

### Tournament not yet started (`status: "paid"`, `startsAt` in the future)

- Live section: hidden
- Standings section: hidden (no results yet)
- Upcoming section: shown with full fixture list
- Results section: hidden
- Hero strip shows: `"Starts [formatted date]"` below the tournament name

### Tournament completed (`status: "completed"`)

- Live section: hidden
- Upcoming section: hidden
- A `ChampionBanner` renders at the top (gold bg, pitch-green text): `"🏆 [Team name] — Champions"` — winner is the home or away team of the completed `"Final"` round match (for `elimination`), or the team with the most points across all groups (for `festival`/`tiered`)
- Standings shown in full
- Results shown in full

### No fixtures scheduled yet

Upcoming and Results both empty. A single centred message below the hero: `"Schedule not published yet — check back soon."`

### Tournament not found / draft status

`notFound()` → Next.js 404 page.

---

## Revalidation

Add to the RSC page:
```ts
export const revalidate = 30; // ISR fallback — page cache max 30s stale
```

The client-side refresh will usually update faster, but this ensures users who don't have JS or open the page once still get reasonably fresh data.

---

## Verification

1. `pnpm dev` → navigate to `http://localhost:3000/[code]` where `[code]` is a seeded tournament code
2. Confirm: tournament header shows real name + status
3. Confirm: if a live match exists, the live section renders with gold score cards
4. Confirm: standings shows stacked groups, gold border on top 2
5. Confirm: upcoming and results sections render correct match cards
6. Confirm: tapping a live match card opens overlay with real event timeline + player names
7. Confirm: no staff emails, player DOB, contact info, or guardian data appear anywhere in the DOM (DevTools → inspect)
8. Simulate 10-second polling: open two tabs, use organizer dashboard to add a match event — confirm the spectator tab updates within ~10 s without a manual reload
9. **Story card**: tap Share on a live match card → on mobile the OS share sheet opens; on desktop the PNG downloads. Open the PNG — confirm giant score, team names, event log, gold bottom border, tournament name, Skrammm branding.
10. **Negative flows**:
    - With no live matches: confirm `NextUpBanner` appears showing the next fixture
    - Set a match to `suspended`: confirm amber `⚠ Suspended` header renders in Upcoming
    - With `tournament.status === "paid"` and future `startsAt`: confirm Live/Standings/Results sections are all absent, hero shows start date
    - With `tournament.status === "completed"`: confirm `ChampionBanner` appears and Upcoming is hidden
11. `pnpm typecheck` — zero errors
12. `pnpm lint` — zero warnings
