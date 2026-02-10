import { getSigningClient } from "../../utils/cosmos/client";
import type { NetworkEndpoints } from "../../context/NetworkContext";
import type { PlayerActionResult } from "../../types";

/**
 * Post big blind in a poker game using Cosmos SDK SigningCosmosClient.
 *
 * @param tableId - The ID of the table (game ID on Cosmos) where the action will be performed
 * @param amount - The big blind amount in micro-units as bigint (10^6 precision)
 * @param network - The current network configuration from NetworkContext
 * @returns Promise with PlayerActionResult containing transaction details
 * @throws Error if Cosmos wallet is not initialized or if the action fails
 */
export async function postBigBlind(tableId: string, amount: bigint, network: NetworkEndpoints): Promise<PlayerActionResult> {
    const { signingClient, userAddress } = await getSigningClient(network);

    console.log("🎰 Post big blind on Cosmos blockchain");
    console.log("  Player:", userAddress);
    console.log("  Game ID:", tableId);
    console.log("  Big blind amount:", amount.toString());

    const transactionHash = await signingClient.performAction(
        tableId,
        "post-big-blind",
        amount
    );

    console.log("✅ Post big blind transaction submitted:", transactionHash);

    return {
        hash: transactionHash,
        gameId: tableId,
        action: "post-big-blind",
        amount: amount.toString()
    };
}
