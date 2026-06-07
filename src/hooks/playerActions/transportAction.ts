/**
 * Transport-aware action executor — the single funnel every per-action
 * helper (callHand, foldHand, ...) routes through (ui#440 PR 2).
 *
 * chain (default): SDK performActionSync, exactly as before.
 * gateway: EIP-191-signed POST to the gateway's /actions (request/response
 * per the #433 lesson); the table's state update arrives on the gateway
 * socket. Hand-boundary actions (deal/new-hand) stay chain-direct even in
 * gateway mode — the chain is the entropy/deck anchor (poker-vm#2221).
 *
 * These helpers are plain async functions (no React context), so the
 * gateway path reads the action index from the latest game state snapshot
 * published by GameStateContext via setLatestGameState().
 */
import { NonPlayerActionType, TexasHoldemStateDTO } from "@block52/poker-vm-sdk";

import type { NetworkEndpoints } from "../../context/NetworkContext";
import type { PlayerActionResult } from "../../types";
import { getSigningClient } from "../../utils/cosmos/client";
import { signActionMessage } from "../../utils/cosmos/signing";
import { getGameTransport, getGatewayApi } from "../../utils/gameTransport";

let latestGameState: TexasHoldemStateDTO | undefined;

/** Published by GameStateContext on every state update. */
export function setLatestGameState(gameState: TexasHoldemStateDTO | undefined): void {
    latestGameState = gameState;
}

/**
 * Next action index for a player not yet seated (join): every seated
 * player's legalActions carry the table's next index; an empty table
 * starts at 1.
 */
export function nextActionIndex(gameState: TexasHoldemStateDTO | undefined): number {
    for (const player of gameState?.players ?? []) {
        const index = player.legalActions?.[0]?.index;
        if (index !== undefined) {
            return index;
        }
    }
    return 1;
}

/** Latest snapshot, for callers that resolve their own index (join). */
export function getLatestGameState(): TexasHoldemStateDTO | undefined {
    return latestGameState;
}

/** Hand-boundary actions anchor to the chain even in gateway mode (poker-vm#2221). */
const CHAIN_ANCHORED_ACTIONS = new Set<string>([NonPlayerActionType.DEAL, NonPlayerActionType.NEW_HAND]);

export async function executeTransportAction(
    tableId: string,
    action: string,
    amount: bigint,
    network: NetworkEndpoints,
    data?: string
): Promise<PlayerActionResult> {
    if (getGameTransport() === "gateway" && !CHAIN_ANCHORED_ACTIONS.has(action)) {
        const address = localStorage.getItem("user_cosmos_address");
        const currentPlayer = latestGameState?.players?.find(p => p.address === address);
        const actionIndex = currentPlayer?.legalActions?.[0]?.index;
        if (actionIndex === undefined) {
            // Per Commandment 7: surface it — no guessed indices.
            throw new Error(`No legal action index available for ${action} — game state may be stale`);
        }
        return executeGatewayAction(tableId, action, actionIndex, amount, data ?? "");
    }

    const { signingClient } = await getSigningClient(network);
    const transactionHash = await signingClient.performActionSync(tableId, action, amount, data);
    return {
        hash: transactionHash,
        gameId: tableId,
        action,
        amount: amount.toString()
    };
}

export async function executeGatewayAction(tableId: string, action: string, actionIndex: number, amount: bigint, data: string): Promise<PlayerActionResult> {
    const address = localStorage.getItem("user_cosmos_address");
    if (!address) {
        throw new Error("No Block52 wallet address found. Please connect your wallet.");
    }

    const amountString = amount.toString();
    const timestamp = Date.now();
    const signature = await signActionMessage(tableId, action, actionIndex, amountString, timestamp, data);
    if (!signature) {
        throw new Error("Failed to sign action — wallet mnemonic unavailable");
    }

    const response = await getGatewayApi().submitAction({
        gameId: tableId,
        action,
        index: actionIndex,
        amount: amountString,
        timestamp,
        address,
        signature,
        data,
        clientTs: Date.now()
    });

    if (response.type !== "ack") {
        throw new Error(response.error || "Gateway rejected the action");
    }

    return {
        // No chain tx hash on the optimistic path; the signed payload is the
        // action's identity until chain settlement lands (poker-vm#2221).
        hash: `gateway:${tableId}:${actionIndex}`,
        gameId: tableId,
        action,
        amount: amountString
    };
}
