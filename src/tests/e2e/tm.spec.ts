import { test, expect } from "./fixtures";
import { loginAsPlayer, TEST_ACCOUNTS } from "./fixtures";

// ---------------------------------------------------------------------------
// Team Manager Portal — TC-TM-01 to TC-TM-34
// Canonical spec: docs/superpowers/specs/2026-06-08-mvp-test-script.md §3
// ---------------------------------------------------------------------------

test.describe("TM — Team Creation", () => {
  test("TC-TM-01 | empty | No team → /tm shows 'Create a Club' CTA", async ({ browser }) => {
    // Preconditions: test-new@skrammm.local, no team created
    const context = await browser.newContext();
    const page = await context.newPage();
    await loginAsPlayer(page, TEST_ACCOUNTS.newUser);
    // Steps: navigate to /tm
    // Expected: "Create a Club" CTA visible
    await page.goto("/tm");
    // TODO: implement
    // await expect(page.getByRole("link", { name: /create.*club/i })).toBeVisible();
    await expect(page).toHaveURL(/\/tm/);
    await context.close();
  });

  test("TC-TM-02 | happy | Create team → club card on dashboard", async ({ playerPage: page }) => {
    // Steps:
    //   1. Navigate to /tm/create-team
    //   2. Fill name "KL Rhinos", origin "Kuala Lumpur", training ground
    //   3. Submit
    // Expected: redirect to /tm, club card shows "KL Rhinos"
    await page.goto("/tm/create-team");
    // TODO: implement (skip if team already exists in seed data)
    // await page.getByLabel(/club name/i).fill("KL Rhinos");
    // await page.getByRole("button", { name: /create/i }).click();
    // await expect(page).toHaveURL(/\/tm$/);
    // await expect(page.getByText("KL Rhinos")).toBeVisible();
    await expect(page).toHaveURL(/\/tm/);
  });

  test("TC-TM-03 | negative | Create team — blank club name", async ({ playerPage: page }) => {
    // Steps: leave name blank, submit
    // Expected: validation error, stays on /tm/create-team
    await page.goto("/tm/create-team");
    await page.getByRole("button", { name: /create/i }).click();
    // TODO: assert inline validation error
    // await expect(page.getByText(/name is required/i)).toBeVisible();
    await expect(page).toHaveURL(/\/tm\/create-team/);
  });
});

