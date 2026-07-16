# Player Portal — Product Requirements Document

**Version:** 1.0  
**Date:** July 2026  
**Phase:** MVP  
**Audience:** Product, design, player-facing stakeholders

---

## 1. Portal Overview

The Player Portal is the personal performance hub for every registered rugby player on Skrammm. It is the most personal and emotionally resonant of the three portals — the place where a player's entire competitive career is distilled into a single verified record.

Unlike the organizer and TM portals, which act on data (recording events, setting lineups, approving teams), the player portal primarily surfaces data produced by others. A player cannot enter their own match stats, because the integrity of the record depends on stats being recorded by a neutral third party (the organizer) in real time. The player's role is to claim their record, complete their profile, and share it with the world.

The portal is accessed at `app.skrammm.com/player/*`. It uses the same `auth` instance as the TM portal — the `skrammm.session_token` cookie — which means a user can hold both a player identity and a TM identity with a single login. The two are distinguished by whether the user has a `Player` record linked to their `userId` (`claimStatus = "claimed"`) and whether they have a `TeamStaff` entry with `isPrimaryManager = true`.

The player portal uses `getClaimedPlayerForUser`, a React `cache()`-wrapped function, as its data entry point. This function is called at the top of most player page RSCs and deduplicates the DB query across all server components in the same render tree, ensuring that a page with many data-consuming components never issues the same lookup twice.

---

## 2. The Claim Flow

Every player profile on Skrammm begins life as an unclaimed record. A team manager creates the player in the TM portal, filling in the player's name, jersey number, position, and optionally their date of birth and photo. At this point the player exists in the DB with `claimStatus = "unclaimed"` and no linked `userId`. All match events, lineup records, and attendance scans are attached to this player record, but no individual user can log into it.

A player claims their record by navigating to the Teams page (`/player/teams`) and entering their unique `playerIdCode`. This is a short alphanumeric code printed on their registration confirmation or given to them by their TM. When they submit the code, the `claimPlayer` server function links the player record to their user account by setting `player.userId = session.user.id` and `player.claimStatus = "claimed"`.

After claiming, the player's full match history — including every try, card, and stat recorded in matches they participated in before creating an account — becomes visible in their profile. The RRS score is computed retroactively over their full history. Their match-day QR code is activated. They are now a fully active Skrammm user.

The claim flow is one-directional and permanent. A claimed player cannot be unclaimed through the portal. If an organizer or TM needs to transfer a claimed player record, this is an administrative operation outside the self-service flow.

---

## 3. MVP Features — Complete

### 3.1 Dashboard

The dashboard is the player's landing screen. It shows their personal profile card (name, jersey number, position, profile photo, team name), a summary of their performance in the last 30 days (matches played, tries, cards, metres run), their current RRS score with a trend indicator, and their next upcoming match.

The last-30-days summary uses `getPlayerStats` with a 30-day window. The RRS score is computed by `computeRrsV2` and displayed with a colour-coded warning level (green ≥ 50, yellow ≥ 30, red < 30). The trend is expressed as "Ascending Form", "Stable Form", or "Slumping Form" based on the delta between the career RRS and the last-30-days RRS.

**Acceptance criteria**: Dashboard renders with real data from the DB. RRS score matches `computeRrsV2` result. Trend label matches the `trendDelta` computation. Next match card shows the nearest upcoming `TournamentTeam` entry with a `scheduled` match.

### 3.2 Profile

The profile page is the most comprehensive view of a player's career record. It is structured in sections:

- **Header**: player photo, name, jersey number, position, club name, `playerIdCode`, and RRS score with colour ring.
- **Career statistics**: total matches, tries, conversions, penalties, drop goals, yellow cards, red cards, metres run, clean breaks.
- **RRS breakdown**: three tabs showing Career RRS, Last-30-Days RRS, and per-tournament RRS. Each shows the score, the warning level, the individual component contributions (participation, scoring, outcome, cards), and the form label.
- **Match-day QR**: a rotating QR code that the TM's attendance app scans to check the player in. The QR encodes a `PlayerQrToken` that expires and rotates automatically.
- **Medical summary**: a brief read-only summary of the player's fitness status (fit/doubtful/out) and any active injury note, sourced from `PlayerMedicalProfile`.

