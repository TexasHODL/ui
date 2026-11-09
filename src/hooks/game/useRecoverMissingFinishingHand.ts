/**
 * When the signed-in finisher has a result but not a showdown (their own cards
 * and the cards that beat them), load that hand from history. A showdown the
 * live table already captured is left alone.
 */
import { useEffect } from "react";
import { STORAGE_KEYS } from "../../constants/storageKeys";
import { useCometRpcApiFactory } from "../../context/CosmosApiContext";
import { useGameStateContext } from "../../context/GameStateContext";
import { useIndexerApi } from "../../context/IndexerApiContext";
import { NETWORK_PRESETS, useNetwork } from "../../context/NetworkContext";
import { bustHandLookup, lookupViewerBustHand } from "../../utils/bustHandRecovery";
import { finishingHandReady, getFinishingHand, saveFinishingHand } from "../../utils/finishingHand";
import { historyNetworks } from "../../utils/handReplay";

export function useRecoverMissingFinishingHand(tableId: string | undefined): void {
    const indexerApi = useIndexerApi();
    const { currentNetwork } = useNetwork();
    const rpcFor = useCometRpcApiFactory();
    const { gameState } = useGameStateContext();

    useEffect(() => {
        if (!tableId || !gameState) return;
        const viewer = localStorage.getItem(STORAGE_KEYS.cosmosAddress);
        if (!viewer) return;
        const finished = (gameState.results ?? []).some(result => result.playerId?.toLowerCase() === viewer.toLowerCase());
        if (!finished || finishingHandReady(getFinishingHand(tableId, viewer))) return;
        const lookup = bustHandLookup({
            listHands: async address => (await indexerApi.getPlayerHands(address, 20, 0)).data ?? [],
            networks: historyNetworks(currentNetwork, NETWORK_PRESETS),
            rpcFor
        });
        let cancelled = false;
        lookupViewerBustHand(tableId, viewer, gameState.handNumber, lookup)
            .then(hand => {
                if (!cancelled && hand) saveFinishingHand(tableId, viewer, hand);
            })
            .catch(err => console.error("Finishing hand recovery failed:", err));
        return () => {
            cancelled = true;
        };
    }, [tableId, gameState, indexerApi, currentNetwork, rpcFor]);
}
