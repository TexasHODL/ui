import { mobileCardUnit } from "./mobileCardSizing";
import { alignLandscapeSeatEdges } from "./landscapeSeatEdges";
import { getAllPositions } from "./stageGeometry";
import { calculateZoom, getStageDims, getSeatCoords, getContentBounds, getTableTransform, type TableSize } from "./stageGeometry";

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
});
