import { landscapeCommunityCardSize, landscapeHoleCardSize, mobileCardUnit, MOBILE_HOLE_CARD_HEIGHT, MOBILE_HOLE_CARD_WIDTH, communityCardHeight } from "./mobileCardSizing";
import { mobileCardObstacles, mobileFeltContains, placeMobileRailMarkers } from "./landscapeSeatEdges";
import { calculateZoom, getAllPositions, getDeckOrigin, getSeatPositions, getStageDims, getSeatCoords, getContentBounds, getTableTransform, MOBILE_LANDSCAPE_BANNER_HALF, MOBILE_LANDSCAPE_HEIGHT_STRETCH, MOBILE_LANDSCAPE_WIDTH_STRETCH, MOBILE_PORTRAIT_HEIGHT_STRETCH, mobileLandscapeHeightStretch, mobileLandscapeWidthStretch, mobilePortraitHeightStretch, TABLE_HEIGHT, TABLE_WIDTH, type TableSize } from "./stageGeometry";

describe("landscape mobile readability", () => {
    const oldWidth = window.innerWidth;
    const oldHeight = window.innerHeight;
    afterAll(() => {
        Object.defineProperty(window, "innerWidth", { configurable: true, value: oldWidth });
        Object.defineProperty(window, "innerHeight", { configurable: true, value: oldHeight });
    });
    test.each([393, 333])("widens the felt toward the stage edges and keeps cards at the landscape size at 852x%i", height => {
        Object.defineProperty(window, "innerWidth", { configurable: true, value: 852 });
        Object.defineProperty(window, "innerHeight", { configurable: true, value: height });
        const stageHeight = height - 48;
        const hole = landscapeHoleCardSize();
        for (const size of [2, 4, 6, 9] as TableSize[]) {
            const zoom = calculateZoom(size, 728, stageHeight);
            const card = parseFloat(mobileCardUnit(false, zoom, 728, stageHeight)) * zoom * hole.width;
            expect(card).toBeLessThanOrEqual(hole.width + 0.01);
            expect(card).toBeGreaterThan(20);
            const dims = getStageDims();
            const widthStretch = mobileLandscapeWidthStretch();
            const heightStretch = mobileLandscapeHeightStretch();
            expect(widthStretch).toBeGreaterThan(1);
            expect(widthStretch).toBeLessThanOrEqual(MOBILE_LANDSCAPE_WIDTH_STRETCH);
            expect(heightStretch).toBeGreaterThan(1);
            expect(heightStretch).toBeLessThanOrEqual(MOBILE_LANDSCAPE_HEIGHT_STRETCH);
            expect(dims.tableWidth).toBeCloseTo(TABLE_WIDTH * widthStretch, 5);
            expect(dims.tableHeight).toBeCloseTo(TABLE_HEIGHT * heightStretch, 5);
            // Wider than the old 2.4:1 cap so the outer seats can reach the stage edges.
            expect(dims.tableWidth / dims.tableHeight).toBeGreaterThan(2.4);
        }
    });
    test.each([393, 333, 320])("fits the desktop-shaped table in the stage at height %i", height => {
        Object.defineProperty(window, "innerWidth", { configurable: true, value: 852 });
        Object.defineProperty(window, "innerHeight", { configurable: true, value: height });
        const width = 610;
        const stageHeight = height - 70 - 21;
        for (const size of [2, 4, 6, 9] as TableSize[]) {
            const zoom = calculateZoom(size, width, stageHeight);
            const bounds = getContentBounds(size);
            expect(bounds.width * zoom).toBeLessThanOrEqual(width + 0.5);
            expect(bounds.height * zoom).toBeLessThanOrEqual(stageHeight + 0.5);
            const transform = getTableTransform(zoom, size, width, stageHeight);
            const y = Number(transform.match(/translate\([^,]+, ([^)]+)px\)/)?.[1]);
            const top = y + (bounds.centerY - bounds.height / 2) * zoom;
            const bottom = y + (bounds.centerY + bounds.height / 2) * zoom;
            expect(top).toBeGreaterThanOrEqual(-0.5);
            expect(bottom).toBeLessThanOrEqual(stageHeight + 0.5);
            const scaleX = Number(transform.match(/scale\(([^)]+)\)/)?.[1]);
            expect(scaleX).toBeCloseTo(zoom, 5);
        }
    });
    test("grows landscape cards by 2px of height and keeps portrait at 39x51", () => {
        const hole = landscapeHoleCardSize();
        const community = landscapeCommunityCardSize();
        expect(hole.height).toBe(MOBILE_HOLE_CARD_HEIGHT + 2);
        expect(hole.width).toBeCloseTo(MOBILE_HOLE_CARD_WIDTH * hole.height / MOBILE_HOLE_CARD_HEIGHT, 5);
        const baseCommunity = communityCardHeight(MOBILE_HOLE_CARD_WIDTH);
        expect(community.height).toBeCloseTo(baseCommunity + 2, 5);
        expect(community.width).toBeCloseTo(MOBILE_HOLE_CARD_WIDTH * community.height / baseCommunity, 5);
        expect(parseFloat(mobileCardUnit(true, 0.4, 393, 480))).toBe(2.5);
    });

    test("preserves portrait sizing and desktop dimensions", () => {
        expect(parseFloat(mobileCardUnit(true, 0.4, 393, 480))).toBe(2.5);
        Object.defineProperty(window, "innerWidth", { configurable: true, value: 1440 });
        Object.defineProperty(window, "innerHeight", { configurable: true, value: 900 });
        expect(getStageDims().tableHeight).toBe(500);
    });
    test("keeps the desktop felt shape and does not stretch seats", () => {
        Object.defineProperty(window, "innerWidth", { configurable: true, value: 1024 });
        Object.defineProperty(window, "innerHeight", { configurable: true, value: 650 });
        const dims = getStageDims();
        expect(dims.tableWidth).toBe(1000);
        expect(dims.tableHeight).toBe(500);
        expect(getSeatCoords(9)[0]).toEqual([800, 842]);
        expect(getSeatCoords(6)[0]).toEqual([800, 832]);
    });

    test("stretches only the mobile-landscape felt, and only as far as the width allows", () => {
        Object.defineProperty(window, "innerWidth", { configurable: true, value: 844 });
        Object.defineProperty(window, "innerHeight", { configurable: true, value: 390 });
        const dims = getStageDims();
        expect(MOBILE_LANDSCAPE_WIDTH_STRETCH).toBe(1.7);
        expect(MOBILE_LANDSCAPE_HEIGHT_STRETCH).toBe(1.4);
        expect(dims.tableWidth).toBeCloseTo(TABLE_WIDTH * mobileLandscapeWidthStretch(), 5);
        expect(dims.tableHeight).toBeCloseTo(TABLE_HEIGHT * mobileLandscapeHeightStretch(), 5);
        // The short phone spends the reclaimed header band on a taller felt,
        // and widens past the desktop ratio so seats 3 and 8 sit near the edges.
        expect(mobileLandscapeWidthStretch()).toBeGreaterThan(1.4);
        expect(mobileLandscapeWidthStretch()).toBeLessThan(MOBILE_LANDSCAPE_WIDTH_STRETCH);
        expect(mobileLandscapeHeightStretch()).toBeGreaterThan(1.05);
        expect(mobileLandscapeHeightStretch()).toBeLessThan(MOBILE_LANDSCAPE_HEIGHT_STRETCH);
        expect(dims.tableWidth / dims.tableHeight).toBeGreaterThan(2.4);
        expect(dims.originX).toBeCloseTo(dims.centerX - dims.tableWidth / 2, 5);
        expect(dims.originY).toBeCloseTo(dims.centerY - dims.tableHeight / 2, 5);
        expect(getSeatCoords(9)[0]).toEqual([800, 842]);
        const centre = dims.tableWidth / 2;
        expect(parseFloat(getSeatPositions(9)[0].left)).toBeCloseTo(centre, 0);
        expect(centre - parseFloat(getSeatPositions(9)[2].left)).toBeGreaterThan(500);
        expect(getDeckOrigin().left).toBe(`${dims.tableWidth / 2}px`);
        expect(parseFloat(getDeckOrigin().top)).toBeCloseTo(dims.tableHeight / 2 - 100, 5);

        const contentWidth = 844 - 124;
        const contentHeight = 390 - 48;
        const zoom = calculateZoom(9, contentWidth, contentHeight);
        const transform = getTableTransform(zoom, 9, contentWidth, contentHeight);
        const tx = Number(transform.match(/translate\(([-\d.]+)px/)?.[1]);
        const ty = Number(transform.match(/translate\([^,]+, ([^)]+)px\)/)?.[1]);
        const unit = parseFloat(mobileCardUnit(false, zoom, contentWidth, contentHeight));
        const half = 35.5 * unit;
        const seats = getSeatPositions(9);
        const tops = seats.map(seat => dims.originY + parseFloat(seat.top));
        const lefts = seats.map(seat => dims.originX + parseFloat(seat.left));
        const cardTop = ty + (Math.min(...tops) - half) * zoom;
        const heroBottom = ty + (Math.max(...tops) + half) * zoom;
        // 33 stage px is the action banner below the hole cards (55px box, 22px tuck).
        const actionBottom = ty + (Math.max(...tops) + half + 33) * zoom;
        const widgetHalf = Math.max((96 * unit) / 2, MOBILE_LANDSCAPE_BANNER_HALF);
        const seatLeft = tx + (Math.min(...lefts) - widgetHalf) * zoom;
        const seatRight = contentWidth - (tx + (Math.max(...lefts) + widgetHalf) * zoom);
        expect(cardTop).toBeGreaterThanOrEqual(3.5);
        expect(cardTop).toBeLessThanOrEqual(7);
        expect(heroBottom).toBeLessThanOrEqual(contentHeight - 4);
        expect(actionBottom).toBeLessThanOrEqual(contentHeight - 4);
        expect(actionBottom).toBeGreaterThanOrEqual(contentHeight - 10);
        expect(seatLeft).toBeGreaterThanOrEqual(4);
        expect(seatLeft).toBeLessThanOrEqual(16);
        expect(seatRight).toBeGreaterThanOrEqual(4);
        expect(seatRight).toBeLessThanOrEqual(16);

        Object.defineProperty(window, "innerWidth", { configurable: true, value: 480 });
        Object.defineProperty(window, "innerHeight", { configurable: true, value: 400 });
        expect(mobileLandscapeWidthStretch()).toBeCloseTo(1, 5);
        expect(mobileLandscapeHeightStretch()).toBeGreaterThanOrEqual(1);
        expect(mobileLandscapeHeightStretch()).toBeLessThanOrEqual(MOBILE_LANDSCAPE_HEIGHT_STRETCH);
        const narrow = getStageDims();
        expect(narrow.tableWidth).toBeCloseTo(TABLE_WIDTH, 4);
        expect(narrow.tableHeight).toBeCloseTo(TABLE_HEIGHT * mobileLandscapeHeightStretch(), 5);
        const narrowHeight = 400 - 48;
        const narrowZoom = calculateZoom(9, 480 - 124, narrowHeight);
        const narrowTransform = getTableTransform(narrowZoom, 9, 480 - 124, narrowHeight);
        const narrowTy = Number(narrowTransform.match(/translate\([^,]+, ([^)]+)px\)/)?.[1]);
        const narrowHalf = 35.5 * parseFloat(mobileCardUnit(false, narrowZoom, 480 - 124, narrowHeight));
        const narrowTops = getSeatPositions(9).map(seat => narrow.originY + parseFloat(seat.top));
        const narrowCards = narrowTy + (Math.min(...narrowTops) - narrowHalf) * narrowZoom;
        const narrowHero = narrowTy + (Math.max(...narrowTops) + narrowHalf) * narrowZoom;
        expect(narrowCards).toBeGreaterThanOrEqual(3.5);
        expect(narrowHero).toBeLessThanOrEqual(narrowHeight - 4);

        Object.defineProperty(window, "innerWidth", { configurable: true, value: 390 });
        Object.defineProperty(window, "innerHeight", { configurable: true, value: 844 });
        const portraitDims = getStageDims();
        expect(portraitDims.tableWidth).toBe(500);
        expect(mobilePortraitHeightStretch()).toBeGreaterThan(1);
        expect(mobilePortraitHeightStretch()).toBeLessThanOrEqual(MOBILE_PORTRAIT_HEIGHT_STRETCH);
        expect(portraitDims.tableHeight).toBeCloseTo(1000 * mobilePortraitHeightStretch(), 5);
        expect(portraitDims.originX).toBe(175);
        expect(getDeckOrigin().left).toBe("250px");
        expect(parseFloat(getDeckOrigin().top)).toBeCloseTo(portraitDims.tableHeight / 2 - 140, 5);
    });

    test("centres 9-seat wings between the neighbouring widgets on mobile landscape", () => {
        const half = 48;
        const check = (width: number, height: number, coarse: boolean) => {
            window.matchMedia = (query: string) => ({ matches: coarse && query.includes("coarse"), media: query, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent() { return false; }, onchange: null }) as MediaQueryList;
            Object.defineProperty(window, "innerWidth", { configurable: true, value: width });
            Object.defineProperty(window, "innerHeight", { configurable: true, value: height });
            const raw = getSeatPositions(9);
            const placed = getAllPositions(9);
            const x = (seat: { left: string }) => parseFloat(seat.left);
            const y = (seat: { top: string }) => parseFloat(seat.top);
            const mid = (right: number, left: number) => (right + left) / 2;
            expect(Math.abs(x(placed.players[1]) - mid(x(raw[2]) + half, x(raw[0]) - half))).toBeLessThanOrEqual(0.1);
            expect(Math.abs(x(placed.players[8]) - mid(x(raw[0]) + half, x(raw[7]) - half))).toBeLessThanOrEqual(0.1);
            expect(y(placed.players[1])).toBeCloseTo(y(raw[1]), 5);
            expect(y(placed.players[8])).toBeCloseTo(y(raw[8]), 5);
            expect(x(placed.players[1])).toBeLessThan(x(raw[1]));
            expect(x(placed.players[8])).toBeGreaterThan(x(raw[8]));
            for (const index of [0, 2, 3, 4, 5, 6, 7]) {
                expect(x(placed.players[index])).toBeCloseTo(x(raw[index]), 5);
                expect(y(placed.players[index])).toBeCloseTo(y(raw[index]), 5);
            }
            expect(y(placed.vacantPlayers[1])).toBeCloseTo(y(raw[1]), 5);
            expect(x(placed.vacantPlayers[1])).toBeCloseTo(x(placed.players[1]), 5);
            expect(x(placed.vacantPlayers[8])).toBeCloseTo(x(placed.players[8]), 5);
            const holeGap = x(placed.holeCards[0].first) - x(placed.players[0]);
            expect(x(placed.holeCards[1].first) - x(placed.players[1])).toBeCloseTo(holeGap, 0);
            expect(x(placed.holeCards[8].second) - x(placed.players[8])).toBeCloseTo(x(placed.holeCards[0].second) - x(placed.players[0]), 0);
            expect(x(placed.turnAnimations[1])).toBeCloseTo(x(placed.players[1]), 0);
            expect(x(placed.winAnimations[8])).toBeCloseTo(x(placed.players[8]), 0);
        };
        check(844, 390, false);
        check(915, 412, false);
        check(1024, 650, true);

        Object.defineProperty(window, "innerWidth", { configurable: true, value: 390 });
        Object.defineProperty(window, "innerHeight", { configurable: true, value: 844 });
        const portrait = getAllPositions(9).players.map(seat => seat.left);
        expect(portrait).toEqual(getSeatPositions(9).map(seat => seat.left));

        window.matchMedia = (query: string) => ({ matches: false, media: query, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent() { return false; }, onchange: null }) as MediaQueryList;
        Object.defineProperty(window, "innerWidth", { configurable: true, value: 1440 });
        Object.defineProperty(window, "innerHeight", { configurable: true, value: 900 });
        expect(getAllPositions(9).players.map(seat => seat.left)).toEqual(getSeatPositions(9).map(seat => seat.left));
    });

    test.each([
        ["844x390", 844, 390, false],
        ["915x412", 915, 412, false],
        ["1024x650", 1024, 650, true]
    ])("keeps the lowest action box inside the stage at %s", (_label, width, height, coarse) => {
        window.matchMedia = (query: string) => ({ matches: coarse && query.includes("coarse"), media: query, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent() { return false; }, onchange: null }) as MediaQueryList;
        Object.defineProperty(window, "innerWidth", { configurable: true, value: width });
        Object.defineProperty(window, "innerHeight", { configurable: true, value: height });
        const contentWidth = width - 124;
        const contentHeight = height - 48;
        for (const size of [2, 4, 6, 9] as TableSize[]) {
            const zoom = calculateZoom(size, contentWidth, contentHeight);
            const transform = getTableTransform(zoom, size, contentWidth, contentHeight);
            const tx = Number(transform.match(/translate\(([-\d.]+)px/)?.[1]);
            const ty = Number(transform.match(/translate\([^,]+, ([^)]+)px\)/)?.[1]);
            const dims = getStageDims();
            const unit = parseFloat(mobileCardUnit(false, zoom, contentWidth, contentHeight));
            const half = 35.5 * unit;
            const seats = getSeatPositions(size);
            const tops = seats.map(seat => dims.originY + parseFloat(seat.top));
            const cardTop = ty + (Math.min(...tops) - half) * zoom;
            const actionBottom = ty + (Math.max(...tops) + half + 33) * zoom;
            expect(cardTop).toBeGreaterThanOrEqual(3.5);
            expect(cardTop).toBeLessThanOrEqual(7);
            expect(actionBottom).toBeLessThanOrEqual(contentHeight - 4);
            expect(actionBottom).toBeGreaterThanOrEqual(contentHeight - 22);
            if (size === 9) {
                const widgetHalf = Math.max((96 * unit) / 2, MOBILE_LANDSCAPE_BANNER_HALF);
                const lefts = seats.map(seat => dims.originX + parseFloat(seat.left));
                const seatLeft = tx + (Math.min(...lefts) - widgetHalf) * zoom;
                const seatRight = contentWidth - (tx + (Math.max(...lefts) + widgetHalf) * zoom);
                // A tall tablet caps zoom so the 6-seat RAISE TO label stays
                // inside, which leaves the narrower 9-seat label further in.
                const sideLimit = width >= 1000 ? 28 : 16;
                expect(seatLeft).toBeGreaterThanOrEqual(4);
                expect(seatLeft).toBeLessThanOrEqual(sideLimit);
                expect(seatRight).toBeGreaterThanOrEqual(4);
                expect(seatRight).toBeLessThanOrEqual(sideLimit);
            }
        }
    });

    test("places mobile chips beside the seat, not at mid-felt", () => {
        window.matchMedia = (query: string) => ({ matches: query.includes("coarse"), media: query, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent() { return false; }, onchange: null }) as MediaQueryList;
        Object.defineProperty(window, "innerWidth", { configurable: true, value: 1024 });
        Object.defineProperty(window, "innerHeight", { configurable: true, value: 650 });
        const size: TableSize = 9;
        const zoom = calculateZoom(size, 900, 570);
        const aligned = getAllPositions(size);
        const placed = placeMobileRailMarkers(aligned, zoom, 0);
        const dims = getStageDims();
        const cx = dims.tableWidth / 2;
        const cy = dims.tableHeight / 2;
        placed.players.forEach((seat, i) => {
            const sx = parseFloat(seat.left);
            const sy = parseFloat(seat.top);
            const chip = placed.chips[i];
            const toCentre = Math.hypot(cx - sx, cy - sy);
            const chipDist = Math.hypot(parseFloat(chip.left) - sx, parseFloat(chip.top ?? "0") - sy);
            expect(chipDist).toBeLessThan(toCentre * 0.5);
            expect(chipDist * zoom).toBeGreaterThan(40);
        });
        expect(placed.dealers).toEqual([]);
        expect(placed.players).toEqual(aligned.players);
    });

    test.each([
        ["844x390 landscape", 844, 390, false],
        ["915x412 landscape", 915, 412, false],
        ["1024x650 landscape", 1024, 650, true],
        ["1024x773 landscape", 1024, 773, true],
        ["390x844 portrait", 390, 844, false]
    ])("keeps every chip with its seat and off the cards at %s", (_label, width, height, coarse) => {
        window.matchMedia = (query: string) => ({ matches: coarse && query.includes("coarse"), media: query, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent() { return false; }, onchange: null }) as MediaQueryList;
        Object.defineProperty(window, "innerWidth", { configurable: true, value: width });
        Object.defineProperty(window, "innerHeight", { configurable: true, value: height });
        const portrait = height > width;
        const cw = portrait ? width : width - 124;
        const ch = portrait ? height - 130 : height - 70;
        for (const size of [2, 4, 6, 9] as TableSize[]) {
            const zoom = calculateZoom(size, cw, ch);
            const screenUnit = parseFloat(mobileCardUnit(portrait, zoom, cw, ch)) * zoom;
            const base = getAllPositions(size);
            const seats = base;
            const placed = placeMobileRailMarkers(seats, zoom, 0, screenUnit, size);
            const scaleY = 1;
            const shiftY = 0;
            const centres = placed.players.map(seat => ({ x: parseFloat(seat.left), y: parseFloat(seat.top) }));
            const cards = mobileCardObstacles(seats, zoom, screenUnit, size);
            const chipHalf = height <= 500 && width > height ? 72 : (width <= 768 || height <= 500) ? 86 : 54;
            const chipHy = 16;
            const hits = (x: number, y: number, hw: number, hy: number) => cards.some(card =>
                Math.abs(x - card.x) < hw + card.hw && Math.abs(y - card.y) < hy + card.hy
            );
            const problems: string[] = [];
            centres.forEach((seat, index) => {
                const chip = { x: parseFloat(placed.chips[index].left), y: parseFloat(placed.chips[index].top ?? "0") };
                const own = Math.hypot(chip.x - seat.x, chip.y - seat.y);
                centres.forEach((other, otherIndex) => {
                    if (otherIndex === index) return;
                    const next = Math.hypot(chip.x - other.x, chip.y - other.y);
                    if (own >= next) problems.push(`${size} seat ${index + 1} chip closer to seat ${otherIndex + 1} (${own.toFixed(0)} vs ${next.toFixed(0)})`);
                });
                if (hits(chip.x, chip.y, chipHalf, chipHy)) problems.push(`${size} seat ${index + 1} chip on a card at ${chip.x},${chip.y}`);
                const onFelt = [[-1, -1], [-1, 1], [1, -1], [1, 1]].every(([sx, sy]) =>
                    mobileFeltContains(chip.x + sx * chipHalf, chip.y + sy * 18, scaleY, shiftY)
                );
                if (!onFelt) problems.push(`${size} seat ${index + 1} chip off the felt at ${chip.x},${chip.y}`);
            });
            expect(problems).toEqual([]);
            expect(placed.players.map(seat => seat.top)).toEqual(seats.players.map(seat => seat.top));
        }
    });

    test("centres the 9-seat flank and top bets and nudges the side bets toward their cards", () => {
        window.matchMedia = (query: string) => ({ matches: query.includes("coarse"), media: query, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent() { return false; }, onchange: null }) as MediaQueryList;
        Object.defineProperty(window, "innerWidth", { configurable: true, value: 844 });
        Object.defineProperty(window, "innerHeight", { configurable: true, value: 390 });
        const assertCentred = (width: number, height: number) => {
            Object.defineProperty(window, "innerWidth", { configurable: true, value: width });
            Object.defineProperty(window, "innerHeight", { configurable: true, value: height });
            const contentWidth = width - 124;
            const contentHeight = height - 70;
            const zoom = calculateZoom(9, contentWidth, contentHeight);
            const screenUnit = parseFloat(mobileCardUnit(false, zoom, contentWidth, contentHeight)) * zoom;
            const placed = placeMobileRailMarkers(getAllPositions(9), zoom, 0, screenUnit, 9);
            for (const index of [1, 8, 4, 5]) {
                const seatX = parseFloat(placed.players[index].left);
                const chipX = parseFloat(placed.chips[index].left);
                const chipY = parseFloat(placed.chips[index].top ?? "0");
                const seatY = parseFloat(placed.players[index].top);
                expect(chipX).toBe(Math.round(seatX));
                expect(chipY).not.toBe(Math.round(seatY));
            }
            // Seats 4–7 sit just under their own action boxes. The pile top
            // keeps 2–4 screen px of air and does not change x.
            const unit = screenUnit / zoom;
            const pillHalf = (22.67 / zoom) / 2;
            const visualHalf = Math.max(pillHalf, 20);
            for (const index of [3, 4, 5, 6]) {
                const seatY = parseFloat(placed.players[index].top);
                const chipY = parseFloat(placed.chips[index].top ?? "0");
                const bannerBottom = seatY + 35.5 * unit + 33;
                const gap = (chipY - visualHalf - bannerBottom) * zoom;
                expect(gap).toBeGreaterThanOrEqual(4);
                // On a tall tablet the curved rail already stops seats 4 and 7,
                // so those two piles cannot rise to the box without leaving the felt.
                if (height <= 500 || index === 4 || index === 5) expect(gap).toBeLessThanOrEqual(6);
            }
            for (const index of [2, 7]) {
                const seatX = parseFloat(placed.players[index].left);
                const chipX = parseFloat(placed.chips[index].left);
                const centre = getStageDims().tableWidth / 2;
                const seatSide = Math.sign(seatX - centre);
                const chipSide = Math.sign(chipX - centre);
                expect(chipSide).toBe(seatSide);
                expect(Math.abs(chipX - seatX)).toBeGreaterThan(12);
                expect(Math.abs(chipX - seatX)).toBeLessThan(Math.abs(centre - seatX));
            }
            // Seats 3 and 8 sit level with the top of their own hole cards.
            // Seat 3 starts just past the right edge. Seat 8 ends just before
            // the left edge. The chip icon and the amount stay off the fan.
            const obstacles = mobileCardObstacles(getAllPositions(9), zoom, screenUnit, 9);
            const pileHalf = Math.max(height <= 500 ? 72 : 66, 40 / zoom);
            const pilePill = (22.67 / zoom) / 2;
            const seat3Cards = obstacles[2];
            const seat3ChipX = parseFloat(placed.chips[2].left);
            const seat3ChipY = parseFloat(placed.chips[2].top ?? "0");
            const seat3Side = (seat3ChipX - pileHalf - (seat3Cards.x + seat3Cards.hw)) * zoom;
            const seat3Top = (seat3ChipY - pilePill - (seat3Cards.y - seat3Cards.hy)) * zoom;
            expect(seat3Side).toBeGreaterThanOrEqual(2);
            expect(seat3Side).toBeLessThanOrEqual(5);
            expect(seat3Top).toBeGreaterThanOrEqual(-1);
            expect(seat3Top).toBeLessThanOrEqual(2);
            const seat8Cards = obstacles[7];
            const seat8ChipX = parseFloat(placed.chips[7].left);
            const seat8ChipY = parseFloat(placed.chips[7].top ?? "0");
            const seat8Side = ((seat8Cards.x - seat8Cards.hw) - (seat8ChipX + pileHalf)) * zoom;
            const seat8Top = (seat8ChipY - pilePill - (seat8Cards.y - seat8Cards.hy)) * zoom;
            expect(seat8Side).toBeGreaterThanOrEqual(2);
            expect(seat8Side).toBeLessThanOrEqual(5);
            expect(seat8Top).toBeGreaterThanOrEqual(-1);
            expect(seat8Top).toBeLessThanOrEqual(2);
        };
        assertCentred(844, 390);
        assertCentred(915, 412);
        assertCentred(1024, 650);

        Object.defineProperty(window, "innerWidth", { configurable: true, value: 390 });
        Object.defineProperty(window, "innerHeight", { configurable: true, value: 844 });
        const portraitZoom = calculateZoom(9, 390, 714);
        const portraitUnit = parseFloat(mobileCardUnit(true, portraitZoom, 390, 714)) * portraitZoom;
        const portrait = placeMobileRailMarkers(getAllPositions(9), portraitZoom, 0, portraitUnit, 9);
        for (const index of [1, 8, 2, 4, 5, 7]) {
            const seatX = parseFloat(portrait.players[index].left);
            const chipX = parseFloat(portrait.chips[index].left);
            expect(Math.abs(chipX - seatX)).toBeGreaterThan(20);
        }
    });

    test("lines 6-seat side bets up with the hole-card corner and the stack badge", () => {
        window.matchMedia = (query: string) => ({ matches: query.includes("coarse"), media: query, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent() { return false; }, onchange: null }) as MediaQueryList;
        const check = (width: number, height: number) => {
            Object.defineProperty(window, "innerWidth", { configurable: true, value: width });
            Object.defineProperty(window, "innerHeight", { configurable: true, value: height });
            const portrait = height > width;
            const contentWidth = portrait ? width : width - 124;
            const contentHeight = portrait ? height - 130 : height - 70;
            const zoom = calculateZoom(6, contentWidth, contentHeight);
            const screenUnit = parseFloat(mobileCardUnit(portrait, zoom, contentWidth, contentHeight)) * zoom;
            const placed = placeMobileRailMarkers(getAllPositions(6), zoom, 0, screenUnit, 6);
            const holes = mobileCardObstacles(getAllPositions(6), zoom, screenUnit, 6).slice(0, 6);
            const unit = screenUnit / zoom;
            for (const index of [1, 5]) {
                const seatY = parseFloat(placed.players[index].top);
                const chipY = parseFloat(placed.chips[index].top ?? "0");
                const corner = Math.round(holes[index].y - holes[index].hy);
                expect(chipY).toBeGreaterThanOrEqual(corner - 1);
                expect(chipY).not.toBe(Math.round(seatY));
            }
            for (const index of [2, 4]) {
                const seatY = parseFloat(placed.players[index].top);
                const chipY = parseFloat(placed.chips[index].top ?? "0");
                const badge = Math.round(seatY + 23 * unit);
                expect(chipY).toBeLessThanOrEqual(badge + 2);
                expect(chipY).toBeGreaterThan(seatY);
            }
            const centre = getStageDims().tableWidth / 2;
            for (const index of [1, 2, 4, 5]) {
                const seatX = parseFloat(placed.players[index].left);
                const chipX = parseFloat(placed.chips[index].left);
                expect(Math.sign(chipX - centre)).toBe(Math.sign(seatX - centre));
                // Inward of the felt centre, and still this seat's bet.
                expect(Math.abs(chipX - seatX)).toBeLessThan(Math.abs(centre - seatX) * 0.36);
                expect(Math.abs(chipX - seatX)).toBeGreaterThan(40);
            }
            // Seat 3's icon steps inward until it clears that seat's cards.
            // A tall tablet was already clear, so its gap is a little wider.
            const seat3Cards = holes[2];
            const seat3Half = Math.max(height <= 500 ? 72 : 66, 40 / zoom);
            const seat3X = parseFloat(placed.chips[2].left);
            const seat3Gap = (seat3X - seat3Half - (seat3Cards.x + seat3Cards.hw)) * zoom;
            expect(seat3Gap).toBeGreaterThanOrEqual(2);
            expect(seat3Gap).toBeLessThanOrEqual(8);
            // Seat 5's painted pill steps right until it is ~3px from the
            // dealer disc. The wider search box would stop short of that.
            const seat5X = parseFloat(placed.chips[4].left);
            const seat5Y = parseFloat(placed.chips[4].top ?? "0");
            const seat5SeatX = parseFloat(placed.players[4].left);
            const seat5SeatY = parseFloat(placed.players[4].top);
            const dealerR = 11 * unit;
            const dealerShift = (9.5 * unit + dealerR + 3 / zoom) / Math.SQRT2;
            const dealerX = seat5SeatX - 31.5 * unit - dealerShift;
            const chipPx = height <= 500 || width <= 768 ? 32 : 28;
            const paintedHalf = (chipPx * zoom + 2 * zoom + 51) / 2 / zoom;
            const dealerGap = (dealerX - dealerR - (seat5X + paintedHalf)) * zoom;
            expect(dealerGap).toBeGreaterThanOrEqual(2);
            expect(dealerGap).toBeLessThanOrEqual(5);
            expect(seat5Y).toBeGreaterThan(seat5SeatY);
            const topSeatY = parseFloat(placed.players[3].top);
            const topChipY = parseFloat(placed.chips[3].top ?? "0");
            const pillHalf = (22.67 / zoom) / 2;
            const bannerBottom = topSeatY + 35.5 * unit + (55 - 22);
            expect(parseFloat(placed.chips[3].left)).toBe(Math.round(parseFloat(placed.players[3].left)));
            expect(topChipY - pillHalf).toBeGreaterThan(bannerBottom + 4);
        };
        check(844, 390);
        check(1024, 650);

        Object.defineProperty(window, "innerWidth", { configurable: true, value: 390 });
        Object.defineProperty(window, "innerHeight", { configurable: true, value: 844 });
        const portraitZoom = calculateZoom(6, 390, 714);
        const portraitUnit = parseFloat(mobileCardUnit(true, portraitZoom, 390, 714)) * portraitZoom;
        const portrait = placeMobileRailMarkers(getAllPositions(6), portraitZoom, 0, portraitUnit, 6);
        const portraitHoles = mobileCardObstacles(getAllPositions(6), portraitZoom, portraitUnit, 6).slice(0, 6);
        const portraitUnitStage = portraitUnit / portraitZoom;
        for (const index of [2, 4]) {
            const seatY = parseFloat(portrait.players[index].top);
            const chipY = parseFloat(portrait.chips[index].top ?? "0");
            const badge = Math.round(seatY + 23 * portraitUnitStage);
            expect(chipY).toBeGreaterThan(badge + 2);
        }
        for (const index of [1, 5]) {
            const chipY = parseFloat(portrait.chips[index].top ?? "0");
            const corner = Math.round(portraitHoles[index].y - portraitHoles[index].hy);
            expect(chipY).toBeGreaterThan(corner + 2);
        }
    });

    test("keeps every landscape bet off the dealer disc", () => {
        window.matchMedia = (query: string) => ({ matches: query.includes("coarse"), media: query, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent() { return false; }, onchange: null }) as MediaQueryList;
        const overlaps: string[] = [];
        for (const size of [2, 4, 6, 9] as TableSize[]) {
            for (const [width, height] of [[844, 390], [915, 412], [1024, 650]] as const) {
                Object.defineProperty(window, "innerWidth", { configurable: true, value: width });
                Object.defineProperty(window, "innerHeight", { configurable: true, value: height });
                const contentWidth = width - 124;
                const contentHeight = height - 70;
                const zoom = calculateZoom(size, contentWidth, contentHeight);
                const screenUnit = parseFloat(mobileCardUnit(false, zoom, contentWidth, contentHeight)) * zoom;
                const placed = placeMobileRailMarkers(getAllPositions(size), zoom, 0, screenUnit, size);
                const unit = screenUnit / zoom;
                const short = height <= 500;
                const chipPx = short || width <= 768 ? 32 : 28;
                const overhang = chipPx * 0.45;
                const textHalf = ((chipPx * 0.55 + 2) * zoom + 58 + 7) / 2 / zoom;
                const wideHalf = textHalf + overhang / 2;
                const paintedHalf = (chipPx * zoom + 2 * zoom + 51) / 2 / zoom;
                const pillHalf = (22.67 / zoom) / 2;
                const dealerR = 11 * unit;
                const shift = (9.5 * unit + dealerR + 3 / zoom) / Math.SQRT2;
                placed.players.forEach((seat, index) => {
                    const sx = parseFloat(seat.left);
                    const sy = parseFloat(seat.top);
                    const dx = sx - 31.5 * unit - shift;
                    const dy = sy + 23 * unit - shift;
                    const x = parseFloat(placed.chips[index].left);
                    const y = parseFloat(placed.chips[index].top ?? "0");
                    const crossing = Math.abs(y - dy) < pillHalf;
                    const air = crossing ? 3 / zoom : 0;
                    // Seat 5 on a 6-seat table is placed against the painted
                    // pill. The wider box is what left it ~10px short.
                    const half = size === 6 && index === 4 ? paintedHalf : wideHalf;
                    const hit = Math.abs(x - dx) < half + dealerR + air && Math.abs(y - dy) < pillHalf + dealerR + air;
                    if (hit) overlaps.push(`${size}-seat ${width}x${height} seat ${index + 1}`);
                });
            }
        }
        expect(overlaps).toEqual([]);
    });

    test("drops the 2-seat top bet below the action banner on mobile landscape", () => {
        window.matchMedia = (query: string) => ({ matches: query.includes("coarse"), media: query, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent() { return false; }, onchange: null }) as MediaQueryList;
        const place = (width: number, height: number) => {
            Object.defineProperty(window, "innerWidth", { configurable: true, value: width });
            Object.defineProperty(window, "innerHeight", { configurable: true, value: height });
            const portrait = height > width;
            const contentWidth = portrait ? width : width - 124;
            const contentHeight = portrait ? height - 130 : height - 70;
            const zoom = calculateZoom(2, contentWidth, contentHeight);
            const screenUnit = parseFloat(mobileCardUnit(portrait, zoom, contentWidth, contentHeight)) * zoom;
            const placed = placeMobileRailMarkers(getAllPositions(2), zoom, 0, screenUnit, 2);
            return { placed, zoom, unit: screenUnit / zoom };
        };
        for (const [width, height] of [[844, 390], [1024, 650]] as const) {
            const { placed, zoom, unit } = place(width, height);
            const seat = placed.players[1];
            const chip = placed.chips[1];
            const seatY = parseFloat(seat.top);
            const chipY = parseFloat(chip.top ?? "0");
            const chipX = parseFloat(chip.left);
            const seatHalf = 35.5 * unit;
            const pillHalf = (22.67 / zoom) / 2;
            const bannerBottom = seatY + seatHalf + (55 - 22);
            expect(chipX).toBe(Math.round(parseFloat(seat.left)));
            const chipPx = height <= 500 || width <= 768 ? 32 : 28;
            const stackScreen = (chipPx + 12) * zoom;
            const overhang = Math.max(0, (stackScreen - 22.67) / 2);
            const air = (chipY - pillHalf - bannerBottom) * zoom;
            const expected = 3 + overhang + 3 * zoom;
            expect(air).toBeGreaterThan(expected - 1.5);
            expect(air).toBeLessThan(expected + 1.5);
            const board = mobileCardObstacles(getAllPositions(2), zoom, unit * zoom, 2)[2];
            expect(chipY + pillHalf).toBeLessThan(board.y - board.hy);
            expect(mobileFeltContains(chipX, chipY, 1, 0)).toBe(true);
        }
        const portrait = place(390, 844);
        expect(portrait.placed.chips.map(chip => `${chip.left},${chip.top}`)).toEqual([
            "250px,1015px",
            "250px,110px"
        ]);
    });

    test("keeps mobile-landscape chips off every action banner", () => {
        window.matchMedia = (query: string) => ({ matches: query.includes("coarse"), media: query, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent() { return false; }, onchange: null }) as MediaQueryList;
        const problems: string[] = [];
        for (const [width, height] of [[844, 390], [1024, 650]] as const) {
            Object.defineProperty(window, "innerWidth", { configurable: true, value: width });
            Object.defineProperty(window, "innerHeight", { configurable: true, value: height });
            for (const size of [2, 4, 6, 9] as TableSize[]) {
                const contentWidth = width - 124;
                const contentHeight = height - 70;
                const zoom = calculateZoom(size, contentWidth, contentHeight);
                const screenUnit = parseFloat(mobileCardUnit(false, zoom, contentWidth, contentHeight)) * zoom;
                const unit = screenUnit / zoom;
                const placed = placeMobileRailMarkers(getAllPositions(size), zoom, 0, screenUnit, size);
                const pileHW = height <= 500 ? 72 : 66;
                const pillHalf = (22.67 / zoom) / 2;
                const seats = placed.players.map(seat => ({ x: parseFloat(seat.left), y: parseFloat(seat.top) }));
                const banners = seats.map(seat => ({
                    x: seat.x,
                    y: seat.y + 35.5 * unit - 22 + 27.5,
                    hw: 44 * unit + 2,
                    hy: 27.5
                }));
                const hits = (x: number, y: number, hw: number, hy: number, banner: { x: number; y: number; hw: number; hy: number }) =>
                    Math.abs(x - banner.x) < hw + banner.hw + 2 && Math.abs(y - banner.y) < hy + banner.hy + 2;
                seats.forEach((_seat, index) => {
                    const chip = { x: parseFloat(placed.chips[index].left), y: parseFloat(placed.chips[index].top ?? "0") };
                    banners.forEach((banner, bannerIndex) => {
                        if (hits(chip.x, chip.y, pileHW, pillHalf, banner)) {
                            problems.push(`${width}x${height} ${size}-seat chip ${index + 1} on banner ${bannerIndex + 1}`);
                        }
                    });
                });
            }
        }
        expect(problems).toEqual([]);
    });
});
