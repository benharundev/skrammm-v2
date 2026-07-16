# Organizer Portal — Product Requirements Document

**Version:** 1.0  
**Date:** July 2026  
**Phase:** Alpha  
**Audience:** Product, design, organizer-facing stakeholders

---

## 1. Portal Overview

The Organizer Portal is the administrative and operational heart of Skrammm. It is where a tournament is created, configured, run, and concluded. Organizers are tournament directors, rugby association officials, or senior club administrators who are responsible for the success of a competition — from the first team registration to the final whistle.

What makes the organizer portal uniquely complex is its position in the data hierarchy: it is the source of truth for the entire platform. Everything downstream — a player's try count, their RRS score, a TM's squad performance view, the spectator's live score feed — originates from events that an organizer records in the match center. This means errors in the organizer portal propagate everywhere, and the quality of the match center's UX directly affects the data quality of every other portal.

The portal is accessed at `app.skrammm.com/organizer/*`. It uses a separate authentication session from the player and TM portals, enforcing a clean trust boundary between tournament operators and participants. An organizer logs in with their email OTP and receives a `skrammm.org_session_token` cookie that is independent of any player or TM account they may also have.

---

## 2. Current Phase: Alpha

The organizer portal has passed its MVP milestone. All core scoring, SSE streaming, team management, and tournament lifecycle flows are implemented and backed by real database operations. There are no mock data fallbacks in the production code paths.

"Alpha" for the organizer portal means: the MVP features are battle-tested and reliable, but several important capabilities are present in the UI as non-functional shells or local-state-only interactions. Specifically, the settings page does not persist anything to the database, the groups editor's save button has no server action behind it, and the knockout bracket shows TBD for everything above the quarter-finals even when QF results are locked.

The goal of the Alpha phase is to close these gaps: make every "Save" button in the product actually save, complete the knockout bracket flow, and add the billing integration that converts the platform from a free tool into a sustainable business.

---

## 3. MVP Features — Complete

### 3.1 Dashboard

The dashboard is the organizer's first screen after login. It gives an immediate operational picture of the tournament: how many teams are registered, how many are pending approval, how many matches are scheduled today, and how many are complete. A live match alert banner appears at the top when any match is currently in the `live` status, with a direct link to the match center.

Today's fixtures are shown in a table with Start and Manage buttons per match. Pending team approval cards are shown in a dedicated section so the organizer can approve or reject without navigating away. The group-labelled team overview at the bottom gives a quick count of teams per group.

All data on the dashboard is fetched from the database via `getOrganizerWithTeams` and `getMatchesByTournament`. There is no mock data on this page.

**Acceptance criteria**: Dashboard loads in under 2 seconds. Live match banner appears for any match with `status = "live"`. KPI cards show accurate counts from DB. Approve and reject buttons on the pending queue call the server actions and update the UI optimistically.

### 3.2 Schedule

The schedule page lists all matches in the tournament, filterable by status (All/Live/Upcoming/Completed) and group. Each match row is inline-editable: the organizer can change the referee name, venue, and scheduled time directly in the table without navigating to a separate edit page.

The page uses a save/discard pattern with per-row and bulk options. Unsaved changes are tracked in client state and a banner appears offering "Save All" and "Discard All" when changes are pending. The Start button on a scheduled match triggers a phase transition to `live` via the `transitionMatchPhase` service.

Edits are persisted via the `saveMatchMetadataAction` server action, which calls `updateMatchMetadata` in the match module.

**Acceptance criteria**: Inline edits persist to DB on save. Unsaved changes banner appears on any modification. Discard reverts to last-saved state. Start button is only active for matches with `status = "scheduled"` and navigates to the match center on success.

### 3.3 Match Center

The match center is the most complex and most important page in the product. It is the live scoring interface that an organizer operates throughout a match, and every action here has real-time downstream consequences.

