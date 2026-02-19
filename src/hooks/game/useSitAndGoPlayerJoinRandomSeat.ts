import { useState, useCallback } from "react";
import { getSigningClient } from "../../utils/cosmos/client";
import { USDC_TO_MICRO } from "../../constants/currency";
import { useNetwork } from "../../context/NetworkContext";

interface SitAndGoJoinOptions {
    tableId: string;
    amount: number;  // Amount in USDC (will be converted to microunits)
}

interface UseSitAndGoPlayerJoinRandomSeatReturn {
    joinSitAndGo: (options: SitAndGoJoinOptions) => Promise<any>;
    isJoining: boolean;
    error: Error | null;
}

/**
 * Custom hook for joining Sit & Go games using Cosmos SDK
 *
 * This hook automatically selects a random available seat when joining a Sit & Go game.
 * It uses the Cosmos SDK's joinGame method with seat number 0 to indicate random selection.
 *
 * AMOUNT HANDLING:
 * - INPUT: User inputs amount as number in USDC (e.g., 10 = $10 USDC)
 * - CONVERSION: Converts to microunits (multiply by 1,000,000)
 * - TRANSMISSION: Passes microunits to Cosmos SDK as BigInt
 *
 * @returns Object with joinSitAndGo function, loading state, and error
 */
export const useSitAndGoPlayerJoinRandomSeat = (): UseSitAndGoPlayerJoinRandomSeatReturn => {
    const [isJoining, setIsJoining] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const { currentNetwork } = useNetwork();

    const joinSitAndGo = useCallback(async (options: SitAndGoJoinOptions): Promise<any> => {
        setIsJoining(true);
        setError(null);

        try {
            const { signingClient, userAddress } = await getSigningClient(currentNetwork);


            // Convert USDC to microunits (1 USDC = 1,000,000 microunits)
            const amountInMicrounits = options.amount * USDC_TO_MICRO;

            // Join game with seat = 0 to indicate random seat selection
            // The blockchain/PVM will automatically assign an available seat
            const transactionHash = await signingClient.joinGame(
                options.tableId,
                0, // Seat 0 = random seat selection
                BigInt(amountInMicrounits)
            );


            return {
                hash: transactionHash,
                gameId: options.tableId,
                action: "join-random-seat",
                amount: amountInMicrounits
            };

        } catch (err: any) {
            const errorMessage = err.message || "Failed to join Sit & Go game";
            console.error("❌ [SIT & GO JOIN] Error:", err);
            setError(new Error(errorMessage));
            throw err;
        } finally {
            setIsJoining(false);
        }
    }, [currentNetwork]);

    return {
        joinSitAndGo,
        isJoining,
        error
    };
};
