import {
    NonPlayerActionType,
    PlayerActionType,
    PlayerStatus,
    TexasHoldemRound,
    type ActionDTO,
    type LegalActionDTO,
    type PlayerDTO,
    type TexasHoldemStateDTO
} from "@block52/poker-vm-sdk";
import type { PinnedSeatAction } from "../../context/PreviewSeatActionsContext";
import { getActionBadgeDisplay } from "../../hooks/player/usePlayerActionDropBox";

/** Seat 1 when the browser has no wallet yet. Matches the local stub hero. */
export const PREVIEW_HERO_ADDRESS = "b521avgyh77ycn997ja45q5q8ss8y9mr424jsnxx93";

export const PREVIEW_SEAT_COUNTS = [2, 4, 6, 9] as const;
export type PreviewSeatCount = (typeof PREVIEW_SEAT_COUNTS)[number];

export const PREVIEW_BOARD_COUNTS = [0, 3, 4, 5] as const;
export type PreviewBoardCount = (typeof PREVIEW_BOARD_COUNTS)[number];

const COMMUNITY = ["AH", "KD", "QC", "JH", "TS"];

export interface PreviewOptions {
    seats: PreviewSeatCount;
    /** Single dealer seat, 1-based. Ignored visually while allDealers is set. */
    dealer: number;
    /** Draw the badge-anchored dealer button on every occupied seat at once. */
    allDealers: boolean;
    /** Pin the real action badge on every seat at once. */
    allActions: boolean;
    /** Seat 1's turn: the real fold / check / call / raise controls. */
    heroTurn: boolean;
    holeCards: boolean;
    /** 2 for Hold'em, 4 for Omaha. Ignored while hole cards are off. */
    holeCount: 2 | 4;
    board: PreviewBoardCount;
    /** Seat that won the last hand (1-based), so the win pulse plays continuously. 0 = none. */
    winner: number;
}

const isSeatCount = (value: number): value is PreviewSeatCount =>
    (PREVIEW_SEAT_COUNTS as readonly number[]).includes(value);

const isBoardCount = (value: number): value is PreviewBoardCount =>
    value === 0 || value === 3 || value === 4 || value === 5;

/**
 * Read the preview from the query string.
 * seats=2|4|6|9 (default 9), dealer=<seat>|all (default seat 1, clamped to the table),
 * holes=0|1|4 (default two cards; 4 draws Omaha), board=0|3|4|5 (default a full board),
 * actions=all to pin an action badge on every seat,
 * turn=1 to make seat 1's turn and show the real action controls.
 * winner=<seat> marks that seat as the winner so its win pulse loops (dev preview only).
 * dealer=all and actions=all are preview-only: the snapshot still has one
 * dealer and one newest action. turn=1 writes seat 1's legal actions.
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
    const holeCount: 2 | 4 = holes === "4" ? 4 : 2;
    const holeCards = holes !== "0" && holes !== "false";
    const boardParam = params.get("board");
    const requestedBoard = boardParam === null ? Number.NaN : Number(boardParam);
    const board: PreviewBoardCount = isBoardCount(requestedBoard) ? requestedBoard : 5;
    const allActions = params.get("actions") === "all";
    const heroTurn = params.get("turn") === "1";
    const requestedWinner = Number(params.get("winner"));
    const winner = Number.isInteger(requestedWinner) && requestedWinner >= 1 && requestedWinner <= seats ? requestedWinner : 0;
    return { seats, dealer, allDealers, allActions, heroTurn, holeCards, holeCount, board, winner };
};

export const previewSearchParams = (options: PreviewOptions): URLSearchParams => {
    const params = new URLSearchParams();
    params.set("seats", String(options.seats));
    params.set("dealer", options.allDealers ? "all" : String(options.dealer));
    params.set("holes", !options.holeCards ? "0" : options.holeCount === 4 ? "4" : "1");
    params.set("board", String(options.board));
    if (options.allActions) params.set("actions", "all");
    if (options.heroTurn) params.set("turn", "1");
    if (options.winner) params.set("winner", String(options.winner));
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

const pinnedAction = (
    seat: number,
    action: ActionDTO["action"],
    amount: string,
    round: TexasHoldemRound = TexasHoldemRound.FLOP
): PinnedSeatAction => {
    const dto: ActionDTO = {
        playerId: previewSeatAddress(seat, PREVIEW_HERO_ADDRESS),
        seat,
        action,
        amount,
        round,
        index: 1,
        timestamp: 0
    };
    const label = getActionBadgeDisplay(dto, [dto], false);
    return {
        action: label.action,
        amount: label.amount,
        isVisible: true,
        isTextHiding: false,
        isAnimatingOut: false
    };
};

/**
 * One real badge label per seat, in seat order. Includes the long labels
 * (ALL IN with an amount, and RAISE TO with the widest amount) so a layout
 * check sees the biggest box the component paints.
 */
