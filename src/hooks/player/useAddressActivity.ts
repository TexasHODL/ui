import { useCallback, useEffect, useState } from "react";
import type { TransactionResponse } from "../../components/TransactionPanel";
import { useCometRpcApiFactory, useCosmosApi } from "../../context/CosmosApiContext";
import { useNetwork } from "../../context/NetworkContext";
import { TX_SEARCH_PAGE_SIZE } from "../../apis/Api";
import { bridgeDepositRow, fetchBridgeDeposits } from "../../utils/bridgeDeposits";
import { hasContent, isNullish } from "@block52/ui-sdk/helpers";
import {
    describeTransaction,
    fetchGamePrizeMeta,
    resolvePrizePlace,
    type ChainGameFormat
} from "../../utils/transactionUtils";

/** How many rows the Recent activity tab shows before a Load more press. */
export const ACTIVITY_PAGE_SIZE = 20;

/** One node search page. The node caps this at {@link TX_SEARCH_PAGE_SIZE}. */
export const ACTIVITY_API_PAGE_SIZE = TX_SEARCH_PAGE_SIZE;

/** Bridge deposits are credited in EndBlock, so they are read from block events, not txs. */
export const ACTIVITY_DEPOSIT_LIMIT = 100;

export interface ActivityRow {
    txhash: string;
    height: string;
    timestamp: string;
    code: number;
    label: string;
    action?: string;
    amount?: string;
    actionAmount?: string;
    gameId?: string;
    transferAmount?: string;
    transferDirection?: "sent" | "received";
    prizePlace?: number;
    isPrizeClaim?: boolean;
    linkTo?: string;
    displayHash?: string;
}

/** Join sent, received and bridge-deposit rows, newest block first, same labels as the lobby panel. */
export function mergeActivityRows(
    sent: TransactionResponse,
    received: TransactionResponse,
    deposits: ActivityRow[],
    address: string
): ActivityRow[] {
    const withBodies = (response: TransactionResponse) => (response.tx_responses || []).map((tx, i) => ({ ...tx, tx: response.txs?.[i] }));
    const unique = Array.from(new Map([...withBodies(sent), ...withBodies(received)].map(tx => [tx.txhash, tx])).values());
    const rows: ActivityRow[] = [
        ...unique.map(tx => ({ txhash: tx.txhash, height: tx.height, timestamp: tx.timestamp, code: tx.code, ...describeTransaction(tx, address) })),
        ...deposits
    ];
    return rows.sort((a, b) => parseInt(b.height, 10) - parseInt(a.height, 10));
}

export function mergeLoadedActivity(current: ActivityRow[], incoming: ActivityRow[]): ActivityRow[] {
    return Array.from(new Map([...current, ...incoming].map(row => [row.txhash, row])).values()).sort(
        (a, b) => parseInt(b.height, 10) - parseInt(a.height, 10)
    );
}

const pageTotal = (response: TransactionResponse): number => parseInt(response.total || "0", 10);

/**
 * Recent activity for a profile address, paged from the node.
 *
 * A busy wallet can have thousands of txs, so this loads one search page of
 * sent and received at a time (plus bridge deposits on the first load) instead
 * of scanning the full history up front.
 */
export function useAddressActivity(address: string | undefined) {
    const { currentNetwork } = useNetwork();
    const cosmosApi = useCosmosApi();
    const cometRpcApiFactory = useCometRpcApiFactory();
    const [rows, setRows] = useState<ActivityRow[]>([]);
    const [gameFormats, setGameFormats] = useState<Record<string, ChainGameFormat | undefined>>({});
    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);

    const applyPrizeMeta = useCallback(
        (list: ActivityRow[], viewer: string) => {
            const gameIds = list.filter(tx => tx.actionAmount || tx.isPrizeClaim).map(tx => tx.gameId);
            void fetchGamePrizeMeta(id => cosmosApi.getGame(id), gameIds).then(meta => {
                setGameFormats(Object.fromEntries(Object.entries(meta).map(([id, m]) => [id, m.format])));
                setRows(prev =>
                    prev.map(tx => {
                        if (!tx.isPrizeClaim || !tx.gameId) return tx;
                        const place = resolvePrizePlace({
                            player: viewer,
                            results: meta[tx.gameId]?.results,
                            payouts: meta[tx.gameId]?.payouts,
                            prizeAmount: tx.transferAmount
                        });
                        if (isNullish(place)) return tx;
                        return { ...tx, prizePlace: place };
                    })
                );
            });
        },
        [cosmosApi]
    );

    const fetchPage = useCallback(
        async (nextPage: number, append: boolean) => {
            if (!hasContent(address)) return;
            const senderQuery = `message.sender='${address}'`;
            const recipientQuery = `transfer.recipient='${address}'`;
            const options = { limit: ACTIVITY_API_PAGE_SIZE, page: nextPage };
            const [sent, received, deposits] = await Promise.all([
                cosmosApi.getSentTransactions(senderQuery, options) as Promise<TransactionResponse>,
                cosmosApi.getReceivedTransactions(recipientQuery, options) as Promise<TransactionResponse>,
                append
                    ? Promise.resolve([])
                    : fetchBridgeDeposits(cometRpcApiFactory(currentNetwork.rpc), address, ACTIVITY_DEPOSIT_LIMIT).catch(err => {
                          console.error("Could not load bridge deposits:", err);
                          return [];
                      })
            ]);
            const incoming = mergeActivityRows(sent, received, deposits.map(bridgeDepositRow), address);
            setRows(prev => (append ? mergeLoadedActivity(prev, incoming) : incoming));
            setPage(nextPage);
            setHasMore(nextPage * ACTIVITY_API_PAGE_SIZE < pageTotal(sent) || nextPage * ACTIVITY_API_PAGE_SIZE < pageTotal(received));
            applyPrizeMeta(incoming, address);
        },
        [address, applyPrizeMeta, cometRpcApiFactory, cosmosApi, currentNetwork.rpc]
    );

    const reload = useCallback(async () => {
        if (!hasContent(address)) return;
        try {
            setLoading(true);
            setError(null);
            await fetchPage(1, false);
        } catch (err) {
            console.error("Error fetching activity:", err);
            setError("Failed to load activity");
        } finally {
            setLoading(false);
        }
    }, [address, fetchPage]);

    const loadMore = useCallback(async () => {
        if (!hasContent(address) || !hasMore || loadingMore) return;
        try {
            setLoadingMore(true);
            setError(null);
            await fetchPage(page + 1, true);
        } catch (err) {
            console.error("Error fetching more activity:", err);
            setError("Failed to load activity");
        } finally {
            setLoadingMore(false);
        }
    }, [address, fetchPage, hasMore, loadingMore, page]);

    useEffect(() => {
        if (!hasContent(address)) {
            setRows([]);
            setError(null);
            setLoading(false);
            setHasMore(false);
            setPage(1);
            return;
        }
        void reload();
    }, [address, reload]);

    return { rows, gameFormats, loading, loadingMore, error, hasMore, reload, loadMore };
}
