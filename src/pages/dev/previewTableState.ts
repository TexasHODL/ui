import {
    PlayerActionType,
    PlayerStatus,
    TexasHoldemRound,
    type ActionDTO,
    type PlayerDTO,
    type TexasHoldemStateDTO
} from "@block52/poker-vm-sdk";

/** Seat 1 when the browser has no wallet yet. Matches the local stub hero. */
export const PREVIEW_HERO_ADDRESS = "b521avgyh77ycn997ja45q5q8ss8y9mr424jsnxx93";

export const PREVIEW_SEAT_COUNTS = [2, 6, 9] as const;
export type PreviewSeatCount = (typeof PREVIEW_SEAT_COUNTS)[number];

export const PREVIEW_BOARD_COUNTS = [0, 3, 4, 5] as const;
export type PreviewBoardCount = (typeof PREVIEW_BOARD_COUNTS)[number];

const COMMUNITY = ["AH", "KD", "QC", "JH", "TS"];

export interface PreviewOptions {
    seats: PreviewSeatCount;
    /** Single dealer seat, 1-based. Ignored visually while allDealers is set. */
    dealer: number;
    /** Draw the real dealer-button position at every seat at once. */
    allDealers: boolean;
    holeCards: boolean;
    board: PreviewBoardCount;
}

const isSeatCount = (value: number): value is PreviewSeatCount =>
    value === 2 || value === 6 || value === 9;

const isBoardCount = (value: number): value is PreviewBoardCount =>
    value === 0 || value === 3 || value === 4 || value === 5;

/**
 * Read the preview from the query string.
 * seats=2|6|9 (default 9), dealer=<seat>|all (default seat 1, clamped to the table),
 * holes=0|1 (default on), board=0|3|4|5 (default a full board).
 * dealer=all is preview-only: the table still has one dealer seat in the snapshot.
 */
export const parsePreviewSearch = (params: URLSearchParams): PreviewOptions => {
    const requestedSeats = Number(params.get("seats"));
    const seats: PreviewSeatCount = isSeatCount(requestedSeats) ? requestedSeats : 9;
    const dealerParam = params.get("dealer");
    const allDealers = dealerParam === "all";
    const requestedDealer = Number(dealerParam);
    const dealer = Number.isInteger(requestedDealer) && requestedDealer >= 1 && requestedDealer <= seats
        ? requestedDealer
        : 1;
    const holes = params.get("holes");
    const holeCards = holes !== "0" && holes !== "false";
    const boardParam = params.get("board");
    const requestedBoard = boardParam === null ? Number.NaN : Number(boardParam);
    const board: PreviewBoardCount = isBoardCount(requestedBoard) ? requestedBoard : 5;
    return { seats, dealer, allDealers, holeCards, board };
};

export const previewSearchParams = (options: PreviewOptions): URLSearchParams => {
    const params = new URLSearchParams();
    params.set("seats", String(options.seats));
    params.set("dealer", options.allDealers ? "all" : String(options.dealer));
    params.set("holes", options.holeCards ? "1" : "0");
    params.set("board", String(options.board));
    return params;
};

const roundForBoard = (board: PreviewBoardCount): TexasHoldemRound => {
    if (board === 0) return TexasHoldemRound.PREFLOP;
    if (board === 3) return TexasHoldemRound.FLOP;
    if (board === 4) return TexasHoldemRound.TURN;
    return TexasHoldemRound.RIVER;
};

/** Distinct address per seat so chip ownership and the hero's face cards resolve. */
export const previewSeatAddress = (seat: number, heroAddress: string): string => {
    if (seat === 1) return heroAddress;
    return `b521preview${String(seat).padStart(2, "0")}seat0000000000000000`.slice(0, 44);
};

/**
 * Cash-table snapshot: every seat filled, every player with a bet of a
 * different size ($0.02 × seat), dealer on `options.dealer`.
 */
export const buildPreviewState = (options: PreviewOptions, heroAddress: string): TexasHoldemStateDTO => {
    const round = roundForBoard(options.board);
    const players: PlayerDTO[] = [];
    const previousActions: ActionDTO[] = [];
    let pot = 0n;

    for (let seat = 1; seat <= options.seats; seat++) {
        const address = previewSeatAddress(seat, heroAddress);
        const amount = String(20000 * seat);
        pot += BigInt(amount);
        const action: ActionDTO = {
            playerId: address,
            seat,
            action: PlayerActionType.BET,
            amount,
            round,
            index: seat,
            timestamp: Date.now()
        };
        previousActions.push(action);
        players.push({
            address,
            seat,
            stack: "500000000",
            isSmallBlind: seat === 1,
            isBigBlind: seat === Math.min(2, options.seats),
            isDealer: seat === options.dealer,
            holeCards: options.holeCards ? (seat === 1 ? ["AS", "KD"] : ["??", "??"]) : undefined,
            status: PlayerStatus.ACTIVE,
            lastAction: action,
            legalActions: [],
            sumOfBets: amount,
            timeout: 30,
            signature: ""
        });
    }

    return {
        gameOptions: {
            minBuyIn: "100000000",
            maxBuyIn: "1000000000",
            minPlayers: 2,
            maxPlayers: options.seats,
            smallBlind: "10000000",
            bigBlind: "20000000",
            timeout: 30
        },
        smallBlindPosition: 1,
        bigBlindPosition: Math.min(2, options.seats),
        dealer: options.dealer,
        players,
        communityCards: COMMUNITY.slice(0, options.board),
        deck: "",
        pots: [pot.toString()],
        totalPot: pot.toString(),
        nextToAct: 1,
        previousActions,
        actionCount: options.seats,
        handNumber: 1,
        round,
        winners: [],
        results: [],
        legalActions: [],
        availableSeats: [],
        signature: ""
    };
};
