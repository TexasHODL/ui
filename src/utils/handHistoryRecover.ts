/**
 * Hands the indexer never attached to a wallet, confirmed on the public chain.
 *
 * `hand_players` is written only when the end snapshot's round is showdown or
 * end. A hand that finishes in the same block the next one starts is stored
 * as community cards only, so the wallet's list skips it. Sessions say which
 * tables the wallet sat at; the chain's masked state says whether they
 * actually played. Nodes keep about 30 days of that state.
 */

import type { TexasHoldemStateDTO } from "@block52/poker-vm-sdk";
import type { NetworkEndpoints } from "../context/NetworkContext";
import type { PlayerHand, PlayerSession, PlayerSessionsResponse } from "../types/players";
import type { HandListItem, HandListResponse } from "../pages/explorer/types";
import { encodeStringField1, parseAbciStringResponse } from "./abciQuery";
import { handKey } from "./handHistory";
import { playerHandFromState, unlistedHands } from "./handHistoryCards";
import { GAME_STATE_PUBLIC_PATH, handEndedQuery, parseGameStateJson, parseTxSearchHeight, snapshotHeights } from "./handReplay";

export interface HistoryRpc {
    txSearch(query: string): Promise<unknown>;
    abciQuery(path: string, dataHex: string, height: number): Promise<unknown>;
}

export interface RecoverHandsDeps {
    address: string;
    listed: Array<Pick<PlayerHand, "game_id" | "hand_number">>;
    sessions: (offset: number) => Promise<PlayerSessionsResponse>;
    gameHands: (gameId: string, offset: number) => Promise<HandListResponse>;
    rpcFor: (rpc: string) => HistoryRpc;
    networks: NetworkEndpoints[];
    signal?: AbortSignal;
    concurrency?: number;
}

export interface RecoveredHand {
    hand: PlayerHand;
    state: TexasHoldemStateDTO;
}

export interface RecoveredHands {
    hands: PlayerHand[];
    states: Map<string, TexasHoldemStateDTO>;
}

const SESSION_PAGE = 100;
const GAME_HAND_PAGE = 1000;

async function collectPages<T>(
    load: (offset: number) => Promise<{ data: T[]; pagination: { total: number } }>,
    signal?: AbortSignal
): Promise<T[]> {
    const out: T[] = [];
    let offset = 0;
    let total = Number.POSITIVE_INFINITY;
    while (offset < total) {
        if (signal?.aborted) return out;
        const page = await load(offset);
        total = page.pagination.total;
        if (page.data.length === 0) break;
        out.push(...page.data);
        offset += page.data.length;
    }
    return out;
}

/** Runs `fn` over `items` with at most `limit` in flight. One failure does not stop the rest. */
export async function mapPool<T>(items: T[], limit: number, fn: (item: T) => Promise<void>, signal?: AbortSignal): Promise<void> {
    if (items.length === 0 || limit < 1) return;
    let cursor = 0;
    const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
        while (!signal?.aborted) {
            const index = cursor;
            cursor += 1;
            if (index >= items.length) return;
            try {
                await fn(items[index]);
            } catch (err) {
                console.error("Hand history lookup failed:", err);
            }
        }
    });
    await Promise.all(workers);
}

function inSession(blockHeight: number, windows: PlayerSession[]): boolean {
    if (windows.length === 0) return true;
    return windows.some(window =>
        blockHeight >= window.join_block && (window.leave_block === undefined || blockHeight <= window.leave_block)
    );
}

async function stateAtHeights(
    rpc: Pick<HistoryRpc, "abciQuery">,
    gameId: string,
    handNumber: number,
    endHeight: number,
    signal?: AbortSignal
): Promise<TexasHoldemStateDTO | null> {
    const request = encodeStringField1(gameId);
    for (const height of snapshotHeights(endHeight)) {
        if (signal?.aborted) return null;
        try {
            const json = parseAbciStringResponse(await rpc.abciQuery(GAME_STATE_PUBLIC_PATH, request, height));
            const parsed = parseGameStateJson(json);
            if (parsed.state.handNumber === handNumber) return parsed.state;
        } catch (err) {
            console.error(`Public state for ${gameId} hand ${handNumber} at block ${height}:`, err);
        }
    }
    return null;
}

