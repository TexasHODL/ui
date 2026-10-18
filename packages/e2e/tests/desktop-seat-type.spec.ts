import { test, expect } from "./fixtures.js";

/**
 * On desktop the action banner, the stack amount, and the countdown number
 * share one computed font-size (--seat-amount-size). An action badge and the
 * countdown cannot share a seat, so the two pages are measured separately.
 */
test.describe("desktop seat type", () => {
    const viewports = [
        { width: 1366, height: 768 },
        { width: 1440, height: 900 },
        { width: 1920, height: 1080 }
    ] as const;

    for (const viewport of viewports) {
        test(`banner, stack, and countdown share one font size at ${viewport.width}x${viewport.height}`, async ({ page }) => {
            await page.setViewportSize({ width: viewport.width, height: viewport.height });

            const fontSize = (selector: string) => page.evaluate((sel) => {
                const el = document.querySelector(sel);
                if (!el) return null;
                return getComputedStyle(el).fontSize;
            }, selector);

            await page.goto("/table-preview?seats=9&actions=all");
            await page.waitForSelector(".action-display-text");
            await page.waitForSelector(".action-display-amount");
            await page.waitForSelector(".badge-value");

            const stack = await fontSize(".badge-value");
            const banner = await fontSize(".action-display-text");
            const amount = await fontSize(".action-display-amount");

            await page.goto("/table-preview?seats=9&turn=1");
            await page.waitForSelector(".seat-timer-value");
            const countdown = await fontSize(".seat-timer-value");
            const stackOnTurn = await fontSize(".badge-value");

            expect(stack, "stack amount").toBeTruthy();
            expect([banner, amount, countdown, stackOnTurn]).toEqual([stack, stack, stack, stack]);
        });
    }
});
