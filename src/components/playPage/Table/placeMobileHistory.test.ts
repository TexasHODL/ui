import { chooseHistoryAnchor, historyBesideDock, historyNudge, overlapArea, type Box } from "./placeMobileHistory";

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

describe("historyBesideDock", () => {
    const dock = { left: 724, right: 844, top: 46, bottom: 390 };
    it("sits just left of a right-hand dock", () => expect(historyBesideDock(73, dock, false, 844)).toBe(647));
    it("sits on the inner side of a left-hand dock", () => expect(historyBesideDock(73, { left: 0, right: 124, top: 46, bottom: 390 }, true, 844)).toBe(128));
    it("clamps on screen", () => expect(historyBesideDock(73, { left: 20, right: 140, top: 0, bottom: 10 }, false, 844)).toBe(8));
});
