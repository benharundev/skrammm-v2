# Skrammm — Master Product Requirements Document

**Version:** 1.0  
**Date:** July 2026  
**Status:** Living Document  
**Audience:** Founders, investors, all product stakeholders

---

## 1. Vision & Mission

Skrammm is Southeast Asia's first end-to-end rugby tournament management platform. It exists because competitive rugby — from grassroots club sevens to national association tournaments — has long been managed through a fragile combination of WhatsApp groups, spreadsheets, and manual scorekeeping on the sideline. Organizers broadcast scores to an audience that has no reliable way to follow along. Players have no portable career record, no objective measure of their reliability, and no way to demonstrate value to a new club. Team managers track attendance in notebooks and set lineups over WhatsApp the night before a match.

Skrammm replaces all of that with a single, connected platform: a tournament management suite for organizers, an operations hub for team managers, a personal career record for players, and a live spectator experience for fans. The mission is to make competitive rugby accessible, transparent, and data-driven — from the smallest grassroots festival to the largest association tournament in the country.

Malaysia is the launch market. The product is built with the cultural and operational realities of Malaysian rugby in mind: Billplz as the payment processor, Bahasa Malaysia and English as the target languages, AWS SES delivery for OTP in the Malaysian region, and a data model that reflects how Malaysian rugby tournaments are actually structured (group stages feeding knockout rounds, 7s and 15s formats, multi-pitch festival days).

---

## 2. Product Overview

Skrammm is served from two domains. The marketing and spectator surface lives at `skrammm.com` — no login required. The application suite for organizers, team managers, and players lives at `app.skrammm.com`. Both domains are served by the same Next.js application but routed to separate parts of the codebase.

The product has four distinct surfaces, each serving a different audience with different needs:

**The Organizer Portal** is where a tournament is born and run. An organizer creates a tournament, configures the format and schedule, approves teams, manages the live match center during competition days, and locks results at the end. Everything that happens in the organizer portal becomes the source of truth for the entire platform. Match events recorded here flow downstream to player stats, to the TM's squad view, and to the public spectator page.

**The Team Manager Portal** is the operational hub for a rugby club. A manager builds their squad, adds player profiles, sets the match-day lineup, and checks players in using a QR scan on the day. The TM is the intermediary between the organizer's tournament and the players on the pitch. They join tournaments by entering a code, and they receive visibility into their team's reliability scores and performance trends.

**The Player Portal** is the personal career record for every registered rugby player. Players claim their profile by entering a unique player ID code given to them by their manager. Once claimed, all match events recorded by the organizer — tries, cards, stats — are reflected in the player's profile. The RRS (Reliability Rating System) score is the centrepiece: a single metric that quantifies how reliable a player is based on attendance, punctuality, discipline, and on-field performance.

**The Spectator Surface** is the public face of a tournament. Any tournament with a live status is accessible at `skrammm.com/[tournament-code]`. It shows live scores, group standings, and the knockout bracket. No account is required. This is the surface that a player shares with their family, or that a journalist uses to follow the action from the media stand.

These four surfaces share a single database. The connection between them is not just architectural — it is the product's core promise. An organizer records a try in the match center. That event immediately updates the live score on the spectator page via Server-Sent Events. When the match is locked, it recomputes the scorer's RRS. The TM sees the player's updated score in their squad view the next time they log in. One piece of data, four surfaces, zero re-entry.

---

## 3. Target Users

### 3.1 Organizer

The organizer is typically a tournament director, a rugby association official, or a senior club administrator who has been tasked with running a competition. They are comfortable enough with technology to manage a spreadsheet or a Facebook event page, but they are not developers. They care deeply about running a smooth, professional-looking tournament — one where scores are broadcast accurately, teams are managed fairly, and the post-tournament record is trustworthy.

Their current pain is operational: they spend enormous time manually coordinating team registrations over WhatsApp, broadcasting scores to group chats one by one, and compiling match reports in Excel after the fact. They have no real-time tool for tracking whether a match is in progress, and they have no persistent record of past tournaments that they can share with sponsors or players.

