# Skrammm — MVP PRD (v1.4)

> Companion to **Skrammm Master PRD v4.1** (vision) and **Skrammm Technical PRD v2.2** (engineering).
> Scope: one-week UAT across all four portals → end-July Alpha. Format: Problem Statement, User Stories, Technical Constraints, Success Metrics.

| Field | Value |
|---|---|
| Document | Skrammm MVP PRD v1.4 |
| Companion docs | Master PRD v4.1 (vision), Tech PRD v2.2 (engineering) |
| Owner | Product Management |
| UAT target | Within one week — Organizer, Team Manager, Player, Public portals |
| Alpha target | End July — 1 real tournament event, run as 2 tournaments (2 categories × 24 teams), ~720 players |
| Commercial model | Free for UAT and Alpha. Paid tiers deferred (see Open Questions) |

---

## 1. Problem Statement

Rugby tournaments in Malaysia are run on a patchwork of spreadsheets, WhatsApp groups, and paper. Scores are relayed by word of mouth, attendance is unverifiable, player records live nowhere durable, and spectators have no single place to follow a live event. There is no tool that ties organizers, team managers, players, and the public into one trustworthy, betting-free system.

Skrammm exists to be that system. This MVP PRD defines the smallest version that is genuinely usable end-to-end by all four audiences, validated first through a one-week UAT and then proven under real load at an end-of-July Alpha tournament.

### 1.1 What this MVP must prove
- A single tournament can be created, run live, scored in real time, and viewed by the public with sub-second-feel updates.
- One identity, one login (email OTP) covers a person whether they act as a player, a team manager, or both — without separate accounts.
- Player attendance can be verified at the pitch via rotating QR, and a player's reliability can be computed and shown transparently.
- Medical safety information is captured and visible to the right people, and only the right people.

### 1.2 Feedback that reshaped this MVP
Recent user sessions produced four concrete changes that alter the user flows from the original PRDs:
1. Players want a player portal to monitor their own progress (confirms existing scope).
2. A player must be able to create a team and thereby become a manager — managers are not a separate signup.
3. Organizers must be able to record the referee's name so it appears in match reports.
4. Organizers must be able to add medical reports so injured players are closely monitored. High-importance; mandatory for MVP.

> **DECISION REVERSAL —** These changes overturn three previously-locked decisions: auth moves from Google-OAuth-only to email OTP; pricing changes from "RM200 base + RM10/team" to a new tier table (§7); and medical data — absent from both prior PRDs — is now in scope. All three are logged for the Master and Tech PRD changelogs.

---

## 2. Goals & Scope

### 2.1 In scope for UAT (all four portals)

| Portal | MVP capability |
|---|---|
| Public / Spectator | Tournament code page: standings, fixtures, live scoreboard (SSE), team rosters, top scorers. No login. |
| Player (Skrammm-P) | Register via email OTP, onboarding, view own stats & reliability score, own medical profile + emergency contact, rotating QR identity, performance card share. |
| Team Manager (Skrammm-M) | Self-service create team (player→manager), manage squad, add/remove players, match-day QR scanner, view own team health/medical status, manual attendance override. |
| Organizer (Skrammm-O) | Create tournament(s), 4-step setup, fixtures, live Scoreboard Controller, add referee name, add match injury report, suspend/lock match. |

### 2.2 Release bands used in this PRD
- **UAT-MUST** — required for the one-week UAT across the four portals. Cutting it blocks UAT.
- **UAT-STRETCH** — built only if the week allows; cutting it does not block UAT.
- **Alpha** — not needed for the UAT week, but required for the end-July Alpha. Distinct from "never" — tracked and scheduled, just after UAT.

### 2.3 Genuinely out of scope (not even Alpha)
Captured in the Master PRD "Future / Post-MVP" section, not built for UAT or the Alpha:
- Tournament Marketplace; Player Transfer (PRO); Scouting (PRO)
- Skrammm-P Plus (activity logs, fitness tracker, AI personal trainer)
- Participation Certificates; XML/CSV bulk upload of match stats
- SSM / org-registry integration; Match/tournament detail statistics (PRO)
- Push notifications; Native mobile apps; Multi-language UI; Self-hosted video

### 2.4 Non-goals (deliberately not solving yet)
- Offline-first manager scanner (connectivity assumed pitch-side; player QR is the only offline-tolerant surface).
- Combined cross-category organizer dashboard — the Alpha's two categories are managed as two independent tournaments (see Open Questions).
- Refund UI, automated reconciliation beyond the webhook cron, and any paid-tier flow (everything is free for UAT + Alpha).

---

## 2A. Sitemap Coverage

Every node from the portal sitemaps and the public/marketing (Home) sitemap, mapped to a release band. This is the explicit record of whether the sitemaps fit the MVP. Two confirmed structural decisions are baked in: (1) registration uses two separate front-door links — one for Organizer, one for Player/Team — but a single email-OTP identity system underneath, with "manager" remaining a role gained after registration by creating a team (never a signup type); (2) the entire public/marketing site is an Alpha-band deliverable, not required for the UAT week.

### 2A.1 Portal nodes

