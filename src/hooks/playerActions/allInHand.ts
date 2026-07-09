import { PlayerActionType } from "@block52/poker-vm-sdk";
import type { NetworkEndpoints } from "../../context/NetworkContext";
import type { PlayerActionResult } from "../../types";
import { executeTransportAction } from "./transportAction";

/**
 * Go all-in (shove the entire remaining stack) in a poker game.
 *
 * "All-in" is a FE concept, not a legal action the engine advertises: the
 * engine never returns ALL_IN from getLegalActions (poker-vm#2351). The FE
 * synthesizes the shove from the player's remaining stack and dispatches it as a
 * raw ALL_IN action — the engine accepts it via performAction regardless of the
 * legal-action surface, committing the whole stack even when neither a min-raise
 * nor a full call is otherwise expressible (short shove, poker-vm#2190/#2244).
 *
 * @param tableId - The ID of the table (game ID on Cosmos)
 * @param amount - The player's full remaining stack in micro-units as bigint (10^6 precision)
 * @param network - The current network configuration from NetworkContext
 * @returns Promise with PlayerActionResult containing transaction details
 */
export async function allInHand(tableId: string, amount: bigint, network: NetworkEndpoints): Promise<PlayerActionResult> {
    return executeTransportAction(tableId, PlayerActionType.ALL_IN, amount, network);
}
