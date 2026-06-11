# Skrammm MVP Test Script v1.0

> **Canonical QA source for TDD enforcement.** Every test case has a unique ID (`TC-{PORTAL}-{NUM}`) that maps to a matching `test()` block in `src/tests/e2e/`. No feature ships without a passing Playwright test tied to its TC-ID.
>
> **Types:** `happy` = primary success path · `empty` = zero-data / first-time state · `negative` = error / boundary / auth failure  
> **Base URL:** `http://app.localhost.skrammm.com:3000` (Playwright config)  
> **Seed accounts (to be provisioned by test setup):**
> - `test-player@skrammm.local` — registered player, has claimed profile, has team
> - `test-manager@skrammm.local` — same account also manages a team
> - `test-organizer@skrammm.local` — organizer account
> - `test-new@skrammm.local` — fresh account, no profile, no team

---

## Section 1 — Authentication (TC-AUTH)

### TC-AUTH-01 | happy | Player/TM login with valid OTP

**Preconditions:** `test-player@skrammm.local` exists in the database.

**Steps:**
1. Navigate to `/login`
2. Verify the Skrammm vertical yellow logo is visible
3. Enter `test-player@skrammm.local` in the email field
4. Click "Send code"
5. Retrieve OTP via `getRealOtpForMock()` dev helper
6. Enter the OTP code in the verification field
7. Click "Sign in" / submit

**Expected:** URL changes to `/player`. Player home dashboard is visible with sidebar (desktop) or bottom nav (mobile).

---

### TC-AUTH-02 | happy | Organizer login with valid OTP

**Preconditions:** `test-organizer@skrammm.local` exists.

**Steps:**
1. Navigate to `/login/organizer`
2. Enter `test-organizer@skrammm.local`
3. Click "Send code"
4. Enter valid OTP
5. Click "Sign in"

**Expected:** URL changes to `/organizer`. Organizer dashboard is visible.

---

### TC-AUTH-03 | negative | Login with invalid email format

**Preconditions:** None.

**Steps:**
1. Navigate to `/login`
2. Enter `notanemail` in the email field
3. Click "Send code" or submit the form

**Expected:** Inline validation error appears (e.g. "Enter a valid email"). No OTP is sent. User remains on `/login`.

---

### TC-AUTH-04 | negative | Login with wrong OTP code

**Preconditions:** `test-player@skrammm.local` exists.

**Steps:**
1. Navigate to `/login`
2. Enter `test-player@skrammm.local`
3. Click "Send code"
4. Enter `000000` (incorrect code) in the OTP field
5. Click "Sign in"

**Expected:** Error message "Invalid or expired code" (or equivalent). User stays on the OTP step. URL remains `/login`.

---

### TC-AUTH-05 | negative | Unauthenticated access to player portal

**Preconditions:** No active session.

**Steps:**
1. Navigate directly to `/player`

**Expected:** Redirect to `/login`. No player data is visible.

---

### TC-AUTH-06 | negative | Unauthenticated access to TM portal

**Preconditions:** No active session.

**Steps:**
1. Navigate directly to `/tm`

**Expected:** Redirect to `/login`. No TM content visible.

---

### TC-AUTH-07 | negative | Unauthenticated access to organizer portal

**Preconditions:** No active session.

**Steps:**
1. Navigate directly to `/organizer`

**Expected:** Redirect to `/login/organizer`. No organizer content visible.

---

### TC-AUTH-08 | happy | Player signs out

**Preconditions:** Active player session.

**Steps:**
1. Navigate to `/player/settings`
2. Click "Sign Out"
3. Confirm sign out (if confirmation dialog exists)

**Expected:** Redirected to `/login`. Navigating to `/player` redirects to `/login` (session cleared).

---

### TC-AUTH-09 | happy | Organizer signs out

**Preconditions:** Active organizer session.

**Steps:**
1. Navigate to `/organizer`
2. Click the sign-out button in the sidebar or header
3. Confirm if required

**Expected:** Redirected to `/login/organizer`. Session is cleared.

---

### TC-AUTH-10 | negative | Authenticated player navigates to login page

**Preconditions:** Active player session (logged in as `test-player@skrammm.local`).

**Steps:**
1. Navigate directly to `/login`

**Expected:** Redirected to `/player` (or the last portal visited). The login form is not shown to an already-authenticated user.

---

## Section 2 — Organizer Portal (TC-ORG)

### TC-ORG-01 | empty | Fresh organizer dashboard shows "New Tournament" CTA

**Preconditions:** `test-organizer@skrammm.local` is logged in but has created no tournaments.

**Steps:**
1. Navigate to `/organizer`

**Expected:** Dashboard displays a prominent "New Tournament" or "Create Tournament" call-to-action. No match stats, fixtures, or team counts are shown (or they show zero).

---

### TC-ORG-02 | happy | Tournament wizard step 1 — name, dates, code

**Preconditions:** Organizer logged in.

**Steps:**
1. Navigate to `/organizer/settings/setup`
2. Enter tournament name "KL Sevens 2026"
3. Enter start date and end date (valid future dates, end ≥ start)
4. Confirm or accept the auto-generated tournament code
5. Click "Next" or "Continue"

**Expected:** Wizard advances to step 2 (team count selection). Step 1 inputs are preserved.

---

### TC-ORG-03 | happy | Format recommendation — 16 teams → "Tiered"

**Preconditions:** Step 1 completed.

