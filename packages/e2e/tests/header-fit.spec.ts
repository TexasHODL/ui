import { test, expect } from "./fixtures.js";

/**
 * Site header stays usable while the window is resized (ui#196).
 *
 * The single row — logo, Lobby / My hands / Wallet, theme toggle, More and
 * the avatar, with the 48px group gaps and 32px padding — fits at 864px and
 * wider in Chromium with Space Grotesk. Narrower than that, the logo box
 * used to shrink and then More and the avatar were clipped, because the
 * compact two-row rules waited until 700px and the page hides horizontal
 * overflow. Those rules now start at 863px.
 */
const SINGLE_ROW_FITS_AT = 864;

type HeaderReport = {
  vw: number;
  wrapped: boolean;
  brandClient: number;
  brandScroll: number;
  avatarRight: number;
  problems: string[];
};

function widths(): number[] {
  const values = new Set<number>([320, 360, 390, 667, 700, 701, 760, 768, 789, 790, 820, 844, 863, 864, 900, 1024, 1180, 1280, 1440, 1920]);
  for (let width = 320; width <= 1100; width += 10) values.add(width);
  for (let width = 690; width <= 710; width += 1) values.add(width);
  for (let width = 850; width <= 880; width += 1) values.add(width);
  return [...values].sort((a, b) => a - b);
}

async function prepare(page: import("@playwright/test").Page, signedOut: boolean) {
  await page.addInitScript((clearWallet) => {
    localStorage.setItem("seen_upcoming_sng_modal", "true");
    if (clearWallet) {
      localStorage.removeItem("user_cosmos_mnemonic");
      localStorage.removeItem("user_cosmos_address");
    }
  }, signedOut);
  await page.goto("/");
  await page.getByRole("link", { name: "Texas HODL lobby" }).waitFor();
  await page.evaluate(() => document.fonts.ready);
  await expect.poll(() => page.evaluate(() => document.fonts.check("600 15px 'Space Grotesk'"))).toBe(true);
}

async function report(page: import("@playwright/test").Page): Promise<HeaderReport> {
  return page.evaluate(() => {
    const viewportWidth = document.documentElement.clientWidth;
    const viewportHeight = window.innerHeight;
    const brand = document.querySelector("header a[aria-label='Texas HODL lobby']");
    const nav = document.querySelector("header nav");
    const links = nav ? [...nav.querySelectorAll("a")] : [];
    const named = (label: string) => links.find((link) => link.textContent?.trim() === label) ?? null;
    const controls: Array<[string, Element | null]> = [
      ["brand", brand],
      ["Lobby", named("Lobby")],
      ["My hands", named("My hands")],
      ["Wallet", named("Wallet")],
      ["Light theme", document.querySelector("header button[aria-label='Light theme']")],
      ["Dark theme", document.querySelector("header button[aria-label='Dark theme']")],
      ["More", document.querySelector("header summary")],
      ["avatar", document.querySelector("header button[aria-label='Choose your avatar']")],
    ];
    const problems: string[] = [];
    for (const [name, el] of controls) {
      if (!el) {
        problems.push(`${name} missing`);
        continue;
      }
      const box = el.getBoundingClientRect();
      if (box.width < 1 || box.height < 1) problems.push(`${name} has no box`);
      if (box.left < -0.5) problems.push(`${name} left ${box.left.toFixed(1)}`);
      if (box.right > viewportWidth + 0.5) problems.push(`${name} right ${box.right.toFixed(1)} past ${viewportWidth}`);
      if (box.top < -0.5) problems.push(`${name} above the viewport`);
      if (box.bottom > viewportHeight + 0.5) problems.push(`${name} below the viewport`);
      const x = box.left + box.width / 2;
      const y = box.top + box.height / 2;
      if (x < 0 || y < 0 || x >= viewportWidth || y >= viewportHeight) {
        problems.push(`${name} center outside the viewport`);
        continue;
      }
      const hit = document.elementFromPoint(x, y);
      if (!hit || (hit !== el && !el.contains(hit))) {
        const covering = hit ? `${hit.tagName} ${hit.getAttribute("aria-label") || hit.textContent?.trim().slice(0, 24) || ""}` : "nothing";
        problems.push(`${name} center covered by ${covering}`);
      }
    }
    const brandBox = brand?.getBoundingClientRect();
    const navBox = nav?.getBoundingClientRect();
    return {
      vw: viewportWidth,
      wrapped: Boolean(brandBox && navBox && navBox.top > brandBox.bottom - 4),
      brandClient: brand?.clientWidth ?? 0,
      brandScroll: brand?.scrollWidth ?? 0,
      avatarRight: document.querySelector("header button[aria-label='Choose your avatar']")?.getBoundingClientRect().right ?? 0,
      problems,
    };
  });
}

async function assertFits(page: import("@playwright/test").Page, width: number, height = 900) {
  await page.setViewportSize({ width, height });
  const result = await report(page);
  const wrapped = result.vw < SINGLE_ROW_FITS_AT;
  const failures = [...result.problems];
  if (result.wrapped !== wrapped) failures.push(`wrapped ${result.wrapped}, expected ${wrapped}`);
  if (result.brandScroll > result.brandClient + 1) {
    failures.push(`logo squeezed ${result.brandClient}px box / ${result.brandScroll}px text`);
  }
  if (!wrapped && result.avatarRight > result.vw - 31) {
    failures.push(`avatar right ${result.avatarRight.toFixed(1)} eats the 32px padding of ${result.vw}`);
  }
  expect(failures, `${width}x${height}: ${failures.join("; ")}`).toEqual([]);
}

