import type { PotDisplayValues } from "./potDisplayUtils";

/**
 * An empty table (nobody seated) shows a clean felt: no pot, no board, no dealer
 * button and no winner leftovers. When the last players leave mid/after a hand the
 * chain keeps the finished hand's pots, community cards, dealer and winners in
 * the public state (round "end"), which otherwise stays on screen for a table
 * with 0 players.
 */
export const isTableEmpty = (seatedPlayerCount: number): boolean => seatedPlayerCount <= 0;

/** Pot display with every pot row hidden (empty table). */
export const hiddenPotDisplay = (values: PotDisplayValues): PotDisplayValues => ({
    ...values,
    showTotalPot: false,
    showMainPot: false,
    showSidePots: false,
    pots: []
});

const NO_CARDS: string[] = [];
const NO_WIN_CARDS: Set<string> = new Set();

/** What the board/seats should draw, given whether the table is empty. */
export const emptyTableBoard = <T extends { potDisplayValues: PotDisplayValues; communityCards: string[]; winnerCards: Set<string>; dealerSeat: number }>(
    board: T,
    empty: boolean
): T => (empty ? { ...board, potDisplayValues: hiddenPotDisplay(board.potDisplayValues), communityCards: NO_CARDS, winnerCards: NO_WIN_CARDS, dealerSeat: -1 } : board);