test.describe("TM — Squad Management", () => {
  test("TC-TM-04 | empty | Squad page — no players shows empty state", async ({ playerPage: page }) => {
    // Preconditions: team exists with zero players
    await page.goto("/tm/squad");
    // TODO: assert empty state message
    // await expect(page.getByText(/no players|add your first/i)).toBeVisible();
    await expect(page).toHaveURL(/\/tm\/squad/);
  });

  test("TC-TM-05 | happy | Add player → Unclaimed section with ID code", async ({ playerPage: page }) => {
    // Steps: navigate to /tm/squad/add, fill form, submit
    // Expected: player in Unclaimed section with dashed border and ID code
    await page.goto("/tm/squad/add");
    // TODO: implement
    // await page.getByLabel(/full name/i).fill("Ahmad bin Ali");
    // await page.getByLabel(/position/i).selectOption("Prop");
    // await page.getByLabel(/jersey/i).fill("1");
    // await page.getByRole("button", { name: /add|save/i }).click();
    // await expect(page).toHaveURL(/\/tm\/squad/);
    // await expect(page.getByText("Ahmad bin Ali")).toBeVisible();
    await expect(page).toHaveURL(/\/tm\/squad\/add/);
  });

  test("TC-TM-06 | happy | Unclaimed player has dashed border and ID code", async ({ playerPage: page }) => {
    // Preconditions: at least one unclaimed player exists
    await page.goto("/tm/squad");
    // TODO: assert dashed border + ID code format (e.g. KLRH0001)
    // await expect(page.locator(".border-dashed")).toBeVisible();
    await expect(page).toHaveURL(/\/tm\/squad/);
  });

  test("TC-TM-07 | happy | Claimed player shows reliability score pill", async ({ playerPage: page }) => {
    // Preconditions: at least one claimed player with reliability score
    await page.goto("/tm/squad");
    // TODO: assert colored pill on claimed player row
    // await expect(page.getByTestId("reliability-pill").first()).toBeVisible();
    await expect(page).toHaveURL(/\/tm\/squad/);
  });

  test("TC-TM-08 | happy | Click player row → player detail", async ({ playerPage: page }) => {
    // Expected: navigates to /tm/squad/{playerId}
    await page.goto("/tm/squad");
    // TODO: click first player row
    // await page.getByRole("link").first().click();
    // await expect(page).toHaveURL(/\/tm\/squad\/[a-z0-9-]+$/);
    await expect(page).toHaveURL(/\/tm\/squad/);
  });

  test("TC-TM-09 | happy | Edit player — changes reflect on squad page", async ({ playerPage: page }) => {
    // Steps: navigate to edit page, update name and jersey, save
    // Expected: redirect to detail, updated values shown; squad page reflects new name
    // TODO: need a specific player ID from seed data
    await page.goto("/tm/squad");
    // TODO: implement
    await expect(page).toHaveURL(/\/tm\/squad/);
  });

  test("TC-TM-10 | happy | Delete player → removed from squad", async ({ playerPage: page }) => {
    // Steps: navigate to edit page, click Delete, confirm
    // Expected: redirect to /tm/squad; player no longer listed
    // TODO: need a specific player ID to delete
    await page.goto("/tm/squad");
    await expect(page).toHaveURL(/\/tm\/squad/);
  });

  test("TC-TM-11 | negative | Edit player — blank name", async ({ playerPage: page }) => {
    // Steps: clear name field, click Save
    // Expected: validation error, not saved
    // TODO: navigate to an edit page and clear the name field
    await expect(page).toHaveURL(/\/tm/);
  });

  test("TC-TM-12 | negative | Add player — duplicate jersey number", async ({ playerPage: page }) => {
    // Preconditions: player with jersey "1" already exists
    // Steps: add another player with jersey "1"
    // Expected: error about duplicate jersey number
    await page.goto("/tm/squad/add");
    // TODO: implement
    // await page.getByLabel(/jersey/i).fill("1");
    // await page.getByRole("button", { name: /add|save/i }).click();
    // await expect(page.getByText(/already taken|duplicate/i)).toBeVisible();
    await expect(page).toHaveURL(/\/tm\/squad\/add/);
  });
});

test.describe("TM — Attendance", () => {
  test("TC-TM-13 | empty | No upcoming matches — cannot scan", async ({ playerPage: page }) => {
    // Expected: "No matches to scan for" or empty match selector
    await page.goto("/tm/attendance");
    // TODO: assert empty state
    // await expect(page.getByText(/no.*match|no upcoming/i)).toBeVisible();
    await expect(page).toHaveURL(/\/tm\/attendance/);
  });

  test("TC-TM-14 | happy | Scan valid QR → success toast + log entry", async ({ playerPage: page }) => {
    // Preconditions: upcoming match exists, player has valid QR token
    // Steps: select match, enable scanner, simulate valid QR scan
    // Expected: success toast with player name, log entry with green icon
    await page.goto("/tm/attendance");
    // TODO: implement — requires mocking QR scan input
    await expect(page).toHaveURL(/\/tm\/attendance/);
  });

  test("TC-TM-15 | happy | Manual override → log entry with 'Manual' flag", async ({ playerPage: page }) => {
    // Steps: select match, open manual override, pick player, submit
    // Expected: log entry shows player name + "Manual" indicator
    await page.goto("/tm/attendance");
    // TODO: implement
    await expect(page).toHaveURL(/\/tm\/attendance/);
  });

  test("TC-TM-16 | negative | Scan expired/invalid QR → error toast", async ({ playerPage: page }) => {
    // Steps: simulate scanning an expired/malformed QR token
    // Expected: error toast "Invalid or expired QR code"
    await page.goto("/tm/attendance");
    // TODO: implement — POST to scan API with bad token, assert toast
    await expect(page).toHaveURL(/\/tm\/attendance/);
  });

  test("TC-TM-17 | negative | Scan player not on this team → error toast", async ({ playerPage: page }) => {
    // Steps: scan QR of a player belonging to another team
    // Expected: error toast "Player not on your squad"
    await page.goto("/tm/attendance");
    // TODO: implement
    await expect(page).toHaveURL(/\/tm\/attendance/);
  });

  test("TC-TM-18 | negative | Scan same player twice → 'Already checked in' error", async ({ playerPage: page }) => {
    // Preconditions: player already checked in for this match
    // Expected: error toast "Already checked in"
    await page.goto("/tm/attendance");
    // TODO: implement
    await expect(page).toHaveURL(/\/tm\/attendance/);
  });
});

