import {
    COMMUNITY_ROW_WIDTH,
    PORTRAIT_BOARD_AIR,
    desktopPortraitRailOutset,
    feltEndRadius,
    getSeatCoords,
    getStageDims,
    holeCardInwardReach,
    notePortraitSize,
    type TableSize
} from "./stageGeometry";

const setViewport = (width: number, height: number) => {
    Object.defineProperty(window, "innerWidth", { configurable: true, writable: true, value: width });
    Object.defineProperty(window, "innerHeight", { configurable: true, writable: true, value: height });
};

describe("desktop portrait rail outset", () => {
    const width = window.innerWidth;
    const height = window.innerHeight;

    afterAll(() => {
        setViewport(width, height);
    });

    it("keeps phones, landscape, and the 2- and 6-seat rings on the 500px felt", () => {
        setViewport(390, 844);
        notePortraitSize(9);
        expect(desktopPortraitRailOutset(4)).toBe(0);
        expect(desktopPortraitRailOutset(9)).toBe(0);
        expect(getStageDims().tableWidth).toBe(500);
        expect(getSeatCoords(4)[1]).toEqual([175, 880]);
        expect(getSeatCoords(9)[2]).toEqual([175, 932]);

        setViewport(1400, 900);
        notePortraitSize(4);
        expect(desktopPortraitRailOutset(4)).toBe(0);
        expect(getSeatCoords(4)[1][0]).toBeLessThan(400);

        setViewport(1000, 1400);
        for (const size of [2, 6] as TableSize[]) {
            notePortraitSize(size);
            expect(desktopPortraitRailOutset(size)).toBe(0);
            expect(getStageDims().tableWidth).toBe(500);
            expect(getStageDims().originX).toBe(175);
        }
    });

    it("moves 4- and 9-seat players out so the full-size board and pot clear their hole cards", () => {
        setViewport(1000, 1400);
        const reach = holeCardInwardReach();
        expect(COMMUNITY_ROW_WIDTH).toBe(457);
        expect(reach).toBeGreaterThan(58);
        expect(reach).toBeLessThan(60);

        for (const size of [4, 9] as TableSize[]) {
            notePortraitSize(size);
            const outset = desktopPortraitRailOutset(size);
            expect(outset).toBeGreaterThan(0);
            const dims = getStageDims();
            expect(dims.tableWidth).toBe(500 + outset * 2);
            expect(dims.originX).toBeCloseTo(dims.centerX - dims.tableWidth / 2, 5);
            expect(feltEndRadius(dims.tableWidth, dims.tableHeight)).toBe(dims.tableWidth / 2);

            const coords = getSeatCoords(size);
            expect(coords[0]).toEqual([425, 1300]);
            const rail = Math.min(...coords.map(point => point[0]));
            const fromCentre = 425 - rail;
            expect(fromCentre).toBeGreaterThanOrEqual(COMMUNITY_ROW_WIDTH / 2 + reach + PORTRAIT_BOARD_AIR);
            // The centred pot is narrower than the community row, so the same rail clears it.
            expect(fromCentre - reach).toBeGreaterThan(COMMUNITY_ROW_WIDTH / 2);
        }

        const four = getSeatCoords(4);
        expect(four[2]).toEqual([425, 275]);
        expect(four[1][0] + four[3][0]).toBe(850);
        const nine = getSeatCoords(9);
        expect(nine[1][0] + nine[8][0]).toBe(850);
        expect(nine[4][0] + nine[5][0]).toBe(850);
    });
});
