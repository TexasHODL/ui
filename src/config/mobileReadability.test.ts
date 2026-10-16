import { getSeatCoords, getSeatPositions, calculateZoom, getContentBounds, mobilePortraitHeightStretch, type TableSize } from "./stageGeometry";

describe("approved portrait seat rings", () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    beforeEach(() => {
        Object.defineProperty(window, "innerWidth", { configurable: true, value: 393 });
        Object.defineProperty(window, "innerHeight", { configurable: true, value: 669 });
    });
    afterAll(() => {
        Object.defineProperty(window, "innerWidth", { configurable: true, value: width });
        Object.defineProperty(window, "innerHeight", { configurable: true, value: height });
    });

    test.each([2, 4, 6, 9] as TableSize[])("%i seats share the same top clearance and fit the action-free stage", size => {
        const coords = getSeatCoords(size);
        expect(Math.min(...coords.map(p => p[1]))).toBe(275);
        expect(coords[0]).toEqual([425, 1300]);
        const bounds = getContentBounds(size);
        const zoom = calculateZoom(size, 393, 485);
        expect(bounds.height * zoom).toBeLessThanOrEqual(485);
        expect(bounds.width * zoom).toBeLessThanOrEqual(393);
        // Seat conversion must not reapply the landscape inward spread.
        expect(parseFloat(getSeatPositions(size)[0].top)).toBeCloseTo(1000 * mobilePortraitHeightStretch(), 1);
    });

    test("nine-seat sides are symmetric and lower arcs stay clear of the hero", () => {
        const coords = getSeatCoords(9);
        for (const [left, right] of [[1, 8], [2, 7], [3, 6], [4, 5]]) {
            expect(coords[left][0] + coords[right][0]).toBe(850);
            expect(coords[left][1]).toBe(coords[right][1]);
        }
        expect(coords[1][0]).toBe(188);
        expect(coords[8][0]).toBe(662);
        expect(coords[3][1]).toBeLessThan(coords[2][1]);
    });

    test("landscape retains a different ring", () => {
        Object.defineProperty(window, "innerWidth", { configurable: true, value: 1440 });
        Object.defineProperty(window, "innerHeight", { configurable: true, value: 900 });
        expect(getSeatCoords(4)[0]).not.toEqual([425, 1300]);
    });
});
