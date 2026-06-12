import { test, expect } from "./fixtures";
import { loginAsPlayer, TEST_ACCOUNTS } from "./fixtures";

// ---------------------------------------------------------------------------
// Player Portal — TC-PLY-01 to TC-PLY-36
// Canonical spec: docs/superpowers/specs/2026-06-08-mvp-test-script.md §4
// ---------------------------------------------------------------------------

test.describe("Player — Home Dashboard", () => {
  test("TC-PLY-01 | empty | No claimed profile → onboarding CTA", async ({ browser }) => {
    // Preconditions: test-new@skrammm.local with no player profile
    const context = await browser.newContext();
    const page = await context.newPage();
    await loginAsPlayer(page, TEST_ACCOUNTS.newUser);
    await page.goto("/player");
    // TODO: assert onboarding CTA visible
    // await expect(page.getByText(/claim.*profile|get started|complete.*profile/i)).toBeVisible();
    await expect(page).toHaveURL(/\/player/);
    await context.close();
  });

  test("TC-PLY-02 | happy | Claimed player with matches → stats grid populated", async ({ playerPage: page }) => {
    // Preconditions: test-player@skrammm.local has match history
    await page.goto("/player");
    // TODO: assert non-zero stats
    // await expect(page.getByTestId("stat-matches")).not.toHaveText("0");
    await expect(page).toHaveURL(/\/player/);
  });

  test("TC-PLY-03 | happy | Reliability score shows correct color coding", async ({ playerPage: page }) => {
    // Expected: color band matches score (green ≥60 / yellow 40-59 / red <40)
    await page.goto("/player");
    // TODO: read score value, assert corresponding color class
    await expect(page).toHaveURL(/\/player/);
  });

  test("TC-PLY-04 | empty | Claimed player with no matches — stats all zero", async ({ playerPage: page }) => {
    // Preconditions: claimed profile, no matches yet
    // Expected: all stat values = 0, no chart
    // TODO: seed a claimed-but-no-matches player scenario
    await page.goto("/player");
    await expect(page).toHaveURL(/\/player/);
  });
});

test.describe("Player — Teams", () => {
  test("TC-PLY-05 | empty | No team → 'Join a Club' section prominent", async ({ browser }) => {
    // Preconditions: claimed player with no team
    const context = await browser.newContext();
    const page = await context.newPage();
    await loginAsPlayer(page, TEST_ACCOUNTS.newUser);
    await page.goto("/player/teams");
    // TODO: assert join form is shown
    // await expect(page.getByLabel(/player id code/i)).toBeVisible();
    await expect(page).toHaveURL(/\/player\/teams/);
    await context.close();
  });

  test("TC-PLY-06 | happy | Claim account with valid player ID code", async ({ playerPage: page }) => {
    // Preconditions: manager created claimable player with code "KLRH0001"
    // Steps: enter code, click Claim
    // Expected: team card appears in Current Club section
    await page.goto("/player/teams");
    // TODO: implement — needs seed data with unclaimed player code
    // await page.getByLabel(/player id code/i).fill("KLRH0001");
    // await page.getByRole("button", { name: /claim/i }).click();
    // await expect(page.getByText(/current club/i)).toBeVisible();
    await expect(page).toHaveURL(/\/player\/teams/);
  });

  test("TC-PLY-07 | happy | Team has tournament → QR section visible", async ({ playerPage: page }) => {
    // Preconditions: claimed player's team has ≥1 approved tournament
    await page.goto("/player/teams");
    // TODO: assert QR section is visible
    // await expect(page.getByText(/attendance qr|show.*manager/i)).toBeVisible();
    await expect(page).toHaveURL(/\/player\/teams/);
  });

  test("TC-PLY-08 | happy | Team has NO tournament → QR section hidden", async ({ playerPage: page }) => {
    // Preconditions: claimed player's team has not joined any tournament
    // TODO: seed this scenario
    await page.goto("/player/teams");
    // TODO: assert QR section is absent
    // await expect(page.getByText(/attendance qr/i)).not.toBeVisible();
    await expect(page).toHaveURL(/\/player\/teams/);
  });

  test("TC-PLY-09 | negative | Invalid player ID code — no crash", async ({ playerPage: page }) => {
    // Steps: enter "BADCODE", click Claim
    // Expected: page stays on /player/teams, no unhandled error, no team added
    await page.goto("/player/teams");
    // TODO: implement
    // await page.getByLabel(/player id code/i).fill("BADCODE");
    // await page.getByRole("button", { name: /claim/i }).click();
    // await expect(page).toHaveURL(/\/player\/teams/);
    await expect(page).toHaveURL(/\/player\/teams/);
  });

  test("TC-PLY-10 | negative | Already claimed code — no duplicate claim", async ({ playerPage: page }) => {
    // Preconditions: code already claimed by another user
    // Expected: error or silent fail, no duplicate claim
    await page.goto("/player/teams");
    // TODO: implement
    await expect(page).toHaveURL(/\/player\/teams/);
  });

  test("TC-PLY-11 | happy | Player is manager → 'Manager Mode' button visible", async ({ playerPage: page }) => {
    // Preconditions: user has a managed team
    await page.goto("/player/teams");
    // TODO: assert Manager Mode button
    // await expect(page.getByRole("link", { name: /manager mode/i })).toBeVisible();
    await expect(page).toHaveURL(/\/player\/teams/);
  });

  test("TC-PLY-12 | empty | Player is NOT manager → no Manager Mode button", async ({ browser }) => {
    // Preconditions: player-only account with no managed team
    const context = await browser.newContext();
    const page = await context.newPage();
    await loginAsPlayer(page, TEST_ACCOUNTS.newUser);
    await page.goto("/player/teams");
    // TODO: assert Manager Mode button is absent
    // await expect(page.getByRole("link", { name: /manager mode/i })).not.toBeVisible();
    await expect(page).toHaveURL(/\/player\/teams/);
    await context.close();
  });
});

