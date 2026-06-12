import { test as base, type Page } from "@playwright/test";
import path from "path";

const AUTH_DIR = path.join(__dirname, ".auth");

// ---------------------------------------------------------------------------
// Test accounts (must be provisioned in the test DB before running e2e tests)
// ---------------------------------------------------------------------------
export const TEST_ACCOUNTS = {
  player: "player@skrammm.dev",
  manager: "tm@skrammm.dev",
  organizer: "organizer@skrammm.dev",
  newUser: "test-new@skrammm.local",
} as const;

// ---------------------------------------------------------------------------
// OTP helper
// ---------------------------------------------------------------------------
export async function getOtp(page: Page, email: string): Promise<string> {
  if (process.env["TEST_OTP_OVERRIDE"]) {
    return process.env["TEST_OTP_OVERRIDE"];
  }
  const response = await page.request.post("/api/dev/otp", {
    data: { email },
  });
  const json = (await response.json()) as { otp?: string; code?: string };
  const code = json.otp ?? json.code;
  if (!code) throw new Error(`Could not retrieve OTP for ${email}`);
  return code;
}

// ---------------------------------------------------------------------------
// Login helpers — called by global.setup.ts once per run, not per test
// ---------------------------------------------------------------------------
export async function loginAsPlayer(
  page: Page,
  email: string = TEST_ACCOUNTS.player
) {
  await page.goto("/login");
  await page.getByRole("textbox", { name: /email/i }).fill(email);
  await page.getByRole("button", { name: /send code/i }).click();
  const otp = await getOtp(page, email);
  await page.getByRole("textbox", { name: /code/i }).fill(otp);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL("**/player**");
}

export async function loginAsOrganizer(
  page: Page,
  email: string = TEST_ACCOUNTS.organizer
) {
  await page.goto("/login/organizer");
  await page.getByRole("textbox", { name: /email/i }).fill(email);
  await page.getByRole("button", { name: /send code/i }).click();
  const otp = await getOtp(page, email);
  await page.getByRole("textbox", { name: /code/i }).fill(otp);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL("**/organizer**");
}

// ---------------------------------------------------------------------------
// Fixtures — load pre-authenticated storage state from global.setup.ts
// ---------------------------------------------------------------------------
type Fixtures = {
  playerPage: Page;
  organizerPage: Page;
  managerPage: Page;
};

export const test = base.extend<Fixtures>({
  playerPage: async ({ browser }, use) => {
    const ctx = await browser.newContext({
      storageState: path.join(AUTH_DIR, "player.json"),
    });
    const page = await ctx.newPage();
    await use(page);
    await ctx.close();
  },
  organizerPage: async ({ browser }, use) => {
    const ctx = await browser.newContext({
      storageState: path.join(AUTH_DIR, "organizer.json"),
    });
    const page = await ctx.newPage();
    await use(page);
    await ctx.close();
  },
  managerPage: async ({ browser }, use) => {
    const ctx = await browser.newContext({
      storageState: path.join(AUTH_DIR, "manager.json"),
    });
    const page = await ctx.newPage();
    await use(page);
    await ctx.close();
  },
});

export { expect } from "@playwright/test";
