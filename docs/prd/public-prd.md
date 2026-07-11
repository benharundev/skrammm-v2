# Public Site — Club Directory Product Requirements Document

**Version:** 1.0  
**Date:** July 2026  
**Phase:** Alpha  
**Audience:** Product, design, public-facing stakeholders

---

## 1. Overview

The Public Club Directory is a discover-and-register portal at `skrammm.com/clubs`. It serves two distinct user flows:

1. **Player Discovery**: Rugby players searching for clubs in their area can browse a split-view directory (card list + Leaflet map), filter by proximity, and view full club profiles. No login required.
2. **Manager Self-Registration**: Club managers can register their club in a 4-step wizard, verify their email via OTP, and go live in the directory immediately. The same account works for the team manager portal at `app.skrammm.com/tm` — no separate signup.

The directory is inspired by petakopi.my (coffee shop discovery app) and prioritizes locality-first design: clubs are sorted by distance when geolocation is available, alphabetically as fallback. Each club shows training schedule, contact information, and a badge indicating openness to new players.

---

## 2. User Stories

### 2.1 US-1: Player Discovery

**As a rugby player, I want to find the nearest rugby club so I can train with them.**

**Acceptance Criteria**:
- Player opens `skrammm.com/clubs` and sees a split-view layout: scrollable card list on the left, Leaflet map on the right (OSM tiles, no API key required).
- On page load, browser requests geolocation. If granted, clubs are sorted by proximity (nearest first). If denied or timeout, clubs are sorted alphabetically.
- Each club card displays: logo (or club initials fallback), club name, area/city, distance (if geolocation granted), short training days summary (e.g. "Mon, Wed, Fri 19:00"), and an "Open to players" badge.
- Player can click a card to view full club profile (see section 2.3).
- A search input filters clubs by name or area (client-side, case-insensitive substring match).
- Map pins sync with card list: clicking a pin highlights the corresponding card; hovering a card highlights its map pin.
- Header includes a "Register your club" CTA button (calls-to-action link to `/clubs/register`).
- No authentication is required to browse the directory.
- Page revalidates every 60 seconds (ISR, incremental static regeneration).

### 2.2 US-2: Manager Self-Registration

**As a club manager, I want to register my club so I can receive enquiries from players.**

**Acceptance Criteria**:
- Manager navigates to `skrammm.com/clubs/register`.
- A 4-step wizard guides registration: Club Info → Location → Training Schedule → Email Verification.
- Wizard state is held client-side only; abandoned wizards do not create database records (no ghost entries).
- On final submit (after OTP verification), the system atomically creates a `Team` record (marked `isPublic = true`), a `TeamStaff` record (manager role), and `TrainingSlot` records, then sets the session cookie and redirects to `app.skrammm.com/tm` (the team manager portal).
- Manager can now log in to the app portal and edit their club listing from `/tm/settings` (see section 2.4).
- The club appears in the public directory immediately — no moderation queue.

**Email Verification Flow**:
- Step 4 (Verify) collects the manager's email and a "Send Code" button triggers the existing SES email OTP flow.
- Manager enters the 6-digit code into a code input.
- On valid OTP, `submitRegistration` server action calls `auth.api.verifyOTP({ email, otp })` (reusing the same auth instance as the app portal) and creates the team atomically.
- Session cookie is set; redirect to app portal.
- If OTP fails, user is prompted to re-request a code (no retries limit at this phase — soft limit via SES throttling).

### 2.3 Club Profile Page

**Route**: `GET /skrammm.com/clubs/[slug]`

**Acceptance Criteria**:
- Profile page shows the club's full public information.
- Layout: left sidebar contains a Leaflet mini-map centred on the club pin, full address text below map, and tappable email/phone links (e.g. `mailto:` and `tel:`).
- Right content area displays: club name and logo at top, "Open to players" badge, club description (markdown or plain text, max 500 chars), structured training schedule as a table (columns: Day, Time, Venue), and recent tournament badges showing tournaments the club has participated in (data from `TournamentTeam` where `status = approved`).
- v1 does not include a contact form; only email/phone links are shown.
- Page revalidates every 60 seconds (ISR).
- If the club does not exist or is not marked `isPublic = true`, return `notFound()`.

### 2.4 Manager Public Listing Settings

**Route**: `GET/POST /app.skrammm.com/tm/settings` (new section)

**Acceptance Criteria** (extends existing settings page):
- New "Public Listing" card appears below existing team settings.
- Card includes:
  - Toggle: "Publish to club directory" (`isPublic` boolean). Default is `false`; manager must explicitly opt in.
  - Description textarea: free text, max 500 characters, with character count. Accepts markdown or plain text.
  - Location field: address search box (powered by `/api/geocode` proxy to Nominatim), Leaflet map pin (draggable to fine-tune coordinates). Same UX as wizard step 2.
  - Training slots editor: table showing current slots (day, start time, end time, venue) with Add Row and Delete Row actions.
