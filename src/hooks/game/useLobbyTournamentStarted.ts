import { useEffect, useState } from "react";
import { useCosmosApi } from "../../context/CosmosApiContext";
import { parseGameStateJson } from "../../utils/handReplay";
import { hasTournamentStarted } from "../../utils/scheduledSng";

/** True when a public game-state payload shows the tournament is already in play. */
export function tournamentStartedFromPublicState(response: { game_state?: string } | null | undefined): boolean {
    if (!response?.game_state) return false;
    try {
        const { state } = parseGameStateJson(response.game_state);
        return hasTournamentStarted(state);
    } catch (err) {
        console.error("Failed to read tournament state:", err);
        return false;
    }
}

/**
 * Whether each visible scheduled table has actually started.
 * Public state only — no wallet, no subscription. Refresh on focus and every 15s.
 */
export function useLobbyTournamentStarted(tableIds: string, refreshToken: unknown): Record<string, boolean> {
    const api = useCosmosApi();
    const [result, setResult] = useState<{ api: typeof api; tableIds: string; started: Record<string, boolean> } | null>(null);
    useEffect(() => {
        if (!tableIds) {
            setResult(null);
            return;
        }
        let cancelled = false;
        let pending = false;
        const refresh = async () => {
            if (pending || document.visibilityState === "hidden") return;
            pending = true;
            try {
                const entries = await Promise.all(tableIds.split(",").map(async id => {
                    try {
                        const response = await api.getPublicGameState(id) as { game_state?: string };
                        return [id, tournamentStartedFromPublicState(response)] as const;
                    } catch (err) {
                        console.error("Failed to fetch public game state:", err);
                        return [id, false] as const;
                    }
                }));
                if (!cancelled) {
                    const started: Record<string, boolean> = {};
                    for (const [id, isStarted] of entries) if (isStarted) started[id] = true;
                    setResult({ api, tableIds, started });
                }
            } finally {
                pending = false;
            }
        };
        void refresh();
        const interval = window.setInterval(refresh, 15000);
        window.addEventListener("focus", refresh);
        document.addEventListener("visibilitychange", refresh);
        return () => {
            cancelled = true;
            window.clearInterval(interval);
            window.removeEventListener("focus", refresh);
            document.removeEventListener("visibilitychange", refresh);
        };
    }, [api, tableIds, refreshToken]);
    return result?.api === api && result.tableIds === tableIds ? result.started : {};
}
