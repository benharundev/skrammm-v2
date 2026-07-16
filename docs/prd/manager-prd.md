# Team Manager Portal — Product Requirements Document

**Version:** 1.0  
**Date:** July 2026  
**Phase:** MVP  
**Audience:** Product, design, team-manager-facing stakeholders

---

## 1. Portal Overview

The Team Manager Portal is the operational hub for every rugby club using Skrammm. It is where a club builds its squad, prepares for tournaments, manages match-day logistics, and monitors team performance over time.

The primary manager is the central figure of this portal. They are identified by a `TeamStaff` record with `isPrimaryManager = true`. They are responsible for every action that requires the `team:manage` permission: adding and editing players, joining tournaments, managing club settings, and approving player changes. Secondary staff (coaches, physios) can access some features — notably lineup setting (`team:set_lineup`) and attendance scanning (`team:scan`) — but cannot perform privileged club management operations.

The TM portal is accessed at `app.skrammm.com/tm/*`. It shares the `auth` instance and `skrammm.session_token` cookie with the player portal. A user can simultaneously hold a TM identity (via `TeamStaff`) and a player identity (via a claimed `Player` record). The portal uses `getManagerTeam`, a React `cache()`-wrapped function, as its primary data entry point — just as the player portal uses `getClaimedPlayerForUser`.

The TM acts as the bridge between the organizer's tournament and the players on the pitch. Without the TM, there would be no registered teams, no submitted lineups, and no checked-in players. The TM's work happens in the days before and on the day of a match. The portal's design reflects this: squad management is a week-long activity, lineup setting happens 24 hours before kick-off, and attendance scanning happens in the 90 minutes before a match starts.

---

## 2. MVP Features — Complete

### 2.1 Dashboard

The dashboard gives the TM an instant picture of their team's current status. It shows the club's name, logo, origin city, and manager details in a header card. Below that, upcoming matches are shown with the opponent's name, scheduled time, and pitch — giving the TM a clear view of the week ahead. Past matches are shown with the score and a win/draw/loss indicator.

A form strip shows the team's recent results (up to the last 5 matches) as coloured W/D/L chips. This is a quick visual signal of recent form.

All data on the dashboard is fetched from the database: `getManagerTeam` for the team details, `getUpcomingMatchesForTeam` for upcoming fixtures, and `getPastMatchesForTeam` for recent results.

**Acceptance criteria**: Dashboard loads with real team data when a team exists. W/D/L form strip matches locked match results. Upcoming matches list is ordered by `scheduledAt` ascending. Past matches list is ordered by `scheduledAt` descending.

### 2.2 Create Club

When a user logs into the TM portal for the first time without an existing team, they are prompted to create their club. The form collects: club name, short name, origin city, primary training ground, contact email, and contact phone.

On submit, `createTeam` is called and the user is redirected to the dashboard. The club is immediately associated with the logged-in user as its primary manager via a `TeamStaff` record with `isPrimaryManager = true`.

**Acceptance criteria**: All required fields are validated before submit. `createTeam` creates both the `Team` record and the `TeamStaff` record in a transaction. After creation, the user is redirected to `/tm` and sees their new club's dashboard.

### 2.3 Squad Management

The squad page at `/tm/squad` shows the full roster of players associated with the club. Each player is shown with their name, jersey number, position, profile photo (or initials avatar as fallback), claim status badge (Claimed/Unclaimed), and their current RRS score.

Players with `claimStatus = "claimed"` have linked their Skrammm account to this player record. Players with `claimStatus = "unclaimed"` exist in the DB but have not yet created an account or entered their player ID code. Unclaimed players are still eligible for match selection and attendance scanning — the claim status only affects whether the player can view their own profile.

The RRS pills are colour-coded by the `getRrsV2WarningLevel` output: green ≥ 50, amber 30–49, red < 30. Players who have no match history show no RRS pill.

**Acceptance criteria**: All players in the squad are shown. Claimed/Unclaimed badges are accurate. RRS pills match `computeTeamRrs` results. Pagination handles squads of 30+ players.

### 2.4 Add Player

A manager can add a new player to their squad at `/tm/squad/add`. The form collects: full name (required), jersey number (required), position (required, constrained `<Select>`), date of birth (optional), and a minor player toggle that reveals guardian name and guardian contact fields.

On submit, `createPlayer` is called, which creates a new `Player` record with `claimStatus = "unclaimed"` and a unique auto-generated `playerIdCode`. The player is associated with the team via a `TeamMember` row.

