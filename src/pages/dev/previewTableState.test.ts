import { PlayerActionType, PlayerStatus, TexasHoldemRound } from "@block52/poker-vm-sdk";
import {
    PREVIEW_HERO_ADDRESS,
    PREVIEW_SEAT_ACTIONS,
    buildPreviewState,
    parsePreviewSearch,
    previewHeroLegalActions,
    previewSearchParams
} from "./previewTableState";

describe("parsePreviewSearch", () => {
    it("defaults to a 9-seat table with the dealer on seat 1 and a full board", () => {
        expect(parsePreviewSearch(new URLSearchParams())).toEqual({
            seats: 9,
            dealer: 1,
            allDealers: false,
            allActions: false,
            heroTurn: false,
            holeCards: true,
            holeCount: 2,
            board: 5,
            winners: [],
            pulse: "breathing"
        });
    });

    it("reads winner=<seat> for a looping win pulse, ignoring seats off the table", () => {
        expect(parsePreviewSearch(new URLSearchParams("winner=3")).winners).toEqual([3]);
        expect(parsePreviewSearch(new URLSearchParams("seats=2&winner=3")).winners).toEqual([]);
        expect(previewSearchParams(parsePreviewSearch(new URLSearchParams("winner=3"))).get("winner")).toBe("3");
        const state = buildPreviewState(parsePreviewSearch(new URLSearchParams("winner=3")), PREVIEW_HERO_ADDRESS);
        expect(state.winners).toHaveLength(1);
        expect(state.winners[0]).toMatchObject({ seat: 3, address: state.players[2].address });
        expect(buildPreviewState(parsePreviewSearch(new URLSearchParams()), PREVIEW_HERO_ADDRESS).winners).toEqual([]);
    });

    it("reads a comma list or all for side-by-side win pulses, and the pulse style", () => {
        expect(parsePreviewSearch(new URLSearchParams("winner=5,2,x,2,12")).winners).toEqual([2, 5]);
        const all = parsePreviewSearch(new URLSearchParams("seats=6&winner=all&pulse=neon"));
        expect(all.winners).toEqual([1, 2, 3, 4, 5, 6]);
        expect(all.pulse).toBe("neon");
        expect(previewSearchParams(all).get("winner")).toBe("all");
        expect(previewSearchParams(all).get("pulse")).toBe("neon");
        expect(parsePreviewSearch(previewSearchParams(all))).toEqual(all);
        expect(buildPreviewState(all, PREVIEW_HERO_ADDRESS).winners.map(w => w.seat)).toEqual([1, 2, 3, 4, 5, 6]);
        expect(parsePreviewSearch(new URLSearchParams("pulse=bogus")).pulse).toBe("breathing");
    });

    it("accepts seats 2, 4, and 6 and a dealer seat", () => {
        expect(parsePreviewSearch(new URLSearchParams("seats=6&dealer=4"))).toMatchObject({
            seats: 6,
            dealer: 4
        });
        expect(parsePreviewSearch(new URLSearchParams("seats=4&dealer=3")).seats).toBe(4);
        expect(parsePreviewSearch(new URLSearchParams("seats=2&dealer=2")).dealer).toBe(2);
    });

    it("ignores a seat count the app does not play", () => {
        expect(parsePreviewSearch(new URLSearchParams("seats=5")).seats).toBe(9);
        expect(parsePreviewSearch(new URLSearchParams("seats=0")).seats).toBe(9);
    });

    it("clamps a dealer seat that is not at the table", () => {
        expect(parsePreviewSearch(new URLSearchParams("seats=2&dealer=9")).dealer).toBe(1);
        expect(parsePreviewSearch(new URLSearchParams("dealer=0")).dealer).toBe(1);
    });

    it("reads dealer=all without changing the snapshot's single dealer seat", () => {
        const options = parsePreviewSearch(new URLSearchParams("seats=6&dealer=all"));
        expect(options.allDealers).toBe(true);
        expect(options.dealer).toBe(1);
        expect(options.seats).toBe(6);
        expect(previewSearchParams(options).get("dealer")).toBe("all");
        const state = buildPreviewState(options, PREVIEW_HERO_ADDRESS);
        expect(state.dealer).toBe(1);
        expect(state.players.filter(player => player.isDealer)).toHaveLength(1);
        expect(parsePreviewSearch(previewSearchParams(options))).toEqual(options);
    });

    it("reads actions=all without changing the snapshot", () => {
        const options = parsePreviewSearch(new URLSearchParams("seats=9&actions=all&dealer=all"));
        expect(options.allActions).toBe(true);
        expect(options.allDealers).toBe(true);
        expect(previewSearchParams(options).get("actions")).toBe("all");
        expect(parsePreviewSearch(previewSearchParams(options))).toEqual(options);
        const state = buildPreviewState(options, PREVIEW_HERO_ADDRESS);
        expect(state.players).toHaveLength(9);
        expect(state.previousActions).toHaveLength(9);
    });

    it("pins a different real badge on every seat, including the long labels", () => {
        expect(PREVIEW_SEAT_ACTIONS).toHaveLength(9);
        expect(PREVIEW_SEAT_ACTIONS.map(label => `${label.action}${label.amount}`)).toEqual([
            "ALL IN $500.00",
            "RAISE TO $1250.00",
            "CALL $0.40",
            "BET $2.00",
            "FOLD",
            "CHECK",
            "POST BB $0.02",
            "SITTING OUT",
            "SHOW"
        ]);
        const texts = PREVIEW_SEAT_ACTIONS.map(label => `${label.action}${label.amount}`);
        const longest = texts.reduce((best, text) => text.length > best.length ? text : best, "");
        expect(longest).toBe("RAISE TO $1250.00");
        expect(PREVIEW_SEAT_ACTIONS.every(label => label.isVisible && !label.isTextHiding && !label.isAnimatingOut)).toBe(true);
        expect(previewSearchParams(parsePreviewSearch(new URLSearchParams("seats=6"))).has("actions")).toBe(false);
    });

    it("reads turn=1 and gives seat 1 fold, check, call, and a sized raise", () => {
        const options = parsePreviewSearch(new URLSearchParams("seats=6&turn=1"));
        expect(options.heroTurn).toBe(true);
        expect(previewSearchParams(options).get("turn")).toBe("1");
        expect(parsePreviewSearch(previewSearchParams(options))).toEqual(options);
        expect(previewSearchParams(parsePreviewSearch(new URLSearchParams("seats=6"))).has("turn")).toBe(false);

        const state = buildPreviewState(options, PREVIEW_HERO_ADDRESS);
        expect(state.nextToAct).toBe(1);
        const hero = state.players[0];
        expect(hero.seat).toBe(1);
        expect(hero.legalActions).toEqual(previewHeroLegalActions(7));
        expect(hero.legalActions.map(action => action.action)).toEqual([
            PlayerActionType.FOLD,
            PlayerActionType.CHECK,
            PlayerActionType.CALL,
            PlayerActionType.RAISE
        ]);
        const raise = hero.legalActions.find(action => action.action === PlayerActionType.RAISE);
        expect(raise?.min).not.toBe(raise?.max);
        expect(state.players.slice(1).every(player => player.legalActions.length === 0)).toBe(true);

        const idle = buildPreviewState(parsePreviewSearch(new URLSearchParams("seats=6")), PREVIEW_HERO_ADDRESS);
        expect(idle.players.every(player => player.legalActions.length === 0)).toBe(true);
        expect(idle.nextToAct).toBe(2);
    });

    it("reads hole cards and community-card count", () => {
        expect(parsePreviewSearch(new URLSearchParams("holes=0&board=0"))).toMatchObject({
            holeCards: false,
            board: 0
        });
        expect(parsePreviewSearch(new URLSearchParams("holes=1&board=3")).board).toBe(3);
        expect(parsePreviewSearch(new URLSearchParams("holes=4")).holeCount).toBe(4);
        const omaha = buildPreviewState(parsePreviewSearch(new URLSearchParams("holes=4")), PREVIEW_HERO_ADDRESS);
        expect(omaha.players[0].holeCards).toEqual(["AS", "KD", "QC", "JH"]);
        expect(omaha.players[1].holeCards).toHaveLength(4);
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
