# Design Spec: TM Portal UI Sync & Tournament Enhancements

**Date**: 2026-06-07
**Status**: Draft
**Topic**: Syncing dropdown designs and adding tournament stats/joining to the Team Manager portal.

## 1. Overview
The Team Manager (TM) portal currently has a slightly different UI feel than the Organizer portal. This spec aims to synchronize the aesthetic (specifically dropdowns) and add requested functionality to the `/tm/tournaments` page.

## 2. UI Synchronization: Dropdowns
All `<select>` and `DropdownMenu` components in the TM portal will be updated to match the Organizer's "Rugby Pitch Utility" style.

### Style Definition
- **Component**: Native `<select>` or shadcn `Select`.
- **Height**: `h-11` for primary inputs.
- **Border**: `border-2 border-border`.
- **Background**: `bg-card`.
- **Radius**: `rounded-sm`.
- **Focus**: `focus:border-fair-play-gold focus:ring-0`.
- **Shadow**: `shadow-brutalist-sm` (3px 3px 0 var(--navy) or matching).
- **Typography**: Lexend for labels (if applicable), Inter for options.

## 3. Tournaments Page (/tm/tournaments)

### 3.1 Join Tournament Feature
- **Placement**: Top of the page, full width.
- **Visuals**: Card with `border-fair-play-gold` and `shadow-brutalist`.
- **Content**: 
    - Heading: "Join Tournament"
    - Subtext: "Enter the code provided by your tournament organizer."
    - Input: Large uppercase mono input for the code.
    - Button: "Join" with brutalist shadow.

### 3.2 Tournament & Match Stats
- **Summary Stats**: A row of small KPI cards:
    - Matches Played
    - Win/Draw/Loss Record
    - Total Points (if applicable)
- **Match History**: A list of past matches.
    - Each row: Result indicator (W/L/D), Score (e.g., 24 - 12), Opponent Name, Tournament Name.
    - Style: Compact rows with `border-b`.

## 4. Technical Implementation
- **Module Updates**:
    - `src/modules/match/service.ts`: Ensure `getPastMatchesForTeam(teamId)` is available.
    - `src/modules/team/service.ts`: `joinTournamentByCode` logic already exists, ensure it handles errors gracefully.
- **Page Updates**:
    - `src/app/(app)/tm/tournaments/page.tsx`: Fetch stats and matches.
    - `src/app/(app)/tm/attendance/_client.tsx`: Update select styles.

## 5. Verification Plan
- **UI Check**: Verify all dropdowns in TM portal look identical to Organizer portal.
- **Functional Check**: 
    - Test joining with a valid/invalid code.
    - Verify stats are calculated correctly from past matches.
- **Responsive Check**: Ensure the new stats cards/list look good on mobile.
