import { readFileSync } from "fs";
import { resolve } from "path";

/**
 * Desktop/tablet portrait board lift, measured on the 500px felt.
 * Table Y grows downward. The community row and the pot move together.
 * 4-seat rail hole-card tops sit at 506; the row bottom is the drop plus 360
 * (bottom: 64% on the 1000px felt). 9-seat lower rail hole-card tops sit at
 * 558; the centred row bottom sits at 591.
 */
const FOUR_HOLE_TOP = 506;
const FOUR_ROW_OFFSET = 360;
const NINE_HOLE_TOP = 558;
const NINE_ROW_BOTTOM = 591;
const GAP = 15;

const fourDrop = FOUR_HOLE_TOP - GAP - FOUR_ROW_OFFSET;
const nineLift = NINE_ROW_BOTTOM - (NINE_HOLE_TOP - GAP);

describe("portrait board lift", () => {
    it("puts the 4-seat row 15px above the rail hole cards", () => {
        expect(fourDrop).toBe(131);
        expect(FOUR_HOLE_TOP - (fourDrop + FOUR_ROW_OFFSET)).toBe(GAP);
        expect(GAP).toBeGreaterThanOrEqual(10);
        expect(GAP).toBeLessThanOrEqual(20);
    });

    it("puts the 9-seat row 15px above the lower rail hole cards", () => {
        expect(nineLift).toBe(48);
        expect(NINE_HOLE_TOP - (NINE_ROW_BOTTOM - nineLift)).toBe(GAP);
    });

    it("is the drop and the lift in the portrait board CSS", () => {
        const css = readFileSync(resolve(__dirname, "../components/playPage/Table.css"), "utf8");
        expect(css).toContain(`var(--tp-four-drop, ${fourDrop}px)`);
        expect(css).toContain(`translate: 0 -${nineLift}px`);
    });

    it("keeps the moved pot below the top seat's chips", () => {
        // 4-seat top chips end at y 91. The highest pot top on the old 190px
        // drop is y 338, and that drop is 59px above the new 131px drop.
        const fourPotTop = 338 - (190 - fourDrop);
        expect(fourPotTop - 91).toBeGreaterThanOrEqual(20);
        // 9-seat upper side bets end at y 317. The highest pot top is y 375.
        const ninePotTop = 375 - nineLift;
        expect(ninePotTop - 317).toBeGreaterThanOrEqual(10);
    });
});