**Scoring**: Try (5 pts), Conversion (2 pts), Penalty (3 pts), and Drop Goal (3 pts) are the four point-scoring events. Each requires selecting a team (Home/Away) and optionally selecting the scoring player from a dropdown populated from the loaded roster. An undo window of 8 seconds appears after each event; if the organizer does not undo within 8 seconds, the event becomes permanent (though it can still be soft-deleted by the delete icon in the event log before the match is locked).

**Cards**: Yellow Card and Red Card are recorded the same way as scoring events. Cards are zero-point events but they trigger immediate RRS recalculation for the carded player (fire-and-forget, does not block the match center).

**Performance stats**: 23 stat types across 5 logical groups are tracked alongside the score. Possession and territory are tracked separately by half. Metres run has dedicated +5m and +10m increment buttons. All stats fire to the same `/api/organizer/match/[matchId]/event` endpoint as scoring events, using the extended `MatchEventType` enum.

**Phase state machine**: Matches move through states: `pre_match → first_half → halftime → second_half → completed → locked`. The organizer controls these transitions via the phase buttons. The clock tracks `startedAt` for the first half and `secondHalfStartedAt` for the second half. Pause controls (Water Break, Team Timeout, Suspend) accumulate time in `totalPausedMs` so the live clock remains accurate. The Suspend action requires confirmation. The Lock Result action requires confirmation and is irreversible — once locked, no further events can be added or deleted.

**Optimistic UI**: All score events update the scoreboard immediately in the client before the server responds. If the server returns an error, the optimistic update is rolled back.

**Acceptance criteria**: All event types POST to `/api/organizer/match/[matchId]/event` and are reflected in the event log. Score totals match the sum of point events in the log. Phase transitions match the defined state machine (no invalid transitions). Lock button disabled until `status = "completed"`. After lock, event log is read-only and scoring buttons are disabled.

### 3.4 Commentator View

The commentator view at `/organizer/match/[matchId]/commentator` is a read-only broadcast screen designed for a second monitor, stadium display, or media operations room. It opens in a new tab and connects to the SSE stream at `/api/stream/[matchId]` immediately on load.

The layout is three columns: home team lineup on the left, stats centre in the middle, and away team lineup with player spotlight on the right. The lineup panels show each player's jersey number, name, position, running point total, try count badges, and card indicators. The top scorer has a star highlight.

The stats centre shows the scoring breakdown (tries/conversions/penalties/drop goals per team) and the full performance stats table for any stat type that has been recorded. The player spotlight section shows the top scorer, top try scorer, all scorers ranked by points, and all cards issued.

A live connectivity badge in the header shows whether the SSE connection is active. On reconnection after a disconnect, the page fetches the full current state from the API before resuming the event stream.

All stats are computed client-side by the `computeLiveStats` utility, which is fully unit-tested. This means the commentator view is never out of sync with the event log — it derives its numbers from the same raw events that populate the match center's event log.

**Acceptance criteria**: Commentary view connects to SSE within 2 seconds of page load. All three event types (score, phase_change, event_deleted) update the view in real time. `computeLiveStats` is the exclusive source of all displayed statistics. View is read-only — no interactive controls.

### 3.5 Video Analyst Mode

The match center includes a togglable **Analyst Mode** designed for a performance analyst who is simultaneously operating the live scoring and tagging spatial match events. Pressing the `ANALYST` button in the header switches the page into analyst mode without leaving the match center — all existing scoring buttons, phase controls, and the event log remain fully accessible below.

**YouTube video embed**: The analyst pastes a YouTube URL (live stream or recording) directly into the analyst panel. The URL is saved to `Match.videoUrl` and persists across page reloads. The video is embedded via the YouTube IFrame API (`?enablejsapi=1`) so that video timestamps can be captured programmatically.

**Interactive rugby pitch**: A top-down SVG pitch rendered below the video shows standard World Rugby markings: try lines, 22m lines, halfway line, and 10m dashed lines. Zone labels (Own 22, Own Half, Opp Half, Opp 22) provide spatial context. The pitch becomes an interactive click surface when an action is active: the cursor changes to a crosshair and a badge shows the pending action label and keyboard shortcut.

