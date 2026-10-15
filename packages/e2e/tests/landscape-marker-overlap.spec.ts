import { test, expect } from "./fixtures.js";

/**
 * Mobile landscape on the dev table preview. Action boxes paint under the
 * seat badge. Chips stay off those boxes. The dealer button is part of the
 * badge, up and to the left of the seat number, and must not land inside a box.
 */
test.describe("landscape action boxes", () => {
    test.use({ viewport: { width: 844, height: 390 } });

    for (const seats of [2, 6, 9]) {
        test(`${seats} seats keep chips and dealer buttons off action boxes`, async ({ page }) => {
            await page.goto(`/table-preview?seats=${seats}&dealer=all&actions=all&holes=1&board=5`);
            await page.waitForSelector(".chip-position");
            await page.waitForSelector("[data-dealer-button]");
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
                [...document.querySelectorAll("[data-dealer-button]")].forEach(el => {
                    const seat = el.getAttribute("data-dealer-button");
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
                    const chrome = document.querySelector(".table-banner-wrap");
                    const chromeBottom = chrome ? chrome.getBoundingClientRect().bottom : 0;
                    document.querySelectorAll("[data-dealer-button]").forEach(el => {
                        consider("dealer", el);
                        const top = el.getBoundingClientRect().y;
                        if (top < chromeBottom - 1) {
                            problems.push(`dealer ${el.getAttribute("data-dealer-button")} under the header by ${(chromeBottom - top).toFixed(0)}px`);
                        }
                    });
                    return problems;
                });

                expect(outside).toEqual([]);
            });
        }
    }
});

/**
 * The dealer button is attached to the seat-number disc: up and to the left
 * at 45 degrees, a few pixels clear, above the hole cards, and inside the
 * viewport on every format.
 */
