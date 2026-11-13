import { finishedPlaceTone, finishedSeatDisplay, finishedSeatPayoutMicro } from "./finishedSeatDisplay";

describe("finishedSeatDisplay", () => {
    it("names each medal place and keeps a payout that floors to cents", () => {
        expect(finishedSeatDisplay(1, "7000000")).toEqual({
            placeLabel: "1st",
            tone: "first",
            payoutMicro: "7000000"
        });
        expect(finishedSeatDisplay(2, "3360000")).toEqual({
            placeLabel: "2nd",
            tone: "second",
            payoutMicro: "3360000"
        });
        expect(finishedSeatDisplay(3, "1680000")).toEqual({
            placeLabel: "3rd",
            tone: "third",
            payoutMicro: "1680000"
        });
    });

    it("mutes 4th and later, including the teens", () => {
        expect(finishedPlaceTone(4)).toBe("other");
        expect(finishedPlaceTone(11)).toBe("other");
        expect(finishedSeatDisplay(4, "0").placeLabel).toBe("4th");
        expect(finishedSeatDisplay(11, "0").placeLabel).toBe("11th");
        expect(finishedSeatDisplay(5, "0").tone).toBe("other");
    });

    it("leaves the card area empty when the payout is zero, missing, or under one cent", () => {
        expect(finishedSeatPayoutMicro("0")).toBeNull();
        expect(finishedSeatPayoutMicro("1")).toBeNull();
        expect(finishedSeatPayoutMicro("9999")).toBeNull();
        expect(finishedSeatPayoutMicro("")).toBeNull();
        expect(finishedSeatPayoutMicro(undefined)).toBeNull();
        expect(finishedSeatPayoutMicro(null)).toBeNull();
        expect(finishedSeatPayoutMicro("nope")).toBeNull();
        expect(finishedSeatDisplay(4, "0").payoutMicro).toBeNull();
    });

    it("keeps a one-cent prize, which does not render as $0.00", () => {
        expect(finishedSeatPayoutMicro("10000")).toBe("10000");
    });
});
