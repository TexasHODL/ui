import { getSigningClient } from "../../utils/cosmos/client";
import type { NetworkEndpoints } from "../../context/NetworkContext";
import type { PlayerActionResult } from "../../types";

/**
 * Post small blind in a poker game using Cosmos SDK SigningCosmosClient.
 *
 * @param tableId - The ID of the table (game ID on Cosmos) where the action will be performed
 * @param amount - The small blind amount in micro-units as bigint (10^6 precision)
 * @param network - The current network configuration from NetworkContext
 * @returns Promise with PlayerActionResult containing transaction details
 * @throws Error if Cosmos wallet is not initialized or if the action fails
 */
export async function postSmallBlind(tableId: string, amount: bigint, network: NetworkEndpoints): Promise<PlayerActionResult> {
    const { signingClient, userAddress } = await getSigningClient(network);

    console.log("🎰 Post small blind on Cosmos blockchain");
    console.log("  Player:", userAddress);
    console.log("  Game ID:", tableId);
    console.log("  Small blind amount:", amount.toString());

    const transactionHash = await signingClient.performAction(
        tableId,
        "post-small-blind",
        amount
    );

    console.log("✅ Post small blind transaction submitted:", transactionHash);

    return {
        hash: transactionHash,
        gameId: tableId,
        action: "post-small-blind",
        amount: amount.toString()
    };
}
