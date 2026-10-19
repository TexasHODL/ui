import { useEffect, useState } from "react";
import { useCosmosApi } from "../../context/CosmosApiContext";
import { parseGameStateJson } from "../../utils/handReplay";
import { hasTournamentFinished, hasTournamentStarted } from "../../utils/scheduledSng";

export type LobbyTournamentMark = "started" | "finished";

/** Started, finished, or still waiting, from one public game-state payload. */
export function tournamentProgressFromPublicState(response: { game_state?: string } | null | undefined): LobbyTournamentMark | null {
    if (!response?.game_state) return null;
    try {
        const { state } = parseGameStateJson(response.game_state);
        if (hasTournamentFinished(state)) return "finished";
        if (hasTournamentStarted(state)) return "started";
        return null;
    } catch (err) {
        console.error("Failed to read tournament state:", err);
        return null;
    }
}

/**
 * Whether each visible scheduled table has started or already been won.
 * Public state only — no wallet, no subscription. Refresh on focus and every 15s.
 */
export function useLobbyTournamentStarted(tableIds: string, refreshToken: unknown): Record<string, LobbyTournamentMark> {
    const api = useCosmosApi();
    const [result, setResult] = useState<{ api: typeof api; tableIds: string; marks: Record<string, LobbyTournamentMark> } | null>(null);
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
                        return [id, tournamentProgressFromPublicState(response)] as const;
                    } catch (err) {
                        console.error("Failed to fetch public game state:", err);
                        return [id, null] as const;
                    }
                }));
                if (!cancelled) {
                    const marks: Record<string, LobbyTournamentMark> = {};
                    for (const [id, mark] of entries) if (mark) marks[id] = mark;
                    setResult({ api, tableIds, marks });
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
    return result?.api === api && result.tableIds === tableIds ? result.marks : {};
}
