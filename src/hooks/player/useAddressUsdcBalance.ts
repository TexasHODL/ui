import { useEffect, useState } from "react";
import { useNetwork } from "../../context/NetworkContext";
import { fetchAddressUsdcMicro } from "../../utils/addressUsdcBalance";
import { hasContent } from "../../utils/guards";

export interface AddressUsdcBalance {
    /** Micro-USDC once the bank read succeeds. Null while loading or after an error. */
    micro: string | null;
    loading: boolean;
    error: string | null;
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

    useEffect(() => {
        if (!hasContent(address)) {
            setMicro(null);
            setLoading(false);
            setError(null);
            return;
        }

        let cancelled = false;
        setLoading(true);
        setError(null);
        setMicro(null);

        fetchAddressUsdcMicro(currentNetwork, address)
            .then(value => {
                if (cancelled) return;
                setMicro(value);
            })
            .catch(err => {
                if (cancelled) return;
                console.error("Failed to fetch wallet balance:", err);
                setMicro(null);
                setError(err instanceof Error ? err.message : "Failed to fetch wallet balance");
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [address, currentNetwork]);

    return { micro, loading, error };
}
