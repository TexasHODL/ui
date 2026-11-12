import { useEffect, useState } from "react";
import { httpErrorMessage } from "../../apis/HTTPClient";
import { useCosmosApi } from "../../context/CosmosApiContext";
import { hasContent, hasValue } from "../../utils/guards";
import { isPrizeClaimAddress, prizeClaimsFromTxSearch, prizeClaimsQueryFor, type PlayerPrizeClaim } from "../../utils/playerPrizeClaims";

interface UsePlayerPrizeClaimsResult {
    claims: PlayerPrizeClaim[];
    loading: boolean;
    /** Set when the chain query failed. Claims are empty so the page keeps the indexer figures. */
    error: string | null;
}

interface PrizeClaimState {
    address: string;
    claims: PlayerPrizeClaim[];
    error: string | null;
}

/**
 * Sit & Go and tournament prizes for one player, from the chain.
 *
 * The indexer only learns about cash-outs from player_left_game. A prize claim
 * emits sng_prize_claimed and leaves the session open at cash_out 0. This reads
 * the successful claims so the profile can fill those in. A failed query leaves
 * claims empty: the page falls back to the indexer and stays up.
 */
export function usePlayerPrizeClaims(address: string | undefined): UsePlayerPrizeClaimsResult {
    const cosmosApi = useCosmosApi();
    const [state, setState] = useState<PrizeClaimState | null>(null);
    const player = hasContent(address) ? address.toLowerCase() : undefined;

    useEffect(() => {
        if (!hasContent(player)) return;
        if (!isPrizeClaimAddress(player)) {
            setState({ address: player, claims: [], error: "Invalid player address" });
            return;
        }
        let cancelled = false;
        cosmosApi
            .getAllTransactionsMatching(prizeClaimsQueryFor(player))
            .then(response => {
                if (cancelled) return;
                setState({ address: player, claims: prizeClaimsFromTxSearch(response, player), error: null });
            })
            .catch(err => {
                if (cancelled) return;
                console.error("Failed to fetch prize claims:", err);
                setState({ address: player, claims: [], error: httpErrorMessage(err, "Failed to fetch prize claims") });
            });
        return () => {
            cancelled = true;
        };
    }, [cosmosApi, player]);

    const ready = hasValue(state) && state.address === player;
    return {
        claims: ready ? state.claims : [],
        loading: hasContent(player) && !ready,
        error: ready ? state.error : null
    };
}
