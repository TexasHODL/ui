import { finishedPayoutPlace, finishedPlaceTone, finishedSeatDisplay, finishedSeatPayoutMicro, finisherPlayedThisHand } from "./finishedSeatDisplay";
import type { FinishingHandMarks } from "./finishedSeatDisplay";

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

const hand = (
    actions: string[],
    winners: string[] = []
): FinishingHandMarks => ({
    previousActions: actions.map(playerId => ({ playerId }) as FinishingHandMarks["previousActions"][number]),
    winners: winners.map(address => ({ address }) as FinishingHandMarks["winners"][number])
});

describe("finished payout phase", () => {
    const bustHand = hand(["ann", "bob", "cara"], ["ann"]);
    const nextHand = hand(["ann", "bob"], ["bob"]);
    const finalHand = hand(["ann", "bob"], ["ann"]);

    it("keeps the finishing hand's payout in the action banner and the cards up", () => {
        expect(finisherPlayedThisHand(bustHand, "cara")).toBe(true);
        expect(finisherPlayedThisHand(bustHand, "ANN")).toBe(true);
        expect(finisherPlayedThisHand(hand([], ["ann"]), "ann")).toBe(true);
        expect(finishedPayoutPlace(true, "1680000")).toBe("action-banner");
        expect(finishedPayoutPlace(true, "0")).toBeNull();
        expect(finishedPayoutPlace(true, "1")).toBeNull();
    });

    it("moves the payout onto the card slot once a later hand is dealt", () => {
        expect(finisherPlayedThisHand(nextHand, "cara")).toBe(false);
        expect(finisherPlayedThisHand(bustHand, "cara")).toBe(true);
        expect(finishedPayoutPlace(false, "1680000")).toBe("hole-cards");
        expect(finishedPayoutPlace(false, "0")).toBeNull();
    });

    it("leaves the final hand's finishers on the banner, because no next hand is dealt", () => {
        expect(finisherPlayedThisHand(finalHand, "ann")).toBe(true);
        expect(finisherPlayedThisHand(finalHand, "bob")).toBe(true);
        expect(finisherPlayedThisHand(finalHand, "cara")).toBe(false);
        expect(finishedPayoutPlace(finisherPlayedThisHand(finalHand, "ann"), "7000000")).toBe("action-banner");
        expect(finishedPayoutPlace(finisherPlayedThisHand(finalHand, "cara"), "0")).toBeNull();
    });

    it("is not the finishing hand without a snapshot or an address", () => {
        expect(finisherPlayedThisHand(null, "ann")).toBe(false);
        expect(finisherPlayedThisHand(bustHand, "")).toBe(false);
        expect(finisherPlayedThisHand(undefined, undefined)).toBe(false);
    });
});
