import { getSigningClient } from "../../utils/cosmos/client";
import { NonPlayerActionType } from "@block52/poker-vm-sdk";
import type { NetworkEndpoints } from "../../context/NetworkContext";
import type { LeaveTableResult } from "../../types";

/**
 * Leave a poker table by broadcasting MsgLeaveGame on Cosmos.
 *
 * MsgLeaveGame carries only {creator, gameId} — the chain decides the refund
 * amount from its own state (cash → stack as microunits; SNG pre-start →
 * original buy-in; SNG mid-game → no refund). The UI does NOT pass a value.
 *
 * @param tableId - The game ID on Cosmos
 * @param network - Current network configuration from NetworkContext
 * @returns Promise with LeaveTableResult containing transaction hash + action discriminator
 * @throws Error if Cosmos wallet is not initialized or if the chain rejects the leave
 */
export async function leaveTable(tableId: string, network: NetworkEndpoints): Promise<LeaveTableResult> {
    // Money-mover: always direct to chain (MsgLeaveGame does the refund). Never
    // via the gateway relay, which would forward a MsgPerformAction and skip the
    // bank movement. Matches transfers. (#467)
    const { signingClient } = await getSigningClient(network);
    const hash = await signingClient.leaveGame(tableId);
    return { hash, gameId: tableId, action: NonPlayerActionType.LEAVE };
}