- On save, `updateTeamSettings` and `upsertTrainingSlots` are called (server actions in `/tm/settings/actions.ts`).
- Changes are reflected in the public directory within 60 seconds (ISR revalidation).

---

## 3. Registration Wizard — Step Details

### 3.1 Step 1: Club Info

**Fields**:
- Club name (required, max 100 chars, text input, trimmed)
- Description (optional, max 500 chars, textarea)
- Contact email (required, valid email format)
- Contact phone (required, E.164 international format, validated)

**Next button**: Enabled once required fields are filled.

**State saved**: Stored in React component `useState`; cleared on wizard close.

### 3.2 Step 2: Location

**UX**:
- Address search input (powered by `/api/geocode` Nominatim proxy).
- As user types, dropdown shows up to 5 suggestions (address name + coordinates).
- Clicking a suggestion populates the map and sets `lat`, `lng`, `address`.
- Map is a Leaflet map with a draggable red pin; moving the pin updates coordinates and triggers a reverse-geocode (optional — can defer to v2).
- "Confirm" button advances to step 3 once coordinates are set.

**Address Parsing**:
- Nominatim returns `lat`, `lon`, and `display_name`. We store all three.
- Example: "25 Arthur Street, Dublin 7, Ireland" → lat=53.3524, lng=-6.2889, address="25 Arthur Street, Dublin 7, Ireland"

### 3.3 Step 3: Training Schedule