| Sitemap node | Band | Notes |
|---|---|---|
| Player: register (OTP) → onboarding → profile | UAT-MUST | Player/Team front-door link. ID-1, ID-2. |
| Player: home, stats, reliability score | UAT-MUST | P-1. |
| Player: medical profile + emergency contact | UAT-MUST | P-2. Player-owned. §5. |
| Player: QR identity | UAT-MUST | P-3. |
| Player: performance card share | UAT-STRETCH | P-4. First to cut. |
| Player: Skrammm-P Plus (logs/fitness/AI) | Out of scope | §2.3. |
| Manager: create team (player→manager) | UAT-MUST | ID-3. |
| Manager: manage players (add/remove) | UAT-MUST | M-1. |
| Manager: match-day QR scanner + override | UAT-MUST | M-2, M-3. |
| Manager: team health/medical view | UAT-MUST | M-4. View-only. §5. |
| Manager: join tournament via code/link | UAT-MUST | M-5. |
| Manager: transfer / scouting (PRO) | Out of scope | §2.3. |
| Organizer: register (OTP) | UAT-MUST | Separate Organizer front-door link. ID-1. |
| Organizer: create tournament + format gate + code/link | UAT-MUST | O-1. |
| Organizer: live controller (scoring, suspend, lock) | UAT-MUST | O-2. |
| Organizer: add referee | UAT-MUST | O-3. §6. |
| Organizer: match injury report | UAT-MUST | O-4. §5. |
| Organizer: approve joined teams (pending queue) | UAT-MUST | O-6. |
| Organizer: fixtures, top scorers, history | UAT-MUST | Part of O-1/O-2 surfaces. |
| Organizer: export PDF / certificates | Out of scope | §2.3. |
| Organizer: billing / SSM / manage users | Alpha | Free for UAT+Alpha; billing surfaces later. |
| Spectator: tournament code page (live) | UAT-MUST | S-1. Approved teams only. |
| Chat (player/manager/admin) | Out of scope | §2.3. |

### 2A.2 Public / marketing (Home) nodes
The entire Home tree is Alpha-band: not built for the UAT week, required before the Alpha when real organizers and teams discover the product.

| Sitemap node | Band | Notes |
|---|---|---|
| Home: role landing pages (Player / Manager / Organizer) | Alpha | Marketing pages. "Manager" landing is informational, not a separate signup. |
| Pricing pages (Player / Manager / Organizer) | Alpha | Marketing shows the plan. Free for UAT+Alpha; see §7. |
| Support: FAQ | Alpha | Marketing/ops surface. |
| Support: Chatbot / Ticket | Alpha | Scope & approach TBD in post-UAT discussion. Not built during UAT week. |
| Support: Feedback | Alpha | Scope & approach TBD post-UAT. Not built during UAT week. |
| News: Articles 1–3 | Alpha | Scope & approach TBD post-UAT. Not built during UAT week. |
| Terms & Condition | UAT-MUST (light) | Legal stub required — medical data is in scope. |
| Privacy Policy | UAT-MUST (light) | Required because medical data is collected. |
| Get Started → Player/Manager Registration | UAT-MUST | Player/Team front-door link. Same OTP identity; manager is a later role. |
| Get Started → Organizer Registration | UAT-MUST | Separate Organizer front-door link. Same OTP identity underneath. |
| Live Tournaments/Matches → Unique Code | UAT-MUST | S-1 entry. The public game-day surface. |

> **COVERAGE VERDICT —** The sitemaps fit the MVP. The four portals map cleanly to UAT-MUST stories. The one structural correction is registration framing: two front-door links (Organizer vs Player/Team), one OTP identity, manager-as-later-role. The public/marketing Home tree is Alpha-band except a light legal stub (T&C + Privacy), pulled forward to UAT because medical data is collected. Support and News are tracked as Alpha with approach deferred to a post-UAT conversation.

### 2A.3 Player & Manager portal nodes (detailed)

**Player portal**

| Sitemap node | Band | Resolution / notes |
|---|---|---|
| Sign Up (OTP) → Onboarding | UAT-MUST | ID-1. |
| Onboarding → fill profile → club code (optional) → create profile | UAT-MUST | Club code now MVP. Self-join → manager approval (P-5 / M-8). |
| Homepage → share player card | UAT-MUST | P-1 surface. |
| Matches / Activities (prev & upcoming) | UAT-MUST | Read surfaces. |
| Team History → list / details / share | UAT-MUST | P-1. |
| Manage club → create team/club | UAT-MUST | ID-3 (player→manager). |
| Individual Detail Stats → share card / QR / Medical Reports | UAT-MUST | QR = P-3. "Medical Reports" = the player's own Medical Profile view (P-2). |
| Settings → Edit Profile / Emergency Contact | UAT-MUST | P-2. |
| Settings → Privacy Policy / Terms | UAT-MUST (light) | Legal stubs. |
| Settings → Billings | Alpha | Free for UAT + Alpha; billing screen later. |
| Chat (tournament/activities) | Out (NEW) | Out of UAT. |
| … "Manager updates lineup for next match" (was under Chat) | UAT-MUST | Pulled OUT of Chat into its own story M-7. Lineup is not chat. |
| Skrammm-P Plus (logs / fitness / AI trainer) | Out (PRO) | §2.3. |

