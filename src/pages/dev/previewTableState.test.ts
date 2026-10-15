import { PlayerStatus, TexasHoldemRound } from "@block52/poker-vm-sdk";
import {
    PREVIEW_HERO_ADDRESS,
    buildPreviewState,
    parsePreviewSearch,
    previewSearchParams
} from "./previewTableState";

describe("parsePreviewSearch", () => {
    it("defaults to a 9-seat table with the dealer on seat 1 and a full board", () => {
        expect(parsePreviewSearch(new URLSearchParams())).toEqual({
            seats: 9,
            dealer: 1,
            holeCards: true,
            board: 5
        });
    });

    it("accepts seats 2 and 6 and a dealer seat", () => {
        expect(parsePreviewSearch(new URLSearchParams("seats=6&dealer=4"))).toMatchObject({
            seats: 6,
            dealer: 4
        });
        expect(parsePreviewSearch(new URLSearchParams("seats=2&dealer=2")).dealer).toBe(2);
    });

    it("ignores a seat count that is not 2, 6, or 9", () => {
        expect(parsePreviewSearch(new URLSearchParams("seats=4")).seats).toBe(9);
        expect(parsePreviewSearch(new URLSearchParams("seats=0")).seats).toBe(9);
    });

    it("clamps a dealer seat that is not at the table", () => {
        expect(parsePreviewSearch(new URLSearchParams("seats=2&dealer=9")).dealer).toBe(1);
        expect(parsePreviewSearch(new URLSearchParams("dealer=0")).dealer).toBe(1);
    });

    it("reads hole cards and community-card count", () => {
        expect(parsePreviewSearch(new URLSearchParams("holes=0&board=0"))).toMatchObject({
            holeCards: false,
            board: 0
        });
        expect(parsePreviewSearch(new URLSearchParams("holes=1&board=3")).board).toBe(3);
        expect(parsePreviewSearch(new URLSearchParams("board=4")).board).toBe(4);
        expect(parsePreviewSearch(new URLSearchParams("board=2")).board).toBe(5);
    });
});

describe("buildPreviewState", () => {
    const hero = PREVIEW_HERO_ADDRESS;

    it("fills every seat and gives every player a different bet", () => {
        const state = buildPreviewState(parsePreviewSearch(new URLSearchParams("seats=9&dealer=7")), hero);
        expect(state.gameOptions.maxPlayers).toBe(9);
        expect(state.players).toHaveLength(9);
        expect(state.availableSeats).toEqual([]);
        expect(state.dealer).toBe(7);
        expect(state.players.every(player => player.status === PlayerStatus.ACTIVE)).toBe(true);
        expect(state.previousActions.map(action => action.amount)).toEqual(
            ["20000", "40000", "60000", "80000", "100000", "120000", "140000", "160000", "180000"]
        );
        expect(state.players.map(player => player.sumOfBets)).toEqual(
            state.previousActions.map(action => action.amount)
        );
        expect(state.players.filter(player => player.isDealer).map(player => player.seat)).toEqual([7]);
        expect(state.totalPot).toBe("900000");
    });

    it("puts the round and the board in step, and can hide hole cards", () => {
        const full = buildPreviewState(parsePreviewSearch(new URLSearchParams()), hero);
        expect(full.round).toBe(TexasHoldemRound.RIVER);
        expect(full.communityCards).toEqual(["AH", "KD", "QC", "JH", "TS"]);
        expect(full.players[0].holeCards).toEqual(["AS", "KD"]);
        expect(full.players[1].holeCards).toEqual(["??", "??"]);
        expect(full.players[0].address).toBe(hero);

        const bare = buildPreviewState(parsePreviewSearch(new URLSearchParams("board=0&holes=0")), hero);
        expect(bare.round).toBe(TexasHoldemRound.PREFLOP);
        expect(bare.communityCards).toEqual([]);
        expect(bare.players.every(player => player.holeCards === undefined)).toBe(true);
        expect(bare.previousActions.every(action => action.round === TexasHoldemRound.PREFLOP)).toBe(true);
    });

    it("round-trips through the query string", () => {
        const options = parsePreviewSearch(new URLSearchParams("seats=2&dealer=2&holes=0&board=3"));
        expect(parsePreviewSearch(previewSearchParams(options))).toEqual(options);
    });
});
