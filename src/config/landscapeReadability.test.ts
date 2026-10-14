import { mobileCardUnit } from "./mobileCardSizing";
import { mobileCardObstacles, mobileFeltContains, placeMobileRailMarkers } from "./landscapeSeatEdges";
import { calculateZoom, getAllPositions, getStageDims, getSeatCoords, getContentBounds, getTableTransform, type TableSize } from "./stageGeometry";

describe("landscape mobile readability", () => {
    const oldWidth = window.innerWidth;
    const oldHeight = window.innerHeight;
    afterAll(() => {
        Object.defineProperty(window, "innerWidth", { configurable: true, value: oldWidth });
        Object.defineProperty(window, "innerHeight", { configurable: true, value: oldHeight });
    });
    test.each([393, 333])("keeps a 2:1 felt and cards no larger than 39px at 852x%i", height => {
        Object.defineProperty(window, "innerWidth", { configurable: true, value: 852 });
        Object.defineProperty(window, "innerHeight", { configurable: true, value: height });
        for (const size of [2, 4, 6, 9] as TableSize[]) {
            const zoom = calculateZoom(size, 728, height - 70);
            const card = parseFloat(mobileCardUnit(false, zoom, 728, height - 70)) * zoom * 39;
            expect(card).toBeLessThanOrEqual(39);
            expect(card).toBeGreaterThan(20);
            expect(getStageDims().tableWidth / getStageDims().tableHeight).toBe(2);
            expect(getStageDims().tableHeight).toBe(500);
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

    test("places mobile chips and the dealer beside the seat, not at mid-felt", () => {
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
            const dealer = placed.dealers[i];
            const toCentre = Math.hypot(cx - sx, cy - sy);
            const chipDist = Math.hypot(parseFloat(chip.left) - sx, parseFloat(chip.top ?? "0") - sy);
            const dealerDist = Math.hypot(parseFloat(dealer.left) - sx, parseFloat(dealer.top) - sy);
            expect(chipDist).toBeLessThan(toCentre * 0.5);
            expect(chipDist * zoom).toBeGreaterThan(40);
            expect(dealerDist * zoom).toBeLessThan(160);
            expect(dealerDist * zoom).toBeGreaterThan(40);
        });
        expect(placed.players).toEqual(aligned.players);
    });

    test.each([
        ["844x390 landscape", 844, 390, false],
        ["915x412 landscape", 915, 412, false],
        ["1024x650 landscape", 1024, 650, true],
        ["1024x773 landscape", 1024, 773, true],
        ["390x844 portrait", 390, 844, false]
    ])("keeps every chip and dealer with its seat and off the cards at %s", (_label, width, height, coarse) => {
        window.matchMedia = (query: string) => ({ matches: coarse && query.includes("coarse"), media: query, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent() { return false; }, onchange: null }) as MediaQueryList;
        Object.defineProperty(window, "innerWidth", { configurable: true, value: width });
        Object.defineProperty(window, "innerHeight", { configurable: true, value: height });
        const portrait = height > width;
        const cw = portrait ? width : width - 124;
        const ch = portrait ? height - 130 : height - 70;
        for (const size of [2, 6, 9] as TableSize[]) {
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
                const dealer = { x: parseFloat(placed.dealers[index].left), y: parseFloat(placed.dealers[index].top) };
                const markers = [
                    { kind: "chip", ...chip, hw: chipHalf, hy: chipHy },
                    { kind: "dealer", ...dealer, hw: 24, hy: 24 }
                ];
                for (const marker of markers) {
                    const own = Math.hypot(marker.x - seat.x, marker.y - seat.y);
                    centres.forEach((other, otherIndex) => {
                        if (otherIndex === index) return;
                        const next = Math.hypot(marker.x - other.x, marker.y - other.y);
                        if (own >= next) problems.push(`${size} seat ${index + 1} ${marker.kind} closer to seat ${otherIndex + 1} (${own.toFixed(0)} vs ${next.toFixed(0)})`);
                    });
                    if (hits(marker.x, marker.y, marker.hw, marker.hy)) problems.push(`${size} seat ${index + 1} ${marker.kind} on a card at ${marker.x},${marker.y}`);
                    if (marker.kind === "chip") {
                        const onFelt = [[-1, -1], [-1, 1], [1, -1], [1, 1]].every(([sx, sy]) =>
                            mobileFeltContains(marker.x + sx * chipHalf, marker.y + sy * 18, scaleY, shiftY)
                        );
                        if (!onFelt) problems.push(`${size} seat ${index + 1} chip off the felt at ${marker.x},${marker.y}`);
                    }
                }
                const sepX = Math.abs(chip.x - dealer.x);
                const sepY = Math.abs(chip.y - dealer.y);
                if (sepX < chipHalf + 24 && sepY < chipHy + 24) {
                    problems.push(`${size} seat ${index + 1} dealer on chip sep ${sepX.toFixed(0)},${sepY.toFixed(0)} chip ${chip.x},${chip.y} dealer ${dealer.x},${dealer.y}`);
                }
            });
            expect(problems).toEqual([]);
            expect(placed.players.map(seat => seat.top)).toEqual(seats.players.map(seat => seat.top));
        }
    });
});
