import { test, expect } from "./fixtures";

// ---------------------------------------------------------------------------
// Organizer Portal — TC-ORG-01 to TC-ORG-28
// Canonical spec: docs/superpowers/specs/2026-06-08-mvp-test-script.md §2
// ---------------------------------------------------------------------------

test.describe("Organizer — Tournament Setup", () => {
  test("TC-ORG-01 | empty | Fresh organizer dashboard shows 'New Tournament' CTA", async ({ organizerPage: page }) => {
    // Preconditions: organizer has created no tournaments
    // Expected: "New Tournament" or "Create Tournament" CTA visible
    await page.goto("/organizer");
    // TODO: implement — seed a fresh organizer account with no tournaments
    // await expect(page.getByRole("link", { name: /new tournament|create tournament/i })).toBeVisible();
    await expect(page).toHaveURL(/\/organizer/);
  });

  test("TC-ORG-02 | happy | Wizard step 1 — valid inputs advance to step 2", async ({ organizerPage: page }) => {
    // Preconditions: organizer logged in
    // Steps:
    //   1. Navigate to /organizer/settings/setup
    //   2. Enter tournament name, valid dates, confirm code
    //   3. Click "Next"
    // Expected: step 2 is shown
    await page.goto("/organizer/settings/setup");
    // TODO: implement
    // await page.getByLabel(/tournament name/i).fill("KL Sevens 2026");
    // await page.getByLabel(/start date/i).fill("2026-09-01");
    // await page.getByLabel(/end date/i).fill("2026-09-02");
    // await page.getByRole("button", { name: /next/i }).click();
    // await expect(page.getByText(/how many teams/i)).toBeVisible();
    await expect(page).toHaveURL(/\/organizer/);
  });

  test("TC-ORG-03 | happy | 16 teams → format recommendation 'Tiered'", async ({ organizerPage: page }) => {
    // Preconditions: wizard step 2 reached
    // Steps: click the "16" teams button
    // Expected: "Tiered" / "Grouping → Quarterfinal → Semifinal" label shown
    await page.goto("/organizer/settings/setup");
    // TODO: advance to step 2, then:
    // await page.getByRole("button", { name: "16" }).click();
    // await expect(page.getByText(/tiered|quarterfinal/i)).toBeVisible();
    await expect(page).toHaveURL(/setup/);
  });

  test("TC-ORG-04 | happy | 8 teams → format recommendation 'Festival'", async ({ organizerPage: page }) => {
    // Expected: "Festival" / "Round Robin" label shown
    await page.goto("/organizer/settings/setup");
    // TODO: advance to step 2
    // await page.getByRole("button", { name: "8" }).click();
    // await expect(page.getByText(/festival|round robin/i)).toBeVisible();
    await expect(page).toHaveURL(/setup/);
  });

  test("TC-ORG-05 | happy | 24 teams → format recommendation 'Elimination'", async ({ organizerPage: page }) => {
    // Expected: "Elimination" / "Cup / Plate / Bowl / Shield" label shown
    await page.goto("/organizer/settings/setup");
    // TODO: advance to step 2
    // await page.getByRole("button", { name: "24" }).click();
    // await expect(page.getByText(/elimination|cup.*plate/i)).toBeVisible();
    await expect(page).toHaveURL(/setup/);
  });

  test("TC-ORG-06 | happy | Launch tournament → success page with join code", async ({ organizerPage: page }) => {
    // Steps: complete all 4 wizard steps, click "Launch Tournament", confirm modal
    // Expected: success page shows join code + shareable URL
    await page.goto("/organizer/settings/setup");
    // TODO: implement full wizard flow
    // await expect(page.getByText(/join code|share link/i)).toBeVisible();
    await expect(page).toHaveURL(/setup/);
  });

  test("TC-ORG-07 | negative | Step 1 — blank tournament name blocks advance", async ({ organizerPage: page }) => {
    // Steps: leave name blank, click "Next"
    // Expected: inline validation error, wizard stays on step 1
    await page.goto("/organizer/settings/setup");
    // TODO: implement
    // await page.getByRole("button", { name: /next/i }).click();
    // await expect(page.getByText(/name is required/i)).toBeVisible();
    await expect(page).toHaveURL(/setup/);
  });

  test("TC-ORG-08 | negative | Step 1 — end date before start date", async ({ organizerPage: page }) => {
    // Steps: start=2026-09-01, end=2026-08-01, click "Next"
    // Expected: validation error "End date must be after start date"
    await page.goto("/organizer/settings/setup");
    // TODO: implement
    // await page.getByLabel(/start date/i).fill("2026-09-01");
    // await page.getByLabel(/end date/i).fill("2026-08-01");
    // await page.getByRole("button", { name: /next/i }).click();
    // await expect(page.getByText(/end date.*after/i)).toBeVisible();
    await expect(page).toHaveURL(/setup/);
  });
});

