import { findSeatFromActions, findUserSeat, formatSeatLabel, isSeatBigBlind, validSeat } from "./playerSeatUtils";

describe("findUserSeat", () => {
    const gameState = {
        players: [
            { address: "b52aaa", seat: 1 },
            { address: "b52BBB", seat: 5 },
            { address: "b52ccc", seat: 9 }
        ]
    };

    it("returns the seat of the matching player (case-insensitive)", () => {
        expect(findUserSeat(gameState, "b52aaa")).toBe(1);
        expect(findUserSeat(gameState, "B52BBB")).toBe(5);
        expect(findUserSeat(gameState, "b52bbb")).toBe(5);
    });

    it("returns undefined when the address is not seated", () => {
        expect(findUserSeat(gameState, "b52ddd")).toBeUndefined();
    });

    it("returns undefined when the address is blank/null/undefined", () => {
        expect(findUserSeat(gameState, "")).toBeUndefined();
        expect(findUserSeat(gameState, null)).toBeUndefined();
        expect(findUserSeat(gameState, undefined)).toBeUndefined();
    });

    it("returns undefined when gameState or players is missing", () => {
        expect(findUserSeat(null, "b52aaa")).toBeUndefined();
        expect(findUserSeat(undefined, "b52aaa")).toBeUndefined();
        expect(findUserSeat({}, "b52aaa")).toBeUndefined();
    });
});

describe("isSeatBigBlind", () => {
    it("returns true when seat matches bigBlindPosition", () => {
        expect(isSeatBigBlind(3, 3)).toBe(true);
        expect(isSeatBigBlind(1, 1)).toBe(true);
        expect(isSeatBigBlind(9, 9)).toBe(true);
    });

    it("returns false when seat does not match bigBlindPosition", () => {
        expect(isSeatBigBlind(3, 4)).toBe(false);
        expect(isSeatBigBlind(5, 1)).toBe(false);
    });

    it("returns false when seat is undefined", () => {
        expect(isSeatBigBlind(undefined, 3)).toBe(false);
    });

    it("returns false when bigBlindPosition is undefined", () => {
        expect(isSeatBigBlind(3, undefined)).toBe(false);
    });

    it("returns false when both are undefined", () => {
        expect(isSeatBigBlind(undefined, undefined)).toBe(false);
    });

    it("treats seat 0 as not-seated (false even if bigBlindPosition is 0)", () => {
        expect(isSeatBigBlind(0, 0)).toBe(false);
        expect(isSeatBigBlind(0, 3)).toBe(false);
    });
});

describe("validSeat", () => {
    it("returns 1-based seats unchanged", () => {
        expect(validSeat(1)).toBe(1);
        expect(validSeat(9)).toBe(9);
    });

    it("treats 0 / missing / non-integers as absent", () => {
        expect(validSeat(0)).toBeUndefined();
        expect(validSeat(null)).toBeUndefined();
        expect(validSeat(undefined)).toBeUndefined();
        expect(validSeat(1.5)).toBeUndefined();
        expect(validSeat(NaN)).toBeUndefined();
    });
});

describe("formatSeatLabel", () => {
    it("renders 1-based seats as Seat N", () => {
        expect(formatSeatLabel(1)).toBe("Seat 1");
        expect(formatSeatLabel(9)).toBe("Seat 9");
    });

    it("never renders Seat 0", () => {
        expect(formatSeatLabel(0)).toBe("Unknown seat");
        expect(formatSeatLabel(null)).toBe("Unknown seat");
        expect(formatSeatLabel(undefined)).toBe("Unknown seat");
    });
});

describe("findSeatFromActions", () => {
    it("returns the most recent valid seat for the address (case-insensitive)", () => {
        const actions = [
            { playerId: "0xAa", seat: 1 },
            { playerId: "0xBb", seat: 2 },
            { playerId: "0xAA", seat: 1 }, // leave / later action still seat 1
        ];
        expect(findSeatFromActions(actions, "0xaa")).toBe(1);
        expect(findSeatFromActions(actions, "0xBB")).toBe(2);
    });

    it("skips seat 0 / missing and keeps scanning older actions", () => {
        const actions = [
            { playerId: "0xa", seat: 3 },
            { playerId: "0xa", seat: 0 },
        ];
        expect(findSeatFromActions(actions, "0xa")).toBe(3);
    });

    it("returns undefined when there is no match or no actions", () => {
        expect(findSeatFromActions([{ playerId: "0xa", seat: 1 }], "0xb")).toBeUndefined();
        expect(findSeatFromActions([], "0xa")).toBeUndefined();
        expect(findSeatFromActions(null, "0xa")).toBeUndefined();
        expect(findSeatFromActions([{ playerId: "0xa", seat: 1 }], "")).toBeUndefined();
    });
});