**Acceptance criteria**: All statistics are accurate against the match event log. RRS breakdown totals match `computeRrsV2` output. QR code is present and scannable for claimed players. Medical summary shows current fitness status.

### 3.3 Edit Profile

Players can edit their own profile details: full name, jersey number, preferred position, and profile photo. Photo upload uses the presigned S3 URL pattern — the server issues a PUT URL, the client uploads directly to S3, and then the URL is saved to the player record.

Position is selected from a constrained `<Select>` component populated from the `RUGBY_POSITIONS` constant. (Note: there is a bug in the current implementation where the edit form uses a free-text `<Input>` instead — this is documented as a bug fix in the MVP backlog.)

**Acceptance criteria**: Name, jersey number, and position changes persist to DB via `updatePlayerProfile`. Photo upload completes without routing binary data through the Next.js server. All changes are reflected immediately on the profile page after save.

### 3.4 Match Statistics

The match statistics page at `/player/matches` shows the player's full tournament history. A list of all tournaments they have participated in is shown with the tournament name, dates, matches played, and a W/D/L summary. Clicking a tournament navigates to the tournament drill-down.

A bar chart is shown above the list. (Note: there is a bug where the chart currently uses the loop index as the bar height instead of the actual tries count — this is documented as a bug fix in the MVP backlog.)

**Acceptance criteria**: Tournament history list is accurate and ordered by most recent first. W/D/L counts match the locked match results for that team in that tournament.

### 3.5 Tournament Drill-Down

The tournament drill-down at `/player/tournaments/[tournamentId]` shows a detailed breakdown of the player's performance in a specific tournament. This includes per-match stats (score, tries, cards, stats), the tournament-level RRS, and the team's group stage result.

The page is powered by `getPlayerStatsByTournament` and `getPlayerMatchesInTournament`.

**Acceptance criteria**: All per-match stat rows are accurate against the event log. Tournament RRS matches `computeRrsV2` output with the tournament filter applied. Matches are shown in chronological order.

### 3.6 Teams

The teams page serves two functions. First, it is where a player claims their player record by entering their `playerIdCode`. Second, once claimed, it shows their current club information and any teams they are associated with.

The claim form is a simple input and submit. On successful claim, the page reloads with the player's club information shown. If the code is invalid or already claimed by another user, an appropriate error message is displayed.

The page also shows a match-day QR code if the player is registered in a tournament with upcoming matches. This QR is the same rotating token shown on the profile page, provided as a convenience here.

**Acceptance criteria**: `claimPlayer` server function links the player record to the user. Invalid codes show an error. Already-claimed codes show a specific "this player ID is already claimed by another account" message. Club info section renders after claim.

### 3.7 Settings

The settings page provides account management and legal links. A signed-in player can sign out from here. Links to the Privacy Policy and Terms of Service are present (as external static routes).

**Acceptance criteria**: Sign-out invalidates the session and redirects to `/login`. Privacy and ToS links navigate correctly.

### 3.8 Medical Profile

The medical profile at `/player/settings/medical` allows a player to self-report their medical and emergency information. This data is stored in `PlayerMedicalProfile` and includes:

- Fitness status (Fit, Doubtful, Out)
- Injury type and body part (shown when status is Doubtful or Out)
- Expected return date
- Allergies (free text)
- Blood type (A+/A−/B+/B−/AB+/AB−/O+/O−)
- Emergency contact name and phone number
- Additional notes for medical staff

