/**
 * Per-variant records for the profile History panel.
 *
 * The indexer profile still returns biggest_pot_won, biggest_hand_profit and
 * longest_session_blocks, and the page used to print them. They stay 0. The
 * player_stats columns default to 0, and update_player_stats never writes
 * them — GetPlayerProfile only SELECTs the stored zeros. Formatting those
 * zeros (and any chip amount) with formatMicroUsd is what showed 0.00 / 0.00 / 0.
 *
 * Longest session is leave block minus join block, using the same leave block
 * Session History already shows (indexer leave, prize-claim height, or the
 * chain elimination block once that lookup has finished). An open seat has no
 * leave block, so it is left out rather than counted as 0.
 *
 * Biggest pot won is the largest amount a hand record awarded this player
 * (PlayerHand.won_amount, the engine's winner.amount: their share of the pot).
 * Cash hands are micro-USDC. Sit & Go and tournament hands are chips. A
 * selection that mixes those units, or that includes a winning hand whose
 * table format is unknown, has no single figure — the panel shows an em dash.
 *
 * Biggest hand profit is the pot awarded minus what this player put into the
 * hand. The hand list My Hands loads does not record that contribution, so
 * the figure stays unknown and the panel shows an em dash. Pass `contributed`
 * only when a hand record actually has it.
 */
import type { PlayerHand } from "../types/players";
import { hasContent, hasValue, isEmpty, isNumber } from "./guards";
import { formatMicroUsd } from "./moneyDisplay";
import type { SessionPrizeRow } from "./playerPrizeClaims";
import { ALL_SESSION_GAMES, filterSessionRows, type SessionGameLabel } from "./sessionGameDisplay";
import { sessionBustFor, sessionLeaveBlock } from "./sessionBust";
import { isCashFormat, isTournamentFormat } from "@block52/poker-vm-sdk";
import { toGameFormat } from "./gameFormatUtils";
import type { GamePrizeMeta } from "./transactionUtils";

/** Dollars for a cash table. Chips for a Sit & Go or tournament. */
export type HistoryMoneyUnit = "usd" | "chips";

export interface HistorySessionSpan {
    gameId: string;
    joinBlock: number;
    /** Absent while the seat is still open, or a bust block has not been read. */
    leaveBlock?: number;
}

export interface HistoryHandAmount {
    gameId: string;
    /** Pot share awarded to this player. 0 when they did not win the hand. */
    wonAmount: number;
    /**
     * What this player put into the hand, in the same unit as wonAmount.
     * Absent when the hand record does not say — profit is then unknown.
     */
    contributed?: number;
}

export interface HistoryVariantStats {
    /** Undefined when no selected session has a positive length. */
    longestSessionBlocks?: number;
    /** Undefined when no selected winning hand shares one money unit. */
    biggestPotWon?: number;
    potUnit?: HistoryMoneyUnit;
    /** Undefined when no selected hand records what the player put in. */
    biggestHandProfit?: number;
    profitUnit?: HistoryMoneyUnit;
}

/** Cash is USDC. Sit & Go and tournament stacks are chips. Anything else is unknown. */
export function historyMoneyUnit(format: string | undefined): HistoryMoneyUnit | undefined {
    const parsed = toGameFormat(format);
    if (!hasValue(parsed)) return undefined;
    if (isCashFormat(parsed)) return "usd";
    if (isTournamentFormat(parsed)) return "chips";
    return undefined;
}

export function historyMoneyUnits(metas: Record<string, GamePrizeMeta | undefined>): Record<string, HistoryMoneyUnit | undefined> {
    const units: Record<string, HistoryMoneyUnit | undefined> = {};
    for (const [id, meta] of Object.entries(metas)) {
        units[id] = historyMoneyUnit(meta?.format);
    }
    return units;
}

/** The indexer hand row, reduced to the amounts this panel can read. */
export function handsForHistory(hands: PlayerHand[]): HistoryHandAmount[] {
    return hands.map(hand => ({ gameId: hand.game_id, wonAmount: hand.won_amount }));
}

/**
 * One span per session row. The leave block is the one the table prints:
 * the row's own leave (indexer or prize claim), otherwise the elimination
 * block for a confirmed bust.
 */
export function sessionSpansForHistory(
    rows: SessionPrizeRow[],
    metas: Record<string, GamePrizeMeta | undefined>,
    player: string | undefined,
    eliminatedAt: Record<string, number | null | undefined>
): HistorySessionSpan[] {
    return rows.map(row => ({
        gameId: row.gameId,
        joinBlock: row.joinBlock,
        leaveBlock: sessionLeaveBlock(row, hasContent(player) ? sessionBustFor(row, rows, metas[row.gameId], player) : undefined, eliminatedAt[row.gameId])
    }));
}