**Steps:**
1. On wizard step 2, click the "16" team count button

**Expected:** Format recommendation card updates to show "Grouping → Quarterfinal → Semifinal" (Tiered). "Tiered" label is visible. No other format is highlighted.

---

### TC-ORG-04 | happy | Format recommendation — 8 teams → "Festival"

**Preconditions:** Step 1 completed.

**Steps:**
1. On wizard step 2, click the "8" team count button

**Expected:** Format recommendation shows "Round Robin (Festival)". "Festival" label is highlighted.

---

### TC-ORG-05 | happy | Format recommendation — 24 teams → "Elimination"

**Preconditions:** Step 1 completed.

**Steps:**
1. On wizard step 2, click the "24" team count button

**Expected:** Format recommendation shows "Grouping → Cup / Plate / Bowl / Shield" (Elimination). Correct label shown.

---

### TC-ORG-06 | happy | Complete wizard → launch tournament → success page with join code

**Preconditions:** Steps 1–3 of wizard completed with valid inputs.

**Steps:**
1. Advance through steps 2 and 3 with default/recommended format
2. On step 4 (Review), click "Launch Tournament"
3. Confirm in the modal

**Expected:** Success page appears showing the tournament join code and shareable URL. Code is copyable. A "how it works" guide for teams is shown.

---

### TC-ORG-07 | negative | Wizard step 1 — blank tournament name

**Preconditions:** Organizer on wizard step 1.

**Steps:**
1. Leave the tournament name field empty
2. Click "Next" / "Continue"

**Expected:** Inline validation error "Tournament name is required" (or equivalent). Wizard does not advance to step 2.

---

### TC-ORG-08 | negative | Wizard step 1 — end date before start date

**Preconditions:** Organizer on wizard step 1.

**Steps:**
1. Set start date to 2026-09-01
2. Set end date to 2026-08-01 (before start)
3. Click "Next"

**Expected:** Validation error "End date must be after start date" (or equivalent). Wizard does not advance.

---

### TC-ORG-09 | empty | No pending teams — "All caught up" state

**Preconditions:** Tournament exists with no pending team applications.

**Steps:**
1. Navigate to `/organizer/teams`
2. Click the "Pending Approval" tab

**Expected:** "All caught up" empty state message shown. No team cards visible in the pending list.

---

### TC-ORG-10 | happy | Approve pending team

**Preconditions:** At least one team in pending_approval status for the organizer's tournament.

**Steps:**
1. Navigate to `/organizer/teams` → "Pending Approval" tab
2. Find the pending team card
3. Click "Approve"

**Expected:** Team is removed from the Pending tab. Team appears in the "Approved Teams" tab with "Approved" status.

---

### TC-ORG-11 | happy | Reject pending team

**Preconditions:** At least one team in pending_approval status.

**Steps:**
1. Navigate to `/organizer/teams` → "Pending Approval" tab
2. Click "Reject" on a pending team card

**Expected:** Team is removed from the Pending tab. It does not appear in Approved Teams. Its tournament_teams status is "rejected".

---

### TC-ORG-12 | happy | Approved Teams — search filters results

**Preconditions:** Multiple approved teams exist.

**Steps:**
1. Navigate to `/organizer/teams` → "Approved Teams" tab
2. Type a partial team name in the search field

**Expected:** Team list filters in real-time to show only teams matching the search term. Non-matching teams are hidden.

---

### TC-ORG-13 | happy | Approved Teams — click row navigates to team detail

**Preconditions:** At least one approved team exists.

**Steps:**
1. Navigate to `/organizer/teams` → "Approved Teams" tab
2. Click on a team row

**Expected:** Navigates to `/organizer/teams/{teamId}`. Team name, group badge, and manager info are shown.

---

### TC-ORG-14 | empty | Team detail — team with no players

**Preconditions:** An approved team exists with zero players added.

**Steps:**
1. Navigate to `/organizer/teams/{teamId}` for an empty team

**Expected:** Roster section shows "No players registered yet" empty state. Player table is not rendered.

---

### TC-ORG-15 | happy | Team detail — roster with pagination

**Preconditions:** A team with 15+ players exists.

**Steps:**
1. Navigate to `/organizer/teams/{teamId}`

**Expected:** Player roster table shows first 10 rows. Pagination controls are visible. Clicking "Next" shows rows 11–15+.

---

### TC-ORG-16 | empty | Schedule page — no matches scheduled

**Preconditions:** Tournament exists but no matches have been created.

**Steps:**
1. Navigate to `/organizer/schedule`

**Expected:** Empty state shown ("No matches scheduled" or equivalent). Match filter controls may be visible but the list body is empty.

---

### TC-ORG-17 | happy | Edit match — unsaved changes banner appears

**Preconditions:** At least one match exists in the schedule.

**Steps:**
1. Navigate to `/organizer/schedule`
2. Expand a match row
3. Change the referee name field
4. Do NOT click "Save"

**Expected:** An "Unsaved changes" banner appears at the top/bottom of the page with "Save All" and "Discard All" buttons.

---

### TC-ORG-18 | happy | Save All — changes persist

**Preconditions:** At least one match with an unsaved referee name change (from TC-ORG-17).

**Steps:**
1. Click "Save All" in the unsaved-changes banner

**Expected:** Banner dismisses. Refreshing the page shows the updated referee name still present.

---

### TC-ORG-19 | happy | Filter schedule by status "Live"

