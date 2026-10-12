import { test, expect, CASH_GAME_ID } from "./fixtures.js";

/**
 * Harness sanity — proves the whole e2e path works BEFORE any gameplay:
 * Playwright boots its browser, fixtures.ts seeds the wallet + Stub network into
 * localStorage, the UI comes up chain-direct against the stub, and the stub's
 * funded balance + seeded table render.
 */

test("funded USDC balance from the stub shows on the dashboard", async ({ page }) => {
  await page.goto("/");
  // The Game wallet region renders the funded balance from the stub's balance
  // endpoint (1000 USDC). Proves wallet seeding + Stub network + funding.
  const wallet = page.getByRole("region", { name: "Game wallet" });
  await expect(wallet).toBeVisible();
  // Scope the exact funded amount to the wallet, not the duplicated header balance.
  await expect(wallet.getByText("$1000.00 USDC", { exact: true })).toBeVisible();
});

test("seeded table page renders without crashing", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));

  await page.goto(`/table/${CASH_GAME_ID}`);

  // Table shell mounted + at least one vacant seat from the seeded empty table.
  // Use the accessible seat action, independent of decorative subtitle wording.
  await expect(page.getByRole("button", { name: /^Join seat \d+$/ }).first()).toBeVisible({ timeout: 15_000 });
  expect(errors, `page errors: ${errors.join(" | ")}`).toHaveLength(0);
});
