import { useCallback } from "react";
import { useGameActions } from "../../context/gameState/GameActionsContext";
import { useGameData } from "../../context/gameState/GameDataContext";
import { useGameUI } from "../../context/gameState/GameUIContext";
import { useNetwork, NetworkEndpoints } from "../../context/NetworkContext";
import { getSigningClient } from "../../utils/cosmos/client";
import { signActionMessage } from "../../utils/cosmos/signing";
import { getGameTransport, getGatewayApi } from "../../utils/gameTransport";
import type { PlayerActionResult } from "../../types";
import { PlayerActionType, NonPlayerActionType, TexasHoldemStateDTO } from "@block52/poker-vm-sdk";

/**
 * Actions that can be performed optimistically.
 * Uses SDK enums for type safety.
 */
export const OptimisticAction = {
    // Player actions (from PlayerActionType)
    FOLD: PlayerActionType.FOLD,
    CHECK: PlayerActionType.CHECK,
    BET: PlayerActionType.BET,
    CALL: PlayerActionType.CALL,
    RAISE: PlayerActionType.RAISE,
    MUCK: PlayerActionType.MUCK,
    SHOW: PlayerActionType.SHOW,
    // Non-player actions (from NonPlayerActionType)
    SIT_IN: NonPlayerActionType.SIT_IN,
    SIT_OUT: NonPlayerActionType.SIT_OUT,
} as const;

export type OptimisticActionType = typeof OptimisticAction[keyof typeof OptimisticAction];

/**
 * Actions that require an amount parameter
 */
const ACTIONS_REQUIRING_AMOUNT: Set<OptimisticActionType> = new Set([
    OptimisticAction.BET,
    OptimisticAction.CALL,
    OptimisticAction.RAISE,
]);

interface UseOptimisticActionReturn {
    performOptimisticAction: (
        tableId: string,
        action: OptimisticActionType,
        amount?: bigint
    ) => Promise<PlayerActionResult>;
    isPending: boolean;
}

/**
 * Execute a poker action on the Cosmos blockchain.
 *
 * Uses the SDK's performActionSync method (CheckTx-only, returns in
 * ~50-100ms) rather than performAction (waits for block inclusion,
 * ~5s with current chain config). The authoritative state arrives
 * via the WebSocket push once the block commits; the SDK throws here
 * only on CheckTx rejection (invalid signature, insufficient gas,
 * malformed message) — that's the immediate rollback signal.
 *
 * The "no WS confirmation within N seconds" timeout-based rollback
 * is a separate enhancement tracked as a follow-up on block52/ui#359.
 *
 * Refs: block52/ui#359, block52/poker-vm#2104.
 */
async function executeAction(
    tableId: string,
    action: OptimisticActionType,
    amount: bigint,
    network: NetworkEndpoints
): Promise<PlayerActionResult> {
    const { signingClient } = await getSigningClient(network);

    const transactionHash = await signingClient.performActionSync(
        tableId,
        action,
        amount
    );

    return {
        hash: transactionHash,
        gameId: tableId,
        action: action
    };
}

/**
 * Execute a poker action via the optimistic WS Action Gateway (ui#440).
 *
 * Request/response per the #433 lesson: POST /actions returns the ack plus
 * the post-action state in ~150ms; the table's authoritative state update
 * arrives on the gateway socket (GameStateContext). The action is EIP-191
 * signed over the gateway's canonical payload — including the monotonic
 * action index from the player's legalActions (replay protection).
 */
async function executeGatewayAction(
    tableId: string,
    action: OptimisticActionType,
    amount: bigint,
    gameState: TexasHoldemStateDTO | undefined
): Promise<PlayerActionResult> {
    const address = localStorage.getItem("user_cosmos_address");
    if (!address) {
        throw new Error("No Block52 wallet address found. Please connect your wallet.");
    }

    const currentPlayer = gameState?.players?.find(p => p.address === address);
    const actionIndex = currentPlayer?.legalActions?.[0]?.index;
    if (actionIndex === undefined) {
        // Per Commandment 7: surface it — no guessed indices.
        throw new Error(`No legal action index available for ${action} — game state may be stale`);
    }

    const amountString = amount.toString();
    const timestamp = Date.now();
    const data = "";
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

/**
 * Hook that wraps player actions with optimistic updates.
 *
 * This hook:
 * 1. Sends the action via WebSocket for immediate broadcast to all subscribers
 * 2. Executes the actual blockchain transaction via SDK
 * 3. The WebSocket server will broadcast "pending" state immediately
 * 4. When the block confirms, the server broadcasts "confirmed" state
 *
 * Usage:
 *   const { performOptimisticAction } = useOptimisticAction();
 *   await performOptimisticAction(tableId, OptimisticAction.FOLD);
 *   await performOptimisticAction(tableId, OptimisticAction.RAISE, 100n);
 */
export function useOptimisticAction(): UseOptimisticActionReturn {
    const { sendAction } = useGameActions();
    const { gameState } = useGameData();
    const { pendingAction } = useGameUI();
    const { currentNetwork } = useNetwork();

    const performOptimisticAction = useCallback(
        async (
            tableId: string,
            action: OptimisticActionType,
            amount?: bigint
        ): Promise<PlayerActionResult> => {

            // Validate amount for actions that require it
            if (ACTIONS_REQUIRING_AMOUNT.has(action) && amount === undefined) {
                throw new Error(`Amount required for ${action}`);
            }

            // Gateway transport (ui#440): one signed request/response — the
            // gateway validates, applies via the PVM, broadcasts to the
            // table socket, and returns the ack. No pending announce needed:
            // the broadcast IS the validated post-action state.
            if (getGameTransport() === "gateway") {
                return executeGatewayAction(tableId, action, amount ?? 0n, gameState);
            }

            // Chain transport (default):
            // Step 1: Send via WebSocket for immediate optimistic broadcast.
            // If this fails, fall through to the SDK transaction anyway — the WS
            // broadcast is purely a latency optimization for other subscribers.
            try {
                await sendAction(action, amount?.toString());
            } catch {
                // intentional: WS broadcast is best-effort
            }

            // Step 2: Execute the blockchain transaction via SDK
            const result = await executeAction(
                tableId,
                action,
                amount ?? 0n,
                currentNetwork
            );

            return result;
        },
        [sendAction, gameState, currentNetwork]
    );

    return {
        performOptimisticAction,
        isPending: pendingAction !== null
    };
}