function positiveLength(span: HistorySessionSpan): number | undefined {
    if (!isNumber(span.joinBlock) || !isNumber(span.leaveBlock)) return undefined;
    if (!Number.isSafeInteger(span.joinBlock) || !Number.isSafeInteger(span.leaveBlock)) return undefined;
    const length = span.leaveBlock - span.joinBlock;
    if (length <= 0) return undefined;
    return length;
}

function longestBlocks(spans: HistorySessionSpan[]): number | undefined {
    let best: number | undefined;
    for (const span of spans) {
        const length = positiveLength(span);
        if (!hasValue(length)) continue;
        if (!hasValue(best) || length > best) best = length;
    }
    return best;
}

/** One unit shared by every id, or undefined when the set is empty, mixed, or missing a format. */
function agreedUnit(gameIds: string[], units: Record<string, HistoryMoneyUnit | undefined>): HistoryMoneyUnit | undefined {
    if (isEmpty(gameIds)) return undefined;
    let agreed: HistoryMoneyUnit | undefined;
    for (const gameId of gameIds) {
        const unit = units[gameId];
        if (!hasValue(unit)) return undefined;
        if (!hasValue(agreed)) {
            agreed = unit;
            continue;
        }
        if (agreed !== unit) return undefined;
    }
    return agreed;
}

function finiteNumber(value: number): boolean {
    return isNumber(value) && Number.isFinite(value);
}

/**
 * Records for the sessions and hands the variant filter keeps.
 * `filterKey` is ALL_SESSION_GAMES or a Session History label such as
 * "Tournament · Texas Hold'em".
 */
export function profileHistoryStats(
    sessions: HistorySessionSpan[],
    hands: HistoryHandAmount[],
    labels: Record<string, SessionGameLabel | undefined>,
    units: Record<string, HistoryMoneyUnit | undefined>,
    filterKey: string
): HistoryVariantStats {
    const selectedSessions = filterSessionRows(sessions, labels, hasContent(filterKey) ? filterKey : ALL_SESSION_GAMES);
    const selectedHands = filterSessionRows(hands, labels, hasContent(filterKey) ? filterKey : ALL_SESSION_GAMES);

    const wins = selectedHands.filter(hand => finiteNumber(hand.wonAmount) && hand.wonAmount > 0);
    const potUnit = agreedUnit(
        wins.map(hand => hand.gameId),
        units
    );
    let biggestPotWon: number | undefined;
    if (hasValue(potUnit)) {
        for (const hand of wins) {
            if (!hasValue(biggestPotWon) || hand.wonAmount > biggestPotWon) biggestPotWon = hand.wonAmount;
        }
    }

    const measured = selectedHands.filter(hand => {
        const contributed = hand.contributed;
        return hasValue(contributed) && finiteNumber(contributed) && finiteNumber(hand.wonAmount);
    });
    const profitUnit = agreedUnit(
        measured.map(hand => hand.gameId),
        units
    );
    let biggestHandProfit: number | undefined;
    if (hasValue(profitUnit)) {
        for (const hand of measured) {
            const contributed = hand.contributed;
            if (!hasValue(contributed) || !finiteNumber(contributed)) continue;
            const profit = hand.wonAmount - contributed;
            if (!Number.isFinite(profit)) continue;
            if (!hasValue(biggestHandProfit) || profit > biggestHandProfit) biggestHandProfit = profit;
        }
    }

    return {
        longestSessionBlocks: longestBlocks(selectedSessions),
        biggestPotWon,
        potUnit: hasValue(biggestPotWon) ? potUnit : undefined,
        biggestHandProfit,
        profitUnit: hasValue(biggestHandProfit) ? profitUnit : undefined
    };
}

/** "18.40" for cash, "24,600 chips" for a tournament. An unknown figure is an em dash, never 0. */
export function formatHistoryAmount(amount: number | undefined, unit: HistoryMoneyUnit | undefined, loading: boolean): string {
    if (loading) return "…";
    if (!hasValue(amount) || !hasValue(unit) || !Number.isFinite(amount)) return "—";
    if (unit === "chips") {
        const grouped = Math.abs(amount).toLocaleString();
        return amount < 0 ? `-${grouped} chips` : `${grouped} chips`;
    }
    return formatMicroUsd(amount, true);
}

/** Block count, or an em dash when no closed session was measured. */
export function formatHistoryBlocks(blocks: number | undefined, loading: boolean): string {
    if (loading) return "…";
    if (!hasValue(blocks)) return "—";
    return blocks.toLocaleString();
}
