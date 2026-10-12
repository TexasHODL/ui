import { useEffect, useState } from "react";
import { useCosmosApi } from "../../context/CosmosApiContext";
import { parseGameStateJson } from "../../utils/handReplay";

/** Public roster lookup only; never subscribes to gameplay or sends actions. */
export function findLobbySeat(response: { game_state?: string }, address: string): number | null {
    if (!response.game_state || !address) return null;
    const { state } = parseGameStateJson(response.game_state);
    const player = state.players?.find((p: { address?: string; seat?: number } | null) =>
        p?.address?.toLowerCase() === address.toLowerCase());
    return player && Number.isInteger(player.seat) && player.seat > 0 ? player.seat : null;
}

/** Only the visible, occupied rows are checked. Refresh on focus and every 15s. */
export function useLobbySeats(tableIds: string, address: string | null, refreshToken: unknown) {
    const api = useCosmosApi();
    const [result, setResult] = useState<{ api: typeof api; address: string; tableIds: string; seats: Record<string, number> } | null>(null);
    useEffect(() => {
        if (!address || !tableIds) { setResult(null); return; }
        let cancelled = false;
        let pending = false;
        const refresh = async () => {
            if (pending || document.visibilityState === "hidden") return;
            pending = true;
            const entries = await Promise.all(tableIds.split(",").map(async id => {
                try {
                    // The private game_state endpoint requires a player address.
                    // Lobby membership needs only the public, masked roster.
                    const response = await api.getPublicGameState(id) as { game_state?: string };
                    return [id, findLobbySeat(response, address)] as const;
                } catch { return [id, null] as const; }
            }));
            if (!cancelled) {
                const seats: Record<string, number> = {};
                for (const [id, seat] of entries) if (seat !== null) seats[id] = seat;
                setResult({ api, address, tableIds, seats });
            }
            pending = false;
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
    }, [api, address, tableIds, refreshToken]);
    return result?.api === api && result.address === address && result.tableIds === tableIds ? result.seats : {};
}
