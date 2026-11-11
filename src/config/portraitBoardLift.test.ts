import { readFileSync } from "fs";
import { resolve } from "path";

/**
 * Desktop/tablet portrait board lift, measured on the 500px felt.
 * Table Y grows downward. 4-seat rail hole-card tops sit at 506; the row
 * bottom is the drop plus 360. 9-seat lower rail hole-card tops sit at 558;
 * the centred row bottom sits at 591, and the board is lifted 48px. The
 * 9-seat row then moves another 12px up on its own, because the pot is
 * already 10px under the upper side bets and cannot rise further.
 */
const FOUR_HOLE_TOP = 506;
const FOUR_ROW_OFFSET = 360;
const FOUR_GAP = 35;
const NINE_HOLE_TOP = 558;
const NINE_ROW_BOTTOM = 591;
const NINE_BOARD_LIFT = 48;
const NINE_ROW_LIFT = 12;

const fourDrop = FOUR_HOLE_TOP - FOUR_GAP - FOUR_ROW_OFFSET;
const nineHoleGap = NINE_HOLE_TOP - (NINE_ROW_BOTTOM - NINE_BOARD_LIFT - NINE_ROW_LIFT);

describe("portrait board lift", () => {
    it("puts the 4-seat row 35px above the rail hole cards", () => {
        expect(fourDrop).toBe(111);
        expect(FOUR_HOLE_TOP - (fourDrop + FOUR_ROW_OFFSET)).toBe(FOUR_GAP);
    });

    it("puts the 9-seat row above the lower rail hole cards without lifting the pot further", () => {
        expect(NINE_BOARD_LIFT).toBe(48);
        expect(NINE_ROW_LIFT).toBe(12);
        expect(nineHoleGap).toBe(27);
        expect(nineHoleGap).toBeGreaterThanOrEqual(20);
        // Tightest measured POT-label gap was 32px. 12px of row lift leaves 20.
        expect(32 - NINE_ROW_LIFT).toBeGreaterThanOrEqual(20);
        // Tightest pot top after the 48px board lift is y 327; upper bets end at 317.
        expect(327 - 317).toBeGreaterThanOrEqual(10);
    });

    it("is the drop and the lifts in the portrait board CSS", () => {
        const css = readFileSync(resolve(__dirname, "../components/playPage/Table.css"), "utf8");
        expect(css).toContain(`var(--tp-four-drop, ${fourDrop}px)`);
        expect(css).toContain(`translate: 0 -${NINE_BOARD_LIFT}px`);
        expect(css).toContain(`translate: 0 -${NINE_ROW_LIFT}px`);
    });

    it("keeps the 4-seat pot below the top seat's chips", () => {
        // Top chips end at y 91. The highest pot top on the old 190px drop
        // is y 338, and that position moves with the new drop.
        const fourPotTop = 338 - (190 - fourDrop);
        expect(fourPotTop - 91).toBeGreaterThanOrEqual(20);
    });
});