export const PREVIEW_SEAT_ACTIONS: readonly PinnedSeatAction[] = [
    pinnedAction(1, PlayerActionType.ALL_IN, "500000000"),
    pinnedAction(2, PlayerActionType.RAISE, "1250000000"),
    pinnedAction(3, PlayerActionType.CALL, "400000"),
    pinnedAction(4, PlayerActionType.BET, "2000000"),
    pinnedAction(5, PlayerActionType.FOLD, "0"),
    pinnedAction(6, PlayerActionType.CHECK, "0"),
    pinnedAction(7, PlayerActionType.BIG_BLIND, "20000", TexasHoldemRound.ANTE),
    pinnedAction(8, NonPlayerActionType.SIT_OUT, "0"),
    pinnedAction(9, PlayerActionType.SHOW, "0")
];

/** Facing a $20 bet, min raise $40, stack $500. Min differs from max so the slider and pot presets render. */
const HERO_CALL_MICRO = "20000000";
const HERO_RAISE_MIN_MICRO = "40000000";
const HERO_STACK_MICRO = "500000000";

/**
 * Fold, check, call, and raise on one index, after the posted bets.
 * A live hand would not offer check and call together; the preview does,
 * so every control the panel can paint is on screen at once.
 */
export const previewHeroLegalActions = (index: number): LegalActionDTO[] => [
    { action: PlayerActionType.FOLD, min: undefined, max: undefined, index },
    { action: PlayerActionType.CHECK, min: undefined, max: undefined, index },
    { action: PlayerActionType.CALL, min: HERO_CALL_MICRO, max: HERO_CALL_MICRO, index },
    { action: PlayerActionType.RAISE, min: HERO_RAISE_MIN_MICRO, max: HERO_STACK_MICRO, index }
];

/**
 * Cash-table snapshot: every seat filled, every player with a bet of a
 * different size ($0.02 × seat), dealer on `options.dealer`.
 * With heroTurn, seat 1 is next and holds the action controls' legal actions.
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
            stack: HERO_STACK_MICRO,
            isSmallBlind: seat === 1,
            isBigBlind: seat === Math.min(2, options.seats),
            isDealer: seat === options.dealer,
            holeCards: options.holeCards
                ? (seat === 1
                    ? (options.holeCount === 4 ? ["AS", "KD", "QC", "JH"] : ["AS", "KD"])
                    : (options.holeCount === 4 ? ["??", "??", "??", "??"] : ["??", "??"]))
                : undefined,
            status: PlayerStatus.ACTIVE,
            lastAction: action,
            legalActions: options.heroTurn && seat === 1 ? previewHeroLegalActions(options.seats + 1) : [],
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
        nextToAct: options.heroTurn ? 1 : Math.min(2, options.seats),
        previousActions,
        actionCount: options.seats,
        handNumber: 1,
        round,
        winners: options.winner >= 1 && options.winner <= options.seats
            ? [{ address: previewSeatAddress(options.winner, heroAddress), seat: options.winner, amount: pot.toString(), cards: undefined, name: undefined, description: undefined }]
            : [],
        results: [],
        legalActions: [],
        availableSeats: [],
        signature: ""
    };
};