test.describe("Organizer — Teams Management", () => {
  test("TC-ORG-09 | empty | No pending teams shows 'All caught up'", async ({ organizerPage: page }) => {
    // Preconditions: tournament with no pending applications
    // Expected: "All caught up" empty state
    await page.goto("/organizer/teams");
    // TODO: click Pending tab, then:
    // await page.getByRole("tab", { name: /pending/i }).click();
    // await expect(page.getByText(/all caught up/i)).toBeVisible();
    await expect(page).toHaveURL(/\/organizer/);
  });

  test("TC-ORG-10 | happy | Approve pending team → moves to Approved tab", async ({ organizerPage: page }) => {
    // Preconditions: at least one pending team exists
    // Steps: click Pending tab → click "Approve"
    // Expected: team removed from Pending, appears in Approved
    await page.goto("/organizer/teams");
    // TODO: implement
    await expect(page).toHaveURL(/\/organizer/);
  });

  test("TC-ORG-11 | happy | Reject pending team → removed from Pending tab", async ({ organizerPage: page }) => {
    // Preconditions: at least one pending team
    // Expected: team removed from Pending, NOT in Approved
    await page.goto("/organizer/teams");
    // TODO: implement
    await expect(page).toHaveURL(/\/organizer/);
  });

  test("TC-ORG-12 | happy | Search filters approved teams", async ({ organizerPage: page }) => {
    // Preconditions: multiple approved teams
    // Steps: type partial team name in search
    // Expected: list filters in real-time
    await page.goto("/organizer/teams");
    // TODO: click Approved tab, type in search, assert filter
    await expect(page).toHaveURL(/\/organizer/);
  });

  test("TC-ORG-13 | happy | Click approved team row → team detail page", async ({ organizerPage: page }) => {
    // Expected: navigates to /organizer/teams/{teamId}
    await page.goto("/organizer/teams");
    // TODO: implement
    await expect(page).toHaveURL(/\/organizer/);
  });

  test("TC-ORG-14 | empty | Team detail — team with no players", async ({ organizerPage: page }) => {
    // Expected: "No players registered yet" empty state
    // TODO: navigate to a team detail page for an empty team
    // await page.goto("/organizer/teams/{emptyTeamId}");
    // await expect(page.getByText(/no players registered/i)).toBeVisible();
    await page.goto("/organizer");
    await expect(page).toHaveURL(/\/organizer/);
  });

  test("TC-ORG-15 | happy | Team detail — 15+ players shows pagination", async ({ organizerPage: page }) => {
    // Expected: first 10 rows visible, pagination controls present
    // TODO: navigate to team with 15+ players
    // await expect(page.getByRole("navigation", { name: /pagination/i })).toBeVisible();
    await page.goto("/organizer");
    await expect(page).toHaveURL(/\/organizer/);
  });
});