**Manager portal**

| Sitemap node | Band | Resolution / notes |
|---|---|---|
| Create new club/team → fill info | UAT-MUST | ID-3. |
| Homepage → share team card | UAT-MUST | Surface. |
| Matches / Activities (prev & upcoming, share) | UAT-MUST | Read surfaces + team general W/L/T. |
| Match / Tournament detail statistics (PRO) | Out (PRO) | §2.3. |
| Tournament Marketplace (NEW) → Join New Tournament | SPLIT | Marketplace browse = Alpha. Join-by-code = UAT-MUST (M-5). |
| Club/Team → Manage Players (details, recent activity) | UAT-MUST | M-1. |
| … Add/Remove Player | UAT-MUST | M-1. |
| … Generate new ID for non-existing player | UAT-MUST | M-6 — claimable player ID (under-17/no-phone case). |
| … Scan QR / add player ID to add players | UAT-MUST | M-1 / M-6. |
| Team Health Reports | UAT-MUST | M-4 (view team medical/fitness status). |
| Transfer player (PRO) / Scouting (PRO) | Out (PRO) | §2.3. |
| Manager → Statistics / Share Manager Card | UAT-MUST | Manager surface. |
| Manager → Change to Player View | UAT-MUST | ID-4 (role switch, one login). |
| Settings → Manager Info / Club Info | UAT-MUST | Surface. |
| Settings → Add members for club (Coach / S&C / Medical) | Post-Alpha | MVP simplification: the manager IS coach/S&C/medical. §5.2. |
| Settings → Billings | Alpha | Free for UAT + Alpha. |
| Settings → Privacy / Terms | UAT-MUST (light) | Legal stubs. |
| Chat as Admin | Out (NEW) | §2.3. |

> **PLAYER/MANAGER VERDICT —** Fits with three reconciliations: (1) lineup pulled out of Chat into M-7; (2) "Join New Tournament" split — join = MUST, Marketplace = Alpha; (3) Coach/S&C/Medical staff accounts deferred post-Alpha because the manager wears all those hats in MVP. Club-code self-join and manager-created claimable accounts added as MUST (P-5, P-6, M-6, M-8).

### 2A.4 Organizer portal nodes (detailed)

| Sitemap node | Band | Resolution / notes |
|---|---|---|
| Sign Up (OTP) → Onboarding | UAT-MUST | ID-1. Separate Organizer front-door link. |
| Create first tournament → name → number of teams → format gate → share code | UAT-MUST | O-1. Format gate corrected (§2A.5). |
| Homepage → Live Controller / Tournament Link / Overview | UAT-MUST | O-1/O-2 surfaces. |
| Homepage → Team Check In (Scan QR) | UAT-MUST | O-7 — organizer scans TEAMS for team attendance (distinct from manager scanning players). §4.5. |
| Homepage → Next Fixtures / Top Try Scorer / Top Points | UAT-MUST | Read surfaces. |
| Live Controller → Start Game → Insert Data (try, conv, Y/R card, injury) | UAT-MUST | O-2. Injury = O-4 match injury report. |
| … Suspend Game | UAT-MUST | O-2. |
| … Add referee | UAT-MUST | O-3. |
| … Add Medical Personnel | Post-Alpha | No separate medical-staff accounts in MVP (manager wears all hats). |
| Scheduled Game → Insert Exact Start Time | UAT-MUST | Part of fixtures/O-1. |
| Finish Match → Match Final Data | UAT-MUST | O-2 (lock result). |
| Finish Match → Insert Match Detail Statistics → Upload from XML | SPLIT | Manual final data = MUST. XML upload = Out (§2.3). |
| Finish Match → MOTM (insert player / calc from points) | Alpha | Man of the Match deferred to Alpha. |
| Fixtures → See teams (edit / add) | UAT-MUST | O-1. |
| Fixtures → Show Fixtures → Edit / referee / Top scorers | UAT-MUST | O-1/O-3. |
| … Add medical personnel | Post-Alpha | Deferred. |
| … Add Medical Reports | UAT-MUST | O-4 match injury report. |
| … Add match detail statistics → Upload from XML/CSV | Out | Bulk upload out of scope (§2.3). |
| Fixtures → Tournament History | UAT-MUST | Read surface. |
| Settings → Manage Organizer Profile → SSM | Out | §2.3. |
| … Billings | Alpha | Free for UAT + Alpha. |
| … Manage Users (multi-user organizer) | Alpha | Delegated scorekeepers/co-organizers deferred to Alpha. |
| … Privacy / Terms | UAT-MUST (light) | Legal stubs. |
| Settings → Manage Tournament → Create new tournament | UAT-MUST | O-1 / O-5. |
| … Show Previous Tournament → Export Report PDF | Alpha | Wrap-up report; not UAT week. |
| … Generate Participation Certificate (team/players) | Out | §2.3. |

### 2A.5 Tournament format gate (corrected, non-overlapping)
A format gate must be deterministic — one team count maps to exactly one bracket.

