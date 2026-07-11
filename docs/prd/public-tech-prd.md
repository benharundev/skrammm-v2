# Public Site — Technical PRD

**Version:** 1.0  
**Date:** July 2026  
**Phase:** Alpha  
**Audience:** Engineering team

---

## 1. Data Model Changes

### 1.1 Extend `Team` Model

Add the following fields to `prisma/schema.prisma`:

```prisma
model Team {
  // ... existing fields ...
  
  isPublic    Boolean  @default(false)   // Opt-in to appear in public directory
  description String?  @db.VarChar(500)  // Club description (markdown or plain text)
  lat         Float?                      // Training ground latitude
  lng         Float?                      // Training ground longitude
  address     String?                     // Human-readable address from Nominatim
  
  // Relation to training slots
  trainingSlots TrainingSlot[]
}
```

### 1.2 New `TrainingSlot` Model

Add a new model to `prisma/schema.prisma`:

```prisma
model TrainingSlot {
  id        String   @id @default(cuid())
  teamId    String
  team      Team     @relation(fields: [teamId], references: [id], onDelete: Cascade)
  
  dayOfWeek Int      // 0 = Monday, 1 = Tuesday, ..., 6 = Sunday
  startTime String   // ISO time format, e.g. "19:00" (HH:mm)
  endTime   String   // ISO time format, e.g. "21:00" (HH:mm)
  venue     String?  // Optional; overrides team.trainingGround if set
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@map("training_slots")
  @@index([teamId])
}
```