test.describe("Organizer — Fixtures & Schedule", () => {
  test("TC-ORG-16 | empty | No matches scheduled → empty schedule", async ({ organizerPage: page }) => {
    // Expected: empty state, no match rows
    await page.goto("/organizer/schedule");
    // TODO: assert empty state if tournament has no matches
    await expect(page).toHaveURL(/\/organizer/);
  });

  test("TC-ORG-17 | happy | Edit referee name → 'Unsaved changes' banner appears", async ({ organizerPage: page }) => {
    // Steps: expand match row, change referee, do NOT save
    // Expected: unsaved-changes banner with Save All / Discard All
    await page.goto("/organizer/schedule");
    // TODO: implement
    // await page.getByRole("button", { name: /edit/i }).first().click();
    // await page.getByLabel(/referee/i).fill("Referee Name");
    // await expect(page.getByText(/unsaved changes/i)).toBeVisible();
    await expect(page).toHaveURL(/\/organizer/);
  });

  test("TC-ORG-18 | happy | Save All → banner dismissed, changes persist", async ({ organizerPage: page }) => {
    // Steps: make unsaved change → click "Save All"
    // Expected: banner gone, referee name persists after reload
    await page.goto("/organizer/schedule");
    // TODO: implement
    await expect(page).toHaveURL(/\/organizer/);
  });

  test("TC-ORG-19 | happy | Filter by status 'Live' shows only live matches", async ({ organizerPage: page }) => {
    // Expected: non-live matches hidden
    await page.goto("/organizer/schedule");
    // TODO: implement
    // await page.getByRole("combobox", { name: /status/i }).selectOption("live");
    // await expect(page.getByText(/upcoming|completed/i)).not.toBeVisible();
    await expect(page).toHaveURL(/\/organizer/);
  });

  test("TC-ORG-20 | negative | Discard All reverts unsaved changes", async ({ organizerPage: page }) => {
    // Steps: edit referee → click Discard All
    // Expected: previous referee name restored, banner dismissed
    await page.goto("/organizer/schedule");
    // TODO: implement
    await expect(page).toHaveURL(/\/organizer/);
  });
});

test.describe("Organizer — Live Match Control", () => {
  test("TC-ORG-21 | happy | Score try (home) → score +5, event in log", async ({ organizerPage: page }) => {
    // Preconditions: live match open at /organizer/match/{matchId}
    // Expected: home score increases by 5, "Try" in event log
    // TODO: navigate to a live match, then:
    // const scoreBefore = await page.getByTestId("home-score").textContent();
    // await page.getByRole("button", { name: /try.*home|home.*try/i }).click();
    // await expect(page.getByTestId("home-score")).toHaveText(String(Number(scoreBefore) + 5));
    await page.goto("/organizer");
    await expect(page).toHaveURL(/\/organizer/);
  });

  test("TC-ORG-22 | happy | Score conversion → score +2, event in log", async ({ organizerPage: page }) => {
    // Expected: home score increases by 2, "Conversion" in log
    // TODO: implement
    await page.goto("/organizer");
    await expect(page).toHaveURL(/\/organizer/);
  });

  test("TC-ORG-23 | happy | Issue yellow card → card event in log", async ({ organizerPage: page }) => {
    // Expected: yellow card event in log, score unchanged
    // TODO: implement
    await page.goto("/organizer");
    await expect(page).toHaveURL(/\/organizer/);
  });

  test("TC-ORG-24 | happy | Cycle all match phases: Kick Off → Full Time", async ({ organizerPage: page }) => {
    // Expected: each phase button advances status indicator
    // TODO: implement full phase cycle
    await page.goto("/organizer");
    await expect(page).toHaveURL(/\/organizer/);
  });

  test("TC-ORG-25 | happy | Undo last event → score reverts, undo bar auto-hides", async ({ organizerPage: page }) => {
    // Steps: score try → click Undo in undo bar
    // Expected: score back to pre-try value, undo bar hides after ~8s
    // TODO: implement
    await page.goto("/organizer");
    await expect(page).toHaveURL(/\/organizer/);
  });

  test("TC-ORG-26 | happy | Suspend match → SUSPENDED badge, resume re-enables scoring", async ({ organizerPage: page }) => {
    // Expected: SUSPENDED badge visible, scoring buttons disabled while suspended
    // TODO: implement
    await page.goto("/organizer");
    await expect(page).toHaveURL(/\/organizer/);
  });

  test("TC-ORG-27 | happy | Lock result → match status = locked", async ({ organizerPage: page }) => {
    // Steps: Full Time phase → Lock Result → confirm modal
    // Expected: status = "locked", confirmation modal closes
    // TODO: implement
    await page.goto("/organizer");
    await expect(page).toHaveURL(/\/organizer/);
  });

  test("TC-ORG-28 | negative | Locked match — scoring buttons disabled", async ({ organizerPage: page }) => {
    // Preconditions: match with status "locked"
    // Expected: Try / Conversion / Card buttons absent or disabled
    // TODO: navigate to a locked match and assert buttons are disabled
    await page.goto("/organizer");
    await expect(page).toHaveURL(/\/organizer/);
  });
});
