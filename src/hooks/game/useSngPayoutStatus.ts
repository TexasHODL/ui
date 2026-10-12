import { useCallback, useEffect, useState } from "react";
import { useCosmosApi } from "../../context/CosmosApiContext";

type ClaimHistory = { tx_responses?: { code?: number; events?: { type: string; attributes: { key: string; value: string }[] }[] }[] };
export function hasSngPayoutReceipt(response: ClaimHistory, table: string, player: string): boolean {
    if (!Array.isArray(response.tx_responses)) throw new Error("Payout history unavailable");
    return response.tx_responses.some(tx => tx.code === 0 && tx.events?.some(event => {
        if (event.type !== "sng_prize_claimed") return false;
        const fields = Object.fromEntries(event.attributes.map(a => [a.key, a.value]));
        return fields.game_id === table && fields.player?.toLowerCase() === player.toLowerCase();
    }));
}
export function isSngPayoutAlreadyClaimed(error: unknown): boolean {
    return error instanceof Error && /sit-and-go payout already claimed/i.test(error.message);
}

/** Read-only, exact table/player event lookup. Missing history is not proof of an unpaid prize. */
export function useSngPayoutStatus(table: string | undefined, player: string | null, enabled: boolean) {
    const api = useCosmosApi();
    const [revision, setRevision] = useState(0);
    const [result, setResult] = useState<{ api: typeof api; table: string; player: string; status: "claimed" | "unclaimed" | "error" } | null>(null);
    const check = useCallback(async () => {
        if (!table || !player || !/^[a-zA-Z0-9]+$/.test(table) || !/^[a-zA-Z0-9]+$/.test(player)) throw new Error("Invalid payout lookup");
        const query = `sng_prize_claimed.game_id='${table}' AND sng_prize_claimed.player='${player.toLowerCase()}'`;
        const response = await api.getSentTransactions(query) as ClaimHistory;
        return hasSngPayoutReceipt(response, table, player);
    }, [api, table, player]);
    useEffect(() => {
        if (!enabled || !table || !player) return;
        let cancelled = false;
        setResult(null);
        check().then(claimed => {
            if (!cancelled) setResult({ api, table, player, status: claimed ? "claimed" : "unclaimed" });
        }).catch(() => {
            if (!cancelled) setResult({ api, table, player, status: "error" });
        });
        return () => { cancelled = true; };
    }, [api, table, player, enabled, revision, check]);
    const status = !enabled ? "unclaimed" : result?.api === api && result.table === table && result.player === player ? result.status : "checking";
    return { status, check, retry: () => setRevision(value => value + 1) };
}
