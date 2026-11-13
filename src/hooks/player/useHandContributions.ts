import { useEffect, useMemo, useState } from "react";
import { useCometRpcApiFactory } from "../../context/CosmosApiContext";
import { NETWORK_PRESETS, useNetwork } from "../../context/NetworkContext";
import { publicStateAt } from "../../utils/chainHistory";
import { hasContent, hasValue, isEmpty } from "../../utils/guards";
import { handKeyForTarget, readHandContribution, type HandContributionTarget } from "../../utils/handContribution";
import { historyNetworks } from "../../utils/handReplay";
import { mapWithConcurrency } from "../../utils/pagedFetch";

/** game + hand → contributed chips, or null when the node no longer has that hand. */
const memory = new Map<string, number | null>();

export function clearHandContributionCache(): void {
    memory.clear();
}

function cacheKey(network: string, player: string, key: string): string {
    return `${network}\0${player.toLowerCase()}\0${key}`;
}

export interface HandContributions {
    /** `gameId#handNumber` → what this player put in. Missing keys were not read, or failed. */
    byKey: Record<string, number>;
    /** True while a requested hand has not been read yet. */
    pending: boolean;
    /** Requested hands whose action log could not be read. */
    unavailable: number;
}

function collect(network: string, player: string | undefined, hands: HandContributionTarget[], enabled: boolean): HandContributions {
    if (!enabled || !hasContent(player)) return { byKey: {}, pending: false, unavailable: 0 };
    const byKey: Record<string, number> = {};
    const seen = new Set<string>();
    let unavailable = 0;
    let pending = false;
    for (const hand of hands) {
        const key = handKeyForTarget(hand);
        if (seen.has(key)) continue;
        seen.add(key);
        const stored = cacheKey(network, player, key);
        if (!memory.has(stored)) {
            pending = true;
            continue;
        }
        const value = memory.get(stored);
        if (!hasValue(value)) unavailable += 1;
        else byKey[key] = value;
    }
    return { byKey, pending, unavailable };
}

/**
 * Fills `contributed` for the profiled player's hands from public chain state.
 *
 * One abci_query per hand, a few at a time, and only for the hands the caller
 * passes (the selected variant, once its tables share a money unit). Results
 * stay in memory for the session, so changing the filter does not read a hand
 * twice. A hand the nodes no longer keep is remembered as unavailable and left
 * out of the profit, rather than counted as 0. The page does not wait on this
 * except the profit card.
 */
export function useHandContributions(player: string | undefined, hands: HandContributionTarget[], enabled: boolean): HandContributions {
    const { currentNetwork } = useNetwork();
    const rpcFactory = useCometRpcApiFactory();
    const [version, setVersion] = useState(0);
    const networkName = currentNetwork.name;
    const rpcs = useMemo(
        () => historyNetworks(currentNetwork, NETWORK_PRESETS).map(network => rpcFactory(network.rpc)),
        [currentNetwork, rpcFactory]
    );
    const listKey = hands.map(handKeyForTarget).join("\n");

    useEffect(() => {
        if (!enabled || !hasContent(player) || !hasContent(listKey)) return;
        const missing = hands.filter(hand => !memory.has(cacheKey(networkName, player, handKeyForTarget(hand))));
        if (isEmpty(missing)) return;
        let cancelled = false;
        mapWithConcurrency(missing, 3, async hand => {
            const value = await readHandContribution(player, hand, rpcs, (rpc, gameId, height) => publicStateAt(rpc, gameId, height));
            memory.set(cacheKey(networkName, player, handKeyForTarget(hand)), value);
        }).then(() => {
            if (!cancelled) setVersion(current => current + 1);
        });
        return () => {
            cancelled = true;
        };
    }, [enabled, hands, listKey, networkName, player, rpcs]);

    // `version` is not read inside the memo. It bumps when a batch lands in the module cache, which is what the memo has to re-read.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    return useMemo(() => collect(networkName, player, hands, enabled), [enabled, hands, networkName, player, version]);
}
