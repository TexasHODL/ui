/**
 * useForceCloseGame — Force-close a poker game and refund every seated player.
 *
 * Distinct from useDeleteGame:
 *   - `deleteGame` requires the table to be empty.
 *   - `forceCloseGame` is for non-empty tables — kicks everyone off, refunds
 *     each stack (plus any current-hand contribution and queued top-up) to the
 *     player's wallet, then deletes the table.
 *
 * Creator-only on the chain side. Cash games only — the chain rejects
 * SNG/Tournament with a separate error message; we surface that toast. See
 * block52/poker-vm#2173.
 */

import { useState, useCallback } from "react";
import { toast } from "react-toastify";
import { useNetwork } from "../../context/NetworkContext";
import { getSigningClient } from "../../utils/cosmos/client";

interface UseForceCloseGameReturn {
    forceCloseGame: (gameId: string) => Promise<string | null>;
    isClosing: boolean;
    error: Error | null;
}

export const useForceCloseGame = (): UseForceCloseGameReturn => {
    const { currentNetwork } = useNetwork();
    const [isClosing, setIsClosing] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const forceCloseGame = useCallback(
        async (gameId: string): Promise<string | null> => {
            setIsClosing(true);
            setError(null);

            try {
                const { signingClient } = await getSigningClient(currentNetwork);

                console.log("🛑 Force-closing game:", gameId);

                const txHash = await signingClient.forceCloseGame(gameId);

                console.log("✅ Game force-closed:", txHash);
                toast.success("Table closed — all players refunded.");

                return txHash;
            } catch (err: unknown) {
                console.error("❌ Failed to force-close game:", err);
                const message = err instanceof Error ? err.message : "Failed to close table";
                setError(new Error(message));
                toast.error(message);
                return null;
            } finally {
                setIsClosing(false);
            }
        },
        [currentNetwork]
    );

    return { forceCloseGame, isClosing, error };
};

export default useForceCloseGame;
