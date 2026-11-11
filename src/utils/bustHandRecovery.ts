/**
 * The showdown that eliminated a player, once the live table has moved on.
 *
 * The indexer already lists the hands a wallet played. The chain's public
 * state at that hand's end block is the same read the hand replay uses.
 * Nothing here invents a card: a snapshot is kept only when it actually
 * contains the player's hole cards and the pot winner's hole cards.
 */
import type { TexasHoldemStateDTO } from "@block52/poker-vm-sdk";
import type { NetworkEndpoints } from "../context/NetworkContext";
import type { HistoryRpc } from "./handHistoryRecover";
import { loadPublicHandState } from "./handHistoryRecover";
import type { PlayerHand } from "../types/players";
import { hasElements } from "./guards";
import { FinishingHand, showdownForViewer } from "./finishingHand";

/** How many indexed hands to open before giving up. The newest is the bust. */
export const BUST_HAND_LOOKUP_LIMIT = 5;

export interface BustHandCandidate {
    handNumber: number;
    blockHeight: number;
}

/** Newest finished hand of this table first, skipping a hand the live snapshot already is. */
export function bustHandCandidates(hands: ReadonlyArray<Pick<PlayerHand, "game_id" | "hand_number" | "block_height">>, tableId: string, liveHand: number): BustHandCandidate[] {
    return hands
        .filter(hand => hand.game_id === tableId && hand.hand_number !== liveHand && hand.hand_number > 0 && hand.block_height > 0)
        .map(hand => ({ handNumber: hand.hand_number, blockHeight: hand.block_height }));
}

/**
 * First historical snapshot that shows `viewer`'s cards and the cards that
 * beat them. `states` is newest-first. Returns null when none of them do.
 */
export function selectBustHand(viewer: string, states: ReadonlyArray<TexasHoldemStateDTO | null>): FinishingHand | null {
    for (const state of states) {
        if (!state) continue;
        const hand = showdownForViewer(state, viewer);
        if (hand) return hand;
    }
    return null;
}

export interface BustHandLookup {
    listHands: (viewer: string) => Promise<ReadonlyArray<Pick<PlayerHand, "game_id" | "hand_number" | "block_height">>>;
    loadState: (tableId: string, handNumber: number, blockHeight: number) => Promise<TexasHoldemStateDTO | null>;
}

/** One page of the wallet's hands, then at most {@link BUST_HAND_LOOKUP_LIMIT} public states. */
export async function lookupViewerBustHand(tableId: string, viewer: string, liveHand: number, lookup: BustHandLookup): Promise<FinishingHand | null> {
    let hands: ReadonlyArray<Pick<PlayerHand, "game_id" | "hand_number" | "block_height">>;
    try {
        hands = await lookup.listHands(viewer);
    } catch (err) {
        console.error("Finishing hand history list failed:", err);
        return null;
    }
    const candidates = bustHandCandidates(hands, tableId, liveHand).slice(0, BUST_HAND_LOOKUP_LIMIT);
    if (!hasElements(candidates)) return null;
    const states: Array<TexasHoldemStateDTO | null> = [];
    for (const candidate of candidates) {
        try {
            states.push(await lookup.loadState(tableId, candidate.handNumber, candidate.blockHeight));
        } catch (err) {
            console.error(`Finishing hand ${tableId}#${candidate.handNumber} failed:`, err);
            states.push(null);
        }
    }
    return selectBustHand(viewer, states);
}

export interface BustHandSources {
    listHands: BustHandLookup["listHands"];
    networks: NetworkEndpoints[];
    rpcFor: (rpc: string) => Pick<HistoryRpc, "abciQuery">;
}

/** Indexer hand list plus the public chain state replay already knows how to read. */
export function bustHandLookup(sources: BustHandSources): BustHandLookup {
    return {
        listHands: sources.listHands,
        loadState: (tableId, handNumber, blockHeight) =>
            loadPublicHandState(tableId, handNumber, blockHeight, sources.networks, sources.rpcFor)
    };
}
