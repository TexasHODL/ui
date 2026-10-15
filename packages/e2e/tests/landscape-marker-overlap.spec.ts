import { test, expect } from "./fixtures.js";

/**
 * Mobile landscape on the dev table preview. Action boxes paint with the
 * seating layer, above chips and dealer buttons, so a marker inside one is
 * hidden. 2, 6 and 9 seats must keep every chip pile and every dealer button
 * off those boxes.
 */
test.describe("landscape action boxes", () => {
    test.use({ viewport: { width: 844, height: 390 } });

    for (const seats of [2, 6, 9]) {
        test(`${seats} seats keep chips and dealer buttons off action boxes`, async ({ page }) => {
            await page.goto(`/table-preview?seats=${seats}&dealer=all&actions=all&holes=1&board=5`);
            await page.waitForSelector(".chip-position");
            await page.waitForSelector("[data-preview-dealer]");
            await page.waitForSelector(".seat-banner-shell.seat-banner-visible .seat-banner-box");
            // The board drop is irrelevant here; freeze it so a late frame cannot
            // move a box under a marker mid-assertion.
            await page.addStyleTag({
                content: "*, *::before, *::after { animation: none !important; transition: none !important; }"
            });

            const overlaps = await page.evaluate(() => {
                const box = (el: Element) => {
                    const r = el.getBoundingClientRect();
                    return { x: r.x, y: r.y, r: r.right, b: r.bottom };
                };
                const hit = (a: { x: number; y: number; r: number; b: number }, b: { x: number; y: number; r: number; b: number }) => {
                    const ix = Math.min(a.r, b.r) - Math.max(a.x, b.x);
                    const iy = Math.min(a.b, b.b) - Math.max(a.y, b.y);
                    // A fraction of a pixel is the border touching, not a pile under the box.
                    if (ix < 1 || iy < 1) return null;
                    return `${ix.toFixed(0)}x${iy.toFixed(0)}`;
                };
                const banners = [...document.querySelectorAll(".seat-banner-shell.seat-banner-visible .seat-banner-box")].map(el => ({
                    label: (el.textContent || "").replace(/\s+/g, " ").trim(),
                    rect: box(el)
                }));
                const problems: string[] = [];
                [...document.querySelectorAll(".chip-position")].forEach((el, index) => {
                    const rect = box(el);
                    // Include the chip image, which hangs off the pill.
                    for (const img of el.querySelectorAll("img")) {
                        const r = box(img);
                        rect.x = Math.min(rect.x, r.x);
                        rect.y = Math.min(rect.y, r.y);
                        rect.r = Math.max(rect.r, r.r);
                        rect.b = Math.max(rect.b, r.b);
                    }
                    for (const banner of banners) {
                        const overlap = hit(rect, banner.rect);
                        if (overlap) problems.push(`chip ${index + 1} under ${banner.label} (${overlap})`);
                    }
                });
                [...document.querySelectorAll("[data-preview-dealer]")].forEach(el => {
                    const seat = el.getAttribute("data-preview-dealer");
                    const rect = box(el);
                    for (const banner of banners) {
                        const overlap = hit(rect, banner.rect);
                        if (overlap) problems.push(`dealer ${seat} under ${banner.label} (${overlap})`);
                    }
                });
                return problems;
            });

            expect(overlaps).toEqual([]);
        });
    }
});

/**
 * The height scale keeps the top cards under the header. The lowest action
 * box, the seat widget and the cards still have to stay inside the viewport.
 */
test.describe("landscape seats stay on screen", () => {
    const viewports = [
        { width: 844, height: 390 },
        { width: 915, height: 412 },
        { width: 1024, height: 650 }
    ] as const;

    for (const viewport of viewports) {
        for (const seats of [2, 6, 9]) {
            test(`${seats} seats at ${viewport.width}x${viewport.height} stay inside the viewport`, async ({ page }) => {
                await page.setViewportSize({ width: viewport.width, height: viewport.height });
                // 1024×650 is mobile landscape only with a coarse pointer. The
                // shorter two already qualify on height. Coarse matches a phone
                // at every size here.
                await page.addInitScript(() => {
                    const original = window.matchMedia.bind(window);
                    window.matchMedia = (query: string) => {
                        if (query.includes("pointer") && query.includes("coarse")) {
                            return {
                                matches: true,
                                media: query,
                                onchange: null,
                                addListener() {},
                                removeListener() {},
                                addEventListener() {},
                                removeEventListener() {},
                                dispatchEvent() { return false; }
                            } as MediaQueryList;
                        }
                        return original(query);
                    };
                });
                await page.goto(`/table-preview?seats=${seats}&dealer=all&actions=all&holes=1&board=5`);
                await page.waitForSelector(".player-seat");
                await page.waitForSelector(".seat-banner-shell.seat-banner-visible .seat-banner-box");
                await page.waitForSelector(".community-card-row .card");
                await page.addStyleTag({
                    content: "*, *::before, *::after { animation: none !important; transition: none !important; }"
                });

                const outside = await page.evaluate(() => {
                    const vw = window.innerWidth;
                    const vh = window.innerHeight;
                    const problems: string[] = [];
                    const consider = (kind: string, el: Element) => {
                        const r = el.getBoundingClientRect();
                        if (r.width < 1 || r.height < 1) return;
                        const label = (el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 24);
                        const edges = [
                            ["left", r.x],
                            ["top", r.y],
                            ["right", vw - r.right],
                            ["bottom", vh - r.bottom]
                        ] as const;
                        for (const [edge, gap] of edges) {
                            if (gap < -1) problems.push(`${kind} ${label || "?"} past the ${edge} by ${(-gap).toFixed(0)}px`);
                        }
                    };
                    document.querySelectorAll(".player-seat").forEach(el => consider("seat", el));
                    document.querySelectorAll(".seat-banner-shell.seat-banner-visible .seat-banner-box").forEach(el => consider("action", el));
                    document.querySelectorAll(".player-cards img, .community-card-row .card").forEach(el => consider("card", el));
                    return problems;
                });

                expect(outside).toEqual([]);
            });
        }
    }
});