Skrammm gives the organizer a professional control centre. From the moment a tournament is created to the moment the final is locked, every operation lives in one place.

### 3.2 Team Manager

The team manager is a club head coach, captain, or club secretary who manages the operational side of a team's tournament participation. They typically run a squad of 15–30 players, manage registrations with multiple tournaments per season, and are responsible for ensuring players show up on time and perform.

Their current pain is split across two problems. First, squad management is informal: player records exist in their head or in a WhatsApp contact list, and there is no centralised record of who is available, injured, or unreliable. Second, match-day operations are manual: attendance is called in person, lineups are shouted across a changing room, and there is no audit trail of who was where.

Skrammm gives the TM a permanent squad record, a one-tap lineup setter, and a QR-based attendance system that creates an objective check-in record for every match.

### 3.3 Player

The player is an active rugby player, typically aged 18–35, playing in competitive club or association rugby in Malaysia. They are mobile-first, comfortable with apps, and likely share performance content on Instagram or TikTok. Many play for more than one club across different tournaments.

Their current pain is that they have no portable career record. If they want to join a new club, they describe their experience in words. There is no objective data. Coaches make selection decisions based on reputation and word of mouth. Players with strong attendance and discipline records have no way to demonstrate that to a new team.

Skrammm gives the player a verified performance card: match history, try count, cards, and most importantly the RRS score — a number that travels with them across clubs and tournaments.

The platform also supports minor players (under 18). These players have a guardian name and contact stored on their profile, and the system treats them accordingly in any medical or emergency context.

### 3.4 Spectator

The spectator is a family member, a fan, a journalist, or a scout who wants to follow a live tournament without needing an account. They are on their phone in the stands or watching from home. They want to know the score, who scored, and where their team stands.

Skrammm's public spectator page serves this audience with an ISR-rendered page that refreshes every 30 seconds and receives live score events via a lightweight client-side poll or SSE connection. No login, no download, no friction.

---

## 4. Core Value Propositions

### 4.1 The Reliability Rating System (RRS)

The RRS is Skrammm's most distinctive feature and its primary defensible differentiator. No other rugby management platform offers a player-level accountability metric that combines attendance, punctuality, discipline, and on-field performance into a single score.

The RRS v2 formula assigns every match a base participation score of 50 points, adds weighted bonuses for tries (×10), conversions (×3), and drop goals (×4), applies an outcome bonus (win = +10, draw = +5), and deducts penalties for yellow cards (−15) and red cards (−40). The result is then multiplied by a format weight — elimination tournaments (1.5×) count more than tiered (1.0×) or festival (0.7×) competitions. A player who does not appear scores 0 for that match regardless of circumstances.

The career RRS is not a simple average. It applies a risk-aversion adjustment: `career = mean − (0.5 × standard deviation)`. A player with a consistent score of 60 is rated higher than one who alternates between 90 and 30. This reflects the real value teams place on reliability over brilliance.

RRS scores are cached in Redis, invalidated on card events and match lock, and are fully unit-tested in `src/modules/reliability/rrs-engine.test.ts`.

### 4.2 Live Match Scoring with Real-Time Broadcast

The match center is the operational heart of the organizer portal, and the SSE stream is what makes it broadcast-quality. When an organizer records a try, the scoreboard on the spectator page updates in under a second — no polling, no page refresh. The commentator view at `/organizer/match/[matchId]/commentator` is a dedicated read-only broadcast screen designed for a second monitor or a stadium display, showing live lineups, scorer spotlights, and a full performance stats breakdown computed entirely from the event stream.

This is not a feature that can be bolted on later. It is architecturally central: every event flows through the same pub/sub bus and is received by every connected client simultaneously. The design is intentionally swap-safe — today it runs on an in-process EventEmitter, and when Skrammm scales beyond a single server it can be replaced with Redis Pub/Sub without changing a line of calling code.

### 4.3 End-to-End Tournament Lifecycle