**Preconditions:** Schedule has a mix of upcoming and live matches.

**Steps:**
1. Navigate to `/organizer/schedule`
2. Select "Live" from the status filter dropdown

**Expected:** Only live matches are displayed. Upcoming and completed matches are hidden.

---

### TC-ORG-20 | negative | Discard All reverts unsaved changes

**Preconditions:** Unsaved referee name change on a match.

**Steps:**
1. With the "Unsaved changes" banner visible, click "Discard All"

**Expected:** Banner dismisses. The referee name field reverts to its previous saved value. No DB write occurs.

---

### TC-ORG-21 | happy | Score a try (home team)

**Preconditions:** A live match is open at `/organizer/match/{matchId}`.

**Steps:**
1. Click the "Try" button for the home team

**Expected:** Home team score increases by 5. A "Try" event is appended to the event log with the current minute. An undo bar appears briefly.

---

### TC-ORG-22 | happy | Score a conversion

**Preconditions:** A live match is open.

**Steps:**
1. Click the "Conversion" button for the home team

**Expected:** Home score increases by 2. Event log shows "Conversion" entry.

---

### TC-ORG-23 | happy | Issue a yellow card

**Preconditions:** A live match is open.

**Steps:**
1. Click the "Yellow Card" button for the away team

**Expected:** Yellow card event appears in the event log. Score does not change. Card is attributed to the selected player (or noted as free-text if player list is used).

---

### TC-ORG-24 | happy | Cycle through all match phases

**Preconditions:** A match in "scheduled" status.

**Steps:**
1. Click "Kick Off" → match enters "1st Half"
2. Click "Half Time" → match enters "Half Time"
3. Click "2nd Half" → match enters "2nd Half"
4. Click "Full Time" → match enters "Full Time"

**Expected:** Each phase button advances the match status. The current phase is indicated visually. The scoring buttons remain active throughout.

---

### TC-ORG-25 | happy | Undo last event

**Preconditions:** At least one event has been scored in a live match.

**Steps:**
1. Score a try (home team)
2. Click "Undo" in the undo bar that appears

**Expected:** The last event is removed from the log. The score reverts. The undo bar auto-hides after ~8 seconds if not interacted with.

---

### TC-ORG-26 | happy | Suspend and resume a match

**Preconditions:** A live match is open.

**Steps:**
1. Click "Suspend"
2. Confirm in the suspension dialog

**Expected:** Match shows "SUSPENDED" status badge. Scoring buttons are disabled. Click "Resume" → badge clears, scoring re-enabled.

---

### TC-ORG-27 | happy | Lock result

**Preconditions:** Match at "Full Time" phase.

**Steps:**
1. Click "Lock Result"
2. Confirm in the lock-result modal (shows final score)

**Expected:** Match status changes to "locked". Modal closes. Scoring buttons are disabled/removed.

---

### TC-ORG-28 | negative | Cannot score on a locked match

**Preconditions:** Match with status "locked".

**Steps:**
1. Navigate to `/organizer/match/{matchId}` for a locked match

**Expected:** Try / Conversion / Penalty / Card buttons are either absent or disabled. No score change is possible.

---

## Section 3 — Team Manager Portal (TC-TM)

### TC-TM-01 | empty | No team → dashboard shows "Create a Club" CTA

**Preconditions:** `test-new@skrammm.local` logged in; no team created.

**Steps:**
1. Navigate to `/tm`

**Expected:** Page shows a "Create a Club" (or equivalent) call-to-action. No club card, no squad stats, no match banners.

---

### TC-TM-02 | happy | Create team → club card visible on dashboard

**Preconditions:** User logged in with no existing team.

**Steps:**
1. Navigate to `/tm/create-team`
2. Enter club name "KL Rhinos"
3. Enter origin "Kuala Lumpur"
4. Enter training ground "Padang Merbuk"
5. Click "Create Club" / submit

**Expected:** Redirected to `/tm`. Club card displays "KL Rhinos" with origin and a player count of 0. Quick-links grid is shown.

---

### TC-TM-03 | negative | Create team — blank club name

**Preconditions:** User on `/tm/create-team`.

**Steps:**
1. Leave the club name field empty
2. Click "Create Club"

**Expected:** Inline validation error "Club name is required". Form is not submitted. User stays on `/tm/create-team`.

---

### TC-TM-04 | empty | Squad page — no players

**Preconditions:** Team exists with zero players added.

**Steps:**
1. Navigate to `/tm/squad`

**Expected:** Empty squad state shown (e.g. "No players yet" or "Add your first player"). No player rows in the Unclaimed or Active sections.

---

### TC-TM-05 | happy | Add player → appears in Unclaimed section with ID code

**Preconditions:** Team exists.

**Steps:**
1. Navigate to `/tm/squad/add`
2. Enter full name "Ahmad bin Ali"
3. Select position "Prop"
4. Enter jersey number "1"
5. Submit

**Expected:** Redirected to `/tm/squad`. Player "Ahmad bin Ali" appears in the Unclaimed section with a dashed border and a visible Player ID code (e.g. `KLRH0001`).

---

### TC-TM-06 | happy | Unclaimed player has dashed border and ID code

**Preconditions:** At least one unclaimed player exists in the squad.

**Steps:**
1. Navigate to `/tm/squad`

**Expected:** Unclaimed players display with a visually distinct dashed border. The Player ID code is visible (monospace font).

