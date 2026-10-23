import { winnerBannerRollDistance, winnerBannerText, winnerBannerTop } from "./winnerBanner";

describe("winnerBannerText", () => {
    it("returns null when there are no winners", () => {
        expect(winnerBannerText(null)).toBeNull();
        expect(winnerBannerText(undefined)).toBeNull();
        expect(winnerBannerText([])).toBeNull();
    });

    it("single showdown winner shows the engine's hand description as-is", () => {
        expect(
            winnerBannerText([
                { seat: 3, formattedAmount: "12.50", description: "Full House, 8s over 7s", handName: "Full House, 8s over 7s", winType: "showdown" }
            ])
        ).toBe("Seat 3 wins the $12.50 pot with Full House, 8s over 7s");
    });

    it("falls back to the hand name when there is no description", () => {
        expect(winnerBannerText([{ seat: 1, formattedAmount: "1.00", handName: "Four 4s", winType: "showdown" }])).toBe(
            "Seat 1 wins the $1.00 pot with Four 4s"
        );
    });

    it("single uncontested winner omits the hand", () => {
        expect(winnerBannerText([{ seat: 5, formattedAmount: "4.00", handName: "Pair of 9s", winType: "uncontested" }])).toBe(
            "Seat 5 wins the $4.00 pot"
        );
    });

    it("keeps chip amounts as chips in tournaments", () => {
        expect(winnerBannerText([{ seat: 1, formattedAmount: "1,240 chips", winType: "showdown" }])).toBe(
            "Seat 1 wins 1,240 chips"
        );
    });

    it("last-resort label when seat stays unresolved (prefer resolving in useWinnerInfo)", () => {
        expect(
            winnerBannerText([{ seat: 0, formattedAmount: "0.54", description: "Trip Tens", winType: "showdown" }])
        ).toBe("Unknown seat wins the $0.54 pot with Trip Tens");
    });

    it("split pot lists every winner and amount", () => {
        expect(
            winnerBannerText([
                { seat: 3, formattedAmount: "6.25" },
                { seat: 5, formattedAmount: "6.25" }
            ])
        ).toBe("Split pot — Seat 3 $6.25 · Seat 5 $6.25");
    });
});

describe("winnerBannerTop", () => {
    it("sits just under the info bar, whatever its height", () => {
        expect(winnerBannerTop(100)).toBe(108); // desktop: one-line header
        expect(winnerBannerTop(185.4)).toBe(193); // narrow window: header wraps
    });

    it("falls back to a fixed offset when there is no info bar", () => {
        expect(winnerBannerTop(null)).toBe(108);
        expect(winnerBannerTop(undefined)).toBe(108);
    });
});

describe("winnerBannerRollDistance", () => {
    it("covers the window, the pill and a margin at each end", () => {
        expect(winnerBannerRollDistance(640, 452)).toBe(640 + 452 + 12);
    });

    it("rounds to whole pixels", () => {
        expect(winnerBannerRollDistance(640.4, 452.3)).toBe(1105);
    });
});
