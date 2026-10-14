import { mobileCardUnit } from "./mobileCardSizing";
import { alignLandscapeSeatEdges, landscapeFeltStretch, placeMobileRailMarkers } from "./landscapeSeatEdges";
import { calculateZoom, getAllPositions, getStageDims, getSeatCoords, getContentBounds, getTableTransform, type TableSize } from "./stageGeometry";

describe("landscape mobile readability", () => {
    const oldWidth = window.innerWidth;
    const oldHeight = window.innerHeight;
    afterAll(() => {
        Object.defineProperty(window, "innerWidth", { configurable: true, value: oldWidth });
        Object.defineProperty(window, "innerHeight", { configurable: true, value: oldHeight });
    });
    test.each([393, 333])("keeps the approved 39x51 cards at 852x%i", height => {
        Object.defineProperty(window, "innerWidth", { configurable: true, value: 852 });
        Object.defineProperty(window, "innerHeight", { configurable: true, value: height });
        for (const size of [2, 4, 6, 9] as TableSize[]) {
            const zoom = calculateZoom(size, 728, height - 70);
            expect(parseFloat(mobileCardUnit(false, zoom, 728, height - 70)) * zoom * 39).toBeCloseTo(39);
            expect(getStageDims().tableHeight).toBe(320);
        }
    });
    test.each([393, 333, 320])("fits seats and rails with notch margins at height %i", height => {
        Object.defineProperty(window, "innerWidth", { configurable: true, value: 852 });
        Object.defineProperty(window, "innerHeight", { configurable: true, value: height });
        const width = 610;
        const stageHeight = height - 70 - 21;
        for (const size of [2, 4, 6, 9] as TableSize[]) {
            const zoom = calculateZoom(size, width, stageHeight);
            const bounds = getContentBounds(size);
            expect(bounds.width * zoom).toBeLessThanOrEqual(width);
            expect(bounds.height * zoom).toBeLessThanOrEqual(stageHeight);
            const transform = getTableTransform(zoom, size, width, stageHeight);
            const y = Number(transform.match(/translate\([^,]+, ([^)]+)px\)/)?.[1]);
            const unit = parseFloat(mobileCardUnit(false, zoom, width, stageHeight)) * zoom;
            const seats = getSeatCoords(size);
            expect(y + Math.min(...seats.map(s => s[1])) * zoom - 39 * unit).toBeGreaterThanOrEqual(0);
            expect(y + Math.max(...seats.map(s => s[1])) * zoom + 54 * unit).toBeLessThanOrEqual(stageHeight);
            expect(unit).toBeLessThanOrEqual(1);
        }
    });
    test("preserves portrait sizing and desktop dimensions", () => {
        expect(parseFloat(mobileCardUnit(true, 0.4, 393, 480))).toBe(2.5);
        Object.defineProperty(window, "innerWidth", { configurable: true, value: 1440 });
        Object.defineProperty(window, "innerHeight", { configurable: true, value: 900 });
        expect(getStageDims().tableHeight).toBe(500);
    });
    test.each([393, 333])("anchors top cards and bottom timer at height %i", height => {
        Object.defineProperty(window, "innerWidth", { configurable: true, value: 852 });
        Object.defineProperty(window, "innerHeight", { configurable: true, value: height });
        for (const size of [2, 4, 6, 9] as TableSize[]) {
            const h = height - 70, zoom = calculateZoom(size, 728, h);
            const p = alignLandscapeSeatEdges(getAllPositions(size), size, 728, h, zoom);
            const ty = Number((h / 2 - getContentBounds(size).centerY * zoom).toFixed(1));
            const ys = p.players.map(s => ty + (parseFloat(s.top) + getStageDims().originY) * zoom);
            expect(Math.min(...ys) - 39).toBeCloseTo(4);
            expect(ys[0] + 54).toBeCloseTo(h - 4);
            if (size === 9) {
                expect(ys[0] - ys[1]).toBeCloseTo(10);
                expect(ys[0] - ys[8]).toBeCloseTo(10);
            }
        }
    });

    test("scales the felt onto the seat ring without moving seats", () => {
        window.matchMedia = (query: string) => ({ matches: query.includes("coarse"), media: query, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent() { return false; }, onchange: null }) as MediaQueryList;
        Object.defineProperty(window, "innerWidth", { configurable: true, value: 1024 });
        Object.defineProperty(window, "innerHeight", { configurable: true, value: 650 });
        const size: TableSize = 9;
        const zoom = calculateZoom(size, 900, 570);
        const aligned = alignLandscapeSeatEdges(getAllPositions(size), size, 900, 570, zoom);
        const before = aligned.players.map(seat => seat.top);
        const stretch = landscapeFeltStretch(aligned, size);
        expect(stretch.scaleY).toBeGreaterThan(1.4);
        const dims = getStageDims();
        const centre = dims.tableHeight / 2 + stretch.shiftY;
        const tops = aligned.players.map(seat => parseFloat(seat.top));
        const feltTop = centre - (dims.tableHeight / 2) * stretch.scaleY;
        const feltBottom = centre + (dims.tableHeight / 2) * stretch.scaleY;
        expect(feltTop).toBeCloseTo(Math.min(...tops), 0);
        expect(feltBottom).toBeCloseTo(Math.max(...tops), 0);
        expect(aligned.players.map(seat => seat.top)).toEqual(before);
    });

    test("places mobile chips and the dealer beside the seat, not at mid-felt", () => {
        window.matchMedia = (query: string) => ({ matches: query.includes("coarse"), media: query, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent() { return false; }, onchange: null }) as MediaQueryList;
        Object.defineProperty(window, "innerWidth", { configurable: true, value: 1024 });
        Object.defineProperty(window, "innerHeight", { configurable: true, value: 650 });
        const size: TableSize = 9;
        const zoom = calculateZoom(size, 900, 570);
        const aligned = alignLandscapeSeatEdges(getAllPositions(size), size, 900, 570, zoom);
        const placed = placeMobileRailMarkers(aligned, zoom, landscapeFeltStretch(aligned, size).shiftY);
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
});