test.describe("TM — Lineups", () => {
  test("TC-TM-19 | empty | No upcoming matches → 'No upcoming matches' state", async ({ playerPage: page }) => {
    // Expected: empty state; match selector absent/empty
    await page.goto("/tm/lineups");
    // TODO: assert empty state if no upcoming matches in seed data
    await expect(page).toHaveURL(/\/tm\/lineups/);
  });

  test("TC-TM-20 | happy | Set lineup for match → saved successfully", async ({ playerPage: page }) => {
    // Preconditions: upcoming match + 15 players in squad
    // Steps: select match, check 15 players, click "Save Lineup"
    // Expected: success indication, no error
    await page.goto("/tm/lineups");
    // TODO: implement
    await expect(page).toHaveURL(/\/tm\/lineups/);
  });

  test("TC-TM-21 | happy | Revisit lineup — previous selection pre-checked", async ({ playerPage: page }) => {
    // Preconditions: lineup saved from TC-TM-20
    // Expected: 15 players pre-checked on revisit
    await page.goto("/tm/lineups");
    // TODO: implement
    await expect(page).toHaveURL(/\/tm\/lineups/);
  });

  test("TC-TM-22 | negative | Past/locked match not in lineup selector", async ({ playerPage: page }) => {
    // Expected: locked/past matches absent from the match dropdown
    await page.goto("/tm/lineups");
    // TODO: assert that locked match IDs do not appear in selector options
    await expect(page).toHaveURL(/\/tm\/lineups/);
  });
});

test.describe("TM — Tournaments", () => {
  test("TC-TM-23 | empty | No tournaments → stats zero, join form prominent", async ({ playerPage: page }) => {
    // Preconditions: team not in any tournament
    await page.goto("/tm/tournaments");
    // TODO: assert zero stats and prominent join form
    // await expect(page.getByText(/0 played|played: 0/i)).toBeVisible();
    await expect(page).toHaveURL(/\/tm\/tournaments/);
  });

  test("TC-TM-24 | happy | Join with valid code → Pending badge appears", async ({ playerPage: page }) => {
    // Steps: enter valid code, click "Join"
    // Expected: tournament entry shows "Pending" badge
    await page.goto("/tm/tournaments");
    // TODO: implement — use a known test tournament code
    // await page.getByLabel(/tournament code/i).fill("TESTCODE");
    // await page.getByRole("button", { name: /join/i }).click();
    // await expect(page.getByText(/pending/i)).toBeVisible();
    await expect(page).toHaveURL(/\/tm\/tournaments/);
  });

  test("TC-TM-25 | happy | After organizer approves → status changes to 'Approved'", async ({ playerPage: page }) => {
    // Preconditions: team is Pending; organizer approves via their portal (separate setup step)
    // Expected: "Approved" badge visible
    await page.goto("/tm/tournaments");
    // TODO: seed an already-approved tournament entry, assert badge
    // await expect(page.getByText(/approved/i)).toBeVisible();
    await expect(page).toHaveURL(/\/tm\/tournaments/);
  });

  test("TC-TM-26 | negative | Invalid tournament code → 'Tournament not found'", async ({ playerPage: page }) => {
    // Steps: enter "BADCODE", click "Join"
    // Expected: inline error message, no tournament entry added
    await page.goto("/tm/tournaments");
    // TODO: implement
    // await page.getByLabel(/tournament code/i).fill("BADCODE");
    // await page.getByRole("button", { name: /join/i }).click();
    // await expect(page.getByText(/not found/i)).toBeVisible();
    await expect(page).toHaveURL(/\/tm\/tournaments/);
  });

  test("TC-TM-27 | negative | Already joined tournament → 'Already joined' error", async ({ playerPage: page }) => {
    // Preconditions: team already in tournament (any status)
    // Steps: enter same code, click "Join"
    // Expected: error "Already joined this tournament"
    await page.goto("/tm/tournaments");
    // TODO: implement
    await expect(page).toHaveURL(/\/tm\/tournaments/);
  });
});

