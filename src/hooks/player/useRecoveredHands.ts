import { useEffect, useMemo, useRef, useState } from "react";
import type { TexasHoldemStateDTO } from "@block52/poker-vm-sdk";
import { useIndexerApi } from "../../context/IndexerApiContext";
import { useCometRpcApiFactory } from "../../context/CosmosApiContext";
import type { NetworkEndpoints } from "../../context/NetworkContext";
import type { PlayerHand } from "../../types/players";
import { handKey } from "../../utils/handHistory";
import { historyGameHandPageSize, historySessionPageSize, recoverUnlistedHands } from "../../utils/handHistoryRecover";

interface UseRecoveredHandsResult {
    hands: PlayerHand[];
    states: ReadonlyMap<string, TexasHoldemStateDTO>;
    recovering: boolean;
    /** True once a finished indexer list has been compared with the chain. */
    searched: boolean;
}

/**
 * Hands the indexer omitted for this wallet, once its own list has finished
 * loading. A new wallet or network drops the previous result immediately.
 */
export interface RecoverHandsOptions {
    /** Extra tables to search, such as every `<tournamentId>-t*` from getTournament. */
    extraGameIds?: readonly string[];
    endedHands?: (gameId: string) => Promise<Array<Pick<PlayerHand, "game_id" | "hand_number" | "block_height">>>;
}

export function useRecoveredHands(
    address: string | null,
    listed: PlayerHand[],
    listedComplete: boolean,
    networks: NetworkEndpoints[],
    options?: RecoverHandsOptions
): UseRecoveredHandsResult {
    const indexerApi = useIndexerApi();
    const rpcFor = useCometRpcApiFactory();
    const [hands, setHands] = useState<PlayerHand[]>([]);
    const [states, setStates] = useState<ReadonlyMap<string, TexasHoldemStateDTO>>(() => new Map());
    const [recovering, setRecovering] = useState(false);
    const [searched, setSearched] = useState(false);
    const listedRef = useRef(listed);
    listedRef.current = listed;

    const listedKey = useMemo(() => listed.map(handKey).join("\n"), [listed]);
    const networksKey = networks.map(network => network.rpc).join("|");
    const extraGameIds = options?.extraGameIds ?? [];
    const extraKey = extraGameIds.join("\n");
    const endedHands = options?.endedHands;

    useEffect(() => {
        setHands([]);
        setStates(new Map());
        setRecovering(false);
        setSearched(false);
    }, [address, networksKey, extraKey]);

    useEffect(() => {
        if (!address || !listedComplete) return;
        const controller = new AbortController();
        let cancelled = false;
        setRecovering(true);
        recoverUnlistedHands({
            address,
            listed: listedRef.current,
            sessions: offset => indexerApi.getPlayerSessions(address, historySessionPageSize, offset),
            gameHands: (gameId, offset) => indexerApi.getHands(gameId, offset, historyGameHandPageSize),
            rpcFor,
            networks,
            extraGameIds,
            endedHands,
            signal: controller.signal
        })
            .then(recovered => {
                if (cancelled) return;
                setHands(recovered.hands);
                setStates(recovered.states);
            })
            .catch(err => {
                console.error("Failed to recover unlisted hands:", err);
            })
            .finally(() => {
                if (cancelled) return;
                setRecovering(false);
                setSearched(true);
            });
        return () => {
            cancelled = true;
            controller.abort();
        };
    }, [address, listedComplete, listedKey, networksKey, networks, extraKey, extraGameIds, endedHands, indexerApi, rpcFor]);

    return { hands, states, recovering, searched };
}
