import { NonPlayerActionType } from "@block52/poker-vm-sdk";
import type { NetworkEndpoints } from "../../context/NetworkContext";
import type { PlayerActionResult } from "../../types";
import { generateShuffledDeck } from "../../utils/deckShuffle";
import { getGameTransport } from "../../utils/gameTransport";
import { executeTransportAction } from "./transportAction";

/**
 * Start a new hand at a poker table using Cosmos SDK SigningCosmosClient.
 *
 * @param tableId - The ID of the table (game ID on Cosmos) where to start a new hand
 * @param network - The current network configuration from NetworkContext
 * @returns Promise with PlayerActionResult containing transaction details
 * @throws Error if Cosmos wallet is not initialized or if the action fails
 */
export async function startNewHand(tableId: string, network: NetworkEndpoints): Promise<PlayerActionResult> {
    // Gateway test mode: no chain VRF, so the client supplies a webcrypto
    // shuffle (poker-vm#2221 / pokerchain#217 replaces this).
    const data = getGameTransport() === "gateway" ? `deck=${generateShuffledDeck()}` : undefined;
    return executeTransportAction(tableId, NonPlayerActionType.NEW_HAND, 0n, network, data);
}
