import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { IndexerApi } from "../../apis/Api";
import { useIndexerApi } from "../../context/IndexerApiContext";
import type { PlayerListItem, PlayerSearchParams } from "../../types/players";
import { hasContent, hasValue } from "@block52/ui-sdk/helpers";
import { fetchAllPages } from "../../utils/pagedFetch";
import { playersPage } from "../../utils/playerDirectory";

export interface SilentRefetchOptions {
    /** Keep the current rows on screen; do not flip the hook back to loading. */
    silent?: boolean;
}

interface UsePlayersDirectoryResult {
    players: PlayerListItem[];
    total: number;
    loading: boolean;
    error: string | null;
    refetch: (options?: SilentRefetchOptions) => void;
}

interface LoadedDirectory {
    search: string;
    reloadKey: number;
    listed: PlayerListItem[];
}

/**
 * One page of the player directory from the indexer.
 *
 * Buy-in, cash-out, net profit and total_hands come from the live indexer
 * aggregates (Sit & Go prizes and MTT money included). The full search result
 * is loaded, then sorted and paged here so Hands and Net Profit stay on those
 * same figures.
 */
export function usePlayersDirectory(params: PlayerSearchParams): UsePlayersDirectoryResult {
    const indexerApi = useIndexerApi();
    const { search, sort, order, limit, offset } = params;
    const [loaded, setLoaded] = useState<LoadedDirectory | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [reloadKey, setReloadKey] = useState(0);
    const loadedRef = useRef<LoadedDirectory | null>(null);
    const silentRef = useRef(false);

    const refetch = useCallback((options?: SilentRefetchOptions) => {
        silentRef.current = options?.silent === true;
        setReloadKey(key => key + 1);
    }, []);

    useEffect(() => {
        const searchKey = hasContent(search) ? search : "";
        const current = loadedRef.current;
        if (hasValue(current) && current.search === searchKey && current.reloadKey === reloadKey) {
            return;
        }

        let cancelled = false;
        const silent = silentRef.current && hasValue(current);
        silentRef.current = false;
        if (!silent) {
            setLoading(true);
            setError(null);
        }

        void (async () => {
            try {
                const listed = await fetchDirectory(indexerApi, hasContent(search) ? search : undefined);
                if (cancelled) return;
                const next = { search: searchKey, reloadKey, listed };
                loadedRef.current = next;
                setLoaded(next);
                setError(null);
            } catch (err) {
                if (cancelled) return;
                console.error("Failed to fetch players:", err);
                const message = err instanceof Error ? err.message : "Failed to fetch players";
                if (silent && hasValue(loadedRef.current)) {
                    setError(message);
                    return;
                }
                loadedRef.current = null;
                setLoaded(null);
                setError(message);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [indexerApi, reloadKey, search]);

    const players = useMemo(() => {
        if (!hasValue(loaded)) return [];
        return playersPage(loaded.listed, sort, order, limit, offset);
    }, [limit, loaded, offset, order, sort]);

    return { players, total: hasValue(loaded) ? loaded.listed.length : 0, loading, error, refetch };
}

async function fetchDirectory(indexerApi: IndexerApi, search: string | undefined): Promise<PlayerListItem[]> {
    return fetchAllPages((limit, offset) => indexerApi.getPlayers({ search, limit, offset }));
}
