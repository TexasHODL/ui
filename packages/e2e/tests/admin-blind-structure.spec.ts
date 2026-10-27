import { test, expect } from "./fixtures.js";

/**
 * /admin/tables offers the same blind structures as the lobby's create modal
 * (ui#905, ui#906): Ladder by default, and the "Show Blind Structure" preview
 * shows the levels the engine will play (rounded doubling, antes) instead of
 * raw doubling. Saves a screenshot for the PR.
 */
const SHOTS = new URL("../../../screenshots/", import.meta.url).pathname;

for (const type of ["sit-and-go", "tournament"] as const) {
  test(`admin tables: a ${type} picks a blind structure, ladder by default`, async ({ page }) => {
    await page.goto("/admin/tables");
    const gameType = page.getByTestId("create-game-type");
    await expect(gameType).toBeVisible({ timeout: 15_000 });
    await gameType.selectOption(type);

    const choice = page.getByTestId("blind-structure");
    await expect(choice).toHaveValue("ladder");
    await page.locator("#showStructure").check();
    const rows = page.getByTestId("blind-preview").locator("tbody tr");
    await expect(rows).toHaveCount(10);
    await expect(rows.nth(0)).toContainText("10 / 20");
    await expect(rows.nth(5)).toContainText("75 / 150");
    await expect(page.getByTestId("blind-preview-note")).toContainText("ladder");

    if (type === "sit-and-go") {
      const form = page.locator("div", { has: page.getByText("Create New Table") }).filter({ has: page.locator("#showStructure") }).last();
      await form.screenshot({ path: `${SHOTS}admin-blind-structure-ladder.png` });
    }

    // Doubling is rounded like the engine plays it (poker-vm#2738).
    await choice.selectOption("doubling");
    await expect(rows.nth(6)).toContainText("650 / 1,300");
    await expect(page.getByTestId("blind-preview-note")).toContainText("double");

    // A preset hides the opening-blind buttons and previews its own levels.
    await choice.selectOption("turbo");
    await expect(page.getByText("Starting Blinds (chips)")).toHaveCount(0);
    await expect(rows.nth(4)).toContainText("400 / 800");
  });
}

test("admin tables: cash games have no blind structure", async ({ page }) => {
  await page.goto("/admin/tables");
  await expect(page.getByTestId("create-game-type")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId("blind-structure")).toHaveCount(0);
});