The data is saved via `upsertMedicalProfile`. If a record already exists for the player, it is updated; otherwise a new one is created. This page is also accessible to the player's primary TM for the unclaimed-player case (where the manager completes it on the player's behalf).

**Acceptance criteria**: All fields persist to DB via `upsertMedicalProfile`. The medical summary on the profile page reflects the current fitness status immediately after save. Blood type selector is constrained to valid values.

### 3.9 Performance Share Cards

Players can generate two types of shareable PNG performance cards:

- **Career card**: at `GET /player/share/card`. Shows name, jersey number, position, club, career stats (tries, matches, cards), RRS score, and a QR code linking back to the tournament's spectator page or the player's club page.
- **Tournament card**: at `GET /player/share/tournament/[tournamentId]`. Shows name, jersey, position, club, stats for that specific tournament, and the tournament-level RRS score. (Note: there is a bug where this card hardcodes `reliability: 0` instead of computing the real tournament RRS — documented in the MVP bug backlog.)

Both cards are generated as edge-compatible PNG responses using `@lib/og`. They are suitable for sharing directly to Instagram Stories, Twitter/X, or WhatsApp.

**Acceptance criteria**: Career card renders with correct stats and non-zero RRS. Tournament card renders with stats for the specific tournament. Both cards are valid PNG images that open correctly in a browser.

---

## 4. Known Bugs — MVP Fixes Required

These four bugs exist in the current codebase and must be fixed before the player portal can advance beyond MVP. They are prioritised in order of user impact.

### 4.1 Tournament Share Card Shows Reliability: 0

**Severity**: High — affects every player who uses the tournament share feature.

**Location**: `src/app/(app)/player/share/tournament/[tournamentId]/route.ts`, approximately line 39.

**Problem**: The tournament share card route passes `reliability: 0` as a hardcoded value to the OG image generator. The career share card correctly calls `computeRrsV2` and passes the computed score. Any player who generates a tournament share card sees 0% reliability displayed, which is misleading and harmful to the feature's usefulness.

**Fix**: Call `computeRrsV2(playerId)` in the tournament share card route handler and extract the tournament-level RRS for the given `tournamentId` from the result. Pass the real value to the image generator.

### 4.2 Tries Bar Chart Uses Loop Index

**Severity**: Medium — the stats page shows incorrect data that could confuse players.

**Location**: `src/app/(app)/player/matches/page.tsx`, approximately line 55.

**Problem**: The bar chart on the match statistics page is populated with `tries: i + 1`, where `i` is the loop index over the tournament history list. This means the first tournament always shows 1 try, the second shows 2, the third shows 3, regardless of actual performance.

**Fix**: Two options. Option A: extend `TournamentHistoryItem` in `src/modules/player/types.ts` to include a `tryCount` field and update `getPlayerTournamentHistory` in the player service to compute it. Option B: change the chart to display `matchCount` (matches played per tournament), which is already available in `TournamentHistoryItem`. Option B is the faster fix; Option A is more product-valuable.

### 4.3 Position Field Uses Free-Text Input

**Severity**: Low — affects data quality but not core functionality.

**Location**: `src/app/(app)/player/profile/edit/page.tsx`.

**Problem**: The edit profile form uses an uncontrolled `<Input>` with `placeholder="e.g. Flanker"` for the position field. All other forms in the product that collect player position (TM's add player, TM's edit player, TM settings personal info) use a `<Select>` populated from `RUGBY_POSITIONS`. A player could enter an arbitrary string that does not match any recognised rugby position, creating data inconsistency.

**Fix**: Replace the `<Input>` with a `<Select>` component using the same `RUGBY_POSITIONS` constant imported from `@lib/constants` (or wherever it is defined). Add a migration to normalise any existing free-text position values that don't match the valid list.

### 4.4 Dead OTP Field in ClaimPlayerSchema

**Severity**: Low — dead code, no user-facing impact today.

**Location**: `src/modules/player/types.ts`, `ClaimPlayerSchema` definition.

