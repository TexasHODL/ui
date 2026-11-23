/**
 * Dealt-in helpers for Playing Style chain logs.
 *
 * A hand counts once, on a cash, Sit & Go, or tournament table, when the log
 * shows this player was dealt in: a real action (blind, fold, bet, call, …)
 * or a pot they won. Sitting out, joining, or leaving does not. The same hand
 * listed twice counts once. A log the node no longer has is left out, never
 * guessed as a played hand. Hands Played on the profile uses the indexer's
 * total_hands instead of this count.
 */
import type { ContributionSnapshot } from "./handContribution";
import { viewerPlayedHand } from "./handHistoryCards";
import { hasContent, hasValue } from "@block52/ui-sdk/helpers";

export interface DealtHandLog {
    /** `gameId#handNumber`. One table cannot repeat a hand number. */
    key: string;
    snapshot: ContributionSnapshot | null | undefined;
}

/** True when this public log shows the player was dealt into the hand. */
export function playerWasDealtIn(snapshot: ContributionSnapshot | null | undefined, playerId: string | undefined): boolean {
    if (!hasContent(playerId) || !hasValue(snapshot)) return false;
    return viewerPlayedHand(snapshot, playerId);
}

/**
 * Distinct hands whose log shows this player was dealt in.
 * A missing log, a blank key, or a repeated key adds nothing.
 */
export function countDealtHands(hands: readonly DealtHandLog[], playerId: string | undefined): number {
    if (!hasContent(playerId)) return 0;
    const seen = new Set<string>();
    let dealt = 0;
    for (const hand of hands) {
        if (!hasContent(hand.key) || seen.has(hand.key)) continue;
        seen.add(hand.key);
        if (playerWasDealtIn(hand.snapshot, playerId)) dealt += 1;
    }
    return dealt;
}