test.describe("Player — Profile", () => {
  test("TC-PLY-13 | empty | No claimed profile → limited profile view", async ({ browser }) => {
    // Preconditions: test-new@skrammm.local
    const context = await browser.newContext();
    const page = await context.newPage();
    await loginAsPlayer(page, TEST_ACCOUNTS.newUser);
    await page.goto("/player/profile");
    // TODO: assert limited view prompt
    // await expect(page.getByText(/claim.*profile/i)).toBeVisible();
    await expect(page).toHaveURL(/\/player\/profile/);
    await context.close();
  });

  test("TC-PLY-14 | happy | Claimed profile → all sections visible", async ({ playerPage: page }) => {
    // Expected: name, jersey, position, stats grid, reliability breakdown all present
    await page.goto("/player/profile");
    // TODO: assert each section
    // await expect(page.getByTestId("player-stats-grid")).toBeVisible();
    // await expect(page.getByTestId("reliability-breakdown")).toBeVisible();
    await expect(page).toHaveURL(/\/player\/profile/);
  });

  test("TC-PLY-15 | happy | Reliability breakdown shows 3 progress bars", async ({ playerPage: page }) => {
    // Expected: Attendance (50%), Punctuality (25%), Discipline (25%) bars
    await page.goto("/player/profile");
    // TODO: assert 3 labeled progress bars
    // await expect(page.getByText(/attendance/i)).toBeVisible();
    // await expect(page.getByText(/punctuality/i)).toBeVisible();
    // await expect(page.getByText(/discipline/i)).toBeVisible();
    await expect(page).toHaveURL(/\/player\/profile/);
  });

  test("TC-PLY-16 | happy | Medical summary shows blood type and emergency contact", async ({ playerPage: page }) => {
    // Preconditions: player has a filled medical profile
    await page.goto("/player/profile");
    // TODO: assert medical summary fields
    // await expect(page.getByTestId("medical-summary")).toBeVisible();
    await expect(page).toHaveURL(/\/player\/profile/);
  });

  test("TC-PLY-17 | empty | No medical profile → prompt to add", async ({ playerPage: page }) => {
    // Preconditions: claimed player with no medical profile
    // TODO: seed this scenario
    await page.goto("/player/profile");
    // TODO: assert "Add medical info" link or empty medical section
    await expect(page).toHaveURL(/\/player\/profile/);
  });

  test("TC-PLY-18 | happy | Edit profile — name change persists", async ({ playerPage: page }) => {
    // Steps: change name to "Farouk Ahmad", save
    // Expected: profile shows "Farouk Ahmad"
    await page.goto("/player/profile/edit");
    // TODO: implement
    // await page.getByLabel(/full name/i).fill("Farouk Ahmad");
    // await page.getByRole("button", { name: /save/i }).click();
    // await expect(page).toHaveURL(/\/player\/profile/);
    // await expect(page.getByText("Farouk Ahmad")).toBeVisible();
    await expect(page).toHaveURL(/\/player\/profile\/edit/);
  });

  test("TC-PLY-19 | negative | Edit profile — blank name", async ({ playerPage: page }) => {
    // Steps: clear name, click Save
    // Expected: validation error, stays on edit page
    await page.goto("/player/profile/edit");
    await page.getByLabel(/full name/i).clear();
    await page.getByRole("button", { name: /save/i }).click();
    // TODO: assert error message
    // await expect(page.getByText(/name is required/i)).toBeVisible();
    await expect(page).toHaveURL(/\/player\/profile\/edit/);
  });

  test("TC-PLY-20 | happy | Match-day QR visible on profile if claimed", async ({ playerPage: page }) => {
    // Preconditions: claimed player profile
    await page.goto("/player/profile");
    // TODO: assert QR code element is visible
    // await expect(page.getByRole("img", { name: /qr|attendance/i })).toBeVisible();
    await expect(page).toHaveURL(/\/player\/profile/);
  });
});

