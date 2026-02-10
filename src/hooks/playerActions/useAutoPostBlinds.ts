import { useEffect, useRef, useCallback } from "react";
import type { NetworkEndpoints } from "../../context/NetworkContext";
import { postSmallBlind } from "./postSmallBlind";
import { postBigBlind } from "./postBigBlind";
import { getAutoPostBlindsEnabled } from "../../utils/urlParams";

/**
 * Hook to automatically post blinds when conditions are met.
 *
 * Auto-post blinds is enabled by default and can be disabled via URL query param:
 * - ?autoblinds=false -> disables auto-post blinds
 * - ?autoblinds=true or no param -> enables auto-post blinds (default)
 *
 * When enabled, this hook will automatically post the small or big blind when:
 * 1. The user has the SMALL_BLIND or BIG_BLIND action in their legal actions
 * 2. It is the user's turn
 * 3. The blind has not already been posted for this opportunity
 *
 * @param tableId - The table/game ID
 * @param network - The network configuration
 * @param hasSmallBlindAction - Whether the SMALL_BLIND action is available in legal actions
 * @param hasBigBlindAction - Whether the BIG_BLIND action is available in legal actions
 * @param smallBlindAmount - The small blind amount in micro-units as bigint
 * @param bigBlindAmount - The big blind amount in micro-units as bigint
 * @param isUsersTurn - Whether it is currently the user's turn
 * @param onBlindStarted - Optional callback when auto-post blind starts
 * @param onBlindComplete - Optional callback when auto-post blind completes
 * @param onBlindError - Optional callback when auto-post blind fails
 */
export function useAutoPostBlinds(
    tableId: string,
    network: NetworkEndpoints,
    hasSmallBlindAction: boolean,
    hasBigBlindAction: boolean,
    smallBlindAmount: bigint,
    bigBlindAmount: bigint,
    isUsersTurn: boolean,
    onBlindStarted?: (blindType: "small" | "big") => void,
    onBlindComplete?: (blindType: "small" | "big", txHash: string) => void,
    onBlindError?: (error: Error) => void
): void {
    // Track if we've already triggered blind posting for this opportunity
    const hasTriggeredSmallBlindRef = useRef<boolean>(false);
    const hasTriggeredBigBlindRef = useRef<boolean>(false);
    // Track if blind posting is currently in progress to prevent duplicate calls
    const isProcessingRef = useRef<boolean>(false);
    // Check if auto-post blinds is enabled (cached on first render)
    const autoPostBlindsEnabledRef = useRef<boolean>(getAutoPostBlindsEnabled());

    const triggerPostSmallBlind = useCallback(async () => {
        if (!tableId || isProcessingRef.current || smallBlindAmount === 0n) {
            return;
        }

        isProcessingRef.current = true;
        onBlindStarted?.("small");

        try {
            console.log("🤖 Auto-post small blind triggered for table:", tableId);
            const result = await postSmallBlind(tableId, smallBlindAmount, network);
            console.log("✅ Auto-post small blind completed:", result.hash);
            onBlindComplete?.("small", result.hash);
        } catch (error) {
            console.error("❌ Auto-post small blind failed:", error);
            onBlindError?.(error instanceof Error ? error : new Error(String(error)));
        } finally {
            isProcessingRef.current = false;
        }
    }, [tableId, network, smallBlindAmount, onBlindStarted, onBlindComplete, onBlindError]);

    const triggerPostBigBlind = useCallback(async () => {
        if (!tableId || isProcessingRef.current || bigBlindAmount === 0n) {
            return;
        }

        isProcessingRef.current = true;
        onBlindStarted?.("big");

        try {
            console.log("🤖 Auto-post big blind triggered for table:", tableId);
            const result = await postBigBlind(tableId, bigBlindAmount, network);
            console.log("✅ Auto-post big blind completed:", result.hash);
            onBlindComplete?.("big", result.hash);
        } catch (error) {
            console.error("❌ Auto-post big blind failed:", error);
            onBlindError?.(error instanceof Error ? error : new Error(String(error)));
        } finally {
            isProcessingRef.current = false;
        }
    }, [tableId, network, bigBlindAmount, onBlindStarted, onBlindComplete, onBlindError]);

    useEffect(() => {
        // Check conditions for auto-post small blind
        const shouldPostSmallBlind =
            autoPostBlindsEnabledRef.current &&
            hasSmallBlindAction &&
            isUsersTurn &&
            !hasTriggeredSmallBlindRef.current &&
            !isProcessingRef.current;

        if (shouldPostSmallBlind) {
            hasTriggeredSmallBlindRef.current = true;
            triggerPostSmallBlind();
        }

        // Reset the trigger flag when small blind action is no longer available
        if (!hasSmallBlindAction) {
            hasTriggeredSmallBlindRef.current = false;
        }
    }, [hasSmallBlindAction, isUsersTurn, triggerPostSmallBlind]);

    useEffect(() => {
        // Check conditions for auto-post big blind
        const shouldPostBigBlind =
            autoPostBlindsEnabledRef.current &&
            hasBigBlindAction &&
            isUsersTurn &&
            !hasTriggeredBigBlindRef.current &&
            !isProcessingRef.current;

        if (shouldPostBigBlind) {
            hasTriggeredBigBlindRef.current = true;
            triggerPostBigBlind();
        }

        // Reset the trigger flag when big blind action is no longer available
        if (!hasBigBlindAction) {
            hasTriggeredBigBlindRef.current = false;
        }
    }, [hasBigBlindAction, isUsersTurn, triggerPostBigBlind]);
}
