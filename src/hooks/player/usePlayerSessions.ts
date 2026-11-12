import { useState, useEffect, useCallback } from "react";
import { useIndexerApi } from "../../context/IndexerApiContext";
import { hasContent } from "../../utils/guards";
import { fetchAllPages } from "../../utils/pagedFetch";
import type { PlayerSession } from "../../types/players";

interface UsePlayerSessionsResult {
    sessions: PlayerSession[];
    total: number;
    loading: boolean;
    error: string | null;
}

/** Fetches a page of a player's session history from the indexer (ui#589). */
export function usePlayerSessions(address: string | undefined, limit: number, offset: number): UsePlayerSessionsResult {
    const indexerApi = useIndexerApi();
    const [sessions, setSessions] = useState<PlayerSession[]>([]);
    const [total, setTotal] = useState<number>(0);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const fetchSessions = useCallback(async () => {
        if (!address) {
            setSessions([]);
            setTotal(0);
            setLoading(false);
            return;
        }
        try {
            setLoading(true);
            setError(null);
            const res = await indexerApi.getPlayerSessions(address, limit, offset);
            setSessions(res?.data ?? []);
            setTotal(res?.pagination?.total ?? 0);
        } catch (err) {
            console.error("Failed to fetch player sessions:", err);
            setError(err instanceof Error ? err.message : "Failed to fetch player sessions");
            setSessions([]);
            setTotal(0);
        } finally {
            setLoading(false);
        }
    }, [indexerApi, address, limit, offset]);

    useEffect(() => {
        fetchSessions();
    }, [fetchSessions]);

    return { sessions, total, loading, error };
}

/**
 * Every session for the profile history, not one indexer page.
 * The game-type filter has to see the whole history; a page of 20 would hide
 * variants that only appear later. The indexer is still paged underneath.
 */
export function useAllPlayerSessions(address: string | undefined): UsePlayerSessionsResult {
    const indexerApi = useIndexerApi();
    const [sessions, setSessions] = useState<PlayerSession[]>([]);
    const [loading, setLoading] = useState<boolean>(hasContent(address));
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!hasContent(address)) {
            setSessions([]);
            setLoading(false);
            setError(null);
            return;
        }
        let cancelled = false;
        setLoading(true);
        setError(null);
        fetchAllPages((limit, offset) => indexerApi.getPlayerSessions(address, limit, offset))
            .then(rows => {
                if (cancelled) return;
                setSessions(rows);
            })
            .catch(err => {
                if (cancelled) return;
                console.error("Failed to fetch player sessions:", err);
                setError(err instanceof Error ? err.message : "Failed to fetch player sessions");
                setSessions([]);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [indexerApi, address]);

    return { sessions, total: sessions.length, loading, error };
}
