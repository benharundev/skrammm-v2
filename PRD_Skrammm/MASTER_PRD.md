# Skrammm (Rugby Management System) — Master PRD (v4.1)

> Companion to **Skrammm MVP PRD v1.3** (one-week UAT scope) and **Skrammm Technical PRD v2.2** (engineering).
> v4.1 changelog from v4.0 is in §11.

---

## 1. Executive Summary

**Objective**: Provide a centralized, digital ecosystem for organizing rugby tournaments, tracking player reliability, and engaging fans without relying on betting revenue.

**Ethical Framework**: A "halal-first" approach focusing on meritocracy, community engagement, and transparent performance data. No gambling, staking, or betting mechanics are permitted. Reliability scoring is fully explainable — players can see exactly which components contribute to their score.

**Delivery Format**: Installable Progressive Web App (PWA) — runs in any modern browser, installs to iOS/Android home screens, offline-tolerant on critical surfaces (most importantly the player's match-day QR).

**Release path**: The product is delivered in bands — **MVP / UAT** (one-week validation across all four portals) → **Alpha** (one real tournament event at end-July: two tournaments of 24 teams each, ~720 players) → **Future / Post-MVP** (monetization and PRO features, §10). This document is the full vision; the MVP PRD scopes what ships first.

---

## 2. System Architecture & Access

The ecosystem lives across two hostnames with role-based path prefixes inside the app domain.

### 2.1 Domain & Routing Strategy

| Surface | URL | Audience |
|---|---|---|
| **Spectator Portal** | `skrammm.com/{tournament-code}` | Public — no login required for live scores, standings, rosters |
| **Marketing & Legal** | `skrammm.com`, `/about`, `/legal`, `/pricing` | Public |
| **Organizer Portal (Skrammm-O)** | `app.skrammm.com/organizer` | Tournament organizers, event directors |
| **Team Manager Portal (Skrammm-M)** | `app.skrammm.com/tm` | Club leads managing squads + match-day check-ins |
| **Player Portal (Skrammm-P)** | `app.skrammm.com/player` | Athletes tracking performance + carrying their digital ID |

Tournament codes are organizer-typed (3–20 lowercase alphanumeric chars), validated against a reserved-words list at creation, and globally unique.

### 2.2 Technical Architecture (summary — see Tech PRD v2.2)

- **Architecture**: Modular monolith — single Next.js codebase, domain-isolated modules per portal with strict module boundaries enforced at lint level.
- **Authentication**: Passwordless via **email OTP** (one-time code to email). Single email-entry sign-in, database-backed sessions, 30-day rolling. No password, no Google-OAuth-only, no magic link. *(CHANGED v4.0 — was Google OAuth only.)*
- **Registration**: Two front-door links — one for **Organizer**, one for **Player/Team** — routed to the same identity system. "Manager" is not a signup type: a user registers as a **player** (baseline) and gains the **manager** role by creating a team. Every manager is also a player; a player need not be a manager. *(CHANGED v4.0.)*
- **Email**: AWS SES (transactional + OTP). *(CHANGED v4.0 — was Resend.)*
- **Reverse proxy / TLS**: Nginx behind Cloudflare (Full/Strict TLS via Cloudflare Origin Certificate). *(CHANGED v4.0 — was Caddy.)*
- **Delivery**: PWA. Installable, offline-tolerant for the player's QR code.

---

## 3. Core Personas & Journeys

### 3.1 Tournament Organizer (Skrammm-O)

Controls everything from tournament inception to final whistle.

- **Tournament Setup Playbook** — 4-step wizard:
    1. **General Info** — Name, dates, daily start/end times, branding (logo, accent color).
    2. **Team Selection / Join** — Organizer generates a tournament code + shareable join link; teams join via the code/link.
    3. **Format & Rules** — Deterministic, non-overlapping logic gate by team count (see §3.5):
        - *Festival (≤ 8 teams)*: Single round-robin. Maximizes game time.
        - *Tiered (9–16 teams)*: Grouping → Quarterfinal → Semifinal.
        - *Elimination (17–32 teams)*: Grouping → Cup / Plate / Bowl / Shield.
    4. **Launch** — Approve joined teams, then go live.
- **Team Approval** — Teams that join via code/link land as *pending approval* and are hidden from public standings until the organizer approves them one by one, after confirming each team's submitted roster (names + jersey numbers). *(NEW v4.0.)*
- **Scoreboard Controller** — Real-time management of tries, conversions, penalties, drop goals, and disciplinary cards (yellow/red). Features:
    - Result "locking" once final
    - Emergency "Suspend Match" trigger (weather/injury/incident)
    - **Add referee name** to a match, surfaced in the match report *(NEW v4.0)*
    - **Match injury report** — per-incident record when a player is hurt during a match *(NEW v4.0)*
    - Live event log visible to spectators in real time
- **Team Check-In (two-level attendance)** — The organizer scans **teams** in at the tournament desk to confirm a team has arrived for a match (team attendance). This is distinct from the manager scanning **players** (player attendance). Team attendance is operational only and does **not** feed the reliability score. *(NEW v4.0.)*
- **Sponsor Management** — Tiered placement system (Platinum, Gold, Silver, Bronze) with clickable advertisement slots across fan-facing views. Click + impression tracking.
- **Financials** — Integrated card/FPX/e-wallet payment via **Billplz** for tournaments above the free tier (see §9). *Dormant for UAT + Alpha (all free).*

### 3.2 Team Manager (Skrammm-M)

Owns the squad. Operates pitch-side. **In the MVP the team manager also fills the coach, S&C, and medical-staff roles** — separate staff accounts are deferred (see §10).

- **Squad Management** — Roster oversight with per-player stats (appearances, tries, cards) and **Reliability Score** (0–100). Add/remove players; add existing Skrammm players or create a claimable player ID.
- **Create Claimable Player Accounts** — For a player who cannot register themselves (driver: under-17 players without a usable phone), the manager creates the account and enters minimal profile + emergency info. The player later claims it via their player ID + a one-time code sent to a manager-set contact. On claim, ownership of the profile and medical profile transfers to the player. *(NEW v4.0.)*
- **Join Tournaments** — Join via the organizer's tournament code/link; submit roster; the team is officially entered once the organizer approves. *(NEW v4.0.)*
- **Approve Self-Joined Players** — Players who self-join the team via a club code are pending until the manager approves them. *(NEW v4.0.)*
- **Match-Day Scanner** — Secure QR scanner activated only on official match days. Verifies **player** attendance and punctuality. Rotating short-lived tokens; replay-resistant by design.
- **Set Lineup** — Set the starting lineup and jersey numbers for the next match. *(NEW v4.0.)*
- **Manual Override** — For phone-dead/lost-QR cases. Logged to audit trail; requires manager confirmation.
- **Team Health View** — View the medical/fitness status of players on the team (view-only for claimed players; editable while a player is unclaimed). *(NEW v4.0.)*
- **Club Identity** — Manage team logo, origin, training ground.

### 3.3 Player (Skrammm-P)

Owns their digital athletic identity.

- **Onboarding** — Register via email OTP; optionally enter a club/team code to join an existing team (subject to manager approval). *(CHANGED v4.0.)*
- **Digital Resume** — Career stats dashboard, tournament history, plus the **Reliability Score** (0–100) with a transparent breakdown of its three components:
    - Attendance rate (50% weight)
    - Punctuality (25%)
    - Discipline — cards penalty (25%)
- **Medical Profile** — The player owns and edits their own medical profile and emergency contact. *(NEW v4.0; see §6.)*
- **Match-Day Identity** — A QR code in-profile, rotating every 60 seconds, used by managers to verify attendance.
- **Account Claim** — A player whose account was created by a manager can claim it with their player ID + a one-time code. *(NEW v4.0.)*
- **Social Growth** — Generate high-impact 9:16 "Strava-style" performance cards for career and tournament-specific stats. Native share intents on supported devices.

### 3.4 Spectator (Public)

No login. No friction. The public most commonly accesses a tournament on game day.

- **Live Match Center** — Real-time scoreboard with player-specific scoring logs (tries, conversions, cards) and direct links to live video feeds (Facebook Live, YouTube — Skrammm does not host video).
- **Contextual Data** — Comprehensive standings (only approved teams are shown) with phase indicators (Group Stage vs. Knockouts), top-scorer leaderboards, points-per-game tables.
- **Roster Access** — Clickable team cards leading to player lists and individual performance summaries.
- **Cross-Portal Continuity** — A logged-in player visiting the spectator view keeps their session across `skrammm.com` and `app.skrammm.com`.

### 3.5 Tournament Format Gate (corrected)

One team count maps to exactly one format. *(CHANGED v4.0 — replaces overlapping ranges.)*

| Teams | Format | Structure |
|---|---|---|
| ≤ 8 | Festival | Single round-robin |
| 9–16 | Tiered | Grouping → Quarterfinal → Semifinal |
| 17–32 | Elimination | Grouping → Cup / Plate / Bowl / Shield |

The Alpha's 24-team categories fall in the 17–32 band.

---

## 4. Medical Data — Two Entities (NEW v4.0)

Medical information is sensitive and is split into two distinct entities, with one shared name retired to avoid conflation.

| Entity | What it is | Owner / creator |
|---|---|---|
| **Player Medical Profile** | Standing health info: conditions, allergies, blood type, fitness status, emergency contact | The player once claimed. While unclaimed, the manager creates/edits it; ownership transfers on claim. |
| **Match Injury Report** | Per-incident record of what happened to a player during a specific match | The organizer, tied to the match + player. |

**Visibility (approved):**

| Role | Player Medical Profile | Match Injury Report |
|---|---|---|
| Player (self, claimed) | View + edit (own) | View (own) |
| Team Manager — claimed player | View only (own team) | View (own team) |
| Team Manager — unclaimed player | View + edit (until claimed) | View (own team) |
| Organizer | No access to full profile | Create + view (their tournament) |

**Minors**: The product knowingly handles minors' data via manager-created accounts. Guardian/parental consent capture is **required before Alpha** (not built for the UAT week). This is the highest-sensitivity surface in the product.

---

## 5. Visual Identity

- **Design System Name**: "Rugby Pitch Utility"
- **Aesthetic**: High-contrast, gritty, athletic, professional. Light UI default with dark green sidebar.
- **Tech**: Tailwind CSS v4 with CSS custom properties in `src/styles/theme.css`; shadcn/ui component library.

### 5.1 Colour Palette

**Brand primitives** (defined in `:root`):

| CSS Token | Hex | Usage |
|---|---|---|
| `--pitch-green` | `#00241a` | Primary brand, sidebar background, nav |
| `--pitch-green-mid` | `#0d3b2e` | Sidebar accent hover state |
| `--pitch-green-light` | `#234e40` | Sidebar border |
| `--pitch-green-container` | `#beedd9` | Light-mode tinted surfaces |
| `--fair-play-gold` | `#ffba20` | CTAs, highlights, scoring events, focus rings, brutalist shadows |
| `--fair-play-gold-dark` | `#463000` | Gold text on light backgrounds |
| `--navy` | `#4f5f77` | Secondary accents, data tables, neutral UI |
| `--navy-light` | `#d0e1fd` | Navy tinted surfaces |
| `--red-card` | `#ba1a1a` | Destructive actions, red-card events, error states |
| `--yellow-card` | `#ffba20` | Yellow-card events (shares the gold value) |
| `--surface-dim` | `#d9dadb` | Dividers, muted borders |

**Tailwind semantic layer** (mapped via `@theme inline`):

| Tailwind Token | Value | Notes |
|---|---|---|
| `primary` | `#00241a` | Pitch green — primary interactive elements |
| `accent` | `#ffba20` | Fair-play gold — CTAs, highlights |
| `secondary` | `#4f5f77` | Navy — supporting UI |
| `destructive` | `#ba1a1a` | Red card — errors, destructive actions |
| `background` | `#f8f9fa` | Page background |
| `foreground` | `#191c1d` | Body text |
| `muted` | `#e1e3e4` | Muted backgrounds |
| `border` | `#c0c8c3` | Default borders |
| `ring` | `#ffba20` | Focus ring — gold throughout |
| `radius` | `0.25rem` | Sharp, athletic corner radius |

### 5.2 Typography

| Role | Font | Application |
|---|---|---|
| Headings (H1–H6) | **Lexend** (Bold / Black) | `font-family: var(--font-lexend)` via `@layer base` |
| Body / UI text | **Inter** | `font-family: var(--font-inter)` on `body` |

Both fonts are loaded and mapped as `--font-lexend` and `--font-inter` CSS variables. No per-component font overrides needed — the base layer handles application automatically.

### 5.3 Brutalist Elevation System

Depth is expressed via hard offset box-shadows in brand colours with no blur. This replaces ambient/Material-style elevation and reinforces the athletic, tactile aesthetic.

| Utility Class | Shadow | Typical Use |
|---|---|---|
| `.shadow-brutalist-sm` | `3px 3px 0 var(--fair-play-gold)` | Small interactive elements, chips |
| `.shadow-brutalist` | `4px 4px 0 var(--fair-play-gold)` | Cards, CTAs — the default offset |
| `.shadow-brutalist-lg` | `6px 6px 0 var(--fair-play-gold)` | Hero cards, featured panels |
| `.shadow-brutalist-green` | `4px 4px 0 var(--pitch-green)` | Elevated elements on light/gold backgrounds |
| `.shadow-brutalist-green-lg` | `6px 6px 0 var(--pitch-green)` | Large panels on light backgrounds |
| `.shadow-brutalist-navy` | `4px 4px 0 var(--navy)` | Data context, tertiary elements |
| `.shadow-brutalist-dark` | `4px 4px 0 var(--fair-play-gold-dark)` | Deep brand / dark surface contexts |

### 5.4 Sidebar Tokens

The app sidebar carries its own dark-green sub-theme, independent of the page background:

| Token | Value |
|---|---|
| `--sidebar` | `#00241a` |
| `--sidebar-foreground` | `#ffffff` |
| `--sidebar-primary` | `#ffba20` (gold — active/selected items) |
| `--sidebar-primary-foreground` | `#00241a` |
| `--sidebar-accent` | `#0d3b2e` (hover state) |
| `--sidebar-accent-foreground` | `#ffffff` |
| `--sidebar-border` | `#234e40` |
| `--sidebar-ring` | `#ffba20` |

### 5.5 PWA Branding

- Manifest theme colour: `#00241a` (pitch-green)
- iOS splash screens generated for primary device sizes
- Border radius `0.25rem` throughout — deliberately sharp to reinforce the athletic aesthetic; avoid `rounded-full` on non-circular elements

---

## 6. Negative Flows & Resilience

- **Empty States** — Professional, persona-appropriate placeholders ("No Matches Scheduled," "No Stats Available," "No History Found"), server-rendered in initial HTML — no spinner-then-empty flash.
- **Match Suspension** — Dedicated `suspended` state drives a high-impact red banner across spectator views, pushed in real time via SSE.
- **Reliability Warnings**: Score < 60 → yellow banner on player dashboard; < 40 → red banner + alert to team manager.
- **Auth Resilience** — OTP codes are single-use, short-TTL, and rate-limited. Invitation/claim tokens valid 14 days with a one-click reissue path.
- **Team Approval** — Teams pending approval are hidden from the public; rejected teams notified with a reason.
- **Offline Tolerance** (PWA) — Player's QR token is service-worker-cached; survives brief connectivity drops pitch-side. Spectator standings cache briefly, fall back to last-known on full disconnect. Live scoreboard requires connectivity.
- **Payment Failures** — Idempotent webhook handler + reconciliation cron (when payments are enabled).

---

## 7. Attendance Model (two levels) (NEW v4.0)

| Level | Who scans | Question | Feeds reliability score? |
|---|---|---|---|
| **Team attendance** | Organizer (tournament desk) | Has the team arrived for this match? | No — operational only |
| **Player attendance** | Team Manager (pitch-side) | Has the player arrived for this match? | Yes |

---

## 8. Pricing (CHANGED v4.0)

All pricing is **free for the UAT and the Alpha**. The commercial model below is the intended go-to-market after Alpha.

### 8.1 Organizer (per tournament)

| Teams | Price |
|---|---|
| ≤ 8 | Free |
| 9–16 | RM 100 |
| 17–32 | RM 150 |
| Above 32 / custom | Get in touch |

### 8.2 Player (monthly subscription)

| Tier | Price |
|---|---|
| Free | Free always |
| PRO | RM 9.90 / month *(future — see §10)* |

### 8.3 Team Manager (monthly subscription)

| Tier | Price |
|---|---|
| Free | Free always |
| PRO | RM 25.90 / month *(future — see §10)* |

> PRO features (Scouting, Transfer, Skrammm-P Plus, detailed statistics) are **future monetization** and do not ship for the MVP/UAT or Alpha. Price points are captured here for planning.

---

## 9. Payments

Integrated via **Billplz** (FPX bank transfer dominant in Malaysia; flat RM 1.50/FPX transaction; also cards + e-wallets). Redirect-based flow, no PCI scope on our side. **Dormant for UAT + Alpha** — wired but disabled while everything is free. Engineering detail in Tech PRD v2.2 §12.

---

## 10. Future / Post-MVP

Captured for the roadmap; **not** built for UAT or Alpha.

**Monetization & PRO features**
- Player PRO (RM 9.90/mo) and Manager PRO (RM 25.90/mo) subscriptions
- Skrammm-P Plus: activity logs, fitness tracker, LLM personal trainer
- Scouting (PRO), Player Transfer (PRO)
- Match/Tournament detailed statistics (PRO)

**Platform & growth**
- Tournament Marketplace (discover/browse tournaments to join)
- In-app Chat (team chat, admin chat)
- Participation Certificates; PDF tournament reports
- Marketing site: role landing pages, pricing pages, FAQ, support (chatbot/ticket, feedback), news/articles

**Organizer & club depth**
- Man of the Match (MOTM) — manual or points-based
- Multi-user organizer accounts (delegated scorekeepers/co-organizers)
- Separate club staff accounts: Coach / S&C / Medical (in MVP the manager fills all)
- XML/CSV bulk upload of match statistics
- SSM / org-registry integration

**Technical (deferred)**
- Redis / ElastiCache, multi-instance, ALB/ASG
- Push notifications (iOS PWA constraints)
- Multi-language UI; native mobile apps; self-hosted video
- Offline-first manager scanner

---

## 11. Changelog

### v3.0 → v4.0

| Area | v3.0 | v4.0 |
|---|---|---|
| Authentication | Google OAuth only | Email OTP (Better Auth) |
| Registration | Per-role | Two front doors, one identity, manager-as-later-role |
| Email | Resend | AWS SES |
| Reverse proxy / TLS | Caddy / auto Let's Encrypt | Nginx / Cloudflare Origin Cert (Full-Strict) |
| Medical data | Absent | Two entities + visibility matrix + minor handling |
| Referee | Absent | Referee name on match → match report |
| Attendance | Player only | Two-level: team (organizer) + player (manager) |
| Team join | Organizer-invited | Self-service join + organizer approval |
| Player onboarding | — | Club-code self-join; manager-created claimable accounts |
| Format gate | Overlapping ranges (4–8 / 12–16 / 20–24) | ≤8 / 9–16 / 17–32 (non-overlapping) |
| Pricing | RM200 base + RM10/team | Organizer ≤8 free / 9–16 RM100 / 17–32 RM150; Player & Manager PRO (future) |
| Staff roles | — | Manager = coach/S&C/medical in MVP; separate accounts future |
| Release bands | "Pilot" | "Alpha" + explicit MVP / Alpha / Future bands |
| Future section | — | Added (§10) |

### v4.0 → v4.1

| Area | v4.0 | v4.1 |
|---|---|---|
| Visual Identity §5 | Sparse (9 lines); two wrong hex values (`#0D3B2E` as primary, `#FFD700` as gold) | Full design system spec: correct palette (§5.1), typography Lexend+Inter (§5.2), brutalist shadow scale (§5.3), sidebar sub-theme tokens (§5.4), PWA branding (§5.5) |
| Companion docs | MVP PRD v1.2, Tech PRD v2.1 | MVP PRD v1.3, Tech PRD v2.2 |

---

*End of Master PRD v4.1. Aligned with MVP PRD v1.3 and Tech PRD v2.2.*