Skrammm covers the entire lifecycle of a tournament without requiring the organizer to leave the platform or export data to another tool. The journey is: tournament creation via a guided 4-step wizard → team registration and approval → schedule setup → live match scoring on match day → automated standings computation → post-match reports → historical record. Every step lives in one database, one interface, one source of truth.

This matters because the alternative — the WhatsApp + spreadsheet stack — breaks at every handoff. Data entered in a spreadsheet cannot update a live score broadcast. A score sent in a WhatsApp group cannot auto-update a standings table. Skrammm removes all of those handoffs.

### 4.4 Cross-Portal Data Consistency

The platform's guarantee is that data enters the system exactly once and flows to every relevant surface automatically. An organizer records a red card in the match center. That event immediately decrements the player's RRS score. It appears on the player's profile the next time they log in. The TM sees the player's updated discipline record in the squad view. The spectator page shows the card marker on the live score feed. No re-entry, no synchronisation step, no lag.

This is only possible because all three portals share one data model. There is no separate "organizer database" or "player app backend". The `MatchEvent` table is the single source of truth for everything derived from a match.

---

## 5. Business Model

Skrammm operates on a freemium SaaS model. The free tier allows an organizer to run one active tournament with up to 16 teams and access to all core scoring and management features. This is generous enough to onboard most grassroots tournament organizers without a credit card, and it means the platform gets real-world usage data from day one.

Paid tiers will unlock the features that larger tournaments and associations need: higher team counts, multi-pitch management, custom tournament branding (logo, colours), advanced analytics exports, and priority support. A "Pro" tier targets club organizers running 20–32 team competitions. An "Association" tier targets regional or national bodies running multi-tournament seasons.

The payment processor is Billplz, which is both natively Malaysian and already scaffolded in the codebase (`modules/payment/service.ts` handles the Billplz webhook and signature verification). Currency is MYR throughout. The Billing section of the organizer settings currently shows a "Free Plan" indicator and an "Upgrade to Pro" button; the Billplz checkout flow is the next billing milestone.

The long-term revenue model is not purely transactional. Tournament data is valuable to sponsors, scouts, and associations. Once a critical mass of tournaments is running on Skrammm, there is a clear path to data licensing, sponsored tournament packages, and federation-level contracts.

---

## 6. Product Phase Map

The three portals are at different maturity levels. This is intentional: the organizer portal is the demand driver — without it, there is no data for players or TMs to consume. Organizer was therefore prioritised to MVP and beyond first.

| Portal | Current Phase | What Is Complete | Next Milestone |
|---|---|---|---|
| Organizer | **Alpha** | Full match center, real-time SSE, commentator view, team approval, schedule management, tournament wizard, match report, group standings | Settings persistence, groups editor save, knockout bracket auto-generation, Billplz billing |
| Player | **MVP** | Profile, RRS v2 display, match statistics, tournament drill-down, share cards, medical profile, QR token | Fix 4 documented bugs, then post-MVP push notifications |
| Manager | **MVP** | Squad management, add/edit player, lineup setter, attendance QR scanning, club settings, logo upload | Fix 4 documented bugs (esp. hard-delete), then post-MVP attendance roster |
| Spectator | **MVP** | ISR public tournament page, live standings, knockout bracket, join wizard UI shell | Wire join wizard to server actions, then sponsor integration |

---

## 7. Long-Term Product Roadmap

### Phase 1 — Alpha Completion (target: ~3 months)

The goal of Phase 1 is to close every known gap between what the UI promises and what the database actually stores. The organizer settings page currently saves nothing to the DB — all tournament configuration (name, format rules, visibility, pitches) lives in local React state and is lost on refresh. Group assignments are the same: the drag-and-drop editor is fully functional in the browser but `saveChanges` never calls a server action. The knockout bracket always shows "TBD" for SF and Final positions even when QF results are locked.

Phase 1 also includes wiring the billing layer. The `Payment` model and `handleBillplzWebhook` function already exist in the codebase — Phase 1 completes the checkout flow from the "Upgrade to Pro" button through to plan activation.

