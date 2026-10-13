import { chooseHistoryAnchor, historyNudge, overlapArea, type Box } from "./placeMobileHistory";

const seat = (left: number, top: number, width = 120, height = 140): Box => ({
    left,
    right: left + width,
    top,
    bottom: top + height
});

describe("chooseHistoryAnchor", () => {
    it("stays on the right when that corner is clear", () => {
        const anchor = chooseHistoryAnchor(72, 24, 48, 390, [seat(135, 80)], 8);
        expect(anchor).toBe("right");
        expect(overlapArea({ left: 0, right: 10, top: 0, bottom: 10 }, { left: 20, right: 30, top: 0, bottom: 10 })).toBe(0);
    });

    it("moves to the left when the right corner covers a seat", () => {
        const anchor = chooseHistoryAnchor(72, 24, 48, 390, [seat(300, 40)], 8);
        expect(anchor).toBe("left");
    });

    it("picks the smaller overlap when both corners touch a seat", () => {
        const anchor = chooseHistoryAnchor(72, 24, 48, 390, [seat(0, 40, 40, 40), seat(320, 40, 80, 80)], 8);
        expect(anchor).toBe("left");
    });
});

describe("historyNudge", () => {
    const button: Box = { left: 300, right: 372, top: 48, bottom: 72 };

    it("drops the launcher just past a slight overlap", () => {
        expect(historyNudge(button, [seat(300, 40, 80, 16)])).toBe(8);
    });

    it("does not push the launcher down the felt when a seat still covers it", () => {
        expect(historyNudge(button, [seat(300, 40)])).toBe(0);
    });
});
