import { useCallback, useEffect, useRef, useState } from "react";
import { useNetwork } from "../../context/NetworkContext";
import { fetchAddressUsdcMicro } from "../../utils/addressUsdcBalance";
import { hasContent } from "@block52/ui-sdk/helpers";
import type { SilentRefetchOptions } from "./usePlayerTournamentEntries";

export interface AddressUsdcBalance {
    /** Micro-USDC once the bank read succeeds. Null while loading or after an error. */
    micro: string | null;
    loading: boolean;
    error: string | null;
    refetch: (options?: SilentRefetchOptions) => void;
}

/**
 * USDC bank balance for one address, from the same Cosmos client the table
 * header uses for the connected wallet. A blank address does not query.
 * A late reply for a previous address is ignored.
 */
export function useAddressUsdcBalance(address: string | undefined): AddressUsdcBalance {
    const { currentNetwork } = useNetwork();
    const [micro, setMicro] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(hasContent(address));
    const [error, setError] = useState<string | null>(null);
    const requestId = useRef(0);

    const fetchBalance = useCallback(
        async (options?: SilentRefetchOptions) => {
            const id = ++requestId.current;
            if (!hasContent(address)) {
                setMicro(null);
                setLoading(false);
                setError(null);
                return;
            }
            const silent = options?.silent === true;
            if (!silent) {
                setLoading(true);
                setMicro(null);
            }
            setError(null);
            try {
                const value = await fetchAddressUsdcMicro(currentNetwork, address);
                if (id !== requestId.current) return;
                setMicro(value);
            } catch (err) {
                if (id !== requestId.current) return;
                console.error("Failed to fetch wallet balance:", err);
                if (!silent) setMicro(null);
                setError(err instanceof Error ? err.message : "Failed to fetch wallet balance");
            } finally {
                if (id === requestId.current) setLoading(false);
            }
        },
        [address, currentNetwork]
    );

    useEffect(() => {
        void fetchBalance();
        return () => {
            requestId.current += 1;
        };
    }, [fetchBalance]);

    return { micro, loading, error, refetch: fetchBalance };
}
