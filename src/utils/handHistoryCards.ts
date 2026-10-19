/**
 * Cards and membership for one finished hand on My Hands.
 *
 * The indexer list has community cards and who it managed to attach, but hole
 * cards are only on the chain's masked public state. This uses the same reveal
 * rule as the bust snapshot: the viewer's own cards, shown and all-in hands,
 * and a busted player who was dealt in. Folded and mucked opponents stay hidden.
 */

import { TexasHoldemStateDTO } from "@block52/poker-vm-sdk";
import { captureFinishingHand } from "./finishingHand";
import type { PlayerHand } from "../types/players";
import { handKey } from "./handHistory";

/** Actions the indexer ignores when deciding who played a hand. */
const NON_HAND_ACTIONS = new Set([
    "join",
    "leave",
    "new-hand",
    "deal",
    "sit-in",
    "sit-out",
    "sit-in-and-wait",
    "top-up",
    "claim-winnings"
]);

export interface HistorySeatCards {
    seat: number;
    address?: string;
    cards: string[];
    yours: boolean;
}

export interface HistoryHandCards {
    board: string[];
    seats: HistorySeatCards[];
}

export function viewerPlayedHand(state: TexasHoldemStateDTO, viewer: string): boolean {
    const address = viewer.toLowerCase();
    const acted = (state.previousActions ?? []).some(action =>
        action.playerId?.toLowerCase() === address && !NON_HAND_ACTIONS.has(String(action.action))
    );
    const won = (state.winners ?? []).some(winner => winner.address?.toLowerCase() === address);
    return acted || won;
}

/** Board and the hole cards this page is allowed to show, viewer first. */
export function cardsForHistoryHand(state: TexasHoldemStateDTO, viewer: string): HistoryHandCards {
    const hand = captureFinishingHand(state, { viewer });
    const you = viewer.toLowerCase();
    const seats = hand.players
        .filter(player => player.cards.length > 0)
        .map(player => ({
            seat: player.seat,
            address: player.address,
            cards: player.cards,
            yours: player.address?.toLowerCase() === you
        }))
        .sort((a, b) => Number(b.yours) - Number(a.yours) || a.seat - b.seat);
    return { board: hand.board, seats };
}

/**
 * A hand the wallet played, shaped like an indexer row, or null when this
 * snapshot does not show them playing it.
 */
export function playerHandFromState(
    gameId: string,
    state: TexasHoldemStateDTO,
    viewer: string,
    blockHeight: number
): PlayerHand | null {
    if (!viewerPlayedHand(state, viewer)) return null;
    const you = viewer.toLowerCase();
    const player = (state.players ?? []).find(seat => seat.address?.toLowerCase() === you);
    const action = (state.previousActions ?? []).find(entry => entry.playerId?.toLowerCase() === you);
    const won = (state.winners ?? [])
        .filter(winner => winner.address?.toLowerCase() === you)
        .reduce((sum, winner) => sum + Number(winner.amount || 0), 0);
    return {
        game_id: gameId,
        hand_number: state.handNumber,
        seat: player?.seat ?? action?.seat ?? 0,
        status: player?.status ?? "",
        won_amount: Number.isFinite(won) ? won : 0,
        block_height: blockHeight,
        community_cards: (state.communityCards ?? []).map(card => card.toUpperCase()),
        winner_count: state.winners?.length ?? 0
    };
}

/** Indexed hands of these tables that are not already on the wallet's list. */
export function unlistedHands<T extends Pick<PlayerHand, "game_id" | "hand_number">>(
    listed: Array<Pick<PlayerHand, "game_id" | "hand_number">>,
    gameHands: T[]
): T[] {
    const seen = new Set(listed.map(handKey));
    return gameHands.filter(hand => !seen.has(handKey(hand)));
}

/** Newest finished hand first. */
export function byHandRecency(a: Pick<PlayerHand, "block_height" | "hand_number">, b: Pick<PlayerHand, "block_height" | "hand_number">): number {
    return b.block_height - a.block_height || b.hand_number - a.hand_number;
}

/** Indexed rows plus hands recovered from the chain, newest first, with no duplicates. */
export function mergeHistoryHands(indexed: PlayerHand[], recovered: PlayerHand[]): PlayerHand[] {
    return [...indexed, ...unlistedHands(indexed, recovered)].sort(byHandRecency);
}

/**
 * The board to draw. A chain snapshot of an earlier street must not hide
 * community cards the indexer already stored for the finished hand.
 */
export function displayBoard(indexed: string[] | undefined, snapshot: string[] | undefined): string[] {
    const known = (indexed ?? []).map(card => card.toUpperCase());
    const board = (snapshot ?? []).map(card => card.toUpperCase());
    if (board.length >= known.length && board.length > 0) return board;
    return known;
}

/** Footer count. Recovered hands can outnumber the indexer's total. */
export function historyCountLabel(shown: number, indexedTotal: number): string {
    const visible = shown.toLocaleString();
    if (shown > indexedTotal) return `Showing ${visible}`;
    return `Showing ${visible} of ${indexedTotal.toLocaleString()}`;
}
