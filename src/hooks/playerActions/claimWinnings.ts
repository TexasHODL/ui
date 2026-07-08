import { getSigningClient } from "../../utils/cosmos/client";
import { getLatestGameState } from "./transportAction";
import type { NetworkEndpoints } from "../../context/NetworkContext";

export interface ClaimWinningsResult {
    hash: string;
    gameId: string;
}

/**
 * Claim a decided SNG/Tournament prize (pokerchain#239).
 *
 * Distinct from leaveTable: once a tournament starts the roster is frozen —
 * players do NOT leave. A finisher instead CLAIMS their prize-pool payout. This:
 *   1. records the hand-end state on-chain (signingClient.recordHandEnd) so the
 *      chain has the finished results to pay from, then
 *   2. settles the prize with a direct MsgLeaveGame (the chain's leaveGameSNG
 *      claim handler: looks up the caller's result, transfers, marks claimed).
 *
 * Both are direct-to-chain, signed by the claiming player's own funded account —
 * so this works with GATEWAY_CHAIN=off and never routes an SNG cash-out through
 * the gateway (the chain rejects SNG leaves relayed as MsgPerformAction).
 *
 * @throws if the wallet is not initialized or the chain rejects the claim.
 */
export async function claimWinnings(tableId: string, network: NetworkEndpoints): Promise<ClaimWinningsResult> {
    const { signingClient } = await getSigningClient(network);

    // 1. Deliver the finished results to the chain. Swallow failures: another
    //    finisher may have already recorded them, or it's transient — the
    //    results are (or will be) on-chain, so the claim proceeds either way.
    const state = getLatestGameState();
    if (state) {
        try {
            await signingClient.recordHandEnd(tableId, JSON.stringify(state));
        } catch (err) {
            console.warn("[sng] recordHandEnd skipped:", err);
        }
    }

    // 2. Settle the prize (leaveGameSNG reads results + pays + marks claimed).
    const hash = await signingClient.leaveGame(tableId);
    return { hash, gameId: tableId };
}
