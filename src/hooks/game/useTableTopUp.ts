import { useState } from "react";
import { COSMOS_CONSTANTS } from "@block52/poker-vm-sdk";
import { getSigningClient } from "../../utils/cosmos/client";
import type { NetworkEndpoints } from "../../context/NetworkContext";

/**
 * Result of a successful top-up transaction
 */
export interface TopUpResult {
    hash: string;
    gameId: string;
    amount: string; // Amount in microunits
}

/**
 * Hook for table top-up functionality
 *
 * Allows a player to add chips to their stack when not in an active hand.
 * Player must be seated at the table and have sufficient wallet balance.
 * Total chips after top-up cannot exceed the table's max_buy_in.
 */
export const useTableTopUp = (tableId: string, network: NetworkEndpoints) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    /**
     * Top up player's stack at the table
     * @param amount - Amount to add in USDC (e.g., "10.00")
     * @returns Transaction result with hash and amount
     */
    const topUp = async (amount: string): Promise<TopUpResult> => {
        setLoading(true);
        setError(null);

        try {
            if (!tableId) {
                throw new Error("Table ID is required for top-up");
            }

            const { signingClient, userAddress } = await getSigningClient(network);


            // Convert amount from USDC to micro-USDC (b52usdc)
            // amount is in USDC (e.g., "10.00"), need to convert to micro-units (e.g., 10000000)
            const amountInUsdc = parseFloat(amount);
            if (isNaN(amountInUsdc) || amountInUsdc <= 0) {
                throw new Error("Invalid top-up amount. Must be a positive number.");
            }

            const topUpAmount = BigInt(Math.floor(amountInUsdc * Math.pow(10, COSMOS_CONSTANTS.USDC_DECIMALS)));


            // Call SigningCosmosClient.topUp()
            const transactionHash = await signingClient.topUp(tableId, topUpAmount);


            return {
                hash: transactionHash,
                gameId: tableId,
                amount: topUpAmount.toString()
            };
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "Failed to top up";
            console.error("❌ Top-up failed:", errorMessage);
            setError(errorMessage);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    return { topUp, loading, error };
};