/**
 * The masked public state of a finished hand. `blockHeight` is the end block
 * when the indexer recorded one; the block before it is the hand when the
 * next hand started in the same block.
 */
export async function loadPublicHandState(
    gameId: string,
    handNumber: number,
    blockHeight: number,
    networks: NetworkEndpoints[],
    rpcFor: (rpc: string) => Pick<HistoryRpc, "abciQuery">,
    signal?: AbortSignal
): Promise<TexasHoldemStateDTO | null> {
    if (!Number.isInteger(blockHeight) || blockHeight < 1) return null;
    for (const network of networks) {
        if (signal?.aborted) return null;
        const state = await stateAtHeights(rpcFor(network.rpc), gameId, handNumber, blockHeight, signal);
        if (state) return state;
    }
    return null;
}

async function confirmPlayedHand(candidate: Pick<HandListItem, "game_id" | "hand_number">, deps: RecoverHandsDeps): Promise<RecoveredHand | null> {
    let query: string;
    try {
        query = handEndedQuery(candidate.game_id, candidate.hand_number);
    } catch (err) {
        console.error("Skipping a hand history id the chain query cannot express:", err);
        return null;
    }
    for (const network of deps.networks) {
        if (deps.signal?.aborted) return null;
        const rpc = deps.rpcFor(network.rpc);
        try {
            const endHeight = parseTxSearchHeight(await rpc.txSearch(query));
            if (endHeight === null) continue;
            const state = await stateAtHeights(rpc, candidate.game_id, candidate.hand_number, endHeight, deps.signal);
            if (!state) continue;
            const hand = playerHandFromState(candidate.game_id, state, deps.address, endHeight);
            // This hand's own state is authoritative: another node will not show a different deal.
            if (!hand) return null;
            return { hand, state };
        } catch (err) {
            console.error(`Hand history lookup ${candidate.game_id}#${candidate.hand_number} on ${network.name}:`, err);
        }
    }
    return null;
}

/** Played hands of the wallet's tables that `listed` does not already contain. */
export async function recoverUnlistedHands(deps: RecoverHandsDeps): Promise<RecoveredHands> {
    const hands: PlayerHand[] = [];
    const states = new Map<string, TexasHoldemStateDTO>();
    try {
        const sessions = await collectPages(offset => deps.sessions(offset), deps.signal);
        const gameIds = [...new Set([...sessions.map(session => session.game_id), ...deps.listed.map(hand => hand.game_id)])];
        const candidates: HandListItem[] = [];
        for (const gameId of gameIds) {
            if (deps.signal?.aborted) break;
            const gameHands = await collectPages(
                offset => deps.gameHands(gameId, offset),
                deps.signal
            );
            const windows = sessions.filter(session => session.game_id === gameId);
            candidates.push(...unlistedHands(deps.listed, gameHands).filter(hand => inSession(hand.block_height, windows)));
        }
        candidates.sort((a, b) => b.block_height - a.block_height || b.hand_number - a.hand_number);
        const claimed = new Set<string>();
        await mapPool(candidates, deps.concurrency ?? 4, async candidate => {
            const key = handKey(candidate);
            if (claimed.has(key)) return;
            claimed.add(key);
            const found = await confirmPlayedHand(candidate, deps);
            if (!found || states.has(handKey(found.hand))) return;
            hands.push(found.hand);
            states.set(handKey(found.hand), found.state);
        }, deps.signal);
    } catch (err) {
        console.error("Failed to recover unlisted hands:", err);
    }
    return { hands, states };
}

export const historySessionPageSize = SESSION_PAGE;
export const historyGameHandPageSize = GAME_HAND_PAGE;