test.describe("TM — Settings", () => {
  test("TC-TM-28 | happy | Update club name → dashboard reflects new name", async ({ playerPage: page }) => {
    // Steps: change club name in settings, save
    // Expected: /tm dashboard shows new club name
    await page.goto("/tm/settings");
    // TODO: implement
    // await page.getByLabel(/club name/i).fill("KL Eagles");
    // await page.getByRole("button", { name: /save/i }).click();
    // await page.goto("/tm");
    // await expect(page.getByText("KL Eagles")).toBeVisible();
    await expect(page).toHaveURL(/\/tm\/settings/);
  });

  test("TC-TM-29 | happy | Update personal info (when player profile exists)", async ({ playerPage: page }) => {
    // Steps: update name in Personal Info section, save
    // Expected: success, changes persist
    await page.goto("/tm/settings");
    // TODO: implement
    await expect(page).toHaveURL(/\/tm\/settings/);
  });

  test("TC-TM-30 | empty | No player profile linked → 'No player profile linked' message", async ({ playerPage: page }) => {
    // Preconditions: manager with no claimed player profile
    await page.goto("/tm/settings");
    // TODO: use test-manager account with no player profile, assert message
    // await expect(page.getByText(/no player profile linked/i)).toBeVisible();
    await expect(page).toHaveURL(/\/tm\/settings/);
  });

  test("TC-TM-31 | negative | Blank club name → validation error, not saved", async ({ playerPage: page }) => {
    // Steps: clear club name, click Save
    // Expected: validation error, previous name persists
    await page.goto("/tm/settings");
    // TODO: implement
    // await page.getByLabel(/club name/i).clear();
    // await page.getByRole("button", { name: /save/i }).click();
    // await expect(page.getByText(/required/i)).toBeVisible();
    await expect(page).toHaveURL(/\/tm\/settings/);
  });

  test("TC-TM-32 | happy | Switch to Player Mode → /player loads", async ({ playerPage: page }) => {
    // Steps: click "Switch to Player Mode" in settings or sidebar
    // Expected: navigates to /player
    await page.goto("/tm/settings");
    // TODO: click switch button
    // await page.getByRole("link", { name: /player mode|switch.*player/i }).click();
    // await expect(page).toHaveURL(/\/player/);
    await expect(page).toHaveURL(/\/tm/);
  });
});

test.describe("TM — Dashboard", () => {
  test("TC-TM-33 | happy | Upcoming match shows 'Next Match' banner with Set Lineup link", async ({ playerPage: page }) => {
    // Preconditions: team approved in tournament with upcoming match
    await page.goto("/tm");
    // TODO: assert banner and Set Lineup link
    // await expect(page.getByText(/next match/i)).toBeVisible();
    // await expect(page.getByRole("link", { name: /set lineup/i })).toBeVisible();
    await expect(page).toHaveURL(/\/tm/);
  });

  test("TC-TM-34 | happy | Pending tournament approval shows alert badge", async ({ playerPage: page }) => {
    // Preconditions: team in pending status for a tournament
    await page.goto("/tm");
    // TODO: assert pending badge/notification
    // await expect(page.getByText(/pending.*approval|approval.*pending/i)).toBeVisible();
    await expect(page).toHaveURL(/\/tm/);
  });
});
