import {
    BOARD_HOLE_AIR,
    COMMUNITY_CARD_HEIGHT,
    COMMUNITY_CARD_WIDTH,
    PORTRAIT_FELT_WIDTH,
    communityRowWidth,
    holeCardReach,
    portraitBoardCardScale
} from "./boardCardScale";

describe("portraitBoardCardScale", () => {
    it("keeps landscape and phone boards at the desktop card size", () => {
        for (const seats of [2, 4, 6, 9]) {
            expect(portraitBoardCardScale(seats, false)).toBe(1);
        }
    });

    it("keeps 2-seat and 6-seat portrait boards at full size", () => {
        expect(portraitBoardCardScale(2, true)).toBe(1);
        expect(portraitBoardCardScale(6, true)).toBe(1);
    });

    it("shrinks the 4-seat and 9-seat row so it clears the rail hole cards", () => {
        const scale = portraitBoardCardScale(4, true);
        expect(portraitBoardCardScale(9, true)).toBe(scale);
        expect(scale).toBeGreaterThan(0.65);
        expect(scale).toBeLessThan(1);
        const row = communityRowWidth(scale);
        const limit = PORTRAIT_FELT_WIDTH - 2 * (holeCardReach() + BOARD_HOLE_AIR);
        expect(row).toBeCloseTo(limit, 5);
        expect(row).toBeLessThan(communityRowWidth(1));
        expect(COMMUNITY_CARD_WIDTH * scale).toBeLessThan(COMMUNITY_CARD_WIDTH);
        expect(COMMUNITY_CARD_HEIGHT * scale).toBeLessThan(COMMUNITY_CARD_HEIGHT);
    });

    it("the unscaled row does not fit between the portrait rail hole cards", () => {
        const limit = PORTRAIT_FELT_WIDTH - 2 * (holeCardReach() + BOARD_HOLE_AIR);
        expect(communityRowWidth(1)).toBeGreaterThan(limit);
        expect(holeCardReach()).toBeGreaterThan(53);
        expect(holeCardReach()).toBeLessThan(70);
    });
});
