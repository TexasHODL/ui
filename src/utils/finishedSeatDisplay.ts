/**
 * How a finished sit-and-go or tournament seat reads on the table.
 *
 * The place replaces the stack amount inside the stack pill. A payout that
 * floors to at least one cent replaces the hole cards ("Won $3.36"). A zero
 * payout, or one that would render as $0.00, leaves the card area empty.
 * The same `results[]` place and payout the old place / Won pills used.
 */
import { ordinalPlace } from "./tournamentFinish";
import { floorPrizeCents, parsePrizeMicro } from "./prizeDisplay";
import { hasContent, hasValue } from "./guards";

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
