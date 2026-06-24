import { getSigningClient } from "../../utils/cosmos/client";
import { NonPlayerActionType } from "@block52/poker-vm-sdk";
import { getGameTransport } from "../../utils/gameTransport";
import { executeGatewayAction, getLatestGameState, nextActionIndex } from "./transportAction";
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
    // WS-first money-mover (#2325): under gateway transport the leave is
    // PVM-verified and applied optimistically by the gateway, which then relays
    // the player's PRE-SIGNED MsgLeaveGame (attached by executeGatewayAction →
    // signSettlementTx) for the refund.
    if (getGameTransport() === "gateway") {
        const index = nextActionIndex(getLatestGameState());
        const result = await executeGatewayAction(tableId, NonPlayerActionType.LEAVE, index, 0n, "", network);
        return { hash: result.hash, gameId: tableId, action: NonPlayerActionType.LEAVE };
    }

    // Direct-to-chain (non-gateway): broadcast MsgLeaveGame ourselves.
    const { signingClient } = await getSigningClient(network);
    const hash = await signingClient.leaveGame(tableId);
    return { hash, gameId: tableId, action: NonPlayerActionType.LEAVE };
}