**Notes**:
- `dayOfWeek` is an integer (0–6 for Mon–Sun) to enable sorting and range queries.
- `startTime` and `endTime` are stored as HH:mm strings (no timezone; assume local time for the club's location).
- `venue` is optional; when null, the UI defaults to the team's `trainingGround` field.
- `onDelete: Cascade` ensures training slots are deleted when a team is deleted.

### 1.3 Migration

After updating the schema, run:
```bash
pnpm db:generate
pnpm db:migrate
```

This creates a migration file in `prisma/migrations/` and regenerates the Prisma client.

---

## 2. Module Layer — Team Service Extensions

**File**: `src/modules/team/service.ts` (existing file, extend with new functions)

**File**: `src/modules/team/index.ts` (re-export new functions)

### 2.1 `listPublicTeams(page?: number, limit?: number)`

Fetches paginated list of public teams with training slots.

```typescript
export async function listPublicTeams(page = 1, limit = 50) {
  const skip = (page - 1) * limit;
  
  const [teams, total] = await Promise.all([
    db.team.findMany({
      where: { isPublic: true },
      include: { trainingSlots: { orderBy: { dayOfWeek: "asc" } } },
      orderBy: { name: "asc" },
      skip,
      take: limit,
    }),
    db.team.count({ where: { isPublic: true } }),
  ]);
  
  return { teams, total, page, limit };
}
```

**Returns**: `{ teams: Team[], total: number, page: number, limit: number }`

**Used by**: `GET /api/clubs` route handler.

### 2.2 `getTeamPublicBySlug(slug: string)`

Fetches a single public team with full profile data (training slots, tournament history).

```typescript
export async function getTeamPublicBySlug(slug: string) {
  return db.team.findFirst({
    where: {
      slug: slug,
      isPublic: true,
    },
    include: {
      trainingSlots: { orderBy: { dayOfWeek: "asc" } },
      tournamentTeams: {
        where: { status: "approved" },
        include: { tournament: true },
      },
    },
  });
}
```

**Returns**: `Team | null`

**Used by**: `GET /api/clubs/[slug]` route handler, `src/app/(marketing)/clubs/[slug]/page.tsx`.

### 2.3 `createTeamWithSlots(data: CreateTeamWithSlotsInput)`

Atomically creates a `Team`, `TeamStaff` (manager), and `TrainingSlot` records in a transaction. Used by the registration wizard.

```typescript
export interface CreateTeamWithSlotsInput {
  name: string;
  description?: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  lat: number;
  lng: number;
  userId: string; // The manager's user ID
  trainingSlots: Array<{
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    venue?: string;
  }>;
}

export async function createTeamWithSlots(input: CreateTeamWithSlotsInput) {
  const { name, description, contactEmail, contactPhone, address, lat, lng, userId, trainingSlots } = input;
  
  return db.$transaction(async (tx) => {
    // 1. Create Team
    const team = await tx.team.create({
      data: {
        name,
        description: description || null,
        email: contactEmail,
        phone: contactPhone,
        address,
        lat,
        lng,
        isPublic: true, // Public by default on creation
        slug: generateSlug(name), // Helper function to create URL-safe slug
      },
    });
    
    // 2. Create TeamStaff (manager)
    await tx.teamStaff.create({
      data: {
        userId,
        teamId: team.id,
        isPrimaryManager: true,
      },
    });
    
    // 3. Create TrainingSlots
    if (trainingSlots.length > 0) {
      await tx.trainingSlot.createMany({
        data: trainingSlots.map((slot) => ({
          ...slot,
          teamId: team.id,
        })),
      });
    }
    
    return team;
  });
}
```

**Error handling**: Transaction rolls back if any step fails. Catch and return error to caller.

**Used by**: `POST /api/clubs/register` route handler (server action).

### 2.4 `upsertTrainingSlots(teamId: string, slots: TrainingSlotInput[])`

Replaces all training slots for a team (delete old, create new). Used by the TM portal settings page.

```typescript
export interface TrainingSlotInput {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  venue?: string;
}

export async function upsertTrainingSlots(teamId: string, slots: TrainingSlotInput[]) {
  return db.$transaction(async (tx) => {
    // Delete all existing slots for this team
    await tx.trainingSlot.deleteMany({ where: { teamId } });
    
    // Create new slots
    if (slots.length > 0) {
      await tx.trainingSlot.createMany({
        data: slots.map((slot) => ({
          ...slot,
          teamId,
        })),
      });
    }
  });
}
```

**Used by**: `POST /tm/settings/actions.ts` (server action for updating public listing).

### 2.5 `updatePublicListing(teamId: string, data: PublicListingInput)`

Updates the public listing fields (description, coordinates, isPublic flag). Does not touch training slots; use `upsertTrainingSlots` for that.

```typescript
export interface PublicListingInput {
  isPublic: boolean;
  description?: string;
  address?: string;
  lat?: number;
  lng?: number;
}

export async function updatePublicListing(teamId: string, data: PublicListingInput) {
  return db.team.update({
    where: { id: teamId },
    data: {
      isPublic: data.isPublic,
      description: data.description ?? undefined,
      address: data.address ?? undefined,
      lat: data.lat ?? undefined,
      lng: data.lng ?? undefined,
    },
  });
}
```

**Used by**: `POST /tm/settings/actions.ts`.

### 2.6 Helper: `generateSlug(name: string): string`

Creates a URL-safe slug from a team name. Example: "Dublin Rugby Club" → "dublin-rugby-club".

```typescript
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "") // Remove special chars
    .replace(/\s+/g, "-")           // Replace spaces with hyphens
    .replace(/-+/g, "-")             // Collapse multiple hyphens
    .slice(0, 50);                   // Cap at 50 chars
}
```

**Note**: Do not add uniqueness constraint in this PRD phase. If collision occurs, append a counter (v2).

---

## 3. API Routes

All routes are in `src/app/(app)/api/` (under the app host, even though they're public-facing).

### 3.1 `GET /api/clubs`

**File**: `src/app/(app)/api/clubs/route.ts`

**Auth**: None (public)

**Query Parameters**:
- `page` (optional, default 1): page number
- `limit` (optional, default 50): items per page

**Response**:
```json
{
  "data": [...],
  "total": 150,
  "page": 1,
  "limit": 50
}
```

**Implementation**:
```typescript
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "50", 10);
  
  const { teams, total } = await listPublicTeams(page, limit);
  
  return Response.json({ data: teams, total, page, limit });
}
```

### 3.2 `GET /api/clubs/[slug]`

**File**: `src/app/(app)/api/clubs/[slug]/route.ts`

**Auth**: None (public)

**Path Parameter**: `slug` (team slug)

**Response**:
```json
{
  "id": "...",
  "name": "...",
  "trainingSlots": [...],
  "tournaments": [...]
}
```

**Implementation**:
```typescript
export async function GET(
  request: Request,
  { params }: { params: { slug: string } }
) {
  const team = await getTeamPublicBySlug(params.slug);
  
  if (!team) {
    return Response.json({ error: "Club not found" }, { status: 404 });
  }
  
  return Response.json(team);
}
```

### 3.3 `POST /api/clubs/register`

**File**: `src/app/(app)/api/clubs/register/route.ts`

**Auth**: None (public)

**Two modes**: OTP send or verify + create.

**Body (mode 1 — send OTP)**:
```json
{
  "email": "manager@club.ie",
  "verifyOnly": false
}
```

**Response**:
```json
{ "success": true, "message": "Code sent to email" }
```

**Body (mode 2 — verify + create)**:
```json
{
  "email": "manager@club.ie",
  "otp": "123456",
  "name": "Club Name",
  "description": "...",
  "contactEmail": "...",
  "contactPhone": "...",
  "address": "...",
  "lat": 53.35,
  "lng": -6.28,
  "trainingSlots": [...]
}
```

**Response on success**:
```json
{ "success": true, "sessionToken": "..." }
```

**Response on error**:
```json
{ "success": false, "error": "Invalid OTP" }
```

**Implementation**:
```typescript
export async function POST(request: Request) {
  const body = await request.json();
  
  if (!body.verifyOnly) {
    // Mode 1: Send OTP
    await auth.api.sendOTP({ email: body.email });
    return Response.json({ success: true, message: "Code sent to email" });
  }
  
  // Mode 2: Verify + Create
  try {
    // Verify OTP
    const session = await auth.api.verifyOTP({
      email: body.email,
      otp: body.otp,
    });
    
    if (!session) {
      return Response.json({ success: false, error: "Invalid OTP" }, { status: 401 });
    }
    
    // Create team atomically
    await createTeamWithSlots({
      name: body.name,
      description: body.description,
      contactEmail: body.contactEmail,
      contactPhone: body.contactPhone,
      address: body.address,
      lat: body.lat,
      lng: body.lng,
      userId: session.user.id,
      trainingSlots: body.trainingSlots,
    });
    
    // Session is already set by auth.api.verifyOTP; return success
    return Response.json({ success: true });
  } catch (error) {
    return Response.json(
      { success: false, error: (error as Error).message },
      { status: 400 }
    );
  }
}
```

### 3.4 `GET /api/geocode?q=...`

**File**: `src/app/(app)/api/geocode/route.ts`

**Auth**: None (public)

**Query Parameter**: `q` (required, search query)

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

**Implementation**:
```typescript
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");
  
  if (!q || q.trim().length === 0) {
    return Response.json({ error: "Query required" }, { status: 400 });
  }
  
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5`,
      {
        headers: {
          "User-Agent": "Skrammm/1.0 (+skrammm.com)", // Required by Nominatim ToS
        },
      }
    );
    
    if (!response.ok) {
      throw new Error("Nominatim API error");
    }
    
    const data = await response.json();
    return Response.json(data);
  } catch (error) {
    return Response.json(
      { error: "Geocoding failed" },
      { status: 500 }
    );
  }
}
```

---

## 4. Public Pages

### 4.1 Directory Page: `/clubs`

**File Structure**:
```
src/app/(marketing)/clubs/
  page.tsx              # RSC, fetches team data, renders ClubDirectoryClient
  _client.tsx           # Client component: split view, map, card list
  [slug]/
    page.tsx            # RSC, fetches single team, renders profile
  register/
    page.tsx            # RSC shell
    _client.tsx         # 4-step wizard (all state in useState)
    actions.ts          # submitRegistration server action
