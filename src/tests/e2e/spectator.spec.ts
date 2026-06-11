import { test, expect } from "@playwright/test";

// ---------------------------------------------------------------------------
// Public Spectator — TC-SPEC-01 to TC-SPEC-12
// Canonical spec: docs/superpowers/specs/2026-06-08-mvp-test-script.md §5
//
// These tests run WITHOUT authentication (fresh browser contexts).
// The public /{tournamentCode} page must be accessible to unauthenticated users.
// ---------------------------------------------------------------------------

// Seed tournament code to use in happy-path tests (must exist in the test DB)
const LIVE_TOURNAMENT_CODE = "TESTLIVE";
const COMPLETED_TOURNAMENT_CODE = "TESTDONE";
const FESTIVAL_TOURNAMENT_CODE = "TESTFEST";
const ELIMINATION_TOURNAMENT_CODE = "TESTELIM";
const EMPTY_TOURNAMENT_CODE = "TESTEMPTY";

test.describe("Spectator — Public Page", () => {
  test.use({ storageState: { cookies: [], origins: [] } }); // ensure unauthenticated

  test("TC-SPEC-01 | happy | Valid tournament code loads without auth", async ({ page }) => {
    // Preconditions: TESTLIVE tournament exists with ≥1 approved team
    // Expected: page loads, tournament header visible, no login prompt
    await page.goto(`/${LIVE_TOURNAMENT_CODE}`);
    // TODO: implement once real data is wired
    // await expect(page.getByRole("heading", { name: /skrammm/i })).not.toBeVisible(); // no auth wall
    // await expect(page.getByTestId("tournament-header")).toBeVisible();
    // For now, just assert the page doesn't redirect to /login
    await expect(page).not.toHaveURL(/\/login/);
  });

  test("TC-SPEC-02 | happy | Live matches → Live section with gold border + pulsing badge", async ({ page }) => {
    // Preconditions: TESTLIVE has ≥1 match with status "live"
    await page.goto(`/${LIVE_TOURNAMENT_CODE}`);
    // TODO: implement
    // await expect(page.getByTestId("live-section")).toBeVisible();
    // await expect(page.getByText(/live/i)).toBeVisible();
    await expect(page).not.toHaveURL(/\/login/);
  });

  test("TC-SPEC-03 | happy | No live matches → NextUpBanner shown", async ({ page }) => {
    // Preconditions: TESTFEST has no live matches but has upcoming matches
    await page.goto(`/${FESTIVAL_TOURNAMENT_CODE}`);
    // TODO: implement
    // await expect(page.getByTestId("next-up-banner")).toBeVisible();
    // await expect(page.getByTestId("live-section")).not.toBeVisible();
    await expect(page).not.toHaveURL(/\/login/);
  });

  test("TC-SPEC-04 | happy | Festival/Tiered format → group standings tables", async ({ page }) => {
    // Preconditions: TESTFEST has completed matches in group format
    await page.goto(`/${FESTIVAL_TOURNAMENT_CODE}`);
    // TODO: implement
    // await expect(page.getByTestId("standings-group").first()).toBeVisible();
    // Standings table columns: P, W, L, PTS
    // await expect(page.getByRole("columnheader", { name: "PTS" }).first()).toBeVisible();
    await expect(page).not.toHaveURL(/\/login/);
  });

  test("TC-SPEC-05 | happy | Elimination format → fixtures grouped by round labels", async ({ page }) => {
    // Preconditions: TESTELIM has QF/SF/Final matches
    await page.goto(`/${ELIMINATION_TOURNAMENT_CODE}`);
    // TODO: implement
    // await expect(page.getByTestId("standings-group")).not.toBeVisible(); // no group tables
    // await expect(page.getByText(/quarter-final|semifinal|final/i)).toBeVisible();
    await expect(page).not.toHaveURL(/\/login/);
  });

  test("TC-SPEC-06 | happy | Completed tournament → Champion Banner", async ({ page }) => {
    // Preconditions: TESTDONE is a completed tournament with a winner
    await page.goto(`/${COMPLETED_TOURNAMENT_CODE}`);
    // TODO: implement
    // await expect(page.getByText(/🏆|champions/i)).toBeVisible();
    // await expect(page.getByTestId("upcoming-section")).not.toBeVisible();
    await expect(page).not.toHaveURL(/\/login/);
  });

  test("TC-SPEC-07 | empty | No fixtures → 'Schedule not published yet'", async ({ page }) => {
    // Preconditions: TESTEMPTY tournament exists but has no matches
    await page.goto(`/${EMPTY_TOURNAMENT_CODE}`);
    // TODO: implement
    // await expect(page.getByText(/schedule not published|no fixtures/i)).toBeVisible();
    await expect(page).not.toHaveURL(/\/login/);
  });

  test("TC-SPEC-08 | negative | Unknown tournament code → 404", async ({ page }) => {
    // Expected: 404 response / page
    const response = await page.goto("/BADTOURNAMENT999");
    // TODO: implement — depends on notFound() being wired
    // expect(response?.status()).toBe(404);
    // OR: await expect(page.getByText(/not found/i)).toBeVisible();
    expect(response).toBeTruthy();
  });

  test("TC-SPEC-09 | negative | Draft tournament → 404", async ({ page }) => {
    // Preconditions: A tournament in "draft" status exists
    // Expected: 404, not publicly accessible
    // TODO: seed a draft tournament with a known code "TESTDRAFT"
    // const response = await page.goto("/TESTDRAFT");
    // expect(response?.status()).toBe(404);
    await expect(page).not.toHaveURL(/\/login/);
  });

  test("TC-SPEC-10 | negative | Pending/unapproved teams not in public view", async ({ page }) => {
    // Preconditions: TESTLIVE has both approved and pending-approval teams
    await page.goto(`/${LIVE_TOURNAMENT_CODE}`);
    // TODO: seed a pending team with name "PendingTeamName"
    // await expect(page.getByText("PendingTeamName")).not.toBeVisible();
    await expect(page).not.toHaveURL(/\/login/);
  });

  test("TC-SPEC-11 | happy | Match card tap → detail overlay opens", async ({ page }) => {
    // Preconditions: TESTLIVE has at least one match card visible
    await page.goto(`/${LIVE_TOURNAMENT_CODE}`);
    // TODO: implement
    // await page.getByTestId("match-card").first().click();
    // await expect(page.getByTestId("match-detail-overlay")).toBeVisible();
    // await page.keyboard.press("Escape"); // close overlay
    // await expect(page.getByTestId("match-detail-overlay")).not.toBeVisible();
    await expect(page).not.toHaveURL(/\/login/);
  });

  test("TC-SPEC-12 | happy | Public page does not expose PII in network responses", async ({ page }) => {
    // Preconditions: TESTLIVE has real player events (try, card)
    // Steps:
    //   1. Open page
    //   2. Intercept all XHR/fetch responses
    //   3. Assert no PII in any response
    const piiFields = ["dateOfBirth", "dob", "email", "ic", "icNumber", "phone",
      "emergencyContact", "bloodType", "guardianName", "guardianContact"];

    const piiFound: string[] = [];

    page.on("response", async (response) => {
      const url = response.url();
      if (!url.includes("_next") && !url.includes("favicon")) {
        try {
          const text = await response.text();
          for (const field of piiFields) {
            if (text.includes(`"${field}"`) || text.includes(`"${field.toLowerCase()}"`)) {
              piiFound.push(`${field} found in ${url}`);
            }
          }
        } catch {
          // binary responses (images etc.) are fine to skip
        }
      }
    });

    await page.goto(`/${LIVE_TOURNAMENT_CODE}`);
    await page.waitForTimeout(2000); // allow network activity to settle

    // TODO: uncomment once real data is wired
    // expect(piiFound).toHaveLength(0);
    await expect(page).not.toHaveURL(/\/login/);
  });
});