| Teams | Format | Structure |
|---|---|---|
| ≤ 8 | Round Robin (Festival) | Single round-robin. Aligns with the free-tier limit. |
| 9 – 16 | Grouping → Quarterfinal → Semifinal | Group stage into knockouts. |
| 17 – 32 | Grouping → Cup / Plate / Bowl / Shield | Group stage into tiered brackets. |

> **ALPHA PLACEMENT —** The 24-team Alpha categories fall unambiguously in the 17–32 band. Boundaries confirmed: ≤8 / 9–16 / 17–32. Corrects the overlap in both the sitemap and prior Master PRD ranges; flagged for the Master PRD changelog.

> **ORGANIZER VERDICT —** Fits the MVP. One real correction (the format gate, now deterministic) and one genuinely new concept: two-level attendance — organizer scans teams, manager scans players. Deferred: medical-personnel accounts, MOTM, multi-user organizer, XML/CSV upload, certificates, PDF report, SSM. None block the UAT week.

---

## 2B. Implementation Status

Current build state of every UAT-MUST story. Status codes: **UI** = screen built, **BE** = backend service wired to real DB, **MOCK** = UI uses hard-coded / mock data, **–** = not started.

| Story | Feature | Status | Notes |
|---|---|---|---|
| ID-1 | Email OTP login (both doors) | UI + BE | Better Auth + AWS SES configured |
| ID-2 | Player baseline role on register | UI + BE | Session-based |
| ID-3 | Player creates team → manager role | UI + BE | `createTeam()` + `team_staff` row |
| ID-4 | Role switch (player ↔ manager) | UI + BE | RoleSwitcher in nav; `getTeamsByManager()` |
| P-1 | Player stats + reliability score | UI + BE | Services exist; score computed from real scans |
| P-2 | Player medical profile | UI + BE | `upsertMedicalProfile()` wired |
| P-3 | Rotating QR identity (60s) | UI + BE | `generatePlayerQrToken()` + `RotatingQr` component |
| P-4 | Performance card share (STRETCH) | UI + MOCK | Satori pipeline exists; share button scaffolded |
| P-5 | Player self-join via club code | UI + BE | `claimPlayer()` wired |
| P-6 | Claim manager-created account | UI + BE | Player ID code + claim flow built |
| M-1 | Manage squad (add/edit/delete) | UI + BE | Server actions wired; `removePlayerFromSquad()` |
| M-2 | Match-day QR scanner | UI + BE | API endpoint + `scanPlayerQr()` wired |
| M-3 | Manual override | UI + BE | `manualOverrideScan()` wired |
| M-4 | View team medical status | UI + MOCK | Read path UI built; real DB read pending |
| M-5 | Join tournament by code | UI + BE | `joinTournamentByCode()` + pending state |
| M-6 | Create claimable player IDs | UI + BE | Auto-generated `playerIdCode` on add |
| M-7 | Set lineup | UI + BE | `saveLineup()` action; `match_lineups` table |
| M-8 | Approve self-joined players | UI + MOCK | UI exists; approval action pending |
| O-1 | Create tournament (wizard) | UI + MOCK | 4-step wizard UI complete; DB write pending |
| O-2 | Live scoreboard (SSE) | UI + MOCK | Controller UI built; SSE + event persistence pending |
| O-3 | Add referee name | UI + MOCK | Inline edit in schedule; persistence pending |
| O-4 | Match injury report | UI + MOCK | UI slot in match controller; `createInjuryReport()` exists but not wired |
| O-5 | Two categories / two tournaments | UI + MOCK | Multi-tournament dashboard pending |
| O-6 | Approve joined teams | UI + MOCK | Pending queue UI; `approveTournamentTeam()` pending wire-up |
| O-7 | Team check-in at desk | UI + MOCK | `teamCheckIn()` service exists; UI scan pending |
| S-1 | Public spectator page | UI + MOCK | Full UI built (spec in `docs/superpowers/specs/`); real-data wire-up pending |

> **Summary:** Player and TM portals are functionally backend-wired. Organizer portal and spectator page are UI-complete but mostly running on mock data — the next major development sprint must wire the organizer actions and the public spectator page to real data.

---

## 3. User Stories

Stories are grouped by persona and tagged MUST (required for UAT) or STRETCH (built only if the week allows).

### 3.1 Identity & Access (cross-cutting)
- **ID-1 (MUST)** — As a new user, I want to register and sign in with a one-time code sent to my email, so that I don't need a password or a Google account and have one identity across the product. *(Email OTP via Better Auth + AWS SES. Everyone registers through the player portal.)*
- **ID-2 (MUST)** — As a player, I want the player role automatically on registration, so I can use the player portal immediately.
- **ID-3 (MUST)** — As a player, I want to create a team and become its manager, so I can manage my squad without a separate account. *(team_staff row, is_primary_manager = true. Every manager is also a player.)*
- **ID-4 (MUST)** — As a multi-role user, I want to switch between player and manager views with one login. *(Shared RBAC guard; role switcher in nav.)*

