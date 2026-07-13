import { useEffect, useRef, useCallback, useState } from "react";
import { NonPlayerActionType } from "@block52/poker-vm-sdk";
import type { NetworkEndpoints } from "../../context/NetworkContext";
import { startNewHand } from "./startNewHand";
import { getLatestGameState } from "./transportAction";
import { useGameEventsContext } from "../../context/gameState/GameEventsContext";
import { getAutoNewHandEnabled } from "../../utils/urlParams";
import { STORAGE_KEYS } from "../../constants/storageKeys";
import { isNullish } from "../../utils/guards";

/**
 * Hook to automatically trigger a new hand when the current hand ends.
 *
 * Auto-new-hand is enabled by default and can be disabled via URL query param:
 * - ?autonewhand=false -> disables auto-new-hand
 * - ?autonewhand=true or no param -> enables auto-new-hand (default)
 *
 * The `enabled` parameter, when provided, overrides the URL query param.
 * It is reactive — toggling it mid-session takes effect immediately.
 *
 * When enabled, this hook triggers the new-hand action when:
 * 1. The user has the NEW_HAND action in their legal actions
 * 2. It is the user's turn
 * 3. Auto-new-hand has not already been triggered for this opportunity
 *
 * WS Action Bus note — showdown pacing lives in the bus, not here.
 * The hook no longer runs its own 2000ms pre-deal timer (the old ui#443 hack).
 * Showdown visibility is now owned by the
 * `showdownHold` decorator, which holds the RENDERED track for SHOWDOWN_HOLD_MS
 * after a `handEnded` commit, keeping the winner banner up while the next hand
 * deals behind it.
 *
 * Because dealing a new hand is an action SUBMISSION, its trigger inputs
 * (`hasNewHandAction` / `isUsersTurn`) are derived from the LOGICAL track
 * (getLatestGameState — the freshest ingested snapshot), NOT the paced rendered
 * state. This is the plan's two-track invariant: submission decisions must never
 * read paced state, or a delayed rendered snapshot would submit against a stale
 * action index. The committed bus item (useGameEventsContext) is used only as the
 * reactive tick that re-runs the check on each commit; the DATA it reads is
 * always the logical snapshot. So the deal fires promptly while the rendered
 * showdown holds — the two are decoupled and never double-delay.
 *
 * @param tableId - The table/game ID
 * @param network - The network configuration
 * @param onNewHandStarted - Optional callback when auto-new-hand starts
 * @param onNewHandComplete - Optional callback when auto-new-hand completes
 * @param onNewHandError - Optional callback when auto-new-hand fails
 * @param enabled - Optional override for the URL param setting (reactive)
 * @returns `{ isDealingNewHand }` — true from the handEnded commit until the next
 *          hand starts (or the deal fails), so the UI can show a
 *          "Dealing hand #X…" indicator during the showdown hold.
 */
export function useAutoNewHand(
    tableId: string,
    network: NetworkEndpoints,
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
    // Drives the "Dealing hand #X…" indicator (showdown hold + deal request).
    const [isDealingNewHand, setIsDealingNewHand] = useState<boolean>(false);

    // Local player address — read once (localStorage is synchronous). Used to
    // resolve the local player's legal actions on the logical track.
    const [localAddress] = useState<string | null>(
        () => localStorage.getItem(STORAGE_KEYS.cosmosAddress)?.toLowerCase() ?? null
    );

    // Reactive tick: re-run the deal check on every committed bus item. The item
    // itself is NOT read for the decision — getLatestGameState() (logical track)
    // is — it is only the signal that a new frame has arrived.
    const { latestItem } = useGameEventsContext();

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
            // Leave isDealingNewHand true on success — it is cleared by the effect
            // below when the next hand starts (hasNewHandAction goes false), so the
            // indicator stays up for the whole showdown hold, not just the ~ms it
            // takes to submit the deal.
        } catch (error) {
            console.error("Auto-new-hand failed:", error);
            // Failure — clear the indicator so the UI recovers.
            setIsDealingNewHand(false);
            onNewHandError?.(error instanceof Error ? error : new Error(String(error)));
        } finally {
            isProcessingRef.current = false;
        }
    }, [tableId, network, onNewHandStarted, onNewHandComplete, onNewHandError]);

    useEffect(() => {
        // `latestItem` is the reactive tick only; the decision reads the LOGICAL
        // track so the deal is never delayed by rendered pacing.
        void latestItem;
        const snapshot = getLatestGameState();
        const localPlayer = snapshot?.players?.find(player => player.address?.toLowerCase() === localAddress);
        const hasNewHandAction = !!localPlayer?.legalActions?.some(action => action.action === NonPlayerActionType.NEW_HAND);
        const isUsersTurn = !!localPlayer && snapshot?.nextToAct === localPlayer.seat;

        const shouldAutoNewHand =
            autoNewHandEnabledRef.current &&
            hasNewHandAction &&
            isUsersTurn &&
            !hasTriggeredRef.current &&
            !isProcessingRef.current;

        if (shouldAutoNewHand) {
            hasTriggeredRef.current = true;
            // Surface the "Dealing hand #X…" indicator, then deal immediately —
            // the showdownHold decoration keeps the showdown visible on the
            // rendered track while the next hand deals behind it.
            setIsDealingNewHand(true);
            triggerAutoNewHand();
        }

        // New-hand opportunity gone (a hand started — by us or another player).
        // Reset so the next END re-arms, and drop the dealing indicator.
        if (!hasNewHandAction) {
            hasTriggeredRef.current = false;
            setIsDealingNewHand(false);
        }
    }, [latestItem, localAddress, triggerAutoNewHand]);

    return { isDealingNewHand };
}