---

### TC-TM-07 | happy | Claimed player shows reliability score pill

**Preconditions:** At least one claimed player in the squad with a computed reliability score.

**Steps:**
1. Navigate to `/tm/squad`

**Expected:** Claimed player row shows a colored pill: green (score ≥ 60), yellow (40–59), or red (< 40). Unclaimed players do not show a score pill.

---

### TC-TM-08 | happy | Click player row → navigate to player detail

**Preconditions:** At least one player (claimed or unclaimed) in the squad.

**Steps:**
1. Navigate to `/tm/squad`
2. Click on a player row

**Expected:** Navigates to `/tm/squad/{playerId}` showing the player's name, jersey, position.

---

### TC-TM-09 | happy | Edit player — changes reflect on squad page

**Preconditions:** Player exists in the squad.

**Steps:**
1. Navigate to `/tm/squad/{playerId}/edit`
2. Change full name to "Ahmad Farouk"
3. Change jersey number to "2"
4. Click "Save"

**Expected:** Redirected to `/tm/squad/{playerId}`. Name shows "Ahmad Farouk" and jersey shows "2". On `/tm/squad`, the updated name appears.

---

### TC-TM-10 | happy | Delete player → removed from squad

**Preconditions:** Player exists in the squad.

**Steps:**
1. Navigate to `/tm/squad/{playerId}/edit`
2. Click "Delete Player"
3. Confirm deletion

**Expected:** Redirected to `/tm/squad`. The deleted player no longer appears in either the Unclaimed or Active section.

---

### TC-TM-11 | negative | Edit player — blank name

**Preconditions:** Player exists.

**Steps:**
1. Navigate to `/tm/squad/{playerId}/edit`
2. Clear the name field
3. Click "Save"

**Expected:** Validation error "Name is required". Save does not occur. User stays on the edit page.

---

### TC-TM-12 | negative | Add player — duplicate jersey number

**Preconditions:** Player with jersey number "1" already exists in the squad.

**Steps:**
1. Navigate to `/tm/squad/add`
2. Enter a new name and select position
3. Enter jersey number "1"
4. Submit

**Expected:** Error message indicating the jersey number is already taken. Player is not added.

---

### TC-TM-13 | empty | Attendance — no upcoming matches

**Preconditions:** Team exists but has no upcoming matches (not in any tournament, or no matches scheduled).

**Steps:**
1. Navigate to `/tm/attendance`

**Expected:** Match selector dropdown is empty or disabled. A message like "No upcoming matches to scan for" is shown. Scanner is not available.

---

### TC-TM-14 | happy | Scan valid player QR → success toast + log entry

**Preconditions:** Upcoming match exists. Player has a valid, non-expired QR token.

**Steps:**
1. Navigate to `/tm/attendance`
2. Select the match from the dropdown
3. Enable the QR scanner
4. Simulate scanning a valid player QR token

**Expected:** Success toast appears with player name (e.g. "Ahmad bin Ali — Checked in"). Scan log shows an entry with player name, timestamp, and a green checkmark icon.

---

### TC-TM-15 | happy | Manual override → log entry with "Manual" flag

**Preconditions:** Upcoming match selected in attendance page.

**Steps:**
1. Navigate to `/tm/attendance`, select match
2. Open the manual override section
3. Select player "Ahmad bin Ali" from the dropdown
4. Click "Check In" / submit

**Expected:** Log entry appears with the player name, timestamp, and a distinct "Manual" label/icon indicating override (not QR-based).

---

### TC-TM-16 | negative | Scan expired/invalid QR

**Preconditions:** Upcoming match selected.

**Steps:**
1. Navigate to `/tm/attendance`, select match
2. Simulate scanning an expired or malformed QR token (e.g. an old token > 60 seconds)

**Expected:** Error toast "Invalid or expired QR code" (or equivalent). No log entry is created for this scan.

---

### TC-TM-17 | negative | Scan player not on this team

**Preconditions:** Upcoming match selected.

**Steps:**
1. Navigate to `/tm/attendance`, select match
2. Simulate scanning the valid QR token of a player who belongs to a different team

**Expected:** Error toast "Player not on your squad" (or equivalent). No log entry created.

---

### TC-TM-18 | negative | Scan same player twice for same match

**Preconditions:** Player already checked in for the selected match.

**Steps:**
1. Navigate to `/tm/attendance`, select the same match
2. Scan or manually check in the already-scanned player again

**Expected:** Error toast "Already checked in" (or equivalent). Duplicate scan is rejected; no second log entry appears.

---

### TC-TM-19 | empty | Lineups — no upcoming matches

**Preconditions:** Team is not in any tournament, or has no scheduled future matches.

**Steps:**
1. Navigate to `/tm/lineups`

**Expected:** "No upcoming matches" or equivalent empty state. Match selector is absent or empty.

---

### TC-TM-20 | happy | Set lineup → saved successfully

**Preconditions:** Team has an upcoming match with at least 15 players in the squad.

**Steps:**
1. Navigate to `/tm/lineups`
2. Select the match from the dropdown
3. Check the checkboxes for 15 players
4. Click "Save Lineup"

**Expected:** Success indication (toast or inline). No validation error. The lineup is persisted.

---

### TC-TM-21 | happy | Revisiting lineup pre-populates checked players

**Preconditions:** A lineup has been saved for a match (from TC-TM-20).