```

**File**: `src/app/(marketing)/clubs/page.tsx`

```typescript
import { listPublicTeams } from "@modules/team";
import { ClubDirectoryClient } from "./_client";

export const revalidate = 60; // ISR: revalidate every 60 seconds

export default async function ClubsPage() {
  const { teams, total } = await listPublicTeams(1, 200); // Fetch first 200 for initial load
  
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-extrabold mb-6">Find a Rugby Club</h1>
        <ClubDirectoryClient initialTeams={teams} />
      </div>
    </div>
  );
}
```

**File**: `src/app/(marketing)/clubs/_client.tsx`

Client component that renders:
- Header with search bar and "Register your club" CTA
- Split-view: card list (left) + Leaflet map (right)
- Card: logo, name, distance, training days, badge
- Map: OSM tiles, draggable pins synced with cards

**File**: `src/app/(marketing)/clubs/[slug]/page.tsx`

```typescript
import { getTeamPublicBySlug } from "@modules/team";
import { notFound } from "next/navigation";
import { ClubProfilePage } from "./_components/ClubProfilePage";

export const revalidate = 60; // ISR

export default async function ClubProfilePage({
  params,
}: {
  params: { slug: string };
}) {
  const team = await getTeamPublicBySlug(params.slug);
  
  if (!team) {
    notFound();
  }
  
  return <ClubProfilePage team={team} />;
}
```

### 4.2 Registration Wizard: `/clubs/register`

**File**: `src/app/(marketing)/clubs/register/page.tsx`

```typescript
export default function RegisterClubPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <RegisterClubWizard />
    </div>
  );
}
```

**File**: `src/app/(marketing)/clubs/register/_client.tsx`

```typescript
"use client";