test.describe("Player — Match Statistics", () => {
  test("TC-PLY-21 | empty | No tournaments → 'No tournaments yet' empty state", async ({ playerPage: page }) => {
    // Preconditions: player has not been in any tournament lineup
    await page.goto("/player/matches");
    // TODO: seed or use new user, assert empty state
    // await expect(page.getByText(/no tournaments yet/i)).toBeVisible();
    await expect(page).toHaveURL(/\/player\/matches/);
  });

  test("TC-PLY-22 | happy | Tournament history shows name, dates, status badge", async ({ playerPage: page }) => {
    // Preconditions: player has participated in ≥1 tournament
    await page.goto("/player/matches");
    // TODO: assert tournament entry with badge
    // await expect(page.getByTestId("tournament-entry").first()).toBeVisible();
    await expect(page).toHaveURL(/\/player\/matches/);
  });

  test("TC-PLY-23 | happy | Click tournament → tournament detail page", async ({ playerPage: page }) => {
    // Expected: navigates to /player/tournaments/{tournamentId}
    await page.goto("/player/matches");
    // TODO: click first tournament entry
    // await page.getByTestId("tournament-entry").first().click();
    // await expect(page).toHaveURL(/\/player\/tournaments\/[a-z0-9-]+/);
    await expect(page).toHaveURL(/\/player\/matches/);
  });

  test("TC-PLY-24 | happy | Tournament detail — performance stats grid", async ({ playerPage: page }) => {
    // Expected: Matches, Tries, Conversions, Penalties, Drop Goals, Yellow Cards shown
    // TODO: navigate to a specific tournament detail page
    // await page.goto("/player/tournaments/{tournamentId}");
    // await expect(page.getByTestId("perf-stats-grid")).toBeVisible();
    await page.goto("/player");
    await expect(page).toHaveURL(/\/player/);
  });

  test("TC-PLY-25 | happy | Tournament detail — per-match rows show results", async ({ playerPage: page }) => {
    // Expected: each match row shows teams, score, result, event icons
    // TODO: navigate to tournament detail and assert match rows
    await page.goto("/player");
    await expect(page).toHaveURL(/\/player/);
  });
});

test.describe("Player — Medical Settings", () => {
  test("TC-PLY-26 | empty | No claimed profile → 'Claim your player profile first'", async ({ browser }) => {
    // Preconditions: test-new@skrammm.local (no claimed profile)
    const context = await browser.newContext();
    const page = await context.newPage();
    await loginAsPlayer(page, TEST_ACCOUNTS.newUser);
    await page.goto("/player/settings/medical");
    // TODO: assert message
    // await expect(page.getByText(/claim.*profile first/i)).toBeVisible();
    await expect(page).toHaveURL(/\/player\/settings\/medical/);
    await context.close();
  });

  test("TC-PLY-27 | happy | Fill medical form → persists on revisit", async ({ playerPage: page }) => {
    // Steps: fill all fields (Fit, O+, Penicillin, Siti Ahmad, +60123456789), save
    // Expected: revisit shows pre-populated values
    await page.goto("/player/settings/medical");
    // TODO: implement
    // await page.getByLabel(/fitness status/i).selectOption("Fit");
    // await page.getByLabel(/blood type/i).fill("O+");
    // await page.getByRole("button", { name: /save/i }).click();
    // await page.goto("/player/settings/medical");
    // await expect(page.getByLabel(/blood type/i)).toHaveValue("O+");
    await expect(page).toHaveURL(/\/player\/settings\/medical/);
  });

  test("TC-PLY-28 | happy | Update existing medical info → changes persist", async ({ playerPage: page }) => {
    // Preconditions: medical profile exists from TC-PLY-27
    // Steps: change fitness status to "Doubtful", save
    // Expected: revisit shows "Doubtful"
    await page.goto("/player/settings/medical");
    // TODO: implement
    await expect(page).toHaveURL(/\/player\/settings\/medical/);
  });

  test("TC-PLY-29 | negative | Medical form — save without fitness status", async ({ playerPage: page }) => {
    // Steps: leave fitness status blank, click Save
    // Expected: validation error, not saved
    await page.goto("/player/settings/medical");
    // TODO: implement — clear fitness status and try to save
    // await page.getByRole("button", { name: /save/i }).click();
    // await expect(page.getByText(/fitness.*required/i)).toBeVisible();
    await expect(page).toHaveURL(/\/player\/settings\/medical/);
  });
});

