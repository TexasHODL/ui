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

/** Dev-only dialog fixtures. entry = take-your-seat, waiting = filling up. */
export const PREVIEW_DIALOGS = ["entry", "waiting"] as const;
export type PreviewDialog = (typeof PREVIEW_DIALOGS)[number];

/**
 * Which hero (bottom) controls the preview shows:
 * none, actions (fold/check/call/raise + sizing, seat 1's turn),
 * preaction (Fold / Call / Call Any while another seat acts),
 * muck (Show / Muck at showdown, seat 1's turn).
 */
export const PREVIEW_BUTTON_STATES = ["none", "actions", "preaction", "muck"] as const;
export type PreviewButtonState = (typeof PREVIEW_BUTTON_STATES)[number];

/** Dev-only all-in runout beats, for the win% chip (ui#210). */
export const PREVIEW_RUNOUTS = ["reveal", "flop", "turn", "river"] as const;
export type PreviewRunout = (typeof PREVIEW_RUNOUTS)[number];

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
    /** win=<seat>: which seat wins (default 1). Lets a top seat play the celebration. */
    winSeat?: number;
    /** win=all: every seat wins at once (split pot), each with its hand tabled. */
    winAll?: boolean;
    /** bet=none: no bets out this round, so the hero can check (free-check pre-actions). */
    noBets?: boolean;
    /**
     * prizes=bubble: fixture only. A 4-player $0.01 tournament after a 10% protocol
     * fee, chain payouts 25200 and 10800 micro-USDC. Not a live table.
     */
    bubblePrizes?: boolean;
    /**
     * open=<n>: leave the last n seats empty. Preview only, so a cash table
     * can be shot with seats still available to join.
     */
    openSeats?: number;
    /**
     * modal=entry leaves seat 1 empty so the take-your-seat dialog opens.
     * modal=waiting seats the hero at a tournament that has not started.
     */
    dialog?: PreviewDialog;
    /**
     * All-in runout beat. Betting is closed, the last caller is still ACTIVE,
     * and the other live seats are all-in with cards face up. `river` is the
     * decided board (winner 100%).
     */
    runout?: PreviewRunout;
    /** nft=0 hides fixture NFT avatar chips on the seat pills. On by default. */
    nft: boolean;
    /** timebank=0 hides the hero time-bank clock fixture. On by default. */
    timeBank: boolean;
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
 * win=1 to make seat 1 the winner so the win celebration plays (win=<seat> picks another winner, win=all makes every seat win).
 * prizes=bubble installs the Bitcoin Bubble prize fixture (25200 / 10800 micro-USDC).
 * modal=entry|waiting shows the tournament take-your-seat or waiting dialog.
 * runout=reveal|flop|turn|river paints a tournament all-in runout (ui#210).
 * nft=0|1 (default on) puts fixture NFT avatar chips on every occupied seat.
 * timebank=0|1 (default on) gives the table a 45s time bank; the clock badge
 * is on the hero pill only, as on a live table, and is ready when buttons=actions.
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
    const requestedFormat: PreviewFormat = formatParam === "tournament" || formatParam === "sng" ? formatParam : "cash";
    const dialogParam = params.get("modal");
    const dialog: PreviewDialog | undefined = (PREVIEW_DIALOGS as readonly string[]).includes(dialogParam ?? "")
        ? (dialogParam as PreviewDialog)
        : undefined;
    const runoutParam = params.get("runout");
    const runout: PreviewRunout | undefined = (PREVIEW_RUNOUTS as readonly string[]).includes(runoutParam ?? "")
        ? (runoutParam as PreviewRunout)
        : undefined;
    const format: PreviewFormat = (dialog || runout) && requestedFormat === "cash" ? "tournament" : requestedFormat;
    const winAll = params.get("win") === "all";
    const winParam = Number(params.get("win"));
    const win = winAll || (Number.isInteger(winParam) && winParam >= 1 && winParam <= seats);
    const winSeat = win && !winAll && winParam !== 1 ? winParam : undefined;
    const noBets = params.get("bet") === "none";
    const bubblePrizes = params.get("prizes") === "bubble";
    const openParam = Number(params.get("open"));
    const openSeats = Number.isInteger(openParam) && openParam >= 1 && openParam < seats ? openParam : undefined;
    const nft = params.get("nft") !== "0" && params.get("nft") !== "false";
    const timeBank = params.get("timebank") !== "0" && params.get("timebank") !== "false";
    return { seats, dealer, allDealers, allActions, buttons, holeCards, holeCount, board, format, win, nft, timeBank, ...(winSeat ? { winSeat } : {}), ...(winAll ? { winAll } : {}), ...(noBets ? { noBets } : {}), ...(bubblePrizes ? { bubblePrizes } : {}), ...(openSeats ? { openSeats } : {}), ...(dialog ? { dialog } : {}), ...(runout ? { runout } : {}) };
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
    if (options.win) params.set("win", options.winAll ? "all" : String(options.winSeat ?? 1));
    if (options.noBets) params.set("bet", "none");
    if (options.bubblePrizes) params.set("prizes", "bubble");
    if (options.openSeats) params.set("open", String(options.openSeats));
    if (options.dialog) params.set("modal", options.dialog);
    if (options.runout) params.set("runout", options.runout);
    if (!options.nft) params.set("nft", "0");
    if (!options.timeBank) params.set("timebank", "0");
    return params;
};