import { useState } from "react";
import { Step1ClubInfo } from "./_steps/Step1ClubInfo";
import { Step2Location } from "./_steps/Step2Location";
import { Step3TrainingSchedule } from "./_steps/Step3TrainingSchedule";
import { Step4Verify } from "./_steps/Step4Verify";

export function RegisterClubWizard() {
  const [currentStep, setCurrentStep] = useState(1);
  const [wizardData, setWizardData] = useState({
    name: "",
    description: "",
    contactEmail: "",
    contactPhone: "",
    address: "",
    lat: 0,
    lng: 0,
    trainingSlots: [],
  });
  
  const updateWizardData = (field: string, value: any) => {
    setWizardData((prev) => ({ ...prev, [field]: value }));
  };
  
  const handleNext = () => {
    setCurrentStep((prev) => Math.min(prev + 1, 4));
  };
  
  const handlePrev = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };
  
  return (
    <div className="w-full max-w-2xl">
      <div className="mb-8">
        <div className="flex justify-between mb-4">
          {[1, 2, 3, 4].map((step) => (
            <div
              key={step}
              className={`flex-1 h-2 mr-2 rounded ${
                step <= currentStep ? "bg-primary" : "bg-muted"
              }`}
            />
          ))}
        </div>
        <p className="text-sm text-muted-foreground">
          Step {currentStep} of 4
        </p>
      </div>
      
      {currentStep === 1 && (
        <Step1ClubInfo
          data={wizardData}
          onUpdate={updateWizardData}
          onNext={handleNext}
        />
      )}
      {currentStep === 2 && (
        <Step2Location
          data={wizardData}
          onUpdate={updateWizardData}
          onNext={handleNext}
          onPrev={handlePrev}
        />
      )}
      {currentStep === 3 && (
        <Step3TrainingSchedule
          data={wizardData}
          onUpdate={updateWizardData}
          onNext={handleNext}
          onPrev={handlePrev}
        />
      )}
      {currentStep === 4 && (
        <Step4Verify
          data={wizardData}
          onPrev={handlePrev}
        />
      )}
    </div>
  );
}
```

**File**: `src/app/(marketing)/clubs/register/actions.ts`

```typescript
"use server";

import { auth } from "@lib/auth/server";
import { createTeamWithSlots } from "@modules/team";
import { redirect } from "next/navigation";

export async function submitRegistration(formData: FormData) {
  const email = formData.get("email") as string;
  const otp = formData.get("otp") as string;
  const wizardDataJson = formData.get("wizardData") as string;
  
  const wizardData = JSON.parse(wizardDataJson);
  
  try {
    // Verify OTP
    const session = await auth.api.verifyOTP({ email, otp });
    
    if (!session) {
      return { error: "Invalid OTP" };
    }
    
    // Create team atomically
    await createTeamWithSlots({
      ...wizardData,
      userId: session.user.id,
    });
    
    // Redirect to app portal
    redirect("https://app.skrammm.com/tm");
  } catch (error) {
    return { error: (error as Error).message };
  }
}
```

---

## 5. TM Portal Changes

### 5.1 `/tm/settings` Extension

**File**: `src/app/(app)/tm/settings/page.tsx`

Add new section after existing team settings:

```typescript
import { PublicListingCard } from "./_components/PublicListingCard";

