/**
 * Captures the showdown summary of the hand that just ended into the
 * lastHandResult store (stop-gap for fast showdowns — ui feedback 22 Sep 2026).
 *
 * Must be called from a component that is ALWAYS mounted on the table page
 * (Table itself): the History sidebar unmounts while closed, and the snapshot
 * forgets the winners as soon as the next hand deals, so the capture window is
 * the rendered END round — which the bus's showdownHold keeps on screen for a
 * couple of seconds even on instant all-in runouts.
 */

import { useEffect, useRef } from "react";
import { TexasHoldemRound, TexasHoldemStateDTO } from "@block52/poker-vm-sdk";
import { captureFinishingHand, createHandRevealLedger, FinishingHand, HandRevealLedger, observeRevealedCards, saveFinishingHand } from "../../utils/finishingHand";
import { useGameStateContext } from "../../context/GameStateContext";
import { useWinnerInfo } from "./useWinnerInfo";
import { shouldShowWinnerSummary } from "../../components/ActionsLog.utils";
import { getShowdownSummaryLines } from "../../utils/showdownSummary";
import { setLastHandResult } from "../../utils/lastHandResult";
import { hasElements } from "../../utils/guards";
import { STORAGE_KEYS } from "../../constants/storageKeys";

export const useLastHandResultCapture = (tableId: string | undefined): void => {
    // Rendered track on purpose: it is what the user saw, and END is held on it.
    const { gameState, gameVariant } = useGameStateContext();
    const { winnerInfo } = useWinnerInfo();
    const tracking = useRef<{ table?: string; seen: Set<string>; latest: FinishingHand | null; pending: Map<string, number>; ledger: HandRevealLedger; previous: TexasHoldemStateDTO | null }>({ seen: new Set(), latest: null, pending: new Map(), ledger: createHandRevealLedger(), previous: null });

    useEffect(() => {
        if (!tableId || !gameState) return;
        const results = gameState.results ?? [];
        if (tracking.current.table !== tableId) {
            // Existing placements on arrival cannot safely be linked to the current hand.
            tracking.current = { table: tableId, seen: new Set(results.map(r => r.playerId.toLowerCase())), latest: null, pending: new Map(), ledger: createHandRevealLedger(), previous: null };
            // A completed tournament's winner necessarily finished in the final hand.
            if (gameState.round === TexasHoldemRound.END) results.filter(r => r.place === 1).forEach(r => tracking.current.pending.set(r.playerId.toLowerCase(), gameState.handNumber));
        }
        const tracker = tracking.current;
        for (const result of results) {
            const address = result.playerId.toLowerCase();
            if (!tracker.seen.has(address)) tracker.pending.set(address, gameState.handNumber);
            tracker.seen.add(address);
        }
        const viewer = localStorage.getItem(STORAGE_KEYS.cosmosAddress);
        observeRevealedCards(tracker.ledger, gameState, viewer, tracker.previous);
        // END with winners is the showdown's last frame. Earlier streets are
        // remembered above and must not be published as the finishing hand.
        if (gameState.round === TexasHoldemRound.END && gameState.winners?.length) {
            tracker.latest = captureFinishingHand(gameState, {
                viewer,
                shown: tracker.ledger.shown,
                ownCards: tracker.ledger.ownCards,
                variant: gameVariant
            });
        }
        tracker.previous = gameState;
        if (tracker.latest && tracker.latest.handNumber === gameState.handNumber) {
            for (const [address, handNumber] of tracker.pending) {
                if (handNumber === tracker.latest.handNumber) saveFinishingHand(tableId, address, tracker.latest);
            }
        }
        for (const [address, handNumber] of tracker.pending) if (handNumber < gameState.handNumber) tracker.pending.delete(address);
    }, [tableId, gameState, gameVariant]);

    useEffect(() => {
        if (!tableId || !gameState) return;
        if (!shouldShowWinnerSummary(gameState, winnerInfo)) return;

        const lines = getShowdownSummaryLines(gameState, winnerInfo, gameVariant);
        if (hasElements(lines)) {
            // The store drops identical re-captures, so per-frame effect runs
            // during the END hold cost nothing.
            setLastHandResult({ tableId, handNumber: gameState.handNumber, lines });
        }
    }, [tableId, gameState, winnerInfo, gameVariant]);
};
