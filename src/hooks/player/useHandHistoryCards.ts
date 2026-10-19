import { useEffect, useRef, useState } from "react";
import type { TexasHoldemStateDTO } from "@block52/poker-vm-sdk";
import { useCometRpcApiFactory } from "../../context/CosmosApiContext";
import type { NetworkEndpoints } from "../../context/NetworkContext";
import type { PlayerHand } from "../../types/players";
import { handKey } from "../../utils/handHistory";
import { cardsForHistoryHand, type HistoryHandCards } from "../../utils/handHistoryCards";
import { loadPublicHandState, mapPool } from "../../utils/handHistoryRecover";

/**
 * Revealed cards for each history row. Recovered hands already carry their
 * snapshot. Indexed rows ask the chain at the recorded end block. Folded and
 * mucked cards stay hidden because the public state masks them.
 */
export function useHandHistoryCards(
    hands: PlayerHand[],
    viewer: string | null,
    seeded: ReadonlyMap<string, TexasHoldemStateDTO>,
    networks: NetworkEndpoints[]
): ReadonlyMap<string, HistoryHandCards> {
    const rpcFor = useCometRpcApiFactory();
    const [cards, setCards] = useState<ReadonlyMap<string, HistoryHandCards>>(() => new Map());
    const cache = useRef(new Map<string, HistoryHandCards>());
    const scope = `${viewer ?? ""}|${networks.map(network => network.rpc).join("|")}`;
    const scopeRef = useRef(scope);
    const handsRef = useRef(hands);
    const seededRef = useRef(seeded);
    const networksRef = useRef(networks);
    handsRef.current = hands;
    seededRef.current = seeded;
    networksRef.current = networks;
    const handsKey = hands.map(handKey).join("\n");
    const seededKey = [...seeded.keys()].sort().join("\n");

    useEffect(() => {
        if (scopeRef.current !== scope) {
            scopeRef.current = scope;
            cache.current = new Map();
        }
        if (!viewer) {
            setCards(new Map());
            return;
        }
        const controller = new AbortController();
        let cancelled = false;
        const known = seededRef.current;
        for (const hand of handsRef.current) {
            const state = known.get(handKey(hand));
            if (state) cache.current.set(handKey(hand), cardsForHistoryHand(state, viewer));
        }
        setCards(new Map(cache.current));
        const pending = handsRef.current.filter(hand => !cache.current.has(handKey(hand)));
        mapPool(pending, 4, async hand => {
            const state = await loadPublicHandState(
                hand.game_id,
                hand.hand_number,
                hand.block_height,
                networksRef.current,
                rpcFor,
                controller.signal
            );
            if (cancelled || !state) return;
            cache.current.set(handKey(hand), cardsForHistoryHand(state, viewer));
            setCards(new Map(cache.current));
        }, controller.signal);
        return () => {
            cancelled = true;
            controller.abort();
        };
    }, [handsKey, seededKey, scope, viewer, rpcFor]);

    return cards;
}