export default async function SettingsPage() {
  // ... existing code ...
  
  return (
    <div className="space-y-6">
      {/* Existing sections */}
      <TeamBasicsCard team={team} />
      
      {/* New public listing section */}
      <PublicListingCard team={team} />
    </div>
  );
}
```

### 5.2 Public Listing Editor Component

**File**: `src/app/(app)/tm/settings/_components/PublicListingCard.tsx`

Client component with:
- Toggle: `isPublic` (publish/unpublish)
- Textarea: `description` (max 500 chars, with counter)
- Address search + Leaflet map (reuse from registration wizard)
- Training slots table (add/delete rows)
- Save button (calls `updatePublicListing` + `upsertTrainingSlots`)

### 5.3 Server Actions

**File**: `src/app/(app)/tm/settings/actions.ts`

Add new server actions:

```typescript
"use server";

import { requireAuth } from "@lib/auth/server";
import { getManagerTeam } from "@modules/team";
import { can } from "@modules/shared/auth/can";
import { updatePublicListing, upsertTrainingSlots } from "@modules/team";
import { revalidatePath } from "next/cache";

export async function updatePublicListingAction(formData: FormData) {
  const session = await requireAuth();
  const team = await getManagerTeam(session.user.id);
  
  if (!team) return { error: "Team not found" };
  
  const allowed = await can(session.user.id, "team:manage", { teamId: team.id });
  if (!allowed) return { error: "Not authorized" };
  
  const isPublic = formData.get("isPublic") === "true";
  const description = formData.get("description") as string;
  const address = formData.get("address") as string;
  const lat = parseFloat(formData.get("lat") as string);
  const lng = parseFloat(formData.get("lng") as string);
  
  try {
    await updatePublicListing(team.id, {
      isPublic,
      description,
      address,
      lat,
      lng,
    });
    
    revalidatePath("/clubs");
    revalidatePath(`/clubs/${team.slug}`);
    
    return { success: true };
  } catch (error) {
    return { error: (error as Error).message };
  }
}

export async function updateTrainingSlotsAction(formData: FormData) {
  const session = await requireAuth();
  const team = await getManagerTeam(session.user.id);
  
  if (!team) return { error: "Team not found" };
  
  const allowed = await can(session.user.id, "team:manage", { teamId: team.id });
  if (!allowed) return { error: "Not authorized" };
  
  const slotsJson = formData.get("trainingSlots") as string;
  const slots = JSON.parse(slotsJson);
  
  try {
    await upsertTrainingSlots(team.id, slots);
    
    revalidatePath(`/clubs/${team.slug}`);
    
    return { success: true };
  } catch (error) {
    return { error: (error as Error).message };
  }
}
```

---

## 6. Libraries to Add

Run `pnpm add` for:

```bash
pnpm add leaflet react-leaflet @types/leaflet
```

**Why these**:
- `leaflet`: lightweight, open-source map library (no API key required)
- `react-leaflet`: React bindings for Leaflet
- `@types/leaflet`: TypeScript types for Leaflet

**OSM Tiles** (free, no API key):
```typescript
<TileLayer
  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
  attribution="&copy; OpenStreetMap contributors"