**Keyboard-first tagging workflow**:
1. Press `[` to set **Home** as the active team, or `]` for **Away** — a badge in the panel header shows which team is active.
2. Press a keyboard shortcut to select the action type. All 29 event types are mapped:

| Key | Action | Key | Action | Key | Action |
|-----|--------|-----|--------|-----|--------|
| `T` | Try +5 | `K` | Kicks from Hand | `W` | Rucks Won |
| `C` | Conversion +2 | `A` | Passes | `L` | Rucks Lost |
| `P` | Penalty +3 | `N` | Runs | `J` | Mauls Won |
| `D` | Drop Goal +3 | `M` | Metres Run | `H` | Mauls Lost |
| `Y` | Yellow Card | `Q` | Possession Phase | `1` | Scrums Won |
| `R` | Red Card | `G` | Territory Phase | `2` | Scrums Lost |
| `E` | Tackles Made | `B` | Clean Breaks | `3` | Lineouts Won |
| `X` | Tackles Missed | `V` | Defenders Beaten | `4` | Lineouts Lost |
| `U` | Turnovers Conceded | `O` | Offloads | `S` | Penalties Conceded |
| | | | | `F` | Forward Pass |
| | | | | `Z` | Knock On |

Keyboard shortcuts are only active when Analyst Mode is ON and the match is live — they do not interfere with normal page interactions.

3. Click the pitch → spatial coordinates `(pitchX, pitchY)` (0–100 normalised) and the current video timestamp in milliseconds are captured automatically.
4. For scoring events (Try, Conversion, Penalty, Drop Goal, Cards): the existing player confirmation modal opens; on confirm, the event is recorded with pitch and video data in `MatchEvent.payload`.
5. For performance stats: the stat is incremented immediately (same as the existing stat buttons) with pitch and video data in `payload`.
6. Press `ESC` at any time to cancel the pending action without recording anything.

**Shortcut reference panel**: A compact keyboard reference panel sits to the right of the pitch SVG showing all 29 shortcuts grouped by category. The active action highlights in the panel. This lets the analyst learn the shortcuts progressively during matches.

**Tagged events log**: All events tagged via pitch click appear in a reverse-chronological log at the bottom of the analyst panel. Each entry shows the video timestamp as a clickable `▶ MM:SS` button — clicking it seeks the YouTube player to that moment for instant video review. Coordinates are shown as a small `⊙ x,y` indicator.

**No impact on downstream systems**: `MatchEvent.payload` is already a `Json?` field. The spatial and video fields are additive — all existing consumers (commentator view, match report, RRS, SSE bus) ignore unknown payload fields and continue to work correctly.

**Acceptance criteria**: Analyst Mode toggle appears in the match center header and is visually distinct when active. Keyboard shortcuts `[`, `]`, and all 29 action keys activate correctly when Analyst Mode is ON. ESC cancels the pending action. Pitch click during an active scoring action opens the existing player confirmation modal with pitch data included in the resulting event payload. Pitch click during a stat action increments the stat and adds a tagged event row. Clicking a tagged event timestamp seeks the YouTube player to that position. Video URL input saves to `Match.videoUrl` and reloads on next page visit. All existing match center features (scoring, stats, phase controls, undo) remain fully functional with Analyst Mode both ON and OFF.

### 3.7 Match Report

The match report at `/organizer/match/[matchId]/report` is a static, printable view of a completed or in-progress match. It shows the full scoring breakdown with a totals row, scorers by player with a per-event breakdown, and the complete performance stats in multiple display modes.

The stat display modes are: pair (rucks, mauls, scrums, lineouts shown as won/total/%), ratio (tackles shown as made/missed + success rate), possession (shown as percentage by half), metres (shown as sum), and simple count (all other stats).

A "Manage Live" shortcut button appears when the match is not yet locked, providing a quick navigation path back to the match center.

**Acceptance criteria**: All stats from the event log are reflected accurately in the report. Display mode switching is client-side with no re-fetch. Stat totals match the sum of individual player event counts.