### 3.2 Player (Skrammm-P)
- **P-1 (MUST)** — Access the player portal and see career stats + reliability score (3-component breakdown: attendance 50 / punctuality 25 / discipline 25).
- **P-2 (MUST)** — View and edit own medical profile and emergency contact. *(Player owns it. §5.)*
- **P-3 (MUST)** — Show a rotating QR code as match-day identity. *(60-second rotating token, SW-cached.)*
- **P-4 (STRETCH)** — Generate and share a 9:16 performance card. *(Cut first if the week tightens.)*
- **P-5 (MUST)** — Enter a club/team code during onboarding to join an existing team. *(Self-join → pending → manager approves.)*
- **P-6 (MUST)** — Claim a manager-created account via player ID + OTP to a manager-set contact. *(Ownership of profile + medical transfers on claim. §4.4.)*

### 3.3 Team Manager (Skrammm-M)
- **M-1 (MUST)** — Manage squad: add and remove players. *(Add existing players or create a claimable placeholder.)*
- **M-2 (MUST)** — Scan player QR codes on match day to record attendance. *(Validates token, scan window, membership, no double-scan.)*
- **M-3 (MUST)** — Manual override when a player's phone is dead. *(Logged; requires confirmation.)*
- **M-4 (MUST)** — View medical/fitness status of own team players. *(View-only for claimed players. §5.)*
- **M-5 (MUST)** — Join a tournament via the organizer's code/link, then submit roster. *(pending_approval; hidden from public until approved.)*
- **M-6 (MUST)** — Create a claimable player ID for a player who can't register themselves. *(Driver: under-17 / no phone. user_id null until claimed.)*
- **M-7 (MUST)** — Set the lineup for the next match. *(match_lineups. Pulled out of Chat.)*
- **M-8 (MUST)** — Approve players who self-joined via club code. *(Counterpart to P-5.)*

### 3.4 Organizer (Skrammm-O)
- **O-1 (MUST)** — Create a tournament with the right format for the team count, get a shareable code/link on creation. *(Gate: ≤8 Festival / 9–16 Group→QF→SF / 17–32 Group→Cup·Plate·Bowl·Shield. §2A.5.)*
- **O-2 (MUST)** — Run a live scoreboard (tries, conversions, penalties, drop goals, cards). *(SSE push; suspend + lock.)*
- **O-3 (MUST)** — Add the referee's name to a match. *(Appears in match report.)*
- **O-4 (MUST)** — Add a match injury report when a player is hurt during a match. *(Distinct from the player medical profile. §5.)*
- **O-5 (MUST for Alpha)** — Run two categories as two tournaments under one account.
- **O-6 (MUST)** — Review and approve joined teams one by one. *(Pending queue shows roster status; not hard-blocked on player count.)*
- **O-7 (MUST)** — Scan a team in at the tournament desk to confirm arrival. *(Two-level attendance: team-level, distinct from M-2. Operational only; does NOT feed reliability. §4.5.)*

### 3.5 Public / Spectator
- **S-1 (MUST)** — Open a tournament code page without logging in to follow live scores, standings, fixtures, rosters. *(Server-rendered; SSE; approved teams only.)*

> These stories are arranged into the user journey in Appendix A. Story Map.

---

## 4. UX / Flow Changes

### 4.1 Unified registration & the player→manager path
1. Every new user registers through the player portal with email OTP → holds the player role.
2. A player who wants to manage uses "Create Team" → granted the manager role (primary manager).
3. Role switcher lets a player-manager move between views with one session.
4. A player may never become a manager (fine). A manager is always also a player (enforced).

> **ARCHITECTURE NOTE —** Reinforces, not breaks, the entity-scoped RBAC. "Shared file with RBAC" = the can() guard in modules/shared/auth. Authorization is per-entity (manager of team Y), never a global role.

### 4.2 Invitation flow under OTP
With email OTP, an invitation email contains a claim link; the invitee signs in with OTP to that same address; the system attaches the role.

### 4.3 Team join & organizer approval
1. Organizer creates the tournament → code + shareable join link (O-1).
2. Manager joins → team record status = pending_approval, NOT shown on public standings (M-5).
3. Manager submits roster: player names + jersey numbers.
4. Organizer opens the pending-teams queue, sees roster status, approves/rejects one by one (O-6).
5. Approve → public + officially entered. Reject → manager notified with a reason.

> **ALPHA NOTE —** The Alpha is 2 tournaments × 24 teams = up to 48 manual approvals. One-by-one accepted for MVP. Bulk-approve is a fast-follow. Public traffic expected mainly on game day.

### 4.4 Player onboarding, self-join & account claim
**Path A — player self-joins (P-5 / M-8)**
1. Player registers (OTP) and optionally enters a club/team code at onboarding.
2. Player lands on that team's roster as pending.
3. Manager approves (or removes). Approved → active squad member.

**Path B — manager creates a claimable account (M-6 / P-6)**
1. Manager creates a players row for someone who cannot register (driver: under-17, no phone). user_id null until claimed.
2. Manager enters minimal profile + emergency info, sets a contact for the claim OTP.
3. Player claims with player ID + OTP to that contact. ID alone is insufficient.
4. On claim, ownership of profile + medical profile transfers to the player.

> **MINORS — STATED MVP SCOPE:** The MVP knowingly handles minors' data via manager-created accounts (highest-sensitivity area: minors + medical). Guardian consent capture is REQUIRED BEFORE ALPHA (not built for UAT week). For UAT, manager-entered emergency contact stands in.

