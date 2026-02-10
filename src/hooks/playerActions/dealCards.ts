import { getSigningClient } from "../../utils/cosmos/client";
import type { NetworkEndpoints } from "../../context/NetworkContext";
import type { PlayerActionResult } from "../../types";

/**
 * Deal cards in a poker game using Cosmos SDK SigningCosmosClient.
 *
 * @param tableId - The ID of the table (game ID on Cosmos) where to deal cards
 * @param network - The current network configuration from NetworkContext
 * @returns Promise with PlayerActionResult containing transaction details
 * @throws Error if Cosmos wallet is not initialized or if the action fails
 */
export async function dealCards(tableId: string, network: NetworkEndpoints): Promise<PlayerActionResult> {
    const { signingClient, userAddress } = await getSigningClient(network);

    console.log("🃏 Deal cards on Cosmos blockchain");
    console.log("  Player:", userAddress);
    console.log("  Game ID:", tableId);

    const transactionHash = await signingClient.performAction(
        tableId,
        "deal",
        0n
    );

    console.log("✅ Deal cards transaction submitted:", transactionHash);

    return {
        hash: transactionHash,
        gameId: tableId,
        action: "deal"
    };
}

/**
 * Deal cards with user-provided entropy for provably fair shuffling.
 *
 * @param tableId - The ID of the table (game ID on Cosmos) where to deal cards
 * @param network - The current network configuration from NetworkContext
 * @param entropy - The entropy string (hex) to use for deck shuffling
 * @returns Promise with PlayerActionResult containing transaction details
 * @throws Error if Cosmos wallet is not initialized or if the action fails
 */
export async function dealCardsWithEntropy(
    tableId: string,
    network: NetworkEndpoints,
    entropy: string
): Promise<PlayerActionResult> {
    const { signingClient, userAddress } = await getSigningClient(network);

    console.log("🃏 Deal cards with entropy on Cosmos blockchain");
    console.log("  Player:", userAddress);
    console.log("  Game ID:", tableId);
    console.log("  Entropy:", entropy);

    const transactionHash = await signingClient.performAction(
        tableId,
        "deal",
        0n,
        entropy  // Pass entropy as optional data parameter
    );

    console.log("✅ Deal cards with entropy transaction submitted:", transactionHash);

    return {
        hash: transactionHash,
        gameId: tableId,
        action: "deal"
    };
}