### 3.8 Teams Management

The teams page has three tabs: Pending Approval, Approved Teams, and Groups.

The Pending Approval tab shows team registration cards with the manager's contact details and the pending player count. Each card has Approve and Reject buttons. Approving or rejecting a team triggers the `approveTeamAction` or `rejectTeamAction` server actions, which verify the user's permission before writing. The UI updates optimistically and rolls back on error.

The Approved Teams tab shows a sortable table of all approved teams. Clicking a row navigates to the team detail page, which shows the team's full registration details (manager, email, origin, roster count, joined date) and a paginated player roster.

The Groups tab contains the drag-and-drop groups editor (see Alpha backlog for its current limitation).

**Acceptance criteria**: Approve/reject actions persist to DB via `approveTournamentTeam`. Team detail page loads full roster paginated at 10 per page. Approved tab table is sortable by team name and roster count.

### 3.9 Standings

The standings page toggles between Group Stage and Knockout views.

The Group Stage view shows tournament summary stats (top scorer, top try scorer, card totals) computed from locked matches. Each group has its own tab with a full standings table: Played, Won, Drawn, Lost, Points For, Points Against, Points Difference, and Points. Standings are computed by `computeStandings` in the match module using the standard rugby points system: win = 3, draw = 1, loss = 0.

The Knockout view shows bracket cards for each round: QF, SF, Final, and 3rd Place. Quarter-final cards read real match data where matches exist with `round = "QF1"` through `"QF4"`. Semi-final and Final cards currently always show TBD — this is a known Alpha backlog item.

**Acceptance criteria**: Group stage tables are accurate against locked match results. Points difference is correctly computed as PF − PA. QF bracket cards show real team names and scores for locked QF matches.

### 3.10 Tournament Setup Wizard

The setup wizard at `/organizer/settings/setup` guides a new organizer through tournament creation in four steps.

Step 1 captures the tournament name, dates, venue, and access code (auto-generated from the name but editable). Step 2 asks for the team count via quick-pick options (8, 10, 12, 16, 20, 24, 32) or a custom entry, with a real-time preview of the implied tournament format. Step 3 shows the recommended format (Festival for ≤12 teams, Tiered for 13–24, Elimination for 25+) derived automatically from the team count. Step 4 shows a review summary and a Launch Tournament button.

The "Launch Tournament" button fires `launchTournamentAction`, which calls `createTournament` in the tournament module and redirects to `/organizer` on success. This is a real DB write — a tournament record is created with `status = "draft"`.

**Acceptance criteria**: All four steps are navigable forward and backward. Auto-generated code is derived from the tournament name. Launch button creates a real `Tournament` row. On success, user is redirected to the dashboard which shows the new tournament's data.

### 3.11 Users Management

The users page at `/organizer/users` provides a workaround for AWS SES sandbox restrictions during early deployment. It allows an organizer to create a new user account (team manager or organizer) directly, generating and displaying a 6-digit OTP that can be relayed manually — for example, via WhatsApp — so the new user can log in without receiving an email.

The page also supports tournament ownership transfer: when creating a user, the organizer can optionally reassign the current tournament's `organizerUserId` to the new user.

**Acceptance criteria**: Creating a user inserts a `User` row and a `Verification` row with a 6-digit OTP. OTP is displayed with a copy button and a refresh button. Tournament transfer updates the `Tournament.organizerUserId` if selected.

---

## 4. Alpha Backlog

The following features are present in the UI but are not yet backed by server actions or database writes. Completing them is the definition of Alpha completion for the organizer portal.

### 4.1 Settings Persistence

**User story**: As an organizer, I can save all tournament configuration settings so that my changes persist across browser sessions and are visible to all staff members with access to the tournament.

**Current state**: The settings page (`/organizer/settings`) has six configurable sections: Tournament Info (name, dates, venue, code), Format & Rules (half duration, bonus try threshold, tie-break order), Pitches (list of venue names), Visibility (toggles for spectator page, join link, live scores), Organizer Profile, and Manage Users. Every section has a Save button. However, `handleSave` in the component only triggers a brief success flash via `setTimeout` — no server action is called, no data is written to the DB.

