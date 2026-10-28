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

export const PREVIEW_FORMATS = ["cash", "tournament", "sng"] as const;
export type PreviewFormat = (typeof PREVIEW_FORMATS)[number];

/**
 * Which hero (bottom) controls the preview shows:
 * none, actions (fold/check/call/raise + sizing, seat 1's turn),
 * preaction (Fold / Call / Call Any while another seat acts),
 * muck (Show / Muck at showdown, seat 1's turn).
 */
export const PREVIEW_BUTTON_STATES = ["none", "actions", "preaction", "muck"] as const;
export type PreviewButtonState = (typeof PREVIEW_BUTTON_STATES)[number];

const COMMUNITY = ["AH", "KD", "QC", "JH", "TS"];

export interface PreviewOptions {
    seats: PreviewSeatCount;
    /** Single dealer seat, 1-based. Ignored visually while allDealers is set. */
    dealer: number;
    /** Draw the badge-anchored dealer button on every occupied seat at once. */
    allDealers: boolean;
    /** Pin the real action badge on every seat at once. */
    allActions: boolean;
    /** Hero controls on screen. "actions" and "muck" make it seat 1's turn. */
    buttons: PreviewButtonState;
    holeCards: boolean;
    /** 2 for Hold'em, 4 for Omaha. Ignored while hole cards are off. */
    holeCount: 2 | 4;
    board: PreviewBoardCount;
    /** Table format: cash (USDC micro-units) or tournament / Sit & Go (raw chips). */
    format: PreviewFormat;
    /** Seat 1 wins the pot: plays the win celebration (floating win chips). */
    win: boolean;
    /** bet=none: no bets out this round, so the hero can check (free-check pre-actions). */
    noBets?: boolean;
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
 * format=cash|tournament|sng (default cash) picks the table format and chip amounts,
 * buttons=none|actions|preaction|muck picks the hero controls (turn=1 is an alias for actions),
 * bet=none for a round with no bets out (seat 1 can check: Check/Fold, Check, Call Any pre-actions),
 * win=1 to make seat 1 the winner so the win celebration plays.
 * dealer=all and actions=all are preview-only: the snapshot still has one
 * dealer and one newest action. buttons=actions|muck writes seat 1's legal actions.
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
    const buttonsParam = params.get("buttons");
    const buttons: PreviewButtonState = (PREVIEW_BUTTON_STATES as readonly string[]).includes(buttonsParam ?? "")
        ? (buttonsParam as PreviewButtonState)
        : params.get("turn") === "1" ? "actions" : "none";
    const formatParam = params.get("format");
    const format: PreviewFormat = formatParam === "tournament" || formatParam === "sng" ? formatParam : "cash";
    const win = params.get("win") === "1";
    const noBets = params.get("bet") === "none";
    return { seats, dealer, allDealers, allActions, buttons, holeCards, holeCount, board, format, win, ...(noBets ? { noBets } : {}) };
};

export const previewSearchParams = (options: PreviewOptions): URLSearchParams => {
    const params = new URLSearchParams();
    params.set("seats", String(options.seats));
    params.set("dealer", options.allDealers ? "all" : String(options.dealer));
    params.set("holes", !options.holeCards ? "0" : options.holeCount === 4 ? "4" : "1");
    params.set("board", String(options.board));
    if (options.allActions) params.set("actions", "all");
    if (options.buttons !== "none") params.set("buttons", options.buttons);
    if (options.format !== "cash") params.set("format", options.format);
    if (options.win) params.set("win", "1");
    if (options.noBets) params.set("bet", "none");
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
 * The hero's legal actions, like a live hand: facing a bet it is fold, call, raise;
 * with no bets out (bet=none) it is fold, check, bet.
 */
export const previewHeroLegalActions = (index: number, noBets = false): LegalActionDTO[] =>
    noBets
        ? [
              { action: PlayerActionType.FOLD, min: undefined, max: undefined, index },
              { action: PlayerActionType.CHECK, min: undefined, max: undefined, index },
              { action: PlayerActionType.BET, min: HERO_RAISE_MIN_MICRO, max: HERO_STACK_MICRO, index }
          ]
        : [
              { action: PlayerActionType.FOLD, min: undefined, max: undefined, index },
              { action: PlayerActionType.CALL, min: HERO_CALL_MICRO, max: HERO_CALL_MICRO, index },
              { action: PlayerActionType.RAISE, min: HERO_RAISE_MIN_MICRO, max: HERO_STACK_MICRO, index }
          ];

/** Show and Muck: the losing-hand player's choices at showdown. */
export const previewHeroShowdownActions = (index: number): LegalActionDTO[] => [
    { action: PlayerActionType.SHOW, min: undefined, max: undefined, index },
    { action: PlayerActionType.MUCK, min: undefined, max: undefined, index }
];

/** Seat 1 acts (and the socket must read live) for the action and showdown bars. */
export const previewIsHeroTurn = (options: Pick<PreviewOptions, "buttons">): boolean =>
    options.buttons === "actions" || options.buttons === "muck";

/**
 * Cash-table snapshot: every seat filled, every player with a bet of a
 * different size ($0.02 × seat), dealer on `options.dealer`.
 * With buttons=actions|muck, seat 1 is next and holds the matching legal actions.
 * buttons=muck moves the hand to SHOWDOWN so the Show / Muck bar applies.
 */
export const buildPreviewState = (options: PreviewOptions, heroAddress: string): TexasHoldemStateDTO => {
    const round = options.buttons === "muck" ? TexasHoldemRound.SHOWDOWN : roundForBoard(options.board);
    const heroTurn = previewIsHeroTurn(options);
    const players: PlayerDTO[] = [];
    const previousActions: ActionDTO[] = [];
    let pot = 0n;

    for (let seat = 1; seat <= options.seats; seat++) {
        const address = previewSeatAddress(seat, heroAddress);
        // Tournament / Sit & Go amounts are raw chips (650 per seat, level-7 blinds); cash is USDC micro-units.
        const amount = options.noBets ? "0" : String(options.format === "cash" ? 20000 * seat : 650 * seat);
        pot += BigInt(amount);
        const action: ActionDTO = {
            playerId: address,
            seat,
            action: options.noBets ? PlayerActionType.CHECK : PlayerActionType.BET,
            amount,
            round,
            index: seat,
            timestamp: Date.now()
        };
        // No bets out: seat 1 has not acted yet, so checking stays free for the hero.
        if (!(options.noBets && seat === 1)) previousActions.push(action);
        players.push({
            address,
            seat,
            stack: options.format === "cash" ? HERO_STACK_MICRO : "40000",
            isSmallBlind: seat === 1,
            isBigBlind: seat === Math.min(2, options.seats),
            isDealer: seat === options.dealer,
            holeCards: options.holeCards
                ? (seat === 1
                    ? (options.holeCount === 4 ? ["AS", "KD", "QC", "JH"] : ["AS", "KD"])
                    : (options.holeCount === 4 ? ["??", "??", "??", "??"] : ["??", "??"]))
                : undefined,
            status: PlayerStatus.ACTIVE,
            lastAction: options.noBets && seat === 1 ? undefined : action,
            legalActions: heroTurn && seat === 1
                ? (options.buttons === "muck" ? previewHeroShowdownActions(options.seats + 1) : previewHeroLegalActions(options.seats + 1, !!options.noBets))
                : [],
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
            smallBlind: options.format === "cash" ? "10000000" : "650",
            bigBlind: options.format === "cash" ? "20000000" : "1300",
            timeout: 30,
            // Level 7 of a tournament / Sit & Go: the blind clock needs the next level.
            ...(options.format === "cash" ? {} : { blindLevel: 7, nextSmallBlind: "800", nextBigBlind: "1600", blindLevelDuration: 10, levelStartTime: Date.now() })
        },
        smallBlindPosition: 1,
        bigBlindPosition: Math.min(2, options.seats),
        dealer: options.dealer,
        players,
        communityCards: COMMUNITY.slice(0, options.board),
        deck: "",
        pots: [pot.toString()],
        totalPot: pot.toString(),
        nextToAct: heroTurn ? 1 : Math.min(2, options.seats),
        previousActions,
        actionCount: options.seats,
        handNumber: 1,
        round,
        winners: options.win
            ? [{ address: previewSeatAddress(1, heroAddress), seat: 1, amount: pot.toString(), cards: undefined, name: undefined, description: undefined }]
            : [],
        results: [],
        legalActions: [],
        availableSeats: [],
        signature: ""
    };
};