test.describe("dealer button on the seat badge", () => {
    const viewports = [
        { width: 844, height: 390, label: "landscape", coarse: true },
        { width: 390, height: 844, label: "portrait", coarse: true },
        { width: 1024, height: 768, label: "tablet", coarse: false },
        { width: 1440, height: 900, label: "desktop", coarse: false }
    ] as const;

    for (const viewport of viewports) {
        for (const seats of [2, 6, 9]) {
            test(`${seats} seats at ${viewport.width}x${viewport.height} ${viewport.label}`, async ({ page }) => {
                await page.setViewportSize({ width: viewport.width, height: viewport.height });
                await page.addInitScript((coarse: boolean) => {
                    const original = window.matchMedia.bind(window);
                    window.matchMedia = (query: string) => {
                        if (query.includes("pointer") && query.includes("coarse")) {
                            return {
                                matches: coarse,
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
                }, viewport.coarse);
                await page.goto(`/table-preview?seats=${seats}&dealer=all&actions=all&holes=1&board=5`);
                await page.waitForSelector("[data-dealer-button]");
                await page.addStyleTag({
                    content: "*, *::before, *::after { animation: none !important; transition: none !important; } .dealer-badge-button, .dealer-badge-button img { pointer-events: auto !important; }"
                });

                const problems = await page.evaluate((expected) => {
                    const found: string[] = [];
                    const buttons = [...document.querySelectorAll("[data-dealer-button]")];
                    if (buttons.length !== expected) found.push(`expected ${expected} dealer buttons, found ${buttons.length}`);
                    const chrome = document.querySelector(".table-banner-wrap");
                    const chromeBottom = chrome ? chrome.getBoundingClientRect().bottom : 0;
                    for (const el of buttons) {
                        const seat = el.getAttribute("data-dealer-button");
                        const badge = el.closest(".badge-number");
                        if (!badge) {
                            found.push(`dealer ${seat} is not inside a seat-number badge`);
                            continue;
                        }
                        const b = el.getBoundingClientRect();
                        const n = badge.getBoundingClientRect();
                        const bx = b.x + b.width / 2;
                        const by = b.y + b.height / 2;
                        const nx = n.x + n.width / 2;
                        const ny = n.y + n.height / 2;
                        const dx = nx - bx;
                        const dy = ny - by;
                        if (dx < 4 || dy < 4) found.push(`dealer ${seat} is not up-left of the badge (dx ${dx.toFixed(1)}, dy ${dy.toFixed(1)})`);
                        if (Math.abs(dx - dy) > 3) found.push(`dealer ${seat} is not on the 45 degree ray (dx ${dx.toFixed(1)}, dy ${dy.toFixed(1)})`);
                        const gap = Math.hypot(dx, dy) - b.width / 2 - n.width / 2;
                        if (gap < 1 || gap > 6) found.push(`dealer ${seat} gap is ${gap.toFixed(1)}px`);
                        if (b.y < chromeBottom - 1) found.push(`dealer ${seat} under the header`);
                        if (b.x < -1 || b.y < -1 || b.right > window.innerWidth + 1 || b.bottom > window.innerHeight + 1) {
                            found.push(`dealer ${seat} outside the viewport`);
                        }
                        const top = document.elementFromPoint(bx, by);
                        if (!top || !el.contains(top)) found.push(`dealer ${seat} is covered at its centre`);
                    }
                    return found;
                }, seats);

                expect(problems).toEqual([]);
            });
        }
    }
});

/**
 * 9-seat mobile landscape. Seats 2 and 9 are centred between the neighbouring
 * widgets. Landscape cards are 2px taller than the portrait box, width scaled.
 */
test.describe("landscape wing seats and card size", () => {
    const viewports = [
        { width: 844, height: 390 },
        { width: 915, height: 412 },
        { width: 1024, height: 650 }
    ] as const;

    for (const viewport of viewports) {
        test(`9 seats at ${viewport.width}x${viewport.height} centre the wings and grow the cards`, async ({ page }) => {
            await page.setViewportSize({ width: viewport.width, height: viewport.height });
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
            await page.goto("/table-preview?seats=9&dealer=1&actions=all&holes=1&board=5");
            await page.waitForSelector(".player-seat");
            await page.waitForSelector(".community-card-row .card");
            await page.addStyleTag({
                content: "*, *::before, *::after { animation: none !important; transition: none !important; }"
            });

            const problems = await page.evaluate(() => {
                const found: string[] = [];
                const seats: Record<string, { cx: number; left: number; right: number; top: number }> = {};
                document.querySelectorAll(".player-seat").forEach(el => {
                    const badge = el.querySelector(".badge-number");
                    const label = badge ? (badge.childNodes[0]?.textContent || "").trim() : "";
                    const r = el.getBoundingClientRect();
                    if (r.width < 1) return;
                    seats[label] = { cx: r.x + r.width / 2, left: r.x, right: r.right, top: r.y };
                });
                const need = ["1", "2", "3", "8", "9"];
                if (need.some(n => !seats[n])) {
                    found.push(`missing seats ${need.filter(n => !seats[n]).join(",")}`);
                    return found;
                }
                const mid2 = (seats["3"].right + seats["1"].left) / 2;
                const mid9 = (seats["1"].right + seats["8"].left) / 2;
                if (Math.abs(seats["2"].cx - mid2) > 1.5) found.push(`seat 2 centre ${seats["2"].cx.toFixed(1)} is not the midpoint ${mid2.toFixed(1)}`);
                if (Math.abs(seats["9"].cx - mid9) > 1.5) found.push(`seat 9 centre ${seats["9"].cx.toFixed(1)} is not the midpoint ${mid9.toFixed(1)}`);
                if (Math.abs(seats["2"].top - seats["9"].top) > 2) found.push("seats 2 and 9 are not level");
                const wrap = document.querySelector("[data-mobile-readable='landscape']");
                if (!wrap) {
                    found.push("table is not mobile landscape");
                    return found;
                }
                const style = getComputedStyle(wrap);
                const unit = parseFloat(style.getPropertyValue("--mobile-unit"));
                const zoom = parseFloat(style.getPropertyValue("--table-zoom"));
                const hole = document.querySelector(".player-cards img");
                const community = document.querySelector(".community-card-row .card");
                if (!(hole instanceof HTMLElement) || !(community instanceof HTMLElement)) {
                    found.push("missing a card");
                    return found;
                }
                // offset* is the layout box. The 8° fan turns getBoundingClientRect
                // into a larger upright box, so it is the wrong height to check.
                const holeH = hole.offsetHeight * zoom;
                const holeW = hole.offsetWidth * zoom;
                const communityH = community.offsetHeight * zoom;
                const communityW = community.offsetWidth * zoom;
                const expectH = 53 * unit * zoom;
                const expectW = (39 * 53 / 51) * unit * zoom;
                const expectCommunityH = (39 * 805 / 550 + 2) * unit * zoom;
                const expectCommunityW = 39 * (39 * 805 / 550 + 2) / (39 * 805 / 550) * unit * zoom;
                if (Math.abs(holeH - expectH) > 1.5) found.push(`hole height ${holeH.toFixed(1)} expected ${expectH.toFixed(1)}`);
                if (Math.abs(holeW - expectW) > 1.5) found.push(`hole width ${holeW.toFixed(1)} expected ${expectW.toFixed(1)}`);
                if (Math.abs(communityH - expectCommunityH) > 1.5) found.push(`community height ${communityH.toFixed(1)} expected ${expectCommunityH.toFixed(1)}`);
                if (Math.abs(communityW - expectCommunityW) > 1.5) found.push(`community width ${communityW.toFixed(1)} expected ${expectCommunityW.toFixed(1)}`);
                document.querySelectorAll(".player-cards img").forEach((img, index) => {
                    if (!(img instanceof HTMLElement)) return;
                    const height = img.offsetHeight * zoom;
                    if (Math.abs(height - expectH) > 1.5) found.push(`hole ${index} height ${height.toFixed(1)}`);
                });
                return found;
            });

            expect(problems).toEqual([]);
        });
    }
});

/**
 * 9-seat mobile landscape. The top four bets sit just under their own
 * action boxes. Horizontal position stays put.
 */
test.describe("top bets sit under the action box", () => {
    const viewports = [
        { width: 844, height: 390 },
        { width: 915, height: 412 },
        { width: 1024, height: 650 }
    ] as const;

    for (const viewport of viewports) {
        test(`9 seats at ${viewport.width}x${viewport.height}`, async ({ page }) => {
            await page.setViewportSize({ width: viewport.width, height: viewport.height });
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
            await page.goto("/table-preview?seats=9&dealer=1&actions=all&holes=1&board=5");
            await page.waitForSelector(".chip-position");
            await page.waitForSelector(".seat-banner-shell.seat-banner-visible .seat-banner-box");
            await page.addStyleTag({
                content: "*, *::before, *::after { animation: none !important; transition: none !important; }"
            });

            const problems = await page.evaluate((shortPhone: boolean) => {
                const found: string[] = [];
                const banners: Record<string, { top: number; bottom: number; left: number; right: number }> = {};
                document.querySelectorAll(".player-seat").forEach(el => {
                    const badge = el.querySelector(".badge-number");
                    const label = badge ? (badge.childNodes[0]?.textContent || "").trim() : "";
                    const banner = el.querySelector(".seat-banner-box");
                    if (!banner) return;
                    const r = banner.getBoundingClientRect();
                    banners[label] = { top: r.y, bottom: r.bottom, left: r.x, right: r.right };
                });
                const chips = [...document.querySelectorAll(".chip-position")].map(el => {
                    const r = el.getBoundingClientRect();
                    let top = r.y;
                    let bottom = r.bottom;
                    let left = r.x;
                    let right = r.right;
                    el.querySelectorAll("img").forEach(img => {
                        const box = img.getBoundingClientRect();
                        top = Math.min(top, box.y);
                        bottom = Math.max(bottom, box.bottom);
                        left = Math.min(left, box.x);
                        right = Math.max(right, box.right);
                    });
                    return { top, bottom, left, right, cx: (left + right) / 2 };
                });
                // positionIndex 3–6 are seats 4–7 when the hero is seat 1.
                const seats = ["4", "5", "6", "7"];
                seats.forEach((seat, offset) => {
                    const chip = chips[3 + offset];
                    const banner = banners[seat];
                    if (!chip || !banner) {
                        found.push(`missing seat ${seat}`);
                        return;
                    }
                    const gap = chip.top - banner.bottom;
                    const railLimited = !shortPhone && (seat === "4" || seat === "7");
                    if (gap < 1) found.push(`seat ${seat} pile covers the box by ${(-gap).toFixed(1)}px`);
                    // A short phone lands in the 2–4px band. On a tall tablet the
                    // shorter pile sits a little lower so a two-chip pile still clears.
                    const maxGap = shortPhone ? 4 : 8;
                    if (!railLimited && (gap < 2 || gap > maxGap)) found.push(`seat ${seat} gap ${gap.toFixed(1)}px`);
                    if (chip.top < -1 || chip.bottom > window.innerHeight + 1 || chip.left < -1 || chip.right > window.innerWidth + 1) {
                        found.push(`seat ${seat} pile outside the viewport`);
                    }
                });
                return found;
            }, viewport.height <= 500);

            expect(problems).toEqual([]);
        });
    }
});
