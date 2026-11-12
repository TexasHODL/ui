import type { PlayerSession } from "../types/players";
import { hasContent, hasValue, isBlank, isNumber, isRecord, isString } from "./guards";
import { findSngPrizeClaimed, type TransferEvent } from "./transactionUtils";

/**
 * A successful `sng_prize_claimed` payout. The indexer never sees these: the
 * chain settles them with MsgLeaveGame and does not emit player_left_game, so
 * the session stays open with cash_out_amount 0.
 */
export interface PlayerPrizeClaim {
    gameId: string;
    /** USDC micro-units paid by the claim. */
    amount: number;
    /** Block the claim was committed in. */
    height: number;
    txhash: string;
}

/** One session-history row after prize claims have been applied. */
export interface SessionPrizeRow {
    gameId: string;
    joinBlock: number;
    leaveBlock?: number;
    buyIn: number;
    /**
     * Cash-out in USDC micro-units. Unset when the seat is still open (no leave
     * and no claim): the page renders an em dash instead of a default 0.00.
     */
    cashOut?: number;
    isPrize: boolean;
    prizeTxHash?: string;
}

export interface ProfileMoney {
    totalCashOuts: number;
    netProfit: number;
}

/**
 * Successful prize claims for `player` from a GetTxsEvent body.
 * A tx with code !== 0 is ignored, same as hasSngPayoutReceipt: a rejected
 * claim is not a payout. Amounts come from findSngPrizeClaimed.
 */
export function prizeClaimsFromTxSearch(body: unknown, player: string): PlayerPrizeClaim[] {
    if (!isRecord(body) || !Array.isArray(body.tx_responses) || !hasContent(player)) return [];
    const claims: PlayerPrizeClaim[] = [];
    const seen = new Set<string>();
    for (const tx of body.tx_responses) {
        if (!isRecord(tx) || !isNumber(tx.code) || tx.code !== 0) continue;
        const txhash = tx.txhash;
        const height = blockHeight(tx.height);
        if (!isString(txhash) || isBlank(txhash) || !hasValue(height) || seen.has(txhash)) continue;
        const prize = findSngPrizeClaimed(readEvents(tx.events), player);
        const amount = microAmount(prize?.amount);
        if (!hasValue(prize) || !hasContent(prize.gameId) || !hasValue(amount)) continue;
        seen.add(txhash);
        claims.push({ gameId: prize.gameId, amount, height, txhash });
    }
    return claims;
}

/**
 * Session rows with prize claims filled in.
 *
 * Each claim goes to the latest unmatched join of that game at or before the
 * claim height, so a re-entry does not inherit an earlier buy-in's prize and
 * one claim is never painted onto two rows. A claim with no such join is left
 * off the table (the caller still adds it to the totals).
 */
export function sessionRowsWithPrizes(sessions: PlayerSession[], claims: PlayerPrizeClaim[]): SessionPrizeRow[] {
    const matches = matchPrizeClaims(sessions, claims);
    return sessions.map((session, index) => {
        const claim = matches.get(index);
        if (hasValue(claim)) {
            return {
                gameId: session.game_id,
                joinBlock: session.join_block,
                leaveBlock: claim.height,
                buyIn: session.buy_in_amount,
                cashOut: claim.amount,
                isPrize: true,
                prizeTxHash: claim.txhash
            };
        }
        return {
            gameId: session.game_id,
            joinBlock: session.join_block,
            leaveBlock: session.leave_block,
            buyIn: session.buy_in_amount,
            cashOut: openWithoutCashOut(session) ? undefined : session.cash_out_amount,
            isPrize: false
        };
    });
}

/**
 * Indexer cash-outs and net profit plus prize claims, each claim once.
 *
 * A claim matched to a session replaces that row's recorded cash-out (the
 * indexer stores 0 for these). Subtracting the recorded amount keeps a prize
 * the indexer already counted from being added a second time. A claim with no
 * row in `sessions` — a game the indexer never saw, or a session on another
 * page — is added in full. Those rows record 0 today, so the page total does
 * not depend on which page is open.
 */
export function profileMoneyWithPrizes(money: ProfileMoney, sessions: PlayerSession[], claims: PlayerPrizeClaim[]): ProfileMoney {
    const matches = matchPrizeClaims(sessions, claims);
    const matched = new Set<string>();
    let added = 0;
    matches.forEach((claim, index) => {
        matched.add(claim.txhash);
        added += claim.amount - recordedCashOut(sessions[index]);
    });
    for (const claim of claims) {
        if (matched.has(claim.txhash)) continue;
        added += claim.amount;
    }
    return {
        totalCashOuts: money.totalCashOuts + added,
        netProfit: money.netProfit + added
    };
}

/**
 * Claim txhash per session index. Claims are applied earliest first; each takes
 * the latest join of its game that is still free and not after the claim.
 */
function matchPrizeClaims(sessions: PlayerSession[], claims: PlayerPrizeClaim[]): Map<number, PlayerPrizeClaim> {
    const matches = new Map<number, PlayerPrizeClaim>();
    const used = new Set<number>();
    const ordered = [...claims].sort((a, b) => a.height - b.height || a.txhash.localeCompare(b.txhash));
    for (const claim of ordered) {
        const gameId = claim.gameId.toLowerCase();
        let best = -1;
        let bestJoin = -1;
        sessions.forEach((session, index) => {
            if (used.has(index) || session.game_id.toLowerCase() !== gameId || session.join_block > claim.height) return;
            if (session.join_block < bestJoin) return;
            best = index;
            bestJoin = session.join_block;
        });
        if (best < 0) continue;
        used.add(best);
        matches.set(best, claim);
    }
    return matches;
}

/** Still seated, and the indexer default of 0 is not a real cash-out. */
function openWithoutCashOut(session: PlayerSession): boolean {
    if (hasValue(session.leave_block)) return false;
    const recorded = session.cash_out_amount;
    return !hasValue(recorded) || recorded === 0;
}

function recordedCashOut(session: PlayerSession): number {
    return hasValue(session.cash_out_amount) ? session.cash_out_amount : 0;
}

function blockHeight(value: unknown): number | undefined {
    if (isNumber(value) && Number.isSafeInteger(value) && value >= 0) return value;
    if (!isString(value) || !/^\d+$/.test(value)) return undefined;
    const height = Number(value);
    return Number.isSafeInteger(height) ? height : undefined;
}

function microAmount(amount: string | undefined): number | undefined {
    if (!hasContent(amount) || !/^\d+$/.test(amount)) return undefined;
    const value = Number(amount);
    return Number.isSafeInteger(value) ? value : undefined;
}

function readEvents(value: unknown): TransferEvent[] | undefined {
    if (!Array.isArray(value)) return undefined;
    return value.filter(isRecord).map(event => ({
        type: isString(event.type) ? event.type : undefined,
        attributes: Array.isArray(event.attributes)
            ? event.attributes.filter(isRecord).map(attribute => ({
                  key: isString(attribute.key) ? attribute.key : undefined,
                  value: isString(attribute.value) ? attribute.value : undefined
              }))
            : undefined
    }));
}

/** True when `address` can be interpolated into an event query. */
export function isPrizeClaimAddress(address: string | undefined): address is string {
    return hasContent(address) && /^[a-z0-9]+$/.test(address);
}