**Problem**: `ClaimPlayerSchema` defines a required `otp: z.string().length(6)` field, but the actual `handleClaim` server action on the Teams page never sends, prompts for, or validates an OTP. The schema is either dead code representing an abandoned security approach, or it is the schema for a planned-but-unbuilt OTP-gated claim flow.

**Fix**: If the OTP claim flow is not planned for MVP, remove the `otp` field from `ClaimPlayerSchema`. If it is planned, implement the full flow: send an OTP to the manager's email on behalf of the player when they attempt to claim, require the player to enter the OTP to confirm.

---

## 5. Post-MVP Backlog

The following features are not in the MVP scope but are confirmed for post-MVP development.

### 5.1 Push Notifications

**User story**: As a player, I want to receive a push notification when my lineup is confirmed for tomorrow's match, so I know in advance that I am selected and can prepare accordingly.

**User story**: As a player, I want to receive a push notification when a match I am registered for is about to kick off, so I don't miss the start when I'm on my way to the venue.

**Acceptance criteria**: Player opt-in to push notifications on first login (web push permission prompt). Notifications are sent when `saveMatchLineup` includes the player as a starter. Notifications are sent 60 minutes before `match.scheduledAt`. Players can disable notifications in Settings.

### 5.2 RRS Trend Chart

**User story**: As a player, I want to see a chart of my RRS score over time, so I can track my progress and understand whether my reliability is improving.

**Acceptance criteria**: A line chart on the profile page shows RRS score per tournament (x-axis: tournament date, y-axis: tournament RRS). The chart uses `getPlayerTournamentHistory` to get the list and `computeRrsV2` tournament-level scores for each. A minimum of 2 tournaments of data is required for the chart to appear.

### 5.3 Public Player Profile (Opt-In)

**User story**: As a player, I want to opt in to having a public profile page so that coaches and selectors at other clubs can find and review my career stats.

**Acceptance criteria**: A "Make profile public" toggle in Settings. When enabled, the player's profile is accessible at `skrammm.com/player/[playerIdCode]` (or similar public route) without a login. Public profile shows career stats, RRS score, position, club name, and profile photo. Personal details (DOB, medical info, contact) are never shown on the public profile.

### 5.4 Social Share Improvements

**User story**: As a player, I want to share my performance card in a format optimised for Instagram Stories so it looks professional when I post it.

**Acceptance criteria**: A `?format=stories` query parameter on the share card endpoints returns a 9:16 aspect ratio PNG optimised for Instagram Stories. The card includes the Skrammm branding and a QR code. Tournament card includes the tournament logo if the organiser has uploaded one.

### 5.5 Multi-Team History

**User story**: As a player who has played for multiple clubs across their career, I want my profile to show my full history across all teams, not just my current club.

**Acceptance criteria**: The match statistics page groups history by team as well as by tournament. Career stats aggregate across all teams. When a player changes clubs (new `TeamMember` record), historical records from the previous team remain accessible.

---

## 6. Success Metrics

**Profile completion rate**: percentage of claimed players who have filled in photo, jersey number, and position. Target: 70% within 7 days of claiming.

**Claim rate**: percentage of player records that are claimed within the first tournament they appear in. Target: 50% claimed within the tournament duration.

**QR scan success rate**: percentage of match-day attendance scans (via QR) that succeed on first scan. Target: 95%. A low rate indicates problems with the rotating token or camera quality.

**Share card generation**: number of share cards generated per tournament. This is a proxy for player engagement and organic marketing reach.

**RRS breakdown engagement**: percentage of claimed players who navigate to the RRS breakdown view at least once per tournament. Target: 40%. Low engagement may indicate the feature is not discoverable.

**DAU/MAU ratio**: ratio of daily active users to monthly active users during active tournament periods. A high ratio indicates that players are returning to the app regularly during competition, not just at the start and end.
