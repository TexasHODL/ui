import { useEffect, useState } from "react";
import { useCosmosApi } from "../../context/CosmosApiContext";
import { parseGameStateJson } from "../../utils/handReplay";
import { maxPreviousActionTimestamp, type LobbyEndedProgress } from "../../utils/lobbyEndedFilter";
import { hasTournamentFinished, hasTournamentStarted, lateRegistrationEndsAt, lateRegistrationPhase } from "../../utils/scheduledSng";

export type LobbyTournamentMark = "started" | "finished";
export type LobbyTournamentProgress = LobbyEndedProgress;

/** Started, finished, or still waiting, from one public game-state payload. */
export function tournamentProgressFromPublicState(
    response: { game_state?: string } | null | undefined
): LobbyTournamentProgress | null {
    if (!response?.game_state) return null;
    try {
        const { state } = parseGameStateJson(response.game_state);
        if (hasTournamentFinished(state)) {
            return {
                mark: "finished",
                endedAtMs: maxPreviousActionTimestamp(state.previousActions)
            };
        }
        if (hasTournamentStarted(state)) {
            // Late registration (poker-vm#2731): still joinable while the window is open.
            // Blind timer for the lobby stuck-table check (same calc as the header).
            const options = state.gameOptions;
            const timer = options?.levelStartTime && options.blindLevelDuration
                ? { blindTimer: { levelStartTime: options.levelStartTime, blindLevelDuration: options.blindLevelDuration } }
                : {};
            if (lateRegistrationPhase(state, Date.now()) === "open") {
                return { mark: "started", lateRegOpen: true, lateRegEndsAtMs: state.gameOptions ? lateRegistrationEndsAt(state.gameOptions) : undefined, ...timer };
            }
            return { mark: "started", ...timer };
        }
        return null;
    } catch (err) {
        console.error("Failed to read tournament state:", err);
        return null;
    }
}

/**
 * Whether each visible scheduled table has started or already been won.
 * Public state only — no wallet, no subscription. Refresh on focus and every 15s.
 * Finished progress includes endedAtMs from the last previousActions timestamp
 * so the lobby can age out Finished rows after 24 hours.
 */
export function useLobbyTournamentStarted(
    tableIds: string,
    refreshToken: unknown
): Record<string, LobbyTournamentProgress> {
    const api = useCosmosApi();
    const [result, setResult] = useState<{
        api: typeof api;
        tableIds: string;
        marks: Record<string, LobbyTournamentProgress>;
    } | null>(null);
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
                    const marks: Record<string, LobbyTournamentProgress> = {};
                    for (const [id, progress] of entries) if (progress) marks[id] = progress;
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