const roundForBoard = (board: PreviewBoardCount): TexasHoldemRound => {
    if (board === 0) return TexasHoldemRound.PREFLOP;
    if (board === 3) return TexasHoldemRound.FLOP;
    if (board === 4) return TexasHoldemRound.TURN;
    return TexasHoldemRound.RIVER;
};


/** Fixture time-bank grant, in milliseconds (shown as 45s when the clock is ready). */
export const PREVIEW_TIME_BANK_MS = 45_000;

export const previewTimeBankAction = (index: number): LegalActionDTO => ({
    action: NonPlayerActionType.TIME_BANK,
    min: undefined,
    max: undefined,
    index
});

/**
 * Distinct circular PFP art per seat, as data: URLs. The live avatar allow-list
 * rejects relative paths, so these stay self-contained in the preview fixture.
 */
const PREVIEW_NFT_ART: readonly { bg: string; draw: string }[] = [
    { bg: "#e23d6d", draw: "<circle cx=\"32\" cy=\"26\" r=\"12\" fill=\"#f4c7a8\"/><path d=\"M16 28c4-16 28-16 32 0\" fill=\"#2a1a14\"/><circle cx=\"27\" cy=\"26\" r=\"2\" fill=\"#2a1a14\"/><circle cx=\"37\" cy=\"26\" r=\"2\" fill=\"#2a1a14\"/><path d=\"M28 32c3 3 5 3 8 0\" fill=\"none\" stroke=\"#b56a5a\" stroke-width=\"1.6\" stroke-linecap=\"round\"/><rect x=\"18\" y=\"40\" width=\"28\" height=\"24\" rx=\"8\" fill=\"#5b2c8a\"/>" },
    { bg: "#c48a3a", draw: "<ellipse cx=\"18\" cy=\"22\" rx=\"11\" ry=\"15\" fill=\"#6b3e1f\"/><ellipse cx=\"46\" cy=\"22\" rx=\"11\" ry=\"15\" fill=\"#6b3e1f\"/><circle cx=\"32\" cy=\"36\" r=\"20\" fill=\"#e8c89a\"/><ellipse cx=\"32\" cy=\"42\" rx=\"10\" ry=\"8\" fill=\"#3a2414\"/><circle cx=\"24\" cy=\"32\" r=\"3\" fill=\"#1a120c\"/><circle cx=\"40\" cy=\"32\" r=\"3\" fill=\"#1a120c\"/><circle cx=\"32\" cy=\"39\" r=\"2.2\" fill=\"#111\"/>" },
    { bg: "#1f6feb", draw: "<circle cx=\"32\" cy=\"28\" r=\"13\" fill=\"#e8b894\"/><path d=\"M18 26c3-14 23-14 28 0\" fill=\"#111\"/><rect x=\"20\" y=\"24\" width=\"24\" height=\"8\" rx=\"4\" fill=\"#111\"/><rect x=\"22\" y=\"26\" width=\"8\" height=\"4\" rx=\"2\" fill=\"#7ec8ff\"/><rect x=\"34\" y=\"26\" width=\"8\" height=\"4\" rx=\"2\" fill=\"#7ec8ff\"/><path d=\"M28 34c3 2 5 2 8 0\" fill=\"none\" stroke=\"#8a4a3a\" stroke-width=\"1.6\" stroke-linecap=\"round\"/><rect x=\"16\" y=\"42\" width=\"32\" height=\"22\" rx=\"6\" fill=\"#0b3a82\"/>" },
    { bg: "#1aa05a", draw: "<circle cx=\"32\" cy=\"30\" r=\"16\" fill=\"#b6f27a\"/><ellipse cx=\"22\" cy=\"14\" rx=\"5\" ry=\"10\" fill=\"#8ed14a\"/><ellipse cx=\"42\" cy=\"14\" rx=\"5\" ry=\"10\" fill=\"#8ed14a\"/><ellipse cx=\"26\" cy=\"28\" rx=\"3\" ry=\"5\" fill=\"#143318\"/><ellipse cx=\"38\" cy=\"28\" rx=\"3\" ry=\"5\" fill=\"#143318\"/><ellipse cx=\"32\" cy=\"38\" rx=\"5\" ry=\"3\" fill=\"#143318\"/>" },
    { bg: "#f0c14a", draw: "<circle cx=\"32\" cy=\"30\" r=\"13\" fill=\"#f3d2b0\"/><path d=\"M14 26 L32 8 L50 26\" fill=\"#f5c542\" stroke=\"#c49212\" stroke-width=\"2\" stroke-linejoin=\"round\"/><circle cx=\"27\" cy=\"30\" r=\"2\" fill=\"#2a1a14\"/><circle cx=\"37\" cy=\"30\" r=\"2\" fill=\"#2a1a14\"/><path d=\"M27 36c3 3 7 3 10 0\" fill=\"none\" stroke=\"#b56a5a\" stroke-width=\"1.6\" stroke-linecap=\"round\"/><rect x=\"18\" y=\"44\" width=\"28\" height=\"20\" rx=\"6\" fill=\"#7a2f1a\"/>" },
    { bg: "#6b2ad1", draw: "<circle cx=\"32\" cy=\"28\" r=\"12\" fill=\"#f0c3b0\"/><path d=\"M16 30c2-20 30-20 32 0-8-8-24-8-32 0z\" fill=\"#c44ad1\"/><circle cx=\"27\" cy=\"28\" r=\"2\" fill=\"#2a1a14\"/><circle cx=\"37\" cy=\"28\" r=\"2\" fill=\"#2a1a14\"/><path d=\"M28 34c3 3 5 3 8 0\" fill=\"none\" stroke=\"#b56a5a\" stroke-width=\"1.6\" stroke-linecap=\"round\"/><rect x=\"18\" y=\"42\" width=\"28\" height=\"22\" rx=\"8\" fill=\"#24104a\"/>" },
    { bg: "#4a5568", draw: "<rect x=\"16\" y=\"14\" width=\"32\" height=\"28\" rx=\"6\" fill=\"#cbd5e1\"/><rect x=\"20\" y=\"20\" width=\"10\" height=\"8\" rx=\"2\" fill=\"#38bdf8\"/><rect x=\"34\" y=\"20\" width=\"10\" height=\"8\" rx=\"2\" fill=\"#38bdf8\"/><rect x=\"26\" y=\"32\" width=\"12\" height=\"4\" rx=\"1\" fill=\"#64748b\"/><rect x=\"22\" y=\"42\" width=\"20\" height=\"18\" rx=\"3\" fill=\"#94a3b8\"/><circle cx=\"32\" cy=\"10\" r=\"4\" fill=\"#f59e0b\"/>" },
    { bg: "#fb923c", draw: "<ellipse cx=\"18\" cy=\"18\" rx=\"8\" ry=\"12\" fill=\"#fb7185\"/><ellipse cx=\"46\" cy=\"18\" rx=\"8\" ry=\"12\" fill=\"#fb7185\"/><circle cx=\"32\" cy=\"34\" r=\"18\" fill=\"#fda4af\"/><circle cx=\"24\" cy=\"32\" r=\"3\" fill=\"#1a120c\"/><circle cx=\"40\" cy=\"32\" r=\"3\" fill=\"#1a120c\"/><ellipse cx=\"32\" cy=\"40\" rx=\"4\" ry=\"2.5\" fill=\"#9f1239\"/><path d=\"M28 24c2-3 6-3 8 0\" fill=\"none\" stroke=\"#9f1239\" stroke-width=\"1.4\"/>" },
    { bg: "#0f766e", draw: "<ellipse cx=\"32\" cy=\"22\" rx=\"18\" ry=\"8\" fill=\"#78350f\"/><rect x=\"14\" y=\"18\" width=\"36\" height=\"8\" fill=\"#92400e\"/><circle cx=\"32\" cy=\"36\" r=\"13\" fill=\"#f3c7a8\"/><circle cx=\"27\" cy=\"35\" r=\"2\" fill=\"#2a1a14\"/><circle cx=\"37\" cy=\"35\" r=\"2\" fill=\"#2a1a14\"/><path d=\"M28 40c3 3 5 3 8 0\" fill=\"none\" stroke=\"#b56a5a\" stroke-width=\"1.6\" stroke-linecap=\"round\"/><rect x=\"18\" y=\"48\" width=\"28\" height=\"16\" rx=\"4\" fill=\"#134e4a\"/>" }
];

export const previewSeatAvatar = (seat: number): string => {
    const art = PREVIEW_NFT_ART[(Math.max(1, seat) - 1) % PREVIEW_NFT_ART.length];
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="32" fill="${art.bg}"/>${art.draw}</svg>`;
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};

const previewPlayerLook = (seat: number, options: PreviewOptions): Pick<PlayerDTO, "avatar" | "timeBankRemainingMs"> => ({
    ...(options.nft ? { avatar: previewSeatAvatar(seat) } : {}),
    ...(options.timeBank ? { timeBankRemainingMs: PREVIEW_TIME_BANK_MS } : {})
});

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
/** Face-up cards for a non-hero winner (win=<seat>), so its cards can lift. */
const PREVIEW_WIN_CARDS = ["QH", "JD"];
const PREVIEW_WIN_CARDS_4 = ["QH", "JD", "9C", "8S"];
/** The winner's hole cards: the ones that get the win lift. */
const previewWinnerCards = (options: PreviewOptions, seat: number): string[] => {
    if (seat === 1) return ["AS", "KD"];
    return options.holeCount === 4 ? PREVIEW_WIN_CARDS_4.slice(0, 2) : PREVIEW_WIN_CARDS;
};

/** Seats drawn for a dialog fixture. Entry keeps the hero's seat empty. */
const dialogSeatNumbers = (options: PreviewOptions): number[] => {
    if (options.dialog === "waiting") {
        const seated = options.seats >= 3 ? [1, 2] : [1];
        return seated.filter(seat => seat <= options.seats);
    }
    const seated: number[] = [];
    for (let seat = 2; seat <= options.seats && seated.length < 6; seat++) seated.push(seat);
    return seated;
};

/**
 * A tournament that has not started, so the real take-your-seat or waiting
 * dialog opens on /table-preview. Amounts match a $2 full-ring entry.
 */
const buildPreviewDialogState = (options: PreviewOptions, heroAddress: string): TexasHoldemStateDTO => {
    const seats = dialogSeatNumbers(options);
    const dealer = seats.includes(options.dealer) ? options.dealer : seats[0];
    const players: PlayerDTO[] = seats.map(seat => ({
        address: previewSeatAddress(seat, heroAddress),
        seat,
        stack: "5000",
        isSmallBlind: seat === 1,
        isBigBlind: seat === 2,
        isDealer: seat === dealer,
        holeCards: undefined,
        status: PlayerStatus.ACTIVE,
        lastAction: undefined,
        legalActions: [],
        sumOfBets: "0",
        timeout: 30,
        signature: "",
        ...previewPlayerLook(seat, options)
    }));
    const scheduledStartTime = Date.now() + (options.dialog === "waiting" ? 49_000 : 47 * 60_000);
    return {
        gameOptions: {
            minBuyIn: "2000000",
            maxBuyIn: "2000000",
            minPlayers: options.dialog === "entry" ? Math.min(5, options.seats) : Math.min(2, options.seats),
            maxPlayers: options.seats,
            smallBlind: "10",
            bigBlind: "20",
            nextSmallBlind: "15",
            nextBigBlind: "30",
            timeout: 30,
            ...(options.timeBank ? { timeBankMs: PREVIEW_TIME_BANK_MS } : {}),
            startingStack: "5000",
            entryFee: "200000",
            protocolFeeBps: 1000,
            scheduledStartTime,
            waitForStartTime: true
        },
        smallBlindPosition: 1,
        bigBlindPosition: Math.min(2, options.seats),
        dealer,
        players,
        communityCards: [],
        deck: "",
        pots: ["0"],
        totalPot: "0",
        nextToAct: 1,
        previousActions: [],
        actionCount: 0,
        handNumber: 1,
        round: TexasHoldemRound.ANTE,
        winners: [],
        results: [],
        legalActions: [],
        availableSeats: [],
        signature: ""
    };
};

const RUNOUT_BOARD = ["2C", "9D", "4S", "8H", "3C"];

const RUNOUT_BEAT: Record<PreviewRunout, { round: TexasHoldemRound; cards: number }> = {
    reveal: { round: TexasHoldemRound.PREFLOP, cards: 0 },
    flop: { round: TexasHoldemRound.FLOP, cards: 3 },
    turn: { round: TexasHoldemRound.TURN, cards: 4 },
    river: { round: TexasHoldemRound.RIVER, cards: 5 }
};

/**
 * Tournament all-in runout as the street frames paint it (ui#210).
 * The last caller is still ACTIVE, the other live seats are all-in with the
 * hand tabled, betting is closed, and a folded seat stays out.
 */
const buildPreviewRunoutState = (options: PreviewOptions, heroAddress: string): TexasHoldemStateDTO => {
    const beat = options.runout as PreviewRunout;
    const street = RUNOUT_BEAT[beat];
    const hands: Record<number, { cards: string[]; status: PlayerStatus; stack: string; cardsShown?: boolean }> = {
        1: { cards: ["AH", "AD"], status: PlayerStatus.ACTIVE, stack: "12000" },
        2: { cards: ["KS", "KC"], status: PlayerStatus.ALL_IN, stack: "0", cardsShown: true },
        3: { cards: ["QS", "QC"], status: PlayerStatus.ALL_IN, stack: "0", cardsShown: true },
        4: { cards: ["7H", "2D"], status: PlayerStatus.FOLDED, stack: "8000" }
    };
    const players: PlayerDTO[] = [1, 2, 3, 4].map(seat => {
        const hand = hands[seat];
        return {
            address: previewSeatAddress(seat, heroAddress),
            seat,
            stack: hand.stack,
            isSmallBlind: seat === 1,
            isBigBlind: seat === 2,
            isDealer: seat === 4,
            holeCards: hand.cards,
            status: hand.status,
            ...(hand.cardsShown ? { cardsShown: true } : {}),
            lastAction: undefined,
            legalActions: [],
            sumOfBets: "0",
            timeout: 30,
            signature: "",
            ...previewPlayerLook(seat, options)
        };
    });
    return {
        gameOptions: {
            minBuyIn: "5000",
            maxBuyIn: "5000",
            minPlayers: 2,
            maxPlayers: 4,
            smallBlind: "100",
            bigBlind: "200",
            timeout: 30,
            ...(options.timeBank ? { timeBankMs: PREVIEW_TIME_BANK_MS } : {}),
            blindLevel: 3,
            nextSmallBlind: "150",
            nextBigBlind: "300",
            blindLevelDuration: 10,
            levelStartTime: Date.now()
        },
        smallBlindPosition: 1,
        bigBlindPosition: 2,
        dealer: 4,
        players,
        communityCards: RUNOUT_BOARD.slice(0, street.cards),
        deck: "",
        pots: ["9000"],
        totalPot: "9000",
        nextToAct: -1,
        previousActions: [],
        actionCount: 8,
        handNumber: 12,
        round: street.round,
        winners: [],
        results: [],
        legalActions: [],
        availableSeats: [],
        signature: ""
    };
};

export const buildPreviewState = (options: PreviewOptions, heroAddress: string): TexasHoldemStateDTO => {
    if (options.dialog) return buildPreviewDialogState(options, heroAddress);
    if (options.runout) return buildPreviewRunoutState(options, heroAddress);
    // win=<seat> (not the hero) tables the winner's hand, which needs showdown.
    const round = options.buttons === "muck" || ((options.winSeat || options.winAll) && options.holeCards) ? TexasHoldemRound.SHOWDOWN : roundForBoard(options.board);
    const heroTurn = previewIsHeroTurn(options);
    const players: PlayerDTO[] = [];
    const previousActions: ActionDTO[] = [];
    let pot = 0n;

    const occupied = options.openSeats ? options.seats - options.openSeats : options.seats;
    for (let seat = 1; seat <= occupied; seat++) {
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
                    : seat === options.winSeat || options.winAll
                      ? (options.holeCount === 4 ? PREVIEW_WIN_CARDS_4 : PREVIEW_WIN_CARDS)
                      : (options.holeCount === 4 ? ["??", "??", "??", "??"] : ["??", "??"]))
                : undefined,
            status: PlayerStatus.ACTIVE,
            ...((seat === options.winSeat || (options.winAll && seat !== 1)) && options.holeCards ? { cardsShown: true } : {}),
            lastAction: options.noBets && seat === 1 ? undefined : action,
            legalActions: heroTurn && seat === 1
                ? [
                    ...(options.buttons === "muck" ? previewHeroShowdownActions(options.seats + 1) : previewHeroLegalActions(options.seats + 1, !!options.noBets)),
                    ...(options.timeBank && options.buttons === "actions" ? [previewTimeBankAction(options.seats + 1)] : [])
                ]
                : [],
            sumOfBets: amount,
            timeout: 30,
            signature: "",
            ...previewPlayerLook(seat, options)
        });
    }

    // Post-flop the main pot holds earlier streets and the total adds this round's bets,
    // so Main Pot and Total Pot differ (Settings: Show Main Pot). Preflop it is all one pot.
    const preflop = round === TexasHoldemRound.PREFLOP;
    const mainPot = preflop ? pot : BigInt(options.format === "cash" ? 100000 : 3000) * BigInt(options.seats);
    const totalPot = preflop ? pot : mainPot + pot;

    return {
        gameOptions: {
            minBuyIn: "100000000",
            maxBuyIn: "1000000000",
            minPlayers: 2,
            maxPlayers: options.seats,
            smallBlind: options.format === "cash" ? "10000000" : "650",
            bigBlind: options.format === "cash" ? "20000000" : "1300",
            timeout: 30,
            ...(options.timeBank ? { timeBankMs: PREVIEW_TIME_BANK_MS } : {}),
            // Level 7 of a tournament / Sit & Go: the blind clock needs the next level.
            ...(options.format === "cash" ? {} : { blindLevel: 7, nextSmallBlind: "800", nextBigBlind: "1600", blindLevelDuration: 10, levelStartTime: Date.now() })
        },
        smallBlindPosition: 1,
        bigBlindPosition: Math.min(2, options.seats),
        dealer: options.dealer,
        players,
        communityCards: COMMUNITY.slice(0, options.board),
        deck: "",
        pots: [mainPot.toString()],
        totalPot: totalPot.toString(),
        nextToAct: heroTurn ? 1 : Math.min(2, options.seats),
        previousActions,
        actionCount: options.seats,
        handNumber: 1,
        round,
        winners: !options.win
            ? []
            : (options.winAll ? Array.from({ length: options.seats }, (_, i) => i + 1) : [options.winSeat ?? 1]).map(seat => ({
                address: previewSeatAddress(seat, heroAddress),
                seat,
                amount: (options.winAll ? totalPot / BigInt(options.seats) : totalPot).toString(),
                cards: options.holeCards ? previewWinnerCards(options, seat) : undefined,
                name: undefined,
                description: undefined
            })),
        results: options.bubblePrizes
            ? [
                { place: 1, playerId: previewSeatAddress(Math.min(2, options.seats), heroAddress), payout: "25200" },
                { place: 2, playerId: previewSeatAddress(1, heroAddress), payout: "10800" }
            ]
            : [],
        ...(options.bubblePrizes ? { payouts: [{ place: 1, amount: "25200" }, { place: 2, amount: "10800" }] } : {}),
        legalActions: [],
        availableSeats: [],
        signature: ""
    };
};