/>
```

---

## 7. Cache Invalidation

### 7.1 ISR Revalidation

Directory and profile pages use `revalidate = 60` to revalidate every 60 seconds.

### 7.2 Manual Revalidation

When a team's public listing is updated from `/tm/settings`:

```typescript
revalidatePath("/clubs");                    // Invalidate directory listing
revalidatePath(`/clubs/${team.slug}`);       // Invalidate this team's profile
```

---

## 8. Auth Integration

### 8.1 Registration Wizard Auth

The registration wizard uses the existing `auth` instance (not `orgAuth`). The flow:

1. User enters email in step 4.
2. "Send Code" button calls `POST /api/clubs/register` with `verifyOnly: false`.
3. Backend calls `auth.api.sendOTP({ email })` (existing flow, AWS SES).
4. User receives 6-digit OTP code via email.
5. User enters code; "Verify & Submit" calls `POST /api/clubs/register` with OTP + wizard data.
6. Backend calls `auth.api.verifyOTP({ email, otp })` (existing flow).
7. On success, session cookie is set automatically by auth.
8. Redirect to `app.skrammm.com/tm`.

**Important**: The same email can be used to log in to both the player portal and the TM portal. A user who registers a club and then claims a player account will have two identities linked to the same session.

---

## 9. Error Handling

### 9.1 Invalid Slug

If a club does not exist or is not marked `isPublic = true`:
- `GET /clubs/[slug]` returns 404 response
- Next.js `notFound()` renders 404 page

### 9.2 Invalid OTP

If OTP is invalid or expired:
- `POST /api/clubs/register` returns `{ success: false, error: "Invalid OTP" }`
- Client displays error message and prompts user to request a new code

### 9.3 Transaction Failure

If `createTeamWithSlots` transaction fails (e.g., due to database constraint):
- Exception is caught and returned to caller
- `POST /api/clubs/register` returns `{ success: false, error: "..." }`

---

## 10. Dependencies

### 10.1 Existing Modules Used

- `@modules/team`: service functions (extended in this PRD)
- `@modules/shared/auth/can`: authorization checks on server actions
- `@lib/auth/server`: `requireAuth()`, `auth` instance, OTP functions

### 10.2 External APIs

- **Nominatim** (OpenStreetMap): free geocoding API, no key required
  - Rate limit: ~1 request/sec per IP
  - User-Agent header required: "Skrammm/1.0 (+skrammm.com)"
  - See: https://nominatim.org/usage_policy.html

---

## 11. Security Considerations

### 11.1 OTP Verification

- OTP codes are time-limited (existing `auth` instance handles this, typically 10–15 min).
- After successful OTP verification, `auth.api.verifyOTP` creates a session automatically.
- No additional CSRF protection needed; `auth` instance handles it.

### 11.2 Public Listing Permissions

- Only the team's primary manager (or staff with `team:manage`) can update the public listing.
- Every server action in `/tm/settings` calls `can(userId, "team:manage", { teamId })`.
- Team membership is verified via `getManagerTeam`.

### 11.3 Nominatim Proxy

- Proxy route (`GET /api/geocode`) is public (no auth required).
- Rate limiting must be implemented separately (e.g., Redis throttle in a future version).
- User-Agent header prevents bot abuse; Nominatim does not ban single requests.

### 11.4 Input Validation

- All form inputs are validated on server side before persisting to DB.
- OTP code is 6 digits, email format is validated, coordinates are floats, times are HH:mm.

---

## 12. Testing Strategy

### 12.1 Unit Tests

- `generateSlug()` utility: test common edge cases (special chars, spacing, length cap)
- `listPublicTeams()`: test pagination, filtering by `isPublic = true`
- `createTeamWithSlots()`: mock DB transaction, test rollback on error

### 12.2 E2E Tests

- Registration wizard: fill all steps, verify OTP, confirm team created and directory updated
- Directory page: sort by distance (mock geolocation), search filter, map sync
- Club profile page: load full profile, verify training slots and tournament history
- TM settings: publish/unpublish listing, edit training slots, verify revalidation

### 12.3 Manual Testing

- Address search (Nominatim): test with common addresses (Dublin, London, New York)
- Map interaction: drag pin, verify coordinates update
- Geolocation: test with permission granted/denied/timeout
- Mobile layout: test split-view collapse on small screens

---

## 13. Rollout Plan

**Phase 1** (Week 1–2): Implement schema, module layer, API routes.  
**Phase 2** (Week 3): Public pages (directory, profile).  
**Phase 3** (Week 4): Registration wizard + TM settings.  
**Phase 4** (Week 5): QA, soft launch, monitoring.  
**Phase 5** (Week 6+): Iterate based on user feedback.

---

## 14. Monitoring & Metrics

- **Clubs created**: track via `Team.createdAt where isPublic = true`
- **Directory page views**: use Next.js analytics or GA
- **Registration completion rate**: OTP sent vs. team created
- **Map performance**: Leaflet render time (target < 500ms for 200 teams)
- **Nominatim latency**: measure `GET /api/geocode` response time (target < 1s)