**Steps:**
1. Navigate to `/tm/lineups`
2. Select the same match

**Expected:** The 15 previously selected players are pre-checked. No other players are checked.

---

### TC-TM-22 | negative | Lineup not available for past/locked match

**Preconditions:** Team has a past/locked match.

**Steps:**
1. Navigate to `/tm/lineups`

**Expected:** Locked or past matches do not appear in the match selector dropdown. Only upcoming/scheduled matches are available.

---

### TC-TM-23 | empty | Tournaments — no tournaments joined

**Preconditions:** Team exists but has never joined a tournament.

**Steps:**
1. Navigate to `/tm/tournaments`

**Expected:** Stats grid shows Played=0, W=0, D=0, L=0. Match history is empty. The "Join Tournament" form is prominently shown.

---

### TC-TM-24 | happy | Join tournament with valid code → Pending badge

**Preconditions:** An active tournament exists with a known join code (e.g. "KLS26").

**Steps:**
1. Navigate to `/tm/tournaments`
2. Enter "KLS26" in the tournament code field
3. Click "Join"

**Expected:** A tournament entry appears in "Your Tournaments" with a "Pending" status badge. The team is not yet visible on the public spectator page.

---

### TC-TM-25 | happy | Organizer approves → status changes to "Approved"

**Preconditions:** Team is in Pending status (TC-TM-24). Organizer approves via their portal.

**Steps:**
1. Log in as organizer and approve the team (TC-ORG-10)
2. Log back in as TM and navigate to `/tm/tournaments`

**Expected:** The tournament entry now shows an "Approved" status badge.

---

### TC-TM-26 | negative | Join with invalid tournament code

**Preconditions:** Team exists.

