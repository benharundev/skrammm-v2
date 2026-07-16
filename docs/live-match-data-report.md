# Live Match Data & Cross-Portal Report

**Date:** 2026-06-19  
**Scope:** Live Match Controller data collection, match reporting, and cross-portal data visibility  
**Codebase:** Skrammm_v2

---

## 1. Overview

| Data | Organizer Report | TM Portal | Player Portal |
|---|---|---|---|
| Final score | ✅ | ✅ Dashboard | ✅ Tournament detail |
| Scoring breakdown (try/conv/pen/DG) | ✅ | ❌ | ✅ Career + tournament totals |
| Disciplinary (yellow/red cards) | ✅ | ❌ | ✅ Career + tournament totals |
| Scorers (player-level) | ✅ | ❌ | ✅ Per-match event icons |
| Performance stats (15 types) | ✅ | ❌ | ❌ |
| Chronological event log | ✅ | ❌ | ❌ |
| Match W/D/L record | ❌ | ✅ Dashboard + Tournaments | ❌ |
| RRS score | ❌ | ✅ Squad (badge) | ✅ Profile + tournament |
| Matches played / starters count | ❌ | ❌ | ✅ Profile |

---

## 2. Live Match Controller: Collectible Data

### 2.1 Scoring Events

| Event | Points | Linked to player? |
|---|---|---|
| Try | 5 | Yes |
| Conversion | 2 | Yes |
| Penalty Goal | 3 | Yes |
| Drop Goal | 3 | Yes |

### 2.2 Disciplinary Events

| Event | Points | Linked to player? |
|---|---|---|
| Yellow Card | 0 | Yes (required) |
| Red Card | 0 | Yes (required) |

### 2.3 Performance Stats (0 points, increment-based)

**Defence**
- `tackles_dom` — Dominant tackles
- `tackles_passive` — Passive tackles
- `tackles_miss` — Missed tackles
- `turnovers_won` — Turnovers won

**Attack**
- `line_breaks` — Line breaks
- `ball_carries` — Ball carries
- `offloads` — Offloads
- `handling_errors` — Handling errors
- `rucks_secured` — Rucks secured

**Set Pieces**
- `scrums_won` — Scrums won
- `scrums_lost` — Scrums lost
- `lineouts_won` — Lineouts won
- `lineouts_lost` — Lineouts lost
- `penalties_conceded` — Penalties conceded

Stats are recorded at team level (not per-player). Each click in the UI creates one `MatchEvent` record of the corresponding type.

### 2.4 Per-Event Metadata

Every recorded event stores:
- `teamId` — home or away team
- `playerId` — optional (required for scoring/disciplinary, null for stats)
- `minute` — game minute (0–120), optional
- `payload` — extensible JSON field for future metadata
- `recordedByUserId` — the organizer who recorded it
- `createdAt` — server timestamp

### 2.5 Match Phases

```
scheduled → live → suspended → live → completed → locked
```

| Status | Meaning |
|---|---|
| `scheduled` | Match not yet started |
| `live` | Actively playing (covers both halves) |
| `suspended` | Paused mid-play; scoring disabled |
| `completed` | Full time blown; result not yet locked |
| `locked` | Result finalised; no further changes allowed |

Halftime is a UI-only state — no separate DB status. The organizer presses "Half Time" which freezes the UI, then "Start 2nd Half" which resumes `live`.

---

## 3. Match Report (Organizer Portal)

**Location:** `organizer/match/[matchId]/report`  
**Access:** Requires `tournament:score` permission (organizer of that tournament only)

### 3.1 Score Card
- Home and away team names, logos, final scores
- Match metadata: group label, venue/pitch, referee, scheduled time, status badge

### 3.2 Scoring Breakdown Table
- One row per scoring event type (Try, Conversion, Penalty, Drop Goal, Yellow Card, Red Card)
- Home count vs Away count side-by-side
- Winning team's column highlighted
- Total Points row at bottom

### 3.3 Scorers Section
- Two-column layout: Home | Away
- Per player: name, list of event labels (e.g. `TRY, CONV`), total points contributed
- Sorted by points descending
- Only players who scored appear

### 3.4 Performance Stats Table
- Grouped by category: Defence, Attack, Set Pieces
- Each stat row: Home count vs Away count
- Higher count highlighted
- Section only rendered if any stats were recorded

### 3.5 Event Log
- Chronological list, newest first
- Each entry: minute · event type badge · player name · team abbreviation · points (if applicable)
- Covers all scoring + disciplinary events (stats excluded from log)

---

## 4. TM Portal: What Reflects

### 4.1 Dashboard (`/tm`)
- **Next upcoming match** — opponent, date, time, venue
- **Live score** — shown inline if match is currently `live`
- **Recent match results** — opponent name, home/away score, W/D/L indicator
- **Team W/D/L aggregate** — total record across all tournaments

### 4.2 Squad Page (`/tm/squad`)
- Player cards with name, jersey, position, fitness status
- **RRS career score badge** (green/yellow/red) derived from match performance
- No individual match stats