The `playerIdCode` is shown to the manager after creation so they can share it with the player to enable claiming.

**Acceptance criteria**: All required fields are validated. `createPlayer` creates both the `Player` and `TeamMember` records. The generated `playerIdCode` is shown on the success screen with a copy button. Position is constrained to `RUGBY_POSITIONS`.

### 2.5 Edit Player

A manager can edit any player in their squad at `/tm/squad/[playerId]/edit`. All fields from the add player form are editable, plus a profile photo upload option.

Photo upload uses the same presigned S3 URL pattern as the player self-edit: the server issues a PUT URL, the browser uploads directly to S3, and the URL is saved to the player record via `updatePlayerByManager`.

**Acceptance criteria**: Changes persist to DB via `updatePlayerByManager` (not `updatePlayerProfile`, which is the player self-edit path). Photo upload does not route binary data through the server. Minor player fields are shown/hidden correctly based on the `isMinor` toggle.

### 2.6 Delete Player

A manager can delete a player from their squad. A confirmation dialog is shown before the action is irreversible.

**Critical note**: This feature currently uses a hard delete (`db.player.delete`) in the `removePlayerFromSquad` function. Hard deletion destroys all match history, lineup records, medical profile, and QR tokens associated with the player. This is documented as a critical bug in the MVP backlog and must be converted to a soft delete before the portal advances beyond MVP.

**Acceptance criteria (post-bug-fix)**: Delete sets `player.deletedAt = now()`. The player no longer appears in the squad list. Their match history and RRS data are preserved. The deletion can be reviewed by an admin if needed.

### 2.7 Tournaments

The tournaments page at `/tm/tournaments` shows all tournaments the team is registered in. For each tournament, the page shows the tournament name, dates, the team's current standing (W/D/L stats), and the team's registration status (pending, approved, rejected, withdrawn).

A "Join Tournament" form at the top allows the manager to enter a tournament code and join a new competition. On submit, `joinTournamentByCode` is called, which creates a `TournamentTeam` record with `status = "pending_approval"`. The organizer must then approve the team before it appears in the tournament.

**Acceptance criteria**: Tournament list is ordered by start date descending. W/D/L counts are accurate against locked matches. Join tournament form shows an error for invalid or expired codes. On successful join, the tournament appears in the list with "Pending Approval" status.

### 2.8 Lineup Setter

The lineup setter at `/tm/lineups` allows the manager to select the starting 15 and up to 8 bench players for an upcoming match. The page shows a list of upcoming matches for the team. Selecting a match loads the full squad roster and allows the manager to drag or select players into the lineup.

Each selected player is assigned a jersey number (pre-filled from their player record but editable). Players are categorised as starters (positions 1–15) or bench (positions 16–23).

The lineup is saved via `saveLineupAction`, which calls `saveMatchLineup` in the match module. `saveMatchLineup` upserts `MatchLineup` rows — so saving a lineup twice updates the existing records rather than creating duplicates.

The submitted lineup is consumed by the commentator view's player spotlight and lineup panels. Organizers can also view (and override) the lineup in the match center.

**Acceptance criteria**: Lineup selector shows all squad players. Jersey numbers are pre-filled and editable. Saving persists all `MatchLineup` rows. Re-saving the lineup updates existing rows (no duplicates). A confirmation is shown after save.

### 2.9 Attendance Scanning

The attendance page at `/tm/attendance` is the match-day check-in tool. It is designed to be used by the manager (or any team staff member) in the 60–90 minutes before a match.

