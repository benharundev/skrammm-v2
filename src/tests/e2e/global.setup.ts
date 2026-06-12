import { chromium } from "@playwright/test";
import fs from "fs";
import path from "path";
import { loginAsOrganizer, loginAsPlayer, TEST_ACCOUNTS } from "./fixtures";

const AUTH_DIR = path.join(__dirname, ".auth");

async function globalSetup() {
  fs.mkdirSync(AUTH_DIR, { recursive: true });

  const browser = await chromium.launch();

  {
    const ctx = await browser.newContext({
      baseURL: "http://app.localhost.skrammm.com:3000",
    });
    const page = await ctx.newPage();
    await loginAsPlayer(page);
    await ctx.storageState({ path: path.join(AUTH_DIR, "player.json") });
    await ctx.close();
  }

  {
    const ctx = await browser.newContext({
      baseURL: "http://app.localhost.skrammm.com:3000",
    });
    const page = await ctx.newPage();
    await loginAsOrganizer(page);
    await ctx.storageState({ path: path.join(AUTH_DIR, "organizer.json") });
    await ctx.close();
  }

  {
    const ctx = await browser.newContext({
      baseURL: "http://app.localhost.skrammm.com:3000",
    });
    const page = await ctx.newPage();
    await loginAsPlayer(page, TEST_ACCOUNTS.manager);
    await ctx.storageState({ path: path.join(AUTH_DIR, "manager.json") });
    await ctx.close();
  }

  await browser.close();
}

export default globalSetup;
