import { useEffect, useRef, useCallback, useState } from "react";
import type { NetworkEndpoints } from "../../context/NetworkContext";
import { startNewHand } from "./startNewHand";
import { getAutoNewHandEnabled } from "../../utils/urlParams";
import { isNullish, hasValue } from "../../utils/guards";

// Hold on the showdown for a beat before auto-dealing so the result is actually
// visible (gateway transport delivers the next hand in ~150ms otherwise). During
// this window the panel shows a "Dealing hand #X…" indicator. See ui#443.
const AUTO_NEW_HAND_DELAY_MS = 2000;

/**
 * Hook to automatically trigger new hand when the current hand ends.
 *
 * Auto-new-hand is enabled by default and can be disabled via URL query param:
 * - ?autonewhand=false -> disables auto-new-hand
 * - ?autonewhand=true or no param -> enables auto-new-hand (default)
 *
 * The `enabled` parameter, when provided, overrides the URL query param.
 * It is reactive — toggling it mid-session takes effect immediately.
 *
 * When enabled, this hook will automatically trigger the new hand action when:
 * 1. The user has the NEW_HAND action in their legal actions
 * 2. It is the user's turn
 * 3. Auto-new-hand has not already been triggered for this opportunity
 *
 * @param tableId - The table/game ID
 * @param network - The network configuration
 * @param hasNewHandAction - Whether the NEW_HAND action is available in legal actions
 * @param isUsersTurn - Whether it is currently the user's turn
 * @param onNewHandStarted - Optional callback when auto-new-hand starts
 * @param onNewHandComplete - Optional callback when auto-new-hand completes
 * @param onNewHandError - Optional callback when auto-new-hand fails
 * @param enabled - Optional override for the URL param setting (reactive)
 * @returns `{ isDealingNewHand }` — true during the pre-deal countdown and the
 *          deal request, so the UI can show a "Dealing hand #X…" indicator.
 */
export function useAutoNewHand(
    tableId: string,
    network: NetworkEndpoints,
    hasNewHandAction: boolean,
    isUsersTurn: boolean,
    onNewHandStarted?: () => void,
    onNewHandComplete?: (txHash: string) => void,
    onNewHandError?: (error: Error) => void,
    enabled?: boolean
): { isDealingNewHand: boolean } {
    // Track if we've already triggered new hand for this opportunity
    const hasTriggeredRef = useRef<boolean>(false);
    // Track if new hand is currently in progress to prevent duplicate calls
    const isProcessingRef = useRef<boolean>(false);
    // Check if auto-new-hand is enabled — prefer the reactive `enabled` prop, fall back to URL param
    const autoNewHandEnabledRef = useRef<boolean>(enabled ?? getAutoNewHandEnabled());
    // Pending pre-deal countdown timer.
    const delayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    // Drives the "Dealing hand #X…" indicator (countdown + deal request).
    const [isDealingNewHand, setIsDealingNewHand] = useState<boolean>(false);

    // Keep the ref up-to-date when the reactive `enabled` prop changes
    useEffect(() => {
        if (!isNullish(enabled)) {
            autoNewHandEnabledRef.current = enabled;
        }
    }, [enabled]);

    const triggerAutoNewHand = useCallback(async () => {
        if (!tableId || isProcessingRef.current) {
            return;
        }

        isProcessingRef.current = true;
        onNewHandStarted?.();

        try {
            const result = await startNewHand(tableId, network);
            onNewHandComplete?.(result.hash);
        } catch (error) {
            console.error("Auto-new-hand failed:", error);
            onNewHandError?.(error instanceof Error ? error : new Error(String(error)));
        } finally {
            isProcessingRef.current = false;
            setIsDealingNewHand(false);
        }
    }, [tableId, network, onNewHandStarted, onNewHandComplete, onNewHandError]);

    /* eslint-disable react-hooks/set-state-in-effect */
    useEffect(() => {
        // Check all conditions for auto-new-hand
        const shouldAutoNewHand =
            autoNewHandEnabledRef.current &&
            hasNewHandAction &&
            isUsersTurn &&
            !hasTriggeredRef.current &&
            !isProcessingRef.current;

        if (shouldAutoNewHand) {
            hasTriggeredRef.current = true;
            // Show the showdown for AUTO_NEW_HAND_DELAY_MS, surfacing the
            // "Dealing hand #X…" indicator, then deal the next hand.
            setIsDealingNewHand(true);
            delayTimerRef.current = setTimeout(() => {
                delayTimerRef.current = null;
                triggerAutoNewHand();
            }, AUTO_NEW_HAND_DELAY_MS);
        }

        // New-hand opportunity gone (a hand started — by us or another player).
        // Reset so the next END re-arms, and cancel any pending countdown.
        if (!hasNewHandAction) {
            hasTriggeredRef.current = false;
            if (hasValue(delayTimerRef.current)) {
                clearTimeout(delayTimerRef.current);
                delayTimerRef.current = null;
            }
            setIsDealingNewHand(false);
        }
    }, [hasNewHandAction, isUsersTurn, triggerAutoNewHand]);
    /* eslint-enable react-hooks/set-state-in-effect */

    // Cancel a pending countdown on unmount.
    useEffect(
        () => () => {
            if (hasValue(delayTimerRef.current)) {
                clearTimeout(delayTimerRef.current);
            }
        },
        []
    );

    return { isDealingNewHand };
}
