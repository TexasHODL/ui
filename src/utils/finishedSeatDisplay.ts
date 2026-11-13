/**
 * How a finished sit-and-go or tournament seat reads on the table.
 *
 * The place replaces the stack amount inside the stack pill. A payout that
 * floors to at least one cent is shown as "Won $3.36": in the action banner
 * while this snapshot is still the hand they finished (hole cards stay up),
 * and in the hole-card slot once a later hand has been dealt. A zero payout,
 * or one that would render as $0.00, is not shown. The place and the payout
 * are the same `results[]` fields the old pills used.
 *
 * `previousActions` is replaced when a new hand is dealt (indices stay
 * monotonic, the list does not). A finisher who acted in that list, or who
 * won its pot, is still on their finishing hand. The final hand never deals
 * another, so the players who finish it stay on the banner.
 */
import type { TexasHoldemStateDTO } from "@block52/poker-vm-sdk";
import { ordinalPlace } from "./tournamentFinish";
import { floorPrizeCents, parsePrizeMicro } from "./prizeDisplay";
import { hasContent, hasValue } from "./guards";

/** Where a positive payout is drawn. Null means show no amount. */
export type FinishedPayoutPlace = "action-banner" | "hole-cards";

export type FinishingHandMarks = Pick<TexasHoldemStateDTO, "previousActions" | "winners">;

/** Stack-pill tone. 4th and later share the muted tone. */
export type FinishedPlaceTone = "first" | "second" | "third" | "other";

export function finishedPlaceTone(place: number): FinishedPlaceTone {
    if (place === 1) return "first";
    if (place === 2) return "second";
    if (place === 3) return "third";
    return "other";
}

/**
 * Micro-USDC to show where the hole cards were, or null when there is nothing
 * to show. Sub-cent prizes floor to $0.00, so they stay hidden too.
 */
export function finishedSeatPayoutMicro(payout: string | null | undefined): string | null {
    const micro = parsePrizeMicro(payout);
    if (!hasValue(micro) || floorPrizeCents(micro) <= 0n || !hasContent(payout)) return null;
    return payout;
}

export interface FinishedSeatDisplay {
    /** "2nd" — replaces the stack amount. Same words as the old place pill, without "Place". */
    placeLabel: string;
    tone: FinishedPlaceTone;
    /** Chain micro-USDC for the card area, or null when the finisher won nothing. */
    payoutMicro: string | null;
}

export function finishedSeatDisplay(place: number, payout: string | null | undefined): FinishedSeatDisplay {
    return {
        placeLabel: ordinalPlace(place),
        tone: finishedPlaceTone(place),
        payoutMicro: finishedSeatPayoutMicro(payout)
    };
}

/**
 * True when this snapshot is still the hand the player finished.
 * A later deal replaces `previousActions` and `winners`, so an earlier bust
 * no longer matches.
 */
export function finisherPlayedThisHand(state: FinishingHandMarks | null | undefined, playerId: string | null | undefined): boolean {
    if (!hasContent(playerId) || !hasValue(state)) return false;
    const id = playerId.toLowerCase();
    const acted = (state.previousActions ?? []).some(action => action.playerId.toLowerCase() === id);
    if (acted) return true;
    return (state.winners ?? []).some(winner => winner.address.toLowerCase() === id);
}

/**
 * Action banner on the finishing hand, hole-card slot after the next deal.
 * A payout that would render as $0.00 is omitted in both phases.
 */
export function finishedPayoutPlace(onFinishingHand: boolean, payout: string | null | undefined): FinishedPayoutPlace | null {
    if (!hasContent(finishedSeatPayoutMicro(payout))) return null;
    return onFinishingHand ? "action-banner" : "hole-cards";
}
