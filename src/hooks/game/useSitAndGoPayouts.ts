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
 * Sit & Go prize structure for the Payouts panel.
 *
 * The structure is the engine's — surfaced on the game state as
 * `gameState.payouts` (absolute per-place amounts; poker-vm#2361). The UI does
 * NOT recompute a curve: doing so drifted from what the chain actually paid
 * (issue #497 — a 6-max paid top 3 while the panel showed top 2). Display
 * percentages are derived from the authoritative amounts.
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

        const places: SitAndGoPayoutPlace[] = payouts.map(p => ({
            place: p.place,
            // Derive the display % from the absolute amounts (single source of truth).
            percentBasisPoints: prizePool > 0n ? Number((BigInt(p.amount) * 10000n) / prizePool) : 0,
            payout: p.amount
        }));

        return {
            isSitAndGo: true,
            prizePool: prizePool.toString(),
            places
        };
    }, [gameFormat, gameState?.payouts]);
};