**Acceptance criteria**:
- Tournament Info: saving writes to `Tournament.name`, `Tournament.startsAt`, `Tournament.endsAt`, `Tournament.slug`, and the new `code` field via `updateTournamentSettings`.
- Format & Rules: saving writes to `Tournament.branding` (JSON field) with format settings.
- Visibility: saving writes the public/join/live-scores visibility toggles to the `Tournament.branding` field.
- Pitches: saving updates a `pitches` array in `Tournament.branding`.
- All saves call `revalidatePath("/organizer/settings")` and display a success confirmation.

### 4.2 Groups Editor Save

**User story**: As an organizer, I can drag teams into groups and save those assignments so that the schedule and standings reflect the correct group structure.

**Current state**: The drag-and-drop groups editor in the Teams → Groups tab is fully functional in the browser. Teams can be moved between groups, groups can be renamed, and new groups can be added. However, the "Save" button calls `saveChanges`, which only updates local React state. On page refresh, all group assignments revert to their last-persisted values.

**Acceptance criteria**:
- "Save" button calls a new `saveGroupAssignmentsAction` server action.
- Server action updates `TournamentTeam.groupLabel` for all affected teams in a single Prisma transaction.
- Schedule and standings pages reflect the updated group labels immediately after save.
- "Discard" reverts the editor to the last-persisted state fetched from the DB.

### 4.3 Knockout Bracket Auto-Generation

**User story**: As an organizer, I can see the knockout bracket automatically populated with the correct team pairings after quarter-final results are locked, so I don't have to manually input SF and Final matchups.

**Current state**: The knockout bracket view shows real team names and scores for QF matches (matches where `round` starts with "QF"). SF, Final, and 3rd Place bracket cards always show "TBD" because no logic exists to seed winners from QF results into the next round.

**Acceptance criteria**:
- When all QF matches have `status = "locked"`, SF bracket cards show the winners of QF1 vs QF2 and QF3 vs QF4.
- When all SF matches are locked, the Final card shows the winners and the 3rd Place card shows the losers.
- The bracket view correctly handles walkovers (a team that wins by default when the opponent withdraws).
- Bracket seeding uses match `round` labels: `QF1, QF2, QF3, QF4 → SF1, SF2 → Final, 3rd`.

### 4.4 Billing and Plan Upgrade

**User story**: As an organizer, I can upgrade my tournament to the Pro plan via a Billplz payment so that I can unlock features available only on paid tiers.

**Current state**: The Billing section of the settings page shows a "Free Plan" badge with a usage bar and an "Upgrade to Pro" button. This button does nothing. The `Payment` model, `createPayment`, and `handleBillplzWebhook` are already scaffolded in `modules/payment/service.ts`. `PAYMENTS_ENABLED` is a flag that can be toggled to activate the flow.

**Acceptance criteria**:
- "Upgrade to Pro" button navigates to a Billplz checkout page pre-filled with the tournament's billing details.
- On successful payment, the Billplz webhook at `/api/webhooks/billplz` calls `handleBillplzWebhook`, creates a `Payment` row with `status = "paid"`, and activates Pro features on the tournament.
- The Billing section of settings shows the current plan and payment history.
- `verifyBillplzSignature` is used to validate all incoming webhook payloads before processing.

### 4.5 Team Join Wizard (Spectator Portal)

**User story**: As a team manager, I can navigate to the public tournament page and register my team without being contacted by the organizer first, so that tournament participation has zero-friction onboarding.

**Current state**: The join wizard at `skrammm.com/[tournamentCode]/join` has a three-step UI shell (Team Details → Squad → Review & Submit) but it is not connected to any server actions. The tournament code is hardcoded in the component to `"klsevens25"` (a development placeholder). Submitting the form does nothing.

