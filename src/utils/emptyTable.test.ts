import { emptyTableBoard, hiddenPotDisplay, isTableEmpty } from "./emptyTable";
import { formatPotDisplay } from "./potDisplayUtils";
import { TexasHoldemRound } from "@block52/poker-vm-sdk";

// The live "Honey Pot" case: 0 seated, round end, $0.48 pot, 4 board cards, dealer seat 4.
const stalePots = formatPotDisplay(["480000"], "480000", undefined, TexasHoldemRound.END);
const board = { potDisplayValues: stalePots, communityCards: ["QC", "8S", "7C", "9C"], winnerCards: new Set(["QC"]), dealerSeat: 4 };

describe("emptyTable", () => {
    it("is empty only with nobody seated", () => {
        expect(isTableEmpty(0)).toBe(true);
        expect(isTableEmpty(1)).toBe(false);
        expect(isTableEmpty(4)).toBe(false);
    });

    it("hides every pot row", () => {
        const side = formatPotDisplay(["300000", "100000"], "400000", undefined, TexasHoldemRound.TURN);
        const hidden = hiddenPotDisplay(side);
        expect(hidden.showTotalPot).toBe(false);
        expect(hidden.showMainPot).toBe(false);
        expect(hidden.showSidePots).toBe(false);
        expect(hidden.pots).toEqual([]);
    });

    it("clears pot, board, win cards and dealer on an empty table", () => {
        expect(stalePots.showTotalPot).toBe(true);
        const out = emptyTableBoard(board, true);
        expect(out.potDisplayValues.showTotalPot).toBe(false);
        expect(out.communityCards).toEqual([]);
        expect(out.winnerCards.size).toBe(0);
        expect(out.dealerSeat).toBe(-1);
    });

    it("leaves a seated table untouched", () => {
        expect(emptyTableBoard(board, false)).toBe(board);
    });
});