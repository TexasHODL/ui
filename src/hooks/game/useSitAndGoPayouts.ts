import { useMemo } from "react";
import { GameFormat } from "@block52/poker-vm-sdk";
import { useGameStateContext } from "../../context/GameStateContext";
import { hasElements } from "../../utils/guards";

export interface SitAndGoPayoutPlace {
    place: number;
    percentBasisPoints: number;
    payout: string;
}

export interface SitAndGoPayoutsReturn {
    isSitAndGo: boolean;
    prizePool: string | null;
    places: SitAndGoPayoutPlace[];
}

const EMPTY: SitAndGoPayoutsReturn = { isSitAndGo: false, prizePool: null, places: [] };

/**
 * SNG payout structure for the Payouts panel.
 *
 * Reads the PVM-authored `payouts[]` straight from the game state — the PVM is
 * the single payout authority (poker-vm#2411) and resolves the exact per-place
 * amounts (correct curve + frozen entrant count + rounding drift). The UI must
 * NOT recompute the split from its own curve table; that third source of truth
 * drifted from what actually pays (poker-vm#2405, ui#497 — a 6-max paid top 3
 * while the panel showed top 2). `percentBasisPoints` is derived from the
 * authoritative amounts for display only.
 */
export const useSitAndGoPayouts = (): SitAndGoPayoutsReturn => {
    const { gameState, gameFormat } = useGameStateContext();

    return useMemo(() => {
        if (gameFormat !== GameFormat.SIT_AND_GO) return EMPTY;

        const payouts = gameState?.payouts;
        if (!hasElements(payouts)) {
            return { isSitAndGo: true, prizePool: null, places: [] };
        }

        const prizePool = payouts.reduce((sum, p) => sum + BigInt(p.amount), 0n);
        if (prizePool <= 0n) {
            return { isSitAndGo: true, prizePool: null, places: [] };
        }

        const places: SitAndGoPayoutPlace[] = payouts.map(p => ({
            place: p.place,
            // Display-only: share of the resolved pool, in basis points.
            percentBasisPoints: Number((BigInt(p.amount) * 10000n) / prizePool),
            payout: p.amount
        }));

        return {
            isSitAndGo: true,
            prizePool: prizePool.toString(),
            places
        };
    }, [gameFormat, gameState?.payouts]);
};
