import { test as base, type Page } from "@playwright/test";

// ---------------------------------------------------------------------------
// Test accounts (must be provisioned in the test DB before running e2e tests)
// ---------------------------------------------------------------------------
export const TEST_ACCOUNTS = {
  player: "test-player@skrammm.local",
  manager: "test-manager@skrammm.local",
  organizer: "test-organizer@skrammm.local",
  newUser: "test-new@skrammm.local",
} as const;

// ---------------------------------------------------------------------------
// OTP helper
// Retrieves the most recent OTP for a given email from the dev endpoint.
// In CI, set TEST_OTP_OVERRIDE env var to use a fixed code.
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
// login helper — drives the email-OTP auth flow for player/manager portal
// ---------------------------------------------------------------------------
export async function loginAsPlayer(page: Page, email: string = TEST_ACCOUNTS.player) {
  await page.goto("/login");
  await page.getByRole("textbox", { name: /email/i }).fill(email);
  await page.getByRole("button", { name: /send code/i }).click();
  const otp = await getOtp(page, email);
  await page.getByRole("textbox", { name: /code/i }).fill(otp);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL("**/player**");
}

// ---------------------------------------------------------------------------
// login helper — drives the email-OTP auth flow for the organizer portal
// ---------------------------------------------------------------------------
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
// Extended test fixture with pre-authenticated contexts
// ---------------------------------------------------------------------------
type Fixtures = {
  playerPage: Page;
  organizerPage: Page;
};

export const test = base.extend<Fixtures>({
  playerPage: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await loginAsPlayer(page);
    await use(page);
    await context.close();
  },
  organizerPage: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await loginAsOrganizer(page);
    await use(page);
    await context.close();
  },
});

export { expect } from "@playwright/test";
