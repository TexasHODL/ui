/**
 * Loading flags for the profile Stats cards that read finished hands.
 *
 * Recovering indexer-omitted MTT hands can walk every session table and every
 * current `<tournamentId>-t*` table, then confirm each candidate on the chain.
 * Biggest Pot Won and Biggest Hand Profit must not stay on an ellipsis until
 * that search finishes. Show the indexer list (and its chain logs) once it is
 * complete, then fold recovered hands in. Hands Played and Playing Style use
 * the indexer profile and do not wait on this path.
 */
export interface ProfileHistoryHandsPendingInput {
    onStatsTab: boolean;
    hasAddress: boolean;
    handListFailed: boolean;
    handListComplete: boolean;
}

/** Ellipsis for Biggest Pot Won until the indexer hand list is complete, not until MTT recovery. */
export function profileHistoryHandsPending(input: ProfileHistoryHandsPendingInput): boolean {
    return input.onStatsTab && input.hasAddress && !input.handListComplete && !input.handListFailed;
}