### 4.5 Two-level attendance

| Level | Who scans | What it answers | Record |
|---|---|---|---|
| Team attendance | Organizer (tournament desk) | Has this team arrived for the match? (O-7) | team_attendance (per match) |
| Player attendance | Team Manager (pitch-side) | Has this player arrived for the match? (M-2) | attendance_scans (per player) |

> **SCORING BOUNDARY —** The reliability score is PLAYER-only. Team attendance is operational and does NOT feed any reliability score.

---

## 5. Medical Data — Ownership & Visibility

Split into two distinct entities; one shared name retired to avoid conflation.

### 5.1 The two entities

| Entity | What it is | Owner / who creates it |
|---|---|---|
| Player Medical Profile | Standing health info: conditions, allergies, blood type, fitness status (fit/doubtful/out), emergency contact. | The player once claimed. For an UNCLAIMED player, the manager creates and edits it; ownership transfers to the player on claim (P-6). |
| Match Injury Report | A per-incident record: what happened to a player during a specific match. | The organizer, during/after the match, tied to the match + player. |

### 5.2 Visibility matrix (approved)

| Role | Player Medical Profile | Match Injury Report |
|---|---|---|
| Player (self, claimed) | View + edit (own only) | View (own only) |
| Team Manager — claimed player | View only — own team players | View — own team players |
| Team Manager — unclaimed player | View + edit (until claimed; then loses edit) | View — own team players |
| Organizer | No access to full profile | Create + view (their tournament) |

> **PRINCIPLE —** The organizer records what happened in a match; the organizer does not get a player's full medical history. The player owns their profile once claimed; before claim, the manager holds it and loses edit rights the moment the player claims. The manager always sees team welfare status to manage availability.

**MVP role simplification: the team manager is also coach, S&C, and medical.** For the MVP there are no separate Coach / S&C / Medical staff accounts. Those responsibilities are collapsed into the single team-manager role. Separate club staff accounts are deferred to post-Alpha.

### 5.3 MVP field scope
- Profile: fitness status (enum), injury type, body part, expected return date, allergies (short), blood type, emergency contact name + phone, one optional short note.
- Injury report: match, player, injury type, body part, severity (minor/moderate/serious), action taken, optional short note, recorded-by, timestamp.

---

## 6. Technical Constraints

### 6.1 Inherited from Tech PRD v2.2

| Area | Constraint |
|---|---|
| Architecture | Modular monolith — single Next.js 15 codebase, module boundaries at lint level. |
| Database | PostgreSQL 16 + Prisma. Self-hosted in Docker on the app EC2 for MVP. |
| Real-time | Server-Sent Events; in-process EventEmitter on single EC2. Postgres LISTEN/NOTIFY at scale. |
| Hosting | Single AWS EC2 (t3.large) + Cloudflare front + Nginx reverse proxy. |
| Delivery | PWA via Serwist. Offline-tolerant only for the player QR surface. |
| Payments | Billplz integration exists but is dormant for UAT + Alpha (all free). |

### 6.2 Changed for this MVP (reversals & additions)

| Change | From | To | Impact |
|---|---|---|---|
| Auth | Google OAuth only | Email OTP (Better Auth) | Rewrite auth; uses AWS SES + verification table; add send-rate-limit. |
| Registration | Per-role signup | Single player-portal registration (two doors) | Player baseline role; manager layered via RBAC. |
| Team creation | Organizer-invited managers | Self-service player→manager | New flow + team_staff is_primary_manager. |
| Medical | Not in PRDs | Two entities (profile + injury report) | New tables + visibility enforcement in can(). |
| Referee | Not in PRDs | Match officials per match | New table or nullable fields on matches. |
| Pricing | RM200 + RM10/team | New tier table (free for now) | Commercial; not built for UAT/Alpha. |

### 6.3 New data model elements
- match_officials (or referee_name on matches): MVP may use a single nullable referee_name.
- player_medical_profiles: id, player_id (owner), fitness_status, injury_type, body_part, expected_return_at, allergies, blood_type, emergency_contact_name, emergency_contact_phone, note, updated_at.
- match_injury_reports: id, match_id, player_id, injury_type, body_part, severity, action_taken, note, recorded_by_user_id, created_at.
- tournament_teams.status state machine: pending_approval → approved | rejected, plus withdrawn. Public visibility only when approved. Guard: tournament:approve_team.
- players: extend with claim_status, player_id_code, claim_contact, is_minor, guardian_name + guardian_contact (REQUIRED BEFORE ALPHA). Claim = player_id_code + OTP to claim_contact → set user_id, transfer medical-profile edit rights.
- team membership status: club-code self-join is roster-pending until manager approves. Guard: team:approve_player.
- match_lineups (existing): surfaced for M-7. Guard: team:set_lineup.
- team_attendance (new): per-match team-level check-in (O-7). Separate from attendance_scans. Does not feed reliability. Guard: tournament:check_in_team.
- RBAC: medical:edit_profile conditional on claim_status; guardian fields gated behind is_minor.