The manager selects the active match from a dropdown (populated with today's scheduled matches for their team). They then activate the QR scanner, which uses the browser's camera API to scan player QR codes. When a valid QR code is scanned, the player's name and check-in time are displayed, and the in-memory scan log is updated.

For players who cannot scan (phone dead, QR not loading), a manual override is available. The manager selects the player from a list and enters a reason for the manual override. Both QR scans and manual overrides write to the `AttendanceScan` table via the respective API routes.

The `team:scan` permission enforces that scanning is only permitted on match day (the match must be scheduled for today) and that the team must be in that match.

**Known gap**: the in-memory scan log resets on page refresh. After refreshing the page, the manager cannot see which players have already been checked in unless they re-scan or re-override. Persisting the scan log from the DB on page load is documented as a bug fix in the MVP backlog.

**Acceptance criteria**: QR scanning invokes `POST /api/tm/attendance/scan`. Manual override invokes `POST /api/tm/attendance/override`. Both write `AttendanceScan` rows. Scanning outside match day returns a clear error. The scan log shows results in real time during the session.

### 2.10 Club Settings

The club settings page at `/tm/settings` has two sections.

The first section is the club profile: name, origin city, training ground, contact email, and contact phone. Changes are persisted via `updateTeamSettingsAction` calling `updateTeamSettings`. Club logo upload uses the presigned S3 pattern via `getTeamLogoPresignedUrl` and `saveTeamLogo`.

The second section is the manager's personal information — their own player record details (name, jersey number, position, date of birth). This allows the TM to keep their own player profile up to date from within the TM portal rather than switching to the player portal. Changes are persisted via `updatePersonalInfoAction` calling `updatePlayerProfile`.

**Acceptance criteria**: Club profile changes persist to DB. Logo upload reflects immediately after save. Personal info changes are reflected in the player portal if the TM is also a claimed player. The `team:manage` permission is checked before any club setting changes.

---

## 3. Known Bugs — MVP Fixes Required

These four bugs exist in the current codebase. The hard-delete bug (item 3.1) is the most critical and must be addressed before any production rollout.

### 3.1 Destructive Player Deletion

**Severity**: Critical — irreversible data loss.

**Location**: `src/modules/player/service.ts`, `removePlayerFromSquad` function (approximately line 220).

**Problem**: `removePlayerFromSquad` calls `db.player.delete({ where: { id: playerId } })`. In PostgreSQL with Prisma's default behaviour, this is a hard delete. Because there are no cascading delete rules defined for cross-module relationships (see Master Tech PRD §7.3 on module independence), related records in `MatchEvent`, `MatchLineup`, `AttendanceScan`, `PlayerMedicalProfile`, and `PlayerQrToken` may either be deleted silently or left as orphaned records, depending on whether each foreign key has `ON DELETE CASCADE` or `ON DELETE SET NULL` in the underlying schema.

The effect from the user's perspective: deleting a player who has participated in past tournaments permanently removes their stats from those tournaments. If the player was a top scorer in a previous competition, their try count disappears. The TM is shown no warning about this before confirming deletion.

**Fix**: Add `deletedAt DateTime?` to the `Player` model in `prisma/schema.prisma`. Run a migration. Update `removePlayerFromSquad` to `db.player.update({ where: { id: playerId }, data: { deletedAt: new Date() } })`. Add `deletedAt: null` to all `db.player.findMany` calls in the player module service. Add a warning dialog to the delete confirmation: "This will remove [name] from your squad. Their match history will be preserved."

### 3.2 No Attendance Roster View

**Severity**: High — critical match-day operation is blind after a page refresh.

**Location**: `src/app/(app)/tm/attendance/_client.tsx`.

**Problem**: The scan log that appears in the attendance page as players are checked in exists only in React state (`useState`). When the manager refreshes the page or returns to it after navigating away, all scan records are gone. There is no call to `getAttendanceForMatch` on page mount, so the manager cannot see who has already been checked in unless they rescan everyone.

`getAttendanceForMatch` is already exported from the attendance module. The only missing piece is calling it when the active match is selected and displaying the results below the scanner.

**Fix**: When the manager selects a match from the dropdown, call `getAttendanceForMatch(matchId)` to load existing scan records from the DB. Display a "Checked In" section below the scanner showing scanned players with their arrival times. Update this section in real time as new scans succeed.

### 3.3 Orphaned Duplicate File

**Severity**: Low — dead code, no user impact.

**Location**: `src/app/(app)/tm/attendance/_client 2.tsx`.

**Problem**: This file is an exact copy of `_client.tsx` with one difference: it uses a native HTML `<select>` element instead of the shadcn/ui `<Select>` component for the match selector. It is not imported by any page or component and has never been in production. It appears to be a workspace leftover from a UI exploration.

**Fix**: Delete the file.

### 3.4 Misleading "Sample Squad" Banner

**Severity**: Low — misleading copy but no functional impact.

**Location**: `src/app/(app)/tm/squad/page.tsx`.

**Problem**: When `isMock === true` (the user has no team yet), the squad page displays a banner: "Showing sample squad — create your club to manage real players." However, `players` is `dbTeam?.players ?? []`, which is an empty array when there is no team. No sample players are shown. The banner implies that sample player cards will appear below it, but the list is empty. A new user sees the banner, looks below it, and sees nothing.

**Fix**: Replace the copy with "No players yet — create your club to get started" or remove the banner entirely and show an empty state card with a "Create Your Club" button as the primary call to action.

---

## 4. Post-MVP Backlog

The following features are confirmed for post-MVP development once the bug fixes are complete.

### 4.1 Attendance Roster Summary Screen

**User story**: As a team manager, after scanning my players in before a match, I want to see a check-in summary screen showing who is present, who is absent, and who arrived late, so I can make last-minute lineup changes if necessary.

**Acceptance criteria**: A dedicated screen (or an expandable section) at `/tm/attendance` shows three groups of players: Checked In (with scan time), Late (with minutes late calculated from `scheduledArrivalAt`), and Not Yet Arrived. The screen updates in real time as new scans succeed. Manual overrides are shown with a "Manual" badge. The view persists across page refreshes by loading from the DB.

### 4.2 Player Fitness Badges on Squad Page

**User story**: As a team manager, I want to see each player's current fitness status on the squad list so I can quickly identify who is unavailable before I set the lineup.

**Acceptance criteria**: A fitness badge appears next to each player's name on the squad page. The badge shows "Fit" (green), "Doubtful" (amber), or "Out" (red) based on `PlayerMedicalProfile.fitnessStatus`. Players with no medical profile show no badge. Clicking the badge links to the player's edit page. The fitness status is loaded in a single batch query alongside the player list.

### 4.3 Match-Day Assistant Checklist

**User story**: As a team manager on match day, I want a checklist view that shows me which pre-match tasks are complete and which are outstanding, so I never forget to submit the lineup or open the attendance scanner.

**Acceptance criteria**: A match-day dashboard section appears on the day of a scheduled match (from 6 AM until the match ends). The checklist items are: ✓/✗ Lineup submitted, ✓/✗ Minimum attendance threshold reached (e.g. 7+ players checked in), ✓/✗ Medical profile complete for all starters. Each item has a shortcut link to the relevant page.

### 4.4 Push Notifications

**User story**: As a team manager, I want to receive a notification when the organizer approves my team's registration, so I know I can proceed with squad preparation for that tournament.

**User story**: As a team manager, I want to receive a notification when the tournament schedule is published, so I can plan around the fixture dates.

**Acceptance criteria**: Push notifications are sent when `TournamentTeam.status` changes from `pending_approval` to `approved`. Push notifications are sent when the first batch of matches for a tournament are created in `scheduled` status. Notification preferences are configurable in Settings.

### 4.5 RRS Leaderboard Within Squad

**User story**: As a team manager, I want to see my squad ranked by RRS score so I can identify my most reliable players and reward good attendance and discipline.

**Acceptance criteria**: A "Reliability Ranking" section on the squad page shows players sorted by career RRS descending. The top 3 players are highlighted. Players with fewer than 3 matches are excluded from the ranking. The ranking uses cached RRS values and does not trigger fresh computations.

### 4.6 Smart Lineup Suggestions

**User story**: As a team manager when setting the lineup, I want to see which players are marked as "Out" or "Doubtful" so I don't accidentally select an injured player.

**Acceptance criteria**: Players with `fitnessStatus = "out"` are shown with a greyed-out appearance and an "Out" badge in the lineup selector and cannot be selected as starters. Players with `fitnessStatus = "doubtful"` are shown with an amber badge but can still be selected. Players with no medical profile show no fitness indicator.

---

## 5. Success Metrics

**Lineup submission rate**: percentage of matches where a lineup is submitted by the TM before kick-off time. Target: 70%. Low rate may indicate the lineup setter is too complex or the reminder notifications are missing.

**Attendance scan adoption**: percentage of match-day attendances that are recorded via QR scan (rather than manual override or not at all). Target: 60%. This measures the operational adoption of the QR workflow on the pitch.

**Squad completeness**: percentage of squad players who have a profile photo, a jersey number, and a valid position. Target: 80% within the first tournament. Incomplete player profiles affect the quality of the commentator view and the share cards.

**Player claim rate within team**: percentage of a team's players who have claimed their player ID code within the first two weeks of the team joining a tournament. Target: 50%. Low claim rate reduces engagement with the player portal and reduces the RRS's visibility to players.

**Time to create club**: median time from first login to completing the "Create Club" flow. Target: under 5 minutes. Long times may indicate friction in the wizard.
