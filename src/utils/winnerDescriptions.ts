import { GameVariant, PlayerActionType, PlayerStatus, PokerGameIntegration, TexasHoldemStateDTO, WinnerDTO } from "@block52/poker-vm-sdk";
import { hasElements, isEmpty } from "./guards";
import { evaluateHand } from "./handEvaluation";

export type WinType = "showdown" | "uncontested";

/**
 * The one rule for "uncontested", shared by the win banner, the History panel
 * and the seat labels: a win is uncontested only when every other player
 * FOLDED, so the hand ended without the winner's cards being known. A winner
 * whose cards are known (a contested showdown, or one who showed while the
 * rest mucked) won at showdown, and the UI says "won with <hand>".
 */
export function getWinType(winner: Pick<WinnerDTO, "cards"> | null | undefined): WinType {
    return hasElements(winner?.cards) ? "showdown" : "uncontested";
}

/** Face-up cards only: masked placeholders ("X") mean the cards are hidden. */
const isRevealed = (cards: string[] | undefined): cards is string[] =>
    hasElements(cards) && cards.every(c => !!c && !c.toUpperCase().startsWith("X"));

/**
 * The winner's hole cards when they showed them this hand (a SHOW action or a
 * SHOWING seat), else null. The engine leaves `winner.cards` empty when the
 * winner shows and everyone else mucks; a winner who never showed (everyone
 * folded) stays null. The local player's own always-visible cards don't count
 * on their own, so a fold win is never relabelled.
 */
export function getShownHoleCards(state: TexasHoldemStateDTO, winner: WinnerDTO): string[] | null {
    const address = winner.address?.toLowerCase();
    if (!address) return null;
    const player = state.players?.find(p => p.address?.toLowerCase() === address);
    if (!player || !isRevealed(player.holeCards)) return null;
    const showed =
        player.status === PlayerStatus.SHOWING ||
        (state.previousActions ?? []).some(a => a.action === PlayerActionType.SHOW && a.playerId?.toLowerCase() === address);
    return showed ? player.holeCards : null;
}

/**
 * Fills each winner's `name` and `description` (the hand in words, "Set of
 * Sevens") from its cards and the board, via the SDK. The engine no longer
 * writes the wording into chain state (poker-vm#2721), so every game state the
 * UI takes in passes through here and the rest of the UI keeps reading
 * `winner.description`.
 *
 * A winner who showed while everyone else mucked arrives without `cards`; their
 * best five are rebuilt from the shown hole cards + board (the same evaluator
 * the showdown summary uses), so the win reads "won with <hand>" rather than
 * "uncontested" (see {@link getWinType}).
 *
 * A state with no winners is returned as-is (nothing to describe). Otherwise a
 * new state object is returned; the input is not modified.
 *
 * @param state The game state as it arrived from the chain
 */
export function withWinnerDescriptions(state: TexasHoldemStateDTO): TexasHoldemStateDTO {
    if (isEmpty(state.winners)) return state;
    const variant = (state as TexasHoldemStateDTO & { variant?: GameVariant }).variant;
    const winners = state.winners.map(winner => {
        if (hasElements(winner.cards)) return winner;
        const shown = getShownHoleCards(state, winner);
        if (!shown) return winner;
        const hand = evaluateHand(shown, state.communityCards ?? [], variant);
        if (!hand || hand.hand.length !== 5) return winner;
        return { ...winner, cards: hand.hand };
    });
    return PokerGameIntegration.withWinnerDescriptions({ ...state, winners });
}