test("header controls stay inside the viewport while resizing both ways", async ({ page }) => {
  test.setTimeout(90_000);
  await prepare(page, false);
  const ascending = widths();
  for (const width of ascending) await assertFits(page, width);
  const across = [1920, 1440, 1024, 864, 863, 800, 768, 720, 701, 700, 390, 320];
  for (const width of across) await assertFits(page, width);
  for (const width of [...across].reverse()) await assertFits(page, width);
  await assertFits(page, 844, 390);
  await assertFits(page, 932, 430);
  await assertFits(page, 390, 844);
});

test("More menu and avatar stay reachable on desktop, the old clip range, and compact widths", async ({ page }) => {
  test.setTimeout(60_000);
  await prepare(page, false);
  const samples = [
    { width: 1440, height: 900 },
    { width: 1024, height: 768 },
    { width: 864, height: 900 },
    { width: 863, height: 900 },
    { width: 768, height: 1024 },
    { width: 720, height: 900 },
    { width: 390, height: 844 },
    { width: 844, height: 390 },
    { width: 320, height: 700 },
  ];
  for (const size of samples) {
    await page.setViewportSize(size);
    const summary = page.locator("header summary");
    await summary.click();
    const menu = page.locator("header details");
    await expect.poll(() => menu.evaluate((el: HTMLDetailsElement) => el.open)).toBe(true);
    const menuProblems = await page.evaluate(() => {
      const viewportWidth = document.documentElement.clientWidth;
      const viewportHeight = window.innerHeight;
      const dropdown = document.querySelector("header details")?.querySelector("div");
      const problems: string[] = [];
      if (!dropdown) {
        problems.push("dropdown missing");
        return problems;
      }
      const box = dropdown.getBoundingClientRect();
      if (box.left < -0.5 || box.right > viewportWidth + 0.5) problems.push(`panel horizontal ${box.left.toFixed(0)}-${box.right.toFixed(0)} vw ${viewportWidth}`);
      if (box.top < -0.5 || box.bottom > viewportHeight + 0.5) problems.push(`panel vertical ${box.top.toFixed(0)}-${box.bottom.toFixed(0)} vh ${viewportHeight}`);
      const tables = [...dropdown.querySelectorAll("a")].find((link) => link.textContent?.trim() === "Tables");
      if (!tables) problems.push("Tables link missing");
      else {
        tables.scrollIntoView({ block: "nearest" });
        const linkBox = tables.getBoundingClientRect();
        const x = linkBox.left + linkBox.width / 2;
        const y = linkBox.top + linkBox.height / 2;
        const hit = document.elementFromPoint(x, y);
        if (!hit || (hit !== tables && !tables.contains(hit))) problems.push("Tables link is not clickable");
        if (linkBox.left < -0.5 || linkBox.right > viewportWidth + 0.5) problems.push("Tables link clipped horizontally");
      }
      return problems;
    });
    expect(menuProblems, `${size.width}x${size.height} menu: ${menuProblems.join("; ")}`).toEqual([]);
    await summary.click();
    await expect.poll(() => menu.evaluate((el: HTMLDetailsElement) => el.open)).toBe(false);

    await page.getByRole("button", { name: "Light theme" }).click();
    await expect(page.getByRole("button", { name: "Light theme" })).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: "Dark theme" }).click();
    await expect(page.getByRole("button", { name: "Dark theme" })).toHaveAttribute("aria-pressed", "true");

    await page.getByRole("button", { name: "Choose your avatar" }).click();
    const dialog = page.getByRole("dialog", { name: "Select Profile Avatar" });
    await expect(dialog).toBeVisible();
    const dialogBox = await dialog.boundingBox();
    expect(dialogBox, "avatar dialog box").not.toBeNull();
    if (dialogBox) {
      expect(dialogBox.x, "dialog left").toBeGreaterThanOrEqual(-1);
      expect(dialogBox.x + dialogBox.width, "dialog right").toBeLessThanOrEqual(size.width + 1);
    }
    await page.getByRole("button", { name: "Close dialog" }).click();
    await expect(dialog).toBeHidden();
  }
});

test("a fresh visit and an NFT image keep the same 36px avatar on screen", async ({ page }) => {
  test.setTimeout(60_000);
  // index.tsx mints a game wallet before React when none is stored, so the
  // header never grows a separate signed-out control. Clearing the fixture
  // mnemonic takes that first-visit path. No ETH wallet is connected, so the
  // avatar is the NFT placeholder until an image is shown in the same slot.
  await prepare(page, true);
  const minted = await page.evaluate(() => localStorage.getItem("user_cosmos_mnemonic"));
  expect(minted && minted.split(" ").length).toBe(24);
  const avatar = page.getByRole("button", { name: "Choose your avatar" });
  await expect(avatar).toHaveText("NFT");
  for (const width of [320, 390, 700, 760, 789, 863, 864, 1024, 1440]) {
    await assertFits(page, width);
  }
  await assertFits(page, 844, 390);

  await page.evaluate(() => {
    const button = document.querySelector("header button[aria-label='Choose your avatar']");
    if (!button) return;
    button.textContent = "";
    const image = document.createElement("img");
    image.alt = "Profile avatar";
    image.src = "data:image/svg+xml," + encodeURIComponent("<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 36 36'><circle cx='18' cy='18' r='18' fill='%23c45cff'/><circle cx='18' cy='15' r='6' fill='%23fff'/></svg>");
    image.style.width = "100%";
    image.style.height = "100%";
    image.style.objectFit = "cover";
    button.appendChild(image);
  });
  for (const width of [320, 760, 863, 864, 1440]) {
    await assertFits(page, width);
    await expect(avatar.locator("img"), `NFT image still in the slot at ${width}`).toHaveCount(1);
    const box = await avatar.boundingBox();
    expect(box?.width, `avatar width at ${width}`).toBe(36);
    expect(box?.height, `avatar height at ${width}`).toBe(36);
  }
});
