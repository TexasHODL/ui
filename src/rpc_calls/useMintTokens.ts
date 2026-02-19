import { useState, useCallback } from "react";
import { getPublicKey } from "../utils/b52AccountUtils";

interface MintTokensParams {
    depositIndex: string;
}

interface MintTokensReturn {
    mint: (params: MintTokensParams) => Promise<any>;
    isLoading: boolean;
    error: Error | null;
}

/**
 * Custom hook to mint tokens after a successful USDC deposit
 * Calls the mint RPC command on the PVM backend
 * @returns Object containing mint function, loading state, and error
 */
export const useMintTokens = (): MintTokensReturn => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const mint = useCallback(async ({ depositIndex }: MintTokensParams) => {
        setIsLoading(true);
        setError(null);

        try {
            // Get the user's public key from storage
            const userAddress = getPublicKey();

            if (!userAddress) {
                throw new Error("No user address found. Please connect your wallet.");
            }

            const rpcUrl = import.meta.env.VITE_NODE_RPC_URL || "https://node1.block52.xyz/";

            // Note: The backend mint RPC only expects depositIndex as a parameter
            // The transaction hash was previously passed but is not used by the backend
            const rpcPayload = {
                id: Math.random().toString(36).substring(7),
                method: "mint",
                params: [depositIndex]
            };

            // Make RPC call to mint tokens
            const response = await fetch(rpcUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(rpcPayload)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            // Check if we got a successful result (even if it's an existing transaction)
            if (data.result && data.result.data) {
                // Success - either new mint or existing transaction returned
            } else if (data.error) {
                console.error("RPC error:", data.error);
                throw new Error(data.error.message || data.error || "Failed to mint tokens");
            }

            return data.result;
        } catch (err) {
            console.error("❌ Mint error:", err);
            const mintError = err instanceof Error ? err : new Error("Failed to mint tokens");
            setError(mintError);
            throw mintError;
        } finally {
            setIsLoading(false);
        }
    }, []);

    return {
        mint,
        isLoading,
        error
    };
};