**Acceptance criteria**:
- The `[tournamentCode]` path param drives the wizard. An invalid or closed tournament shows an appropriate error message.
- Step 1 collects team name, short name, origin, manager name, and manager email.
- Step 2 collects player roster (minimum 7, maximum 15 players, each with jersey number and position).
- Submitting the wizard calls a `registerTeamAction` server action that calls `joinTournamentByCode` and creates a `TournamentTeam` with `status = "pending_approval"`.
- The new team appears in the organizer's Pending Approval queue immediately.
- A confirmation screen is shown to the manager after successful submission.

### 4.6 Match Lineup Management

**User story**: As an organizer, I can set the lineup (15 starters and up to 8 substitutes) for each team before a match kicks off, so that the commentator view shows accurate player jersey numbers and names, and post-match player stats are attributed correctly.

**Current state**: The `MatchLineup` model exists in the schema and `saveMatchLineup` is already implemented and exported from the match module. The TM portal has a lineup setter at `/tm/lineups`. There is no organizer-facing UI to view or set lineups.

**Acceptance criteria**:
- A Lineup tab or section appears in the Match Center before the match enters `first_half` status.
- The organizer can see the lineup submitted by each team's TM (if set) or set it manually from the approved squad.
- Each player can be designated as a starter (1–15) or bench (16–23) with a jersey number.
- The saved lineup data is consumed by the commentator view for the player spotlight and lineup panels.

### 4.7 Attendance Summary View

**User story**: As an organizer, I can see a check-in summary for each match showing which players have scanned in, who is absent, and who arrived late, so I have an accurate attendance record for the day.

**Current state**: The attendance module has a fully implemented `getAttendanceForMatch` function that returns scan records with player names, arrival times, and late minutes. No organizer page calls this function.

**Acceptance criteria**:
- A check-in summary is accessible from the match detail view (either as a tab or a linked page).
- The summary shows three lists: Checked In (with scan time), Late (with minutes late), and Not Checked In.
- The summary updates in real time or on refresh as players scan in.
- The organizer can see whether a player's check-in was a QR scan or a manual override by the TM.

---

## 5. Post-Alpha Backlog

The following features are outside the Alpha scope but are on the confirmed product roadmap.

**Medical and Injury Dashboard**: The `PlayerMedicalProfile` and `MatchInjuryReport` models are fully defined. A post-Alpha organizer page will allow physiotherapists and tournament medical officers to view player fitness statuses and log injury reports from the sideline during a match.

**Sponsor Management**: The `Sponsor` model (name, logo, tier, impressions, clicks) is defined. A post-Alpha section of the tournament settings will allow organizers to add sponsors and control how they appear on the public tournament page.

**Video URL per Match**: The `Match` model has a `videoUrl` field. The Video Analyst Mode (§3.5) uses this field to persist the YouTube embed URL per match. A future enhancement will also surface this URL as a "Watch Replay" link on the match report and spectator page.

**In-App Notifications**: Organizers will receive in-app alerts when a team submits a join request, when a payment is confirmed, and when a match is about to start without a lineup set. This requires the notification infrastructure described in the Master Technical PRD.

**Multi-Tournament Dashboard**: A post-GA feature for associations managing multiple tournaments in a season. The current data model (one `Tournament` per organizer account) already supports multiple tournaments per organizer — the UI just needs a tournament switcher and an aggregated analytics view.

---

## 6. Non-Goals for Alpha

The organizer portal will not pursue the following in the Alpha phase:

**Video streaming**: Skrammm stores a URL and embeds external video via YouTube's IFrame API — it does not host, transcode, or stream video. Native video storage or a proprietary streaming pipeline is not in scope.

**National federation export**: Data export to World Rugby or national union systems is a Phase 3 initiative and requires formal integration agreements.

**Multi-organizer collaboration**: The current model is one primary organizer per tournament. Co-organizer or sub-admin access requires a more complex permission model that is deferred to Phase 2.

**Mobile-native application**: The organizer portal is web-first and is designed to work well on a tablet or laptop. A native iOS or Android app is not in the Alpha scope.