**Steps:**
1. Navigate to `/tm/tournaments`
2. Enter "BADCODE" (a code that doesn't exist)
3. Click "Join"

**Expected:** Inline error "Tournament not found" (or equivalent). No tournament entry is added.

---

### TC-TM-27 | negative | Join tournament already joined

**Preconditions:** Team is already in a tournament (pending or approved).

**Steps:**
1. Navigate to `/tm/tournaments`
2. Enter the same tournament code again
3. Click "Join"

**Expected:** Error "Already joined this tournament" (or equivalent). No duplicate entry is created.

---

### TC-TM-28 | happy | Update club settings → header reflects new name

**Preconditions:** Team exists.

**Steps:**
1. Navigate to `/tm/settings`
2. Change club name to "KL Eagles"
3. Click "Save"

**Expected:** Success indication. Navigating to `/tm` shows the updated club name "KL Eagles" in the club card.

---

### TC-TM-29 | happy | Update personal info (when player profile exists)

**Preconditions:** Manager also has a claimed player profile.

**Steps:**
1. Navigate to `/tm/settings` → Personal Info section
2. Update full name and position
3. Click "Save"

**Expected:** Success indication. Changes are persisted and visible on revisiting the page.

---

### TC-TM-30 | empty | Personal Info — no player profile linked

**Preconditions:** Manager account with no associated player profile.

**Steps:**
1. Navigate to `/tm/settings`

**Expected:** Personal Info section shows "No player profile linked" (or equivalent message). No editable fields for name/jersey/position.

---

### TC-TM-31 | negative | Club settings — blank club name

**Preconditions:** Team exists.

**Steps:**
1. Navigate to `/tm/settings`
2. Clear the club name field
3. Click "Save"

**Expected:** Validation error "Club name is required". Settings are not saved. Previous name persists.

---

### TC-TM-32 | happy | Switch to Player Mode

**Preconditions:** Manager is also a player (has a claimed profile).

**Steps:**
1. Navigate to `/tm/settings` (or sidebar)
2. Click "Switch to Player Mode"

**Expected:** Navigates to `/player`. Player portal loads with the user's player data.

---

### TC-TM-33 | happy | Dashboard — upcoming match shows "Next Match" banner

**Preconditions:** Team is in an approved tournament with an upcoming match.

**Steps:**
1. Navigate to `/tm`

**Expected:** "Next Match" banner is visible, showing the opponent name, tournament, and date. A "Set Lineup" link is present.

---

### TC-TM-34 | happy | Dashboard — pending tournament shows alert badge

**Preconditions:** Team has a pending tournament application.

**Steps:**
1. Navigate to `/tm`

**Expected:** An alert badge or notification is visible indicating pending tournament approval (count badge and/or descriptive text).

---

## Section 4 — Player Portal (TC-PLY)

### TC-PLY-01 | empty | No claimed profile → onboarding CTA on dashboard

**Preconditions:** `test-new@skrammm.local` logged in; no player profile claimed.

**Steps:**
1. Navigate to `/player`

**Expected:** Dashboard shows a "Claim your profile" or "Get started" call-to-action. No stats, no reliability score, no team card.

---

### TC-PLY-02 | happy | Claimed player with matches → stats grid populated

**Preconditions:** `test-player@skrammm.local` has a claimed profile and has played in matches.

**Steps:**
1. Navigate to `/player`

**Expected:** Stats grid shows non-zero values for Matches, Tries, or other recorded events. Reliability score is displayed.

---

### TC-PLY-03 | happy | Reliability score displays correct color coding

**Preconditions:** Claimed player with a computed reliability score.

**Steps:**
1. Navigate to `/player`

**Expected:**
- Score ≥ 60: green indicator
- Score 40–59: yellow indicator
- Score < 40: red indicator
The score and its color match the expected band.

---

### TC-PLY-04 | empty | Claimed player with no matches — stats all zero

**Preconditions:** Claimed player profile exists but player has not appeared in any matches.

**Steps:**
1. Navigate to `/player`

**Expected:** Stats grid shows all zeroes. Reliability chart is absent or shows a flat/empty state. No "Next Match" banner.

---

### TC-PLY-05 | empty | No team → "Join a Club" section prominent

**Preconditions:** Claimed player with no team membership.

**Steps:**
1. Navigate to `/player/teams`

**Expected:** "Join a Club" section is prominently displayed with a player ID code input. "Current Club" section is absent or shows an empty state.

---

### TC-PLY-06 | happy | Claim account with valid player ID code

**Preconditions:** Manager has created a claimable player account with code "KLRH0001". Player is logged in as a different user.

**Steps:**
1. Navigate to `/player/teams`
2. Enter "KLRH0001" in the Player ID code field
3. Click "Claim"

**Expected:** Success indication. The team card for the manager's team appears in the "Current Club" section. The player profile is now claimed.

---

### TC-PLY-07 | happy | QR section visible when team has tournament

**Preconditions:** Claimed player's team has joined and been approved in at least one tournament.

**Steps:**
1. Navigate to `/player/teams`

**Expected:** "Attendance QR" section is visible between "Current Club" and "Join a Club". A rotating QR code is shown with the label "Show this to your manager at match day".

---

### TC-PLY-08 | happy | QR section hidden when team has no tournament

**Preconditions:** Claimed player's team exists but has NOT joined any tournament.

**Steps:**
1. Navigate to `/player/teams`

**Expected:** The QR section is absent. Only the "Current Club" card and "Join a Club" section are shown.

---

### TC-PLY-09 | negative | Invalid player ID code — no crash

**Preconditions:** Player on `/player/teams`.

**Steps:**
1. Enter "BADCODE" in the Player ID code field
2. Click "Claim"

**Expected:** Page stays on `/player/teams`. No crash or unhandled error. Either a silent fail (page reload, no new team) or an inline error message. No team is added.

---

### TC-PLY-10 | negative | Already claimed player ID code

**Preconditions:** Code "KLRH0001" is already claimed by another user.

**Steps:**
1. Navigate to `/player/teams`
2. Enter "KLRH0001"
3. Click "Claim"

**Expected:** Error or silent fail. The claiming user's profile is NOT linked to the already-claimed player. No duplicate claim is created.

---

### TC-PLY-11 | happy | Player is also a manager → "Manager Mode" button visible

**Preconditions:** User is both a player and a team manager.

**Steps:**
1. Navigate to `/player/teams`

**Expected:** "Manager Mode" button (or equivalent) is visible in the top-right area. Clicking it navigates to `/tm`.

---

### TC-PLY-12 | empty | Player is NOT a manager → no Manager Mode button

**Preconditions:** User is a player only; has no managed teams.

**Steps:**
1. Navigate to `/player/teams`

**Expected:** No "Manager Mode" button is visible. The "Create a Club" CTA may be shown instead.

---

### TC-PLY-13 | empty | No claimed profile → limited profile view

**Preconditions:** `test-new@skrammm.local` with no claimed profile.

**Steps:**
1. Navigate to `/player/profile`

**Expected:** Profile page shows a prompt to claim a profile or shows minimal info. Full stats, reliability breakdown, and QR are absent.

---

### TC-PLY-14 | happy | Claimed profile → all sections visible

**Preconditions:** `test-player@skrammm.local` with claimed profile.

**Steps:**
1. Navigate to `/player/profile`

**Expected:** Name, jersey number, position, career stats grid, reliability score, and reliability breakdown (3 progress bars) are all visible.

---

### TC-PLY-15 | happy | Reliability breakdown shows 3 progress bars

**Preconditions:** Claimed player with at least one reliability snapshot.

**Steps:**
1. Navigate to `/player/profile`

**Expected:** Three labeled progress bars are shown:
- Attendance (50% weight)
- Punctuality (25% weight)
- Discipline (25% weight)
Each bar is color-coded by its sub-score.

---

### TC-PLY-16 | happy | Medical summary shows blood type and emergency contact

**Preconditions:** Claimed player has a completed medical profile.

**Steps:**
1. Navigate to `/player/profile`

**Expected:** Medical summary section shows blood type and emergency contact name. A link to the full medical profile page is present.

---

### TC-PLY-17 | empty | No medical profile → prompt to add

**Preconditions:** Claimed player with no medical profile saved.

**Steps:**
1. Navigate to `/player/profile`

**Expected:** Medical summary section is absent or shows "No medical info yet — Add medical info" link. Blood type and emergency contact fields are not shown.

---

### TC-PLY-18 | happy | Edit profile — name change persists

**Preconditions:** Claimed player profile exists.

**Steps:**
1. Navigate to `/player/profile/edit`
2. Change name to "Farouk Ahmad"
3. Click "Save Changes"

**Expected:** Redirected to `/player/profile`. Name shows "Farouk Ahmad". The change is visible on revisit.

---

### TC-PLY-19 | negative | Edit profile — blank name

**Preconditions:** On `/player/profile/edit`.

**Steps:**
1. Clear the name field
2. Click "Save Changes"

**Expected:** Validation error "Name is required". Profile is not saved. User stays on the edit page.

---

### TC-PLY-20 | happy | Match-day QR visible on profile if claimed

**Preconditions:** Claimed player profile (regardless of team/tournament state).

**Steps:**
1. Navigate to `/player/profile`

**Expected:** A rotating QR code section is visible labelled "Match-day QR" or equivalent. The QR rotates every 60 seconds. The player ID code is shown in monospace font.

---

### TC-PLY-21 | empty | Matches page — no tournaments

**Preconditions:** Claimed player has not been in any tournament lineup.

**Steps:**
1. Navigate to `/player/matches`

**Expected:** "No tournaments yet" empty state is shown. Stats pills show zeros (or are absent).

---

### TC-PLY-22 | happy | Tournament history list entries

**Preconditions:** Player has participated in at least one tournament.

**Steps:**
1. Navigate to `/player/matches`

**Expected:** Each tournament entry shows: tournament name, tournament code, date range, and a status badge (Completed / Live / Upcoming / Cancelled).

---

### TC-PLY-23 | happy | Click tournament → navigate to tournament detail

**Preconditions:** Player has at least one tournament in history.

**Steps:**
1. Navigate to `/player/matches`
2. Click on a tournament entry

**Expected:** Navigates to `/player/tournaments/{tournamentId}`. Tournament detail page loads with the correct tournament name.

---

### TC-PLY-24 | happy | Tournament detail — performance stats grid

**Preconditions:** Player has participated in the tournament.

**Steps:**
1. Navigate to `/player/tournaments/{tournamentId}`

**Expected:** Stats grid shows Matches, Tries, Conversions, Penalties, Drop Goals, Yellow Cards — with correct values (not all zeros if data exists).

---

### TC-PLY-25 | happy | Tournament detail — per-match rows show results

**Preconditions:** Player has matches in the tournament.

**Steps:**
1. Navigate to `/player/tournaments/{tournamentId}`

**Expected:** Each match row shows: home vs away teams, final score, starter/sub status, try count (if any), and relevant event icons (try, yellow card, red card).

---

### TC-PLY-26 | empty | Medical settings — no claimed profile

**Preconditions:** `test-new@skrammm.local` (unclaimed) on medical settings page.

**Steps:**
1. Navigate to `/player/settings/medical`

**Expected:** "Claim your player profile first" message (or equivalent) is shown. The medical form fields are absent or disabled.

---

### TC-PLY-27 | happy | Fill medical form → persists on revisit

**Preconditions:** Claimed player, no existing medical profile.

**Steps:**
1. Navigate to `/player/settings/medical`
2. Select Fitness Status "Fit"
3. Enter Blood Type "O+"
4. Enter Allergies "Penicillin"
5. Enter Emergency Contact Name "Siti Ahmad"
6. Enter Emergency Contact Phone "+60123456789"
7. Click "Save Medical Info"

**Expected:** Success indication (toast or redirect). Revisiting `/player/settings/medical` shows all entered values pre-populated.

---

### TC-PLY-28 | happy | Update existing medical info → changes persist

**Preconditions:** Medical profile already exists from TC-PLY-27.

**Steps:**
1. Navigate to `/player/settings/medical`
2. Change Fitness Status from "Fit" to "Doubtful"
3. Click "Save Medical Info"

**Expected:** Success. Revisiting shows "Doubtful" as the selected status. Other fields remain unchanged.

---

### TC-PLY-29 | negative | Medical form — save without fitness status

**Preconditions:** Claimed player on `/player/settings/medical`.

**Steps:**
1. Leave Fitness Status unselected (blank / default option)
2. Fill other fields
3. Click "Save Medical Info"

**Expected:** Validation error "Fitness status is required" (or equivalent). Medical profile is not saved.

---

### TC-PLY-30 | happy | Settings page shows non-editable email

**Preconditions:** Any authenticated user.

**Steps:**
1. Navigate to `/player/settings`

**Expected:** The user's email address is displayed but is NOT an editable field (read-only or plain text). No email change UI exists.

---

### TC-PLY-31 | happy | "Switch to Manager Mode" visible for managers

**Preconditions:** User is both a player and a team manager.

**Steps:**
1. Navigate to `/player/settings`

**Expected:** "Switch to Manager Mode" button (or equivalent) is visible in the settings page.

---

### TC-PLY-32 | happy | Sign out from player portal

**Preconditions:** Active player session.

**Steps:**
1. Navigate to `/player/settings`
2. Click "Sign Out" button

**Expected:** Redirected to `/login`. Session cookie is cleared. Navigating to `/player` redirects back to `/login`.

---

### TC-PLY-33 | happy | Switch player → manager → team data loads

**Preconditions:** User is both player and manager.

**Steps:**
1. Navigate to `/player` (or `/player/teams`)
2. Click "Switch to Manager Mode"

**Expected:** Navigates to `/tm`. TM dashboard loads showing the user's managed team.

---

### TC-PLY-34 | happy | Switch manager → player → player data loads

**Preconditions:** User is at `/tm` as a manager-player.

**Steps:**
1. In TM portal sidebar or settings, click "Switch to Player Mode"

**Expected:** Navigates to `/player`. Player dashboard loads with the user's player data (stats, reliability score).

---

### TC-PLY-35 | negative | Player-only user accessing TM portal

**Preconditions:** User has a player account but has NEVER created a team (no manager role).

**Steps:**
1. Navigate directly to `/tm`

**Expected:** User either sees the "Create a Club" CTA (allowed to access TM to create a team) OR is redirected. The user should NOT see another user's team data. No authorization error should crash the app.

---

### TC-PLY-36 | negative | Player accessing organizer portal

**Preconditions:** Active player-only session.

**Steps:**
1. Navigate directly to `/organizer`

**Expected:** Redirect to `/login/organizer`. No organizer data is exposed.

---

## Section 5 — Public Spectator (TC-SPEC)

### TC-SPEC-01 | happy | Valid tournament code — loads without auth

**Preconditions:** An active tournament with code "KLS26" exists with at least one approved team.

**Steps:**
1. In a fresh browser context (no session), navigate to `/{tournamentCode}` (e.g. `/KLS26`)

**Expected:** Page loads without any login prompt. Tournament header is visible (name, status badge). No authentication error.

---

### TC-SPEC-02 | happy | Live matches — Live section with gold-bordered cards and pulsing badge

**Preconditions:** Tournament "KLS26" has at least one match with status "live".

**Steps:**
1. Navigate to `/KLS26` without authentication

**Expected:** A "LIVE" section is present. Each live match card has a 2px gold border. A pulsing red "LIVE" badge is shown. Current scores are displayed.

---

### TC-SPEC-03 | happy | No live matches → NextUpBanner shown

**Preconditions:** Tournament has no live matches; has at least one upcoming match.

**Steps:**
1. Navigate to the tournament code page

**Expected:** No "LIVE" section. An amber "Next Up" banner is shown with the earliest upcoming match (teams and scheduled time).

---

### TC-SPEC-04 | happy | Festival/Tiered format → group standings tables

**Preconditions:** Tournament format is "festival" or "tiered"; has completed matches.

**Steps:**
1. Navigate to the tournament code page

**Expected:** Group standings tables are visible, one per group (A, B, etc.). Each row shows: team name, P, W, L, PTS. Top 2 rows are highlighted (gold left border or similar).

---

### TC-SPEC-05 | happy | Elimination format → fixtures grouped by round

**Preconditions:** Tournament format is "elimination"; has matches with group labels QF/SF/Final.

**Steps:**
1. Navigate to the tournament code page

**Expected:** No group standings table. Matches are shown grouped by round label: "Quarter-Final", "Semi-Final", "Final", "3rd Place Playoff".

---

### TC-SPEC-06 | happy | Completed tournament → Champion Banner

**Preconditions:** Tournament status is "completed"; a winner has been determined.

**Steps:**
1. Navigate to a completed tournament's code page

**Expected:** A "ChampionBanner" is shown: "🏆 [Team Name] — Champions". Results section shows all match results. Upcoming section is absent.

---

### TC-SPEC-07 | empty | No fixtures scheduled

**Preconditions:** Tournament exists and is approved, but no matches have been created in the schedule.

**Steps:**
1. Navigate to the tournament code page

**Expected:** "Schedule not published yet" (or equivalent) message shown. Live, Upcoming, and Results sections are absent or show the empty state.

---

### TC-SPEC-08 | negative | Unknown tournament code → 404

**Preconditions:** No tournament with code "BADCODE" exists.

**Steps:**
1. Navigate to `/BADCODE`

**Expected:** 404 page is returned. No tournament data is shown.

---

### TC-SPEC-09 | negative | Draft/non-public tournament → 404

**Preconditions:** Tournament exists in "draft" status (not yet launched/live/completed).

**Steps:**
1. Navigate to the tournament code page

**Expected:** 404 page (or equivalent "not found" response). Draft tournaments are not publicly accessible.

---

### TC-SPEC-10 | negative | Unapproved teams not visible in public view

**Preconditions:** Tournament has both approved and pending-approval teams.

**Steps:**
1. Navigate to the tournament code page

**Expected:** Only approved teams appear in standings, rosters, and fixtures. Pending/rejected teams are NOT listed anywhere on the public page.

---

### TC-SPEC-11 | happy | Match card tap → detail overlay opens

**Preconditions:** At least one match (upcoming, live, or completed) is shown on the spectator page.

**Steps:**
1. Navigate to the tournament code page
2. Tap/click on any match card

**Expected:** A full-screen or slide-up overlay opens showing the match detail: teams, score (if applicable), and event log (for live/completed matches). Overlay closes on dismiss/back.

---

### TC-SPEC-12 | happy | Public page does not expose PII

**Preconditions:** The public spectator page is loaded for a tournament with real player data.

**Steps:**
1. Navigate to the tournament code page
2. Open browser DevTools → Network tab
3. Inspect all API/data responses visible on the page

**Expected:** No date of birth, email address, IC/passport number, phone number, emergency contact, blood type, or guardian information appears anywhere on the page or in the network responses. Only: full name (for match events), team name, match scores, match status, tournament metadata.

---

## Appendix — Test Case Summary

| Portal | Total | Happy | Empty | Negative |
|--------|-------|-------|-------|---------|
| Auth | 10 | 5 | 0 | 5 |
| Organizer | 28 | 20 | 3 | 5 |
| Team Manager | 34 | 19 | 5 | 10 |
| Player | 36 | 22 | 8 | 6 |
| Spectator | 12 | 7 | 1 | 4 |
| **Total** | **120** | **73** | **17** | **30** |

---

*Test Script v1.0 — Aligned with MVP PRD v1.4. Enforced via `src/tests/e2e/` Playwright scaffolding.*