### 4.3 Squad Player Detail (`/tm/squad/[playerId]`)
- Jersey number, position, name, claim status
- Medical profile (blood type, fitness status, emergency contact, allergies)
- **Zero match performance data** — no tries, cards, conversions, or match history

### 4.4 Tournaments Page (`/tm/tournaments`)
- List of tournaments the team has joined
- Per tournament: W/D/L record, match count
- Match list within tournament: opponent, score, date — no player-level breakdown

### 4.5 Gap
The TM portal is intentionally squad-management focused. It shows team-level outcomes and RRS badges but exposes no per-player match performance data. A team manager cannot see which player scored how many tries or received cards from this portal.

---

## 5. Player Portal: What Reflects

### 5.1 Profile Page (`/player/profile`)

**Career stat totals** (aggregated across all matches and tournaments):
- Matches played
- Starters count
- Tries, Conversions, Penalty Goals, Drop Goals
- Yellow Cards, Red Cards

**RRS metrics:**
- Career RRS score
- Last 30 days RRS score
- Form trend (Ascending / Stable / Slumping)
- Per-tournament RRS breakdown table

### 5.2 Matches Page (`/player/matches`)
- Bar chart: tries per tournament (visual overview)
- Tournament history list: tournament name, match count, dates

### 5.3 Tournament Detail Page (`/player/tournaments/[tournamentId]`)

**Per-tournament stat totals:** tries, conversions, penalties, drop goals, yellow cards, red cards for that tournament only.

**Individual match breakdown** — one row per match:
- Opponent, final score (Home–Away)
- Starter or Sub status
- Try count for that match
- Event icons: ⚡ try, ✓ conversion, P penalty, 🟨 yellow card, 🟥 red card

This is the most granular view available to a player — match-by-match with per-match event detail.

---

## 6. RRS (Reliability Rating System)

### 6.1 Formula

```
matchScore = P (participation) 
           + (w_try × tries) 
           + (w_conv × conversions) 
           + (w_dg × drop_goals) 
           + outcomeBonus (Win/Tie/Loss) 
           - (v_yc × yellowCards) 
           - (v_rc × redCards)

matchScore = max(0, matchScore × formatWeight)
```

Performance stats (tackles, line breaks, etc.) do **not** currently feed into RRS — only scoring events and disciplinary events contribute.

### 6.2 Cache Invalidation

| Trigger | Action |
|---|---|
| Card event recorded (yellow/red) | Immediate RRS snapshot refresh for that player + cache clear |
| Match transitions to `locked` | Full RRS refresh for all players in both team lineups + team cache clear |

### 6.3 Where RRS Surfaces

| Location | What's shown |
|---|---|
| TM Squad page | Career RRS badge (green/yellow/red) per player |
| Player Profile | Career score, last 30-day score, form trend, per-tournament breakdown |
| Player Tournament Detail | Tournament-specific RRS score |

---

## 7. Data Flow

```
Organizer — Live Match Controller
    │
    ▼
POST /api/organizer/match/[matchId]/event
    │
    ├─ db.matchEvent.create  (stores event with type, player, team, minute)
    ├─ match.homeScore / awayScore += points  (atomic transaction)
    ├─ publish(matchId, event)  →  SSE bus  →  (no active subscribers currently)
    └─ cache invalidation + RRS snapshot (on cards / on lock)
         │
         ├──▶ PLAYER PORTAL
         │       ├─ getPlayerStats()         → career totals on Profile
         │       ├─ getPlayerMatchesInTournament() → per-match detail on Tournament page
         │       └─ computeRrsV2()           → RRS on Profile + Tournament page
         │
         └──▶ TM PORTAL
                 ├─ getPastMatchesForTeam()  → team-level scores on Dashboard
                 └─ computeTeamRrs()         → per-player RRS badge on Squad page
```

---

## 8. Gaps & Observations

1. **TM portal has no player-level match analytics** — By design, the TM portal focuses on squad management. A manager who wants to review individual player performance must ask the player to share their profile, or access the data via another means. There is no TM-facing "match performance" page.

2. **Performance stats (tackles, line breaks, etc.) are not player-attributed** — Stats are recorded at team level, so they cannot be broken down per player in any portal. They only appear in the organizer match report (home vs away totals).

3. **Performance stats do not feed RRS** — Only tries, conversions, drop goals, yellow cards, red cards, and match outcomes influence a player's RRS score. Defensive stats have no effect.

4. **SSE stream is published but unconsumed** — Every match event is broadcast via the in-process SSE bus. No portal currently subscribes. The spectator public page uses 10-second polling instead.

5. **Match report is organizer-only** — The detailed event log and scoring breakdown in `organizer/match/[matchId]/report` are not accessible to team managers or players. Players see a simplified per-match icon summary; managers see only the final score.

6. **Stat events have no undo grace period** — The 8-second undo window applies to scoring and disciplinary events. Stat increments (tackles, line breaks, etc.) can be deleted via the DELETE endpoint but there is no UI undo button for them.