### 6.4 Alpha load constraint (the named risk)
The Alpha drives **~720 players across 2 tournaments of 24 teams each, with concurrent live scoring.** The single t3.large is provisioned for roughly 500 concurrent users before ALB/ASG. Peak concurrency must be load-tested before the Alpha; vertical scale to t3.xlarge or early Postgres→RDS extraction is the contingency.

### 6.5 UI Standards — Rugby Pitch Utility

All four portals built during the UAT week must conform to the "Rugby Pitch Utility" design system. Full specification: **Master PRD v4.1 §5** (palette, typography, components) and **Tech PRD v2.2 §2A** (all token values with CSS variable names).

**Non-negotiable for UAT:**
- Use Tailwind contract tokens (`primary`, `accent`, `secondary`, `destructive`, `muted`, `border`, `ring`) in all components — never hardcode hex values.
- Typography: `font-lexend` on all headings (H1–H6); `font-inter` on body. Both are applied in `@layer base` — no per-component overrides needed.
- Default elevation on interactive cards and CTAs: `.shadow-brutalist` (gold, 4px offset). Use `.shadow-brutalist-sm` for chips/tags; `.shadow-brutalist-lg` for hero panels.
- Border radius: `0.25rem` throughout. Do not use `rounded-full` on non-circular elements.
- Sidebar: use `--sidebar-*` sub-theme tokens (dark green `#00241a` background, gold `#ffba20` for active items).
- Scoring events (tries, conversions) and CTA highlights: `accent` / `--fair-play-gold` (`#ffba20`).
- Destructive actions and red-card events: `destructive` / `--red-card` (`#ba1a1a`).

### 6.6 Design & Branding — Logo Assets (Locked)

The visual identity is locked. All logo files live in `public/logos/`. Two color variants exist for each layout:

| Layout | File (Yellow) | File (Green) | Use |
|---|---|---|---|
| Horizontal (H) | `logo-h-yellow.png` | `logo-h-green.png` | Desktop sidebar header |
| Vertical (V) | `logo-v-yellow.png` | `logo-v-green.png` | Login pages, marketing hero |
| Icon mark | `logo-icon-yellow.png` | `logo-icon-green.png` | Favicon, PWA icons, small spaces |
| Wordmark | `logo-wordmark-yellow.png` | `logo-wordmark-green.png` | Mobile header, spectator header |

**Color variant rule:** Yellow on dark backgrounds (`--pitch-green #00241a`); Green on light backgrounds (`--background #f8f9fa`).

### 6.7 TDD Enforcement

From this version forward, **no feature ships without a passing Playwright E2E test** tied to a test case in the canonical test script.

- **Canonical test script:** `docs/superpowers/specs/2026-06-08-mvp-test-script.md`
- **Scaffolded Playwright files:** `src/tests/e2e/{auth,organizer,tm,player,spectator}.spec.ts`
- **Process:** dev reads TC-ID → writes failing test → implements feature → test passes → ship
- Every test case is identified by a `TC-{PORTAL}-{NUM}` code that links the markdown spec to the Playwright assertion

---

## 7. Pricing (Deferred — Free for UAT & Alpha)

Pricing does not gate UAT or the Alpha — everything is free. See Master PRD v4.1 §8 for the full commercial model.

### 7.1 Organizer (per tournament)

| Teams | Price |
|---|---|
| ≤ 8 | Free |
| 9 – 16 | RM 100 |
| 17 – 32 | RM 150 |
| Above 32 / custom | Get in touch |

### 7.2 Player & Manager (monthly, future)
- Player: Free always; PRO RM 9.90/month *(future)*.
- Manager: Free always; PRO RM 25.90/month *(future)*.

> PRO features are future monetization and do not ship for UAT/Alpha.

---

## 8. Success Metrics

Two distinct bars, measured separately.

### 8.1 UAT success (within one week)

| Dimension | Target |
|---|---|
| Auth | 100% of test users register and sign in via email OTP with no password; role switch works on one login. |
| Player→Manager | A player can create a team and immediately manage a squad in the same session. |
| Live scoring | An organizer scores a full mock match; spectators see each event within ~1–2s. |
| Team join | Manager joins via code/link, submits roster; team hidden from public until approved; organizer approves; team appears publicly. |
| Attendance | Manager scans a player QR successfully; replay of an old QR is rejected; manual override logged. |
| Medical | Player edits own profile; manager sees team status; organizer files an injury report; organizer cannot see full profiles. |
| Referee | Referee name entered by organizer appears on the match report. |
| Public | Spectator opens a tournament code page with no login and sees live state. |
| Critical bugs | Zero P0/P1 defects open on the four core flows at UAT exit. |

### 8.2 Alpha success (end July, real tournament)

| Dimension | Target |
|---|---|
| Scale handled | 2 tournaments × 24 teams × ~720 players onboarded and active without data loss. |
| Concurrency | Live scoring + spectator load sustained at peak with sub-2s scoreboard latency; no SSE collapse. |
| Attendance integrity | ≥ 95% of intended check-ins captured via QR (remainder via logged override). |
| Uptime | No unplanned downtime during match hours across the event. |
| Reliability score | Scores computed and visible for all active players with correct component breakdown. |
| Organizer satisfaction | Organizer completes the event without falling back to spreadsheets for core scoring/standings. |
| Stability under load | EC2 stays within memory/CPU alarms or contingency (t3.xlarge / RDS) triggered in time. |

