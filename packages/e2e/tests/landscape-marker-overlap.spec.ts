import { test, expect } from "./fixtures.js";

/**
 * Mobile landscape on the dev table preview. Action boxes paint under the
 * seat badge. Chips stay off those boxes. The dealer button is part of the
 * badge, up and to the left of the seat number, and must not land inside a box.
 */
test.describe("landscape action boxes", () => {
    test.use({ viewport: { width: 844, height: 390 } });

    for (const seats of [2, 4, 6, 9]) {
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
        for (const seats of [2, 4, 6, 9]) {
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
        for (const seats of [2, 4, 6, 9]) {
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

/**
 * 9-seat mobile landscape. Seats 3 and 8 sit level with the top of their
 * own hole cards. Seat 3 starts just past the right edge. Seat 8 ends
 * just before the left edge. The cards do not cover the chip icon or the amount.
 */
test.describe("side bets sit beside their cards", () => {
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
            await page.waitForSelector(".hole-card-fan img");
            await page.addStyleTag({
                content: "*, *::before, *::after { animation: none !important; transition: none !important; }"
            });

            const problems = await page.evaluate(() => {
                const found: string[] = [];
                const felt = document.querySelector(".table-surface-shadow")?.getBoundingClientRect();
                const chips = [...document.querySelectorAll(".chip-position")];
                const seats = [
                    { label: "3", chipIndex: 2, side: 1 },
                    { label: "8", chipIndex: 7, side: -1 }
                ];
                seats.forEach(spec => {
                    const seat = [...document.querySelectorAll(".player-seat")].find(el => {
                        const badge = el.querySelector(".badge-number");
                        return ((badge?.childNodes[0]?.textContent) || "").trim() === spec.label;
                    });
                    const chip = chips[spec.chipIndex];
                    if (!seat || !chip) {
                        found.push(`missing seat ${spec.label}`);
                        return;
                    }
                    const cards = [...seat.querySelectorAll(".hole-card-fan img")].map(img => img.getBoundingClientRect());
                    if (cards.length < 2) {
                        found.push(`missing seat ${spec.label} cards`);
                        return;
                    }
                    const card = {
                        top: Math.min(...cards.map(r => r.y)),
                        bottom: Math.max(...cards.map(r => r.bottom)),
                        left: Math.min(...cards.map(r => r.x)),
                        right: Math.max(...cards.map(r => r.right))
                    };
                    const box = chip.getBoundingClientRect();
                    let top = box.y;
                    let bottom = box.bottom;
                    let left = box.x;
                    let right = box.right;
                    chip.querySelectorAll("img").forEach(img => {
                        const r = img.getBoundingClientRect();
                        top = Math.min(top, r.y);
                        bottom = Math.max(bottom, r.bottom);
                        left = Math.min(left, r.x);
                        right = Math.max(right, r.right);
                    });
                    const overlapX = Math.min(right, card.right) - Math.max(left, card.left);
                    const overlapY = Math.min(bottom, card.bottom) - Math.max(top, card.top);
                    if (overlapX > 0.5 && overlapY > 0.5) found.push(`seat ${spec.label} pile overlaps the cards by ${overlapX.toFixed(1)}x${overlapY.toFixed(1)}`);
                    const gap = spec.side > 0 ? left - card.right : card.left - right;
                    if (gap < 2 || gap > 10) found.push(`seat ${spec.label} side gap ${gap.toFixed(1)}px`);
                    const topDelta = top - card.top;
                    if (topDelta < -2 || topDelta > 4) found.push(`seat ${spec.label} top delta ${topDelta.toFixed(1)}px`);
                    if (felt && (left < felt.x + 2 || right > felt.right - 2 || top < felt.y + 2 || bottom > felt.bottom - 2)) {
                        found.push(`seat ${spec.label} pile outside the rail`);
                    }
                    if (top < -1 || bottom > window.innerHeight + 1 || left < -1 || right > window.innerWidth + 1) {
                        found.push(`seat ${spec.label} pile outside the viewport`);
                    }
                });
                return found;
            });

            expect(problems).toEqual([]);
        });
    }
});

/**
 * The dealer disc hangs up-left of the seat number. Chips move inward so the
 * disc never touches the pile. 6-seat seat 3's pile also stays off its own
 * hole cards, and a 4-seat table follows the same rule for every seat.
 */
test.describe("landscape bets clear the dealer disc", () => {
    const viewports = [
        { width: 844, height: 390 },
        { width: 915, height: 412 },
        { width: 1024, height: 650 }
    ] as const;

    for (const viewport of viewports) {
        for (const seats of [2, 4, 6, 9]) {
            test(`${seats} seats at ${viewport.width}x${viewport.height}`, async ({ page }) => {
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
                await page.goto(`/table-preview?seats=${seats}&dealer=all&holes=1&board=5`);
                await page.waitForSelector(".chip-position");
                await page.waitForSelector(".dealer-badge-button");
                await page.addStyleTag({
                    content: "*, *::before, *::after { animation: none !important; transition: none !important; }"
                });

                const problems = await page.evaluate((seatCount) => {
                    const found: string[] = [];
                    const box = (el: Element) => {
                        const r = el.getBoundingClientRect();
                        return { x: r.x, y: r.y, r: r.right, b: r.bottom };
                    };
                    const union = (el: Element) => {
                        const rect = box(el);
                        el.querySelectorAll("img").forEach(img => {
                            const r = box(img);
                            rect.x = Math.min(rect.x, r.x);
                            rect.y = Math.min(rect.y, r.y);
                            rect.r = Math.max(rect.r, r.r);
                            rect.b = Math.max(rect.b, r.b);
                        });
                        return rect;
                    };
                    const overlap = (a: { x: number; y: number; r: number; b: number }, b: { x: number; y: number; r: number; b: number }) => {
                        const ix = Math.min(a.r, b.r) - Math.max(a.x, b.x);
                        const iy = Math.min(a.b, b.b) - Math.max(a.y, b.y);
                        return { ix, iy };
                    };
                    const chips = [...document.querySelectorAll(".chip-position")].map(union);
                    const seatCards = new Map<string, { x: number; y: number; r: number; b: number }>();
                    document.querySelectorAll(".player-seat").forEach(el => {
                        const badge = el.querySelector(".badge-number");
                        const label = badge ? (badge.childNodes[0]?.textContent || "").trim() : "";
                        const cards = [...el.querySelectorAll(".hole-card-fan img")].map(box);
                        if (!label || cards.length === 0) return;
                        seatCards.set(label, {
                            x: Math.min(...cards.map(card => card.x)),
                            y: Math.min(...cards.map(card => card.y)),
                            r: Math.max(...cards.map(card => card.r)),
                            b: Math.max(...cards.map(card => card.b))
                        });
                    });
                    document.querySelectorAll(".dealer-badge-button").forEach(el => {
                        const seat = el.getAttribute("data-dealer-button") || "";
                        const chip = chips[Number(seat) - 1];
                        if (!chip) {
                            found.push(`dealer ${seat} has no chip`);
                            return;
                        }
                        const hit = overlap(box(el), chip);
                        if (hit.ix > 0.5 && hit.iy > 0.5) found.push(`dealer ${seat} covers the pile by ${hit.ix.toFixed(1)}x${hit.iy.toFixed(1)}`);
                    });
                    const cardSeats = seatCount === 4
                        ? [...seatCards.keys()]
                        : seatCount === 6 ? ["3"] : [];
                    cardSeats.forEach(label => {
                        const card = seatCards.get(label);
                        const chip = chips[Number(label) - 1];
                        if (!card || !chip) {
                            found.push(`missing seat ${label}`);
                            return;
                        }
                        const hit = overlap(card, chip);
                        if (hit.ix > 0.5 && hit.iy > 0.5) found.push(`seat ${label} cards cover the pile by ${hit.ix.toFixed(1)}x${hit.iy.toFixed(1)}`);
                        if (seatCount === 6) {
                            const gap = chip.x - card.r;
                            if (gap < 1) found.push(`seat 3 pile gap is ${gap.toFixed(1)}px`);
                        }
                    });
                    return found;
                }, seats);

                expect(problems).toEqual([]);
            });
        }
    }
});

/**
 * Mobile portrait. The height stretch puts the top hole cards just under the
 * header and the hero action banner just above the action dock. Chips stay
 * on the felt, in front of their own seat, and off cards, action boxes and
 * the dealer button. The raise slider may float over the felt.
 */
test.describe("portrait table fit", () => {
    const viewports = [
        { width: 390, height: 844 },
        { width: 375, height: 667 },
        { width: 412, height: 915 },
        { width: 360, height: 800 }
    ] as const;

    for (const viewport of viewports) {
        for (const seats of [2, 4, 6, 9]) {
            test(`${seats} seats at ${viewport.width}x${viewport.height}`, async ({ page }) => {
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
                await page.goto(`/table-preview?seats=${seats}&turn=1&dealer=all&actions=all&holes=1&board=5`);
                await page.waitForSelector(".chip-position");
                await page.waitForSelector("[data-dealer-button]");
                await page.waitForSelector(".seat-banner-shell.seat-banner-visible .seat-banner-box");
                await page.waitForSelector(".mobile-history-trigger");
                await page.waitForSelector(".mobile-action-slot");
                await page.waitForSelector(".hole-card-fan img");
                await page.addStyleTag({
                    content: "*, *::before, *::after { animation: none !important; transition: none !important; }"
                });

                const problems = await page.evaluate((seatCount) => {
                    const found: string[] = [];
                    const box = (el: Element) => {
                        const r = el.getBoundingClientRect();
                        return { x: r.x, y: r.y, r: r.right, b: r.bottom };
                    };
                    const union = (el: Element) => {
                        const rect = box(el);
                        el.querySelectorAll("img").forEach(img => {
                            const r = box(img);
                            rect.x = Math.min(rect.x, r.x);
                            rect.y = Math.min(rect.y, r.y);
                            rect.r = Math.max(rect.r, r.r);
                            rect.b = Math.max(rect.b, r.b);
                        });
                        return rect;
                    };
                    const overlap = (a: { x: number; y: number; r: number; b: number }, b: { x: number; y: number; r: number; b: number }) => {
                        const ix = Math.min(a.r, b.r) - Math.max(a.x, b.x);
                        const iy = Math.min(a.b, b.b) - Math.max(a.y, b.y);
                        return { ix, iy };
                    };
                    const vw = window.innerWidth;
                    const vh = window.innerHeight;
                    const header = document.querySelector(".table-banner-wrap");
                    const dock = document.querySelector(".mobile-action-slot");
                    const felt = document.querySelector(".table-surface-shadow");
                    if (!header || !dock || !felt) {
                        found.push("missing header, dock, or felt");
                        return found;
                    }
                    const headerBottom = header.getBoundingClientRect().bottom;
                    const dockTop = dock.getBoundingClientRect().top;
                    const feltRect = felt.getBoundingClientRect();
                    const cx = feltRect.x + feltRect.width / 2;
                    const cy = feltRect.y + feltRect.height / 2;
                    const cards = [...document.querySelectorAll(".hole-card-fan img")].map(box);
                    if (cards.length === 0) found.push("no hole cards");
                    const cardTop = Math.min(...cards.map(card => card.y));
                    const cardGap = cardTop - headerBottom;
                    if (cardGap < 2 || cardGap > 8) found.push(`top card gap is ${cardGap.toFixed(1)}px`);
                    const banners = [...document.querySelectorAll(".seat-banner-shell.seat-banner-visible .seat-banner-box")].map(el => ({
                        label: (el.textContent || "").replace(/\s+/g, " ").trim(),
                        rect: box(el)
                    }));
                    const hero = banners.find(banner => banner.label.includes("ALL IN"));
                    if (!hero) found.push("missing hero ALL IN banner");
                    else {
                        const bannerGap = dockTop - hero.rect.b;
                        if (bannerGap < 2 || bannerGap > 8) found.push(`hero banner gap is ${bannerGap.toFixed(1)}px`);
                    }
                    const history = document.querySelector(".mobile-history-trigger");
                    const historyRect = history ? box(history) : null;
                    if (!history || !historyRect) found.push("missing History button");
                    else {
                        if (historyRect.y < headerBottom - 1 || historyRect.b > dockTop + 1 || historyRect.x < -1 || historyRect.r > vw + 1) {
                            found.push("History button is off its spot");
                        }
                    }
                    const onFelt = (x: number, y: number) => {
                        const radius = feltRect.width / 2;
                        const pad = 2;
                        if (y >= feltRect.y + radius && y <= feltRect.bottom - radius) {
                            return x >= feltRect.x + pad && x <= feltRect.right - pad;
                        }
                        const capY = y < feltRect.y + radius ? feltRect.y + radius : feltRect.bottom - radius;
                        const dx = x - (feltRect.x + radius);
                        const dy = y - capY;
                        return dx * dx + dy * dy <= (radius - pad) * (radius - pad);
                    };
                    const chips = [...document.querySelectorAll(".chip-position")].map(union);
                    const seats = [...document.querySelectorAll(".player-seat")].map(el => {
                        const badge = el.querySelector(".badge-number");
                        const label = badge ? (badge.childNodes[0]?.textContent || "").trim() : "";
                        return { label, rect: box(el) };
                    });
                    if (chips.length !== seatCount || seats.length !== seatCount) {
                        found.push(`expected ${seatCount} seats and chips, found ${seats.length} seats and ${chips.length} chips`);
                    }
                    if (seatCount === 2) {
                        const raise = banners.find(banner => banner.label.includes("RAISE"));
                        const pile = chips[1];
                        const topSeat = seats.find(seat => seat.label === "2");
                        if (!raise || !pile || !topSeat) found.push("missing the seat 2 bet");
                        else {
                            const gap = pile.y - raise.rect.b;
                            if (gap < 1.5 || gap > 4.5) found.push(`seat 2 pile gap is ${gap.toFixed(1)}px`);
                            const dx = (pile.x + pile.r) / 2 - (topSeat.rect.x + topSeat.rect.r) / 2;
                            if (Math.abs(dx) > 2) found.push(`seat 2 pile is ${dx.toFixed(1)}px off centre`);
                        }
                    }
                    if (seatCount === 4) {
                        const call = banners.find(banner => banner.label.includes("CALL"));
                        const topIndex = seats.findIndex(seat => seat.label === "3");
                        const topPile = chips[topIndex];
                        const topSeat = seats[topIndex];
                        if (!call || !topPile || !topSeat) found.push("missing the seat 3 bet");
                        else {
                            const gap = topPile.y - call.rect.b;
                            if (gap < 1.5 || gap > 4.5) found.push(`seat 3 pile gap is ${gap.toFixed(1)}px`);
                            const dx = (topPile.x + topPile.r) / 2 - (topSeat.rect.x + topSeat.rect.r) / 2;
                            if (Math.abs(dx) > 2) found.push(`seat 3 pile is ${dx.toFixed(1)}px off centre`);
                        }
                        const seatEls = [...document.querySelectorAll(".player-seat")];
                        const side = (label: string) => {
                            const index = seats.findIndex(seat => seat.label === label);
                            const pile = chips[index];
                            const seat = seats[index];
                            const seatEl = seatEls[index];
                            if (!pile || !seat || !seatEl) {
                                found.push(`missing seat ${label} pile`);
                                return;
                            }
                            const ownCards = [...seatEl.querySelectorAll(".hole-card-fan img")].map(box);
                            if (ownCards.length === 0) {
                                found.push(`seat ${label} has no cards`);
                                return;
                            }
                            const ownTop = Math.min(...ownCards.map(card => card.y));
                            const gap = ownTop - pile.b;
                            if (gap < 2 || gap > 6.5) found.push(`seat ${label} pile gap above cards is ${gap.toFixed(1)}px`);
                            const dx = (pile.x + pile.r) / 2 - (seat.rect.x + seat.rect.r) / 2;
                            if (Math.abs(dx) > 2) found.push(`seat ${label} pile is ${dx.toFixed(1)}px off centre`);
                            const hit = ownCards.some(card => {
                                const ix = Math.min(pile.r, card.r) - Math.max(pile.x, card.x);
                                const iy = Math.min(pile.b, card.b) - Math.max(pile.y, card.y);
                                return ix > 0.5 && iy > 0.5;
                            });
                            if (hit) found.push(`seat ${label} cards cover the pile`);
                        };
                        side("2");
                        side("4");
                    }
                    if (seatCount === 6) {
                        const bet = banners.find(banner => banner.label.includes("BET"));
                        const topIndex = seats.findIndex(seat => seat.label === "4");
                        const topPile = chips[topIndex];
                        const topSeat = seats[topIndex];
                        if (!bet || !topPile || !topSeat) found.push("missing the seat 4 bet");
                        else {
                            const gap = topPile.y - bet.rect.b;
                            if (gap < 1.5 || gap > 4.5) found.push(`seat 4 pile gap is ${gap.toFixed(1)}px`);
                            const dx = (topPile.x + topPile.r) / 2 - (topSeat.rect.x + topSeat.rect.r) / 2;
                            if (Math.abs(dx) > 2) found.push(`seat 4 pile is ${dx.toFixed(1)}px off centre`);
                        }
                        const seatEls = [...document.querySelectorAll(".player-seat")];
                        const railGap = (pile: { x: number; r: number }, sign: number) =>
                            sign > 0 ? pile.x - feltRect.x : feltRect.right - pile.r;
                        const sideBet = (label: string, expectSign: number, aboveCards: boolean) => {
                            const index = seats.findIndex(seat => seat.label === label);
                            const pile = chips[index];
                            const seat = seats[index];
                            const seatEl = seatEls[index];
                            if (!pile || !seat || !seatEl) {
                                found.push(`missing seat ${label} pile`);
                                return;
                            }
                            if (aboveCards) {
                                const ownCards = [...seatEl.querySelectorAll(".hole-card-fan img")].map(box);
                                if (ownCards.length === 0) {
                                    found.push(`seat ${label} has no cards`);
                                    return;
                                }
                                const gap = Math.min(...ownCards.map(card => card.y)) - pile.b;
                                if (gap < 2 || gap > 6.5) found.push(`seat ${label} pile gap above cards is ${gap.toFixed(1)}px`);
                            } else {
                                const banner = seatEl.querySelector(".seat-banner-shell.seat-banner-visible .seat-banner-box");
                                if (!banner) {
                                    found.push(`seat ${label} has no banner`);
                                    return;
                                }
                                const gap = pile.y - banner.getBoundingClientRect().bottom;
                                if (gap < 1.5 || gap > 5.5) found.push(`seat ${label} pile gap is ${gap.toFixed(1)}px`);
                            }
                            const dx = (pile.x + pile.r) / 2 - (seat.rect.x + seat.rect.r) / 2;
                            if (Math.sign(dx) !== expectSign || Math.abs(dx) < 20 || Math.abs(dx) > 80) {
                                found.push(`seat ${label} pile is ${dx.toFixed(1)}px from its seat centre`);
                            }
                            const edge = railGap(pile, expectSign);
                            if (edge < 2 || edge > 16) found.push(`seat ${label} pile is ${edge.toFixed(1)}px inside the rail`);
                        };
                        sideBet("3", 1, false);
                        sideBet("5", -1, false);
                        sideBet("2", 1, true);
                        sideBet("6", -1, true);
                    }
                    if (seatCount === 9) {
                        const pot = document.querySelector(".pot-display");
                        const cardRow = document.querySelector(".community-card-row");
                        if (!pot || !cardRow) found.push("missing the total pot or the community cards");
                        else {
                            const gap = cardRow.getBoundingClientRect().top - pot.getBoundingClientRect().bottom;
                            if (gap < 2.5 || gap > 5.5) found.push(`total pot gap is ${gap.toFixed(1)}px`);
                        }
                        const seatEls = [...document.querySelectorAll(".player-seat")];
                        const railGap = (pile: { x: number; r: number }, sign: number) =>
                            sign > 0 ? pile.x - feltRect.x : feltRect.right - pile.r;
                        const place = (label: string, expectSign: number, aboveCards: boolean) => {
                            const index = seats.findIndex(seat => seat.label === label);
                            const pile = chips[index];
                            const seat = seats[index];
                            const seatEl = seatEls[index];
                            if (!pile || !seat || !seatEl) {
                                found.push(`missing seat ${label} pile`);
                                return null;
                            }
                            if (aboveCards) {
                                const ownCards = [...seatEl.querySelectorAll(".hole-card-fan img")].map(box);
                                if (ownCards.length === 0) {
                                    found.push(`seat ${label} has no cards`);
                                    return null;
                                }
                                const gap = Math.min(...ownCards.map(card => card.y)) - pile.b;
                                const floor = label === "2" ? 1 : 2;
                                if (gap < floor || gap > 6.5) found.push(`seat ${label} pile gap above cards is ${gap.toFixed(1)}px`);
                            } else {
                                const banner = seatEl.querySelector(".seat-banner-shell.seat-banner-visible .seat-banner-box");
                                if (!banner) {
                                    found.push(`seat ${label} has no banner`);
                                    return null;
                                }
                                const gap = pile.y - banner.getBoundingClientRect().bottom;
                                if (gap < 1.5 || gap > 5.5) found.push(`seat ${label} pile gap is ${gap.toFixed(1)}px`);
                            }
                            const dx = (pile.x + pile.r) / 2 - (seat.rect.x + seat.rect.r) / 2;
                            if (label === "5" || label === "6") {
                                const centred = Math.abs(dx) < 2;
                                const nudged = window.innerWidth <= 375 && Math.sign(dx) === expectSign && Math.abs(dx) > 8 && Math.abs(dx) < 40;
                                if (!centred && !nudged) found.push(`seat ${label} pile is ${dx.toFixed(1)}px from its seat centre`);
                            } else if (Math.sign(dx) !== expectSign || Math.abs(dx) < 20 || Math.abs(dx) > (label === "9" ? 90 : 80)) {
                                found.push(`seat ${label} pile is ${dx.toFixed(1)}px from its seat centre`);
                            }
                            if (label !== "5" && label !== "6" && label !== "9") {
                                const edge = railGap(pile, expectSign);
                                if (edge < 2 || edge > 16) found.push(`seat ${label} pile is ${edge.toFixed(1)}px inside the rail`);
                            }
                            return pile;
                        };
                        place("4", 1, false);
                        const pile5 = place("5", 1, false);
                        const pile6 = place("6", -1, false);
                        place("7", -1, false);
                        place("2", 1, true);
                        place("3", 1, true);
                        place("8", -1, true);
                        place("9", -1, true);
                        if (pile5 && pile6) {
                            const gap = pile6.x - pile5.r;
                            if (gap < 2) found.push(`seats 5 and 6 piles are ${gap.toFixed(1)}px apart`);
                        }
                    }
                    chips.forEach((chip, index) => {
                        const midX = (chip.x + chip.r) / 2;
                        const midY = (chip.y + chip.b) / 2;
                        const seatLabel = seats[index]?.label;
                        // 4-seat seats 2 and 4 are centred on the rail, so the
                        // pile centre sits on the felt edge.
                        const centredOnRail = seatCount === 4 && (seatLabel === "2" || seatLabel === "4");
                        if (!centredOnRail && !onFelt(midX, midY)) found.push(`chip ${index + 1} is off the felt`);
                        const seat = seats[index];
                        if (!seat) return;
                        const seatX = (seat.rect.x + seat.rect.r) / 2;
                        const seatY = (seat.rect.y + seat.rect.b) / 2;
                        const inward = (cx - seatX) * (midX - seatX) + (cy - seatY) * (midY - seatY);
                        if (inward <= 0) found.push(`chip ${seat.label || index + 1} is not in front of its seat`);
                        for (const card of cards) {
                            const hit = overlap(chip, card);
                            if (hit.ix > 0.5 && hit.iy > 0.5) found.push(`chip ${seat.label || index + 1} under a card (${hit.ix.toFixed(0)}x${hit.iy.toFixed(0)})`);
                        }
                        for (const banner of banners) {
                            const hit = overlap(chip, banner.rect);
                            if (hit.ix > 0.5 && hit.iy > 0.5) found.push(`chip ${seat.label || index + 1} under ${banner.label} (${hit.ix.toFixed(0)}x${hit.iy.toFixed(0)})`);
                        }
                    });
                    document.querySelectorAll(".dealer-badge-button").forEach(el => {
                        const seat = el.getAttribute("data-dealer-button") || "";
                        const chip = chips[Number(seat) - 1];
                        if (!chip) {
                            found.push(`dealer ${seat} has no chip`);
                            return;
                        }
                        const hit = overlap(box(el), chip);
                        if (hit.ix > 0.5 && hit.iy > 0.5) found.push(`dealer ${seat} covers the pile by ${hit.ix.toFixed(1)}x${hit.iy.toFixed(1)}`);
                    });
                    const consider = (kind: string, rect: { x: number; y: number; r: number; b: number }, label: string) => {
                        if (rect.r - rect.x < 1 || rect.b - rect.y < 1) return;
                        if (rect.x < -1) found.push(`${kind} ${label} past the left`);
                        if (rect.y < -1) found.push(`${kind} ${label} past the top`);
                        if (rect.r > vw + 1) found.push(`${kind} ${label} past the right`);
                        if (rect.b > vh + 1) found.push(`${kind} ${label} past the bottom`);
                        if (rect.y < headerBottom - 1) found.push(`${kind} ${label} under the header by ${(headerBottom - rect.y).toFixed(0)}px`);
                        if (rect.b > dockTop + 1) found.push(`${kind} ${label} under the dock by ${(rect.b - dockTop).toFixed(0)}px`);
                    };
                    seats.forEach(seat => consider("seat", seat.rect, seat.label));
                    cards.forEach((card, index) => consider("card", card, String(index + 1)));
                    banners.forEach(banner => consider("action", banner.rect, banner.label));
                    chips.forEach((chip, index) => consider("chip", chip, String(index + 1)));
                    document.querySelectorAll(".dealer-badge-button").forEach(el => {
                        consider("dealer", box(el), el.getAttribute("data-dealer-button") || "");
                    });
                    if (history && historyRect) {
                        const hx = (historyRect.x + historyRect.r) / 2;
                        const hy = (historyRect.y + historyRect.b) / 2;
                        const stack = document.elementsFromPoint(hx, hy);
                        const hit = stack.find(el => !el.closest("[data-testid='table-preview-panel']"));
                        if (!hit || !history.contains(hit)) {
                            const name = hit ? (hit.getAttribute("aria-label") || hit.className || hit.tagName) : "nothing";
                            found.push(`History button is covered by ${name}`);
                        }
                    }
                    return found;
                }, seats);

                expect(problems).toEqual([]);
            });
        }
    }
});

/**
 * Portrait bet labels share one computed size on every table. Seats 1 and 2
 * used to drop to the compact 24px label on 2, 4, 6 and 9 seats.
 */
test.describe("portrait chip labels", () => {
    const viewports = [
        { width: 390, height: 844 },
        { width: 375, height: 667 },
        { width: 412, height: 915 },
        { width: 360, height: 800 }
    ] as const;

    for (const viewport of viewports) {
        test(`every chip label shares one font size at ${viewport.width}x${viewport.height}`, async ({ page }) => {
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

            for (const seats of [2, 4, 6, 9]) {
                await page.goto(`/table-preview?seats=${seats}&turn=1&dealer=all&actions=all&holes=1&board=5`);
                await page.waitForSelector(".chip-position span");
                const fonts = await page.evaluate(() => {
                    return [...document.querySelectorAll(".chip-position span")].map((el, index) => ({
                        seat: index + 1,
                        font: parseFloat(getComputedStyle(el).fontSize),
                        height: el.getBoundingClientRect().height
                    }));
                });
                expect(fonts, `${seats} seats`).toHaveLength(seats);
                const reported = fonts.map(item => `seat ${item.seat}=${item.font.toFixed(2)}px`).join(", ");
                expect(fonts.map(item => item.font.toFixed(2)), `${seats} seats ${reported}`).toEqual(Array(seats).fill("36.00"));
                const heights = fonts.map(item => item.height);
                expect(Math.max(...heights) - Math.min(...heights), `${seats} seats painted label height`).toBeLessThan(1);
            }
        });
    }
});