**UX**:
- Table with columns: Day of Week, Start Time (HH:mm), End Time (HH:mm), Venue (optional).
- Days are radio buttons (Mon–Sun).
- Times are time inputs (HTML5 `<input type="time">`).
- Venue is a text input (optional; if left blank, club's main training ground is used as fallback).
- "Add Slot" button: appends a new empty row.
- "Delete" button per row: removes that slot.
- At least one slot is encouraged (not required; club can have zero slots initially).

**State saved**: Array of `{ dayOfWeek: number, startTime: string, endTime: string, venue?: string }`.

### 3.4 Step 4: Email Verification

**UX**:
- Manager's email (from step 1) is displayed read-only.
- "Send Code" button calls `/api/clubs/register` with a temporary `verifyOnly = true` flag to trigger SES send.
- Manager enters 6-digit code in a code input.
- "Verify & Submit" button calls `submitRegistration` server action with all wizard data + OTP code.
- On success: session cookie set, redirect to `app.skrammm.com/tm`.
- On error: error message shown (invalid OTP, email validation failed, etc.); manager can retry.

---

## 4. Feature Scope

### In Scope (v1)
- Split-view directory (card list + Leaflet map) with geolocation sorting
- Club profile page with sidebar map and training schedule table
- 4-step manager registration wizard
- Email OTP verification (reusing existing auth flow)
- Public listing settings in TM portal
- Nominatim geocoding (free, no API key)
- ISR revalidation (60-second cache)

### Out of Scope (v1)
- Contact/enquiry form (show email/phone only)
- Player-side club bookmarking or favorites
- Admin moderation dashboard
- Club type/format filters (7s vs 15s rugby, social vs competitive)
- Review/rating system
- Waitlist or application queue
- Analytics dashboard for club managers
- Multi-language support
- Advanced search (by location radius, distance limit, etc.)

---

## 5. API Contracts

### 5.1 `GET /api/clubs`

Returns paginated list of public teams.

**Query Parameters**:
- `page` (optional, default 1): page number
- `limit` (optional, default 50): results per page

**Response**:
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Dublin Rugby Club",
      "slug": "dublin-rugby-club",
      "logo": "https://cdn.skrammm.com/...",
      "city": "Dublin",
      "lat": 53.3524,
      "lng": -6.2889,
      "address": "25 Arthur Street, Dublin 7, Ireland",
      "description": "Community rugby club for all ages.",
      "trainingSlots": [
        { "dayOfWeek": 0, "startTime": "19:00", "endTime": "21:00", "venue": "Donnybrook Stadium" }
      ]
    }
  ],
  "total": 150,
  "page": 1,
  "limit": 50
}
```

### 5.2 `GET /api/clubs/[slug]`

Returns full club profile with tournament history.

**Response**:
```json
{
  "id": "uuid",
  "name": "Dublin Rugby Club",
  "slug": "dublin-rugby-club",
  "logo": "https://cdn.skrammm.com/...",
  "city": "Dublin",
  "lat": 53.3524,
  "lng": -6.2889,
  "address": "25 Arthur Street, Dublin 7, Ireland",
  "description": "Community rugby club for all ages.",
  "contactEmail": "manager@dublinrugby.ie",
  "contactPhone": "+353 1 234 5678",
  "trainingSlots": [
    { "dayOfWeek": 0, "startTime": "19:00", "endTime": "21:00", "venue": "Donnybrook Stadium" }
  ],
  "tournaments": [
    {
      "id": "uuid",
      "name": "Summer Sevens 2026",
      "year": 2026,
      "status": "approved"
    }
  ]
}
```

### 5.3 `POST /api/clubs/register`

Initiates OTP send or verifies OTP and creates team.

**Mode 1: Send OTP** (`verifyOnly: false`, manager just entered email)
```json
{
  "email": "manager@dublinrugby.ie",
  "verifyOnly": false
}
```
Response: `{ "success": true, "message": "Code sent to email" }`

**Mode 2: Verify & Create** (`verifyOnly: true`, manager entered OTP + wizard data)
```json
{
  "email": "manager@dublinrugby.ie",
  "otp": "123456",
  "name": "Dublin Rugby Club",
  "description": "Community rugby club",
  "contactEmail": "manager@dublinrugby.ie",
  "contactPhone": "+353 1 234 5678",
  "address": "25 Arthur Street, Dublin 7, Ireland",
  "lat": 53.3524,
  "lng": -6.2889,
  "trainingSlots": [
    { "dayOfWeek": 0, "startTime": "19:00", "endTime": "21:00", "venue": "Donnybrook Stadium" }
  ]
}
```
Response: `{ "success": true, "redirect": "https://app.skrammm.com/tm" }`

Error: `{ "success": false, "error": "Invalid OTP" }`

### 5.4 `GET /api/geocode?q=...`

Nominatim proxy to avoid browser CORS issues.

**Query Parameters**:
- `q` (required): search query (e.g. "25 Arthur Street, Dublin")

**Response** (pass-through from Nominatim):
```json
[
  {
    "lat": "53.3524",
    "lon": "-6.2889",
    "display_name": "25 Arthur Street, Dublin 7, Ireland"
  }
]
```

---

## 6. Routes & Files

**Public Routes** (no auth):

| Route | File | Rendering | ISR |
|---|---|---|---|
| `/clubs` | `src/app/(marketing)/clubs/page.tsx` | RSC (data) + CC (`_client.tsx`) | 60s |
| `/clubs/[slug]` | `src/app/(marketing)/clubs/[slug]/page.tsx` | RSC | 60s |
| `/clubs/register` | `src/app/(marketing)/clubs/register/page.tsx` | RSC shell + CC (`_client.tsx`) | None |

**API Routes**:

| Route | File | Auth | Purpose |
|---|---|---|---|
| `GET /api/clubs` | `src/app/(app)/api/clubs/route.ts` | None | List public teams |
| `GET /api/clubs/[slug]` | `src/app/(app)/api/clubs/[slug]/route.ts` | None | Fetch club profile |
| `POST /api/clubs/register` | `src/app/(app)/api/clubs/register/route.ts` | None | OTP send/verify + team create |
| `GET /api/geocode` | `src/app/(app)/api/geocode/route.ts` | None | Nominatim proxy |

**TM Portal Changes**:

| Route | File | Change |
|---|---|---|
| `/tm/settings` | `src/app/(app)/tm/settings/page.tsx` | Add "Public Listing" section |
| `/tm/settings` | `src/app/(app)/tm/settings/actions.ts` | New `updatePublicListing` server action |

---

## 7. Acceptance Criteria Summary

- [ ] Directory page loads with all public teams sorted by distance (or alphabetically if no geolocation).
- [ ] Map and card list stay in sync when clicking/hovering.
- [ ] Search filters teams by name or city.
- [ ] Club profile page shows all details: logo, description, training schedule, contact info, tournament history.
- [ ] Registration wizard completes all 4 steps and creates account + team atomically.
- [ ] Email OTP verification works and redirects manager to TM portal.
- [ ] TM settings page includes "Public Listing" editor.
- [ ] Published clubs appear in directory within 60 seconds.
- [ ] ISR revalidation works correctly (60-second cache).
- [ ] Nominatim geocoding returns results for common addresses (tested with Dublin, London, Paris).

---

## 8. Design System

- Use Tailwind v4 tokens from `src/styles/theme.css` — no hardcoded hex values.
- Split-view layout: Flexbox, left card list 40% width (scrollable), right map 60% width (fixed).
- Club cards: use shadcn/ui `Card` component with logo, name, distance pill, training summary, badge.
- Forms: use shadcn/ui `Input`, `Textarea`, `Select`, `Button`.
- Map: Leaflet + react-leaflet, OSM tiles.
- Responsiveness: mobile-first. On mobile, stack layout (card list 100%, map below) or hide map; provide a "Show Map" toggle.

---

## 9. Success Metrics

- Clubs in directory: > 100 by end of Q3
- Player directory page visits: > 1000/month
- Registration completion rate: > 70% (started wizard → submitted)
- Manager retention (still `isPublic = true` after 30 days): > 80%