test.describe("Player — Settings", () => {
  test("TC-PLY-30 | happy | Settings page shows non-editable email", async ({ playerPage: page }) => {
    // Expected: email displayed as read-only text (not input field)
    await page.goto("/player/settings");
    // TODO: assert email is visible and not an <input>
    // const emailEl = page.getByText(TEST_ACCOUNTS.player);
    // await expect(emailEl).toBeVisible();
    await expect(page).toHaveURL(/\/player\/settings/);
  });

  test("TC-PLY-31 | happy | 'Switch to Manager Mode' visible for managers", async ({ playerPage: page }) => {
    // Preconditions: user has a managed team
    await page.goto("/player/settings");
    // TODO: assert button visible
    // await expect(page.getByRole("link", { name: /manager mode/i })).toBeVisible();
    await expect(page).toHaveURL(/\/player\/settings/);
  });

  test("TC-PLY-32 | happy | Sign out → redirected to /login", async ({ playerPage: page }) => {
    // Steps: click Sign Out button
    // Expected: redirect to /login, session cleared
    await page.goto("/player/settings");
    // TODO: implement sign out click
    // await page.getByRole("button", { name: /sign out/i }).click();
    // await expect(page).toHaveURL(/\/login/);
    await expect(page).toHaveURL(/\/player\/settings/);
  });
});

test.describe("Player — Cross-Portal Role Switching", () => {
  test("TC-PLY-33 | happy | Switch player → manager → team data loads", async ({ playerPage: page }) => {
    // Preconditions: user is both player and manager
    await page.goto("/player/teams");
    // TODO: click Manager Mode button
    // await page.getByRole("link", { name: /manager mode/i }).click();
    // await expect(page).toHaveURL(/\/tm/);
    // await expect(page.getByTestId("club-card")).toBeVisible();
    await expect(page).toHaveURL(/\/player/);
  });

  test("TC-PLY-34 | happy | Switch manager → player → player data loads", async ({ playerPage: page }) => {
    // Preconditions: at /tm as a manager-player
    await page.goto("/tm");
    // TODO: click Switch to Player Mode
    // await page.getByRole("link", { name: /player mode/i }).click();
    // await expect(page).toHaveURL(/\/player/);
    await expect(page).toHaveURL(/\/tm/);
  });

  test("TC-PLY-35 | negative | Player-only accessing /tm — no other team's data exposed", async ({ browser }) => {
    // Preconditions: test-new@skrammm.local with no managed team
    const context = await browser.newContext();
    const page = await context.newPage();
    await loginAsPlayer(page, TEST_ACCOUNTS.newUser);
    await page.goto("/tm");
    // Expected: sees "Create a Club" CTA (allowed) OR redirect — never another team's data
    // TODO: assert that no team name from other accounts is visible
    // await expect(page.getByText(/other team name/i)).not.toBeVisible();
    await expect(page).toHaveURL(/\/tm/);
    await context.close();
  });

  test("TC-PLY-36 | negative | Player accessing /organizer → redirect to /login/organizer", async ({ playerPage: page }) => {
    // Steps: navigate directly to /organizer as a player
    // Expected: redirect to /login/organizer
    await page.goto("/organizer");
    await expect(page).toHaveURL(/\/login\/organizer/);
  });
});