For the player and manager portals, Phase 1 is primarily bug fixes: the four player portal bugs (tries chart, tournament share card reliability, free-text position field, dead OTP schema) and the four manager portal bugs (no attendance roster view, hard-delete player, orphaned duplicate file, misleading sample squad banner).

### Phase 2 — Beta (target: ~6 months from Phase 1 completion)

Phase 2 is about expanding the platform beyond the organizer-centric workflow and building the engagement loops that bring players and managers back to the app repeatedly.

Push notifications are the central capability of Phase 2. Players need to receive a notification when their lineup is confirmed. Managers need to know when the organizer approves their team or publishes the schedule. This requires a notification adapter (`lib/notifications/`) backed by Firebase Cloud Messaging or OneSignal, and a notification preference model.

The spectator join wizard (at `skrammm.com/[code]/join`) exists as a UI shell but is not wired to any server action. Wiring it means a team manager can register their club directly from the public tournament page, which dramatically reduces the friction of tournament participation and removes the need for organizers to manually invite every team.

Sponsor management is the revenue expansion play. The `Sponsor` model is fully defined in the schema (name, logo, click URL, tier, impressions, clicks). Phase 2 builds the organizer UI to add sponsors to a tournament and the spectator page integration to display them with click and impression tracking.

Share card improvements target the viral growth loop. The current career and tournament PNG cards are functional but basic. Phase 2 upgrades them with Instagram Stories dimensions, animated try and card sequences, and a QR code linking back to the public spectator page.

### Phase 3 — General Availability (target: ~12 months from Phase 2 completion)

Phase 3 is the platform maturity phase. Multi-tournament organizer dashboards allow an association to manage a full season across multiple competitions from a single view. White-label tournament pages let sponsors or associations brand the spectator experience with their own identity. The medical and injury dashboard gives organizers and team physios visibility into the `PlayerMedicalProfile` and `MatchInjuryReport` data that is already being collected but not yet surfaced in a dedicated UI.

Video URL integration adds a link-to-highlight feature per match. National federation data export opens a path to integration with World Rugby's data systems for national selection tracking. The PWA service worker (already scaffolded via Serwist) is promoted to a first-class mobile experience with offline-capable lineup setting and QR scanning.

---

## 8. Success Metrics

Skrammm's success is measured differently at each stage of the funnel.

**Acquisition**: number of new tournaments created per month, percentage of those tournaments that reach the "live" status (i.e., at least one match scored). A tournament that is created but never run represents a failed onboarding.

**Engagement**: daily active users during live match days (organizer + spectators), percentage of players who claim their player ID within 7 days of the tournament starting, share card generation count per tournament.

**Retention**: percentage of organizers who run a second tournament on Skrammm within 6 months, RRS engagement rate (percentage of claimed players who view their RRS breakdown at least once).

**Revenue**: payment conversion rate from free to Pro tier, average revenue per paying tournament, time to first payment from tournament creation.

**Quality**: tournament completion rate (tournaments that reach "completed" status without data loss), SSE uptime during live match days, match center event error rate.

---

## 9. Non-Goals

The following are explicitly outside the scope of Skrammm's current roadmap, to prevent scope creep and maintain focus on the core rugby tournament management use case:

**Video streaming and hosting.** Skrammm stores a video URL per match (the field exists in the schema) but does not host, transcode, or stream video. Integration with YouTube or Vimeo links is a future consideration, not a core feature.

**Betting and fantasy sports.** Skrammm produces match data that could theoretically feed a betting or fantasy product. That is not a direction the platform will pursue in any current phase.

**National federation integrations.** World Rugby and national union data systems are targets for Phase 3 at the earliest. In the current roadmap, Skrammm is a standalone platform that does not import from or export to any external federation system.

**White-label mobile applications.** Skrammm is a web-first product. The PWA service worker provides a near-native mobile experience without the overhead of maintaining separate iOS and Android apps for early-stage growth.

**Non-rugby sports.** The data model, RRS formula, scoring event types, and tournament formats are all designed specifically for rugby union (15s and 7s). Adapting the platform to football, cricket, or other sports is not in scope.
