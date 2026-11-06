import { useEffect, useMemo, useRef, useState } from "react";
import type { TexasHoldemStateDTO } from "@block52/poker-vm-sdk";
import type { WinnerInfo, WinnerInfoReturn } from "../../types/index";
import { useGameStateContext } from "../../context/GameStateContext";
import { useCompletedHandView } from "../../context/CompletedHandContext";
import {
    SHOW_LIVE_HAND,
    decideCompletedHand,
    filterCelebratingWinners,
    handEndedAtMs,
    readCelebrationClock,
    writeCelebrationClock,
    type CelebrationClock,
    type CompletedHandView
} from "../../utils/completedHandCelebration";
import { hasContent, hasElements, isNullish } from "../../utils/guards";
import { useWinnerInfo } from "./useWinnerInfo";

export { CompletedHandProvider } from "../../context/CompletedHandContext";

/**
 * Owns the win-celebration clock for the rendered table.
 *
 * The chain snapshot at `round=end` does not change when nobody deals the next
 * hand, so a render-only timer would restart on every identical frame. The
 * clock is recorded once (and stored for this tab) and the timeout is armed
 * for that absolute deadline only.
 */
export function useCompletedHandCelebration(tableId: string | undefined, isReplayMode: boolean): CompletedHandView {
    const { gameState } = useGameStateContext();
    const [now, setNow] = useState(() => Date.now());
    const memoryRef = useRef<CelebrationClock | null>(null);
    const watchedRef = useRef(false);
    const tableRef = useRef<string | undefined>(undefined);
    const storedRef = useRef<CelebrationClock | null>(null);

    if (tableRef.current !== tableId) {
        tableRef.current = tableId;
        memoryRef.current = null;
        watchedRef.current = false;
        storedRef.current = hasContent(tableId) ? readCelebrationClock(window.sessionStorage, tableId) : null;
    }

    const fingerprint = completedHandFingerprint(gameState);

    const decision = useMemo(() => {
        if (isReplayMode || !gameState) return { view: SHOW_LIVE_HAND, clock: memoryRef.current };
        const previous = memoryRef.current ?? storedRef.current;
        const next = decideCompletedHand({
            now,
            handNumber: gameState.handNumber,
            round: gameState.round,
            winners: gameState.winners,
            seated: gameState.players,
            handEndedAt: handEndedAtMs(gameState.previousActions),
            previous,
            watched: watchedRef.current
        });
        memoryRef.current = next.clock;
        storedRef.current = null;
        return next;
        // fingerprint stands in for the snapshot fields decideCompletedHand reads.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fingerprint, now, isReplayMode, tableId]);

    // Only a snapshot this client has actually rendered counts as "watched".
    // The loading frame before game state arrives must not, or a stale end
    // snapshot that lands next would look like a run-out the viewer just saw.
    useEffect(() => {
        if (gameState) watchedRef.current = true;
    });

    const celebrateUntil = decision.view.celebrateUntil;
    useEffect(() => {
        if (isNullish(celebrateUntil)) return;
        const delay = Math.max(0, celebrateUntil - Date.now());
        const timer = window.setTimeout(() => setNow(Date.now()), delay);
        return () => window.clearTimeout(timer);
    }, [celebrateUntil]);

    const clockSerial = decision.view.clockSerial;
    useEffect(() => {
        if (!hasContent(tableId) || isNullish(memoryRef.current) || isNullish(clockSerial)) return;
        writeCelebrationClock(window.sessionStorage, tableId, memoryRef.current);
    }, [tableId, clockSerial]);

    return decision.view;
}

function completedHandFingerprint(gameState: TexasHoldemStateDTO | null | undefined): string {
    if (!gameState) return "";
    const winners = (gameState.winners ?? [])
        .map(winner => `${winner.seat}:${(winner.address ?? "").toLowerCase()}`)
        .sort()
        .join(",");
    const seated = (gameState.players ?? [])
        .map(player => `${player.seat}:${(player.address ?? "").toLowerCase()}`)
        .sort()
        .join(",");
    const endedAt = handEndedAtMs(gameState.previousActions);
    return `${gameState.handNumber}|${gameState.round}|${winners}|${seated}|${isNullish(endedAt) ? "" : endedAt}`;
}

/**
 * Winner info the felt should paint. History and the last-hand capture keep
 * the unfiltered snapshot via {@link useWinnerInfo}.
 */
export function useVisibleWinnerInfo(): WinnerInfoReturn {
    const raw = useWinnerInfo();
    const decision = useCompletedHandView();
    return useMemo(() => {
        if (isNullish(decision) || isNullish(decision.activeWinnerAddresses)) return raw;
        const winnerInfo = filterCelebratingWinners(raw.winnerInfo, decision.activeWinnerAddresses);
        const winnerBySeat = new Map<number, WinnerInfo>();
        if (hasElements(winnerInfo)) {
            for (const winner of winnerInfo) winnerBySeat.set(winner.seat, winner);
        }
        return { winnerInfo, winnerBySeat, error: raw.error };
    }, [raw, decision]);
}