---

## 9. Open Questions & Decisions Needed

| # | Question | Owner | Blocking? |
|---|---|---|---|
| 1 | Corrected pricing ladder finalised (resolved in Master v4.0). | Product | No (free for UAT/Alpha) |
| 2 | Combined cross-category organizer view for the Alpha, or two independent tournaments? | Product / Organizer | No (assume independent) |
| 3 | Referee: single nullable referee_name vs a match_officials table? | Eng / Product | No (default to simple field) |
| 4 | Load test plan for 720 players on single t3.large before Alpha — who runs it and when? | DevSecOps | Yes (before Alpha) |
| 5 | Performance card (P-4) — keep as stretch or cut now to protect the week? | Product | No |
| 6 | Medical data retention & access-log policy. | Product / DevSecOps | Confirm before Alpha |
| 7 | Guardian / parental consent capture for minors (manager-created under-17 accounts). | Product / Legal | Yes (before Alpha) |
| 8 | Claim-OTP contact handling — minimum verification + wrong-contact recovery. | Product / Eng | Confirm before Alpha |

---

## 10. Changelog Impact on Companion Docs

### 10.1 Master PRD → done (v4.0)
- Future / Post-MVP section; auth → OTP; invitation flow for OTP; medical (two-entity) + referee in journeys; new pricing tiers; format gate correction; two-level attendance.

### 10.2 Tech PRD → done (v2.2)
- Reverse Decision #7 (auth) to email OTP; rewrite auth flows; new data-model elements; self-service player→manager; can() guards for medical/injury/approval/lineup/team-checkin; team_attendance + claim/guardian fields; pricing references; Decisions Log; Nginx + SES. *(v2.1)*
- New §2A Design System: full token table from `src/styles/theme.css` — brand primitives, Tailwind contract tokens, border radius scale, typography, brutalist utility classes, sidebar sub-theme, chart tokens. *(v2.2 — documentation only)*

### 10.3 v1.3 update
- Added §6.5 UI Standards — Rugby Pitch Utility: UAT-binding design system rules (token usage, typography, brutalist shadows, radius) referenced from Master PRD v4.1 §5 and Tech PRD v2.2 §2A.
- Updated companion-doc references to Master PRD v4.1 and Tech PRD v2.2.

### 10.4 This update (v1.4)
- Added §2B Implementation Status: per-story build state (UI / BE / MOCK / –) reflecting current codebase snapshot.
- Added §6.6 Design & Branding: logo asset inventory locked; color variant rule formalized.
- Added §6.7 TDD Enforcement: canonical test script + Playwright scaffolding workflow; no feature ships without passing E2E test.
- Key finding: Player and TM portals are largely backend-wired; Organizer portal and Spectator page are UI-complete but need real-data wire-up as the next sprint priority.

---

## Appendix A. Story Map

User story map (Patton structure). Horizontal backbone = user journey in order; stories hang vertically by release band.

Backbone: **Discover & Register → Set up identity/team → Create/Join tournament → Pre-match (roster, approval, QR) → Live match → Post-match → Follow as public**

| Band | Discover & Register | Set up identity/team | Create/Join tournament | Pre-match | Live match | Post-match | Follow as public |
|---|---|---|---|---|---|---|---|
| **UAT-MUST** | ID-1 Register (OTP); ID-2 Player baseline; P-5 Join via club code; P-6 Claim account | ID-3 Create team→manager; ID-4 Role switch; M-1 Manage squad; M-6 Create claimable player; M-8 Approve self-joins | O-1 Create tournament + code/link; M-5 Join via code/link | O-6 Approve teams; M-5 Submit roster; M-7 Set lineup; O-7 Team check-in; P-3 QR identity; M-2 Scan QR (player); M-3 Manual override; P-2/M-4 Medical profile + view | O-2 Live scoreboard (SSE); O-3 Add referee; O-4 Match injury report | P-1 Stats + reliability score | S-1 Public tournament code page (approved teams only) |
| **UAT-STRETCH** | — | — | — | — | — | P-4 Performance card share | — |
| **Alpha** | Marketing landing pages; Organizer vs Player/Team links; T&C + Privacy (light, pulled to UAT); Guardian consent for minors (required before Alpha) | Coach / S&C / Medical staff accounts (deferred); Multi-user organizer | Pricing pages (display only); Marketplace browse | — | MOTM (Man of the Match) | Org billing surfaces; PDF tournament report | FAQ / Support (chatbot, ticket, feedback) — approach TBD post-UAT; News articles |

**Walking skeleton (thinnest end-to-end slice to demo first):** Register (OTP) → create team → organizer creates tournament + shares link → team joins → organizer approves → organizer scores a live match → public sees it on the code page. Build this spine end-to-end first, then thicken each column. Everything in this spine is UAT-MUST.

---

*End of Skrammm MVP PRD v1.3 — Draft for review. Aligned with Master PRD v4.1 and Tech PRD v2.2.*
