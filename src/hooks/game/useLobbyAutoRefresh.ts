import { useEffect, useRef } from "react";
import type { GameWithFormat } from "../../utils/convertUtils";

/** Options for the games-list refetch (mirrors useFindGames). */
export interface RefetchOptions {
    /** Background refresh: keep current rows on screen (no loading state, no flicker). */
    silent?: boolean;
}

/** Background lobby refresh cadence while the tab is visible. */
export const LOBBY_REFRESH_INTERVAL_MS = 20_000;

/** True for a full table id: 0x + 64 hex chars. */
export const isFullGameId = (query: string): boolean => /^0x[0-9a-f]{64}$/i.test(query.trim());

/**
 * Keeps the lobby fresh: silent refetch every `intervalMs` while the tab is visible,
 * and immediately when the tab becomes visible / the window regains focus.
 */
export const useLobbyAutoRefresh = (
    refetch: (options?: RefetchOptions) => Promise<void>,
    intervalMs: number = LOBBY_REFRESH_INTERVAL_MS
): void => {
    const refetchRef = useRef(refetch);
    refetchRef.current = refetch;

    useEffect(() => {
        if (typeof document === "undefined") return;
        const tick = () => {
            if (document.visibilityState === "hidden") return;
            void refetchRef.current({ silent: true });
        };
        const timer = setInterval(tick, intervalMs);
        document.addEventListener("visibilitychange", tick);
        window.addEventListener("focus", tick);
        return () => {
            clearInterval(timer);
            document.removeEventListener("visibilitychange", tick);
            window.removeEventListener("focus", tick);
        };
    }, [intervalMs]);
};

/**
 * When a search matches nothing, refresh once per query; a full table id is also
 * looked up directly so a brand-new or unlisted table still shows.
 */
export const useSearchMissRecovery = (
    search: string,
    hasResults: boolean,
    isLoading: boolean,
    refetch: (options?: RefetchOptions) => Promise<void>,
    lookupGame: (gameId: string) => Promise<GameWithFormat | null>
): void => {
    const attempted = useRef<string>("");
    useEffect(() => {
        const query = search.trim().toLowerCase();
        if (!query || hasResults || isLoading || attempted.current === query) return;
        attempted.current = query;
        void (async () => {
            await refetch({ silent: true });
            if (isFullGameId(query)) await lookupGame(query);
        })();
    }, [search, hasResults, isLoading, refetch, lookupGame]);
};