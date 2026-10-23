import { formatMicroUsd } from "../utils/moneyDisplay";
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";

import { useNetwork } from "../context/NetworkContext";
import { formatTimestampRelative } from "../utils/formatUtils";

import styles from "./TransactionPanel.module.css";
import {
    describeTransaction,
    fetchGameFormats,
    fetchGamePrizeMeta,
    formatActionAmount,
    formatPrizeClaimLabel,
    resolvePrizePlace,
    type ChainGameFormat,
    formatTransferDirection,
    getTransferDirectionClass,
    formatShortHash,
    formatGameId,
    type TransferEvent,
    type TxMessage
} from "../utils/transactionUtils";
import { useCosmosApi } from "../context/CosmosApiContext";
import { isEmpty, hasElements } from "../utils/guards";

interface Transaction {
    txhash: string;
    height: string;
    timestamp: string;
    code: number;
    // Display label from describeTransaction ("Bet", "Join table", "Transfer"…)
    label: string;
    // Detailed action info
    action?: string;
    amount?: string;
    actionAmount?: string;
    gameId?: string;
    // Transfer info
    transferAmount?: string;
    transferDirection?: "sent" | "received";
    // SNG/tournament prize claim (from describeTransaction / sng_prize_claimed)
    prizePlace?: number;
    isPrizeClaim?: boolean;
}

interface TransactionPanelProps {
    cosmosWalletAddress: string | null;
    usdcBalance: string;
}

/** The decoded transaction body, as returned in the parallel `txs` array. */
interface CosmosTx {
    body?: { messages?: TxMessage[] };
}

/**
 * One element of `tx_responses`.
 *
 * This is the REST gateway's JSON shape, NOT cosmjs-types' `TxResponse`. The
 * gateway emits snake_case and serialises numerics as strings: `height` here is
 * a string we `parseInt`, where cosmjs-types models it as a `bigint` (and
 * `raw_log` as `rawLog`). Importing that type would need a cast at every
 * access, which is how `any` grew here in the first place.
 */
export interface CosmosTxResponse {
    txhash: string;
    height: string;
    timestamp: string;
    code: number;
    events?: TransferEvent[];
}

export interface TransactionResponse {
    pagination: { next_key: string | null; total: string } | null;
    total: string;
    tx_responses: CosmosTxResponse[];
    txs?: CosmosTx[]; // Include txs for message parsing
}

/** A response entry joined to its decoded body from the parallel `txs` array. */
type TxWithBody = CosmosTxResponse & { tx?: CosmosTx };

/**
 * TransactionPanel - Shows recent transactions for the connected wallet
 * Displays the last 6 transactions
 */
const TransactionPanel: React.FC<TransactionPanelProps> = ({ cosmosWalletAddress, usdcBalance }) => {
    const navigate = useNavigate();
    const { currentNetwork } = useNetwork();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    // Each game's format decides an action amount's unit (USDC vs chips).
    const [gameFormats, setGameFormats] = useState<Record<string, ChainGameFormat | undefined>>({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const cosmosApi = useCosmosApi();

    const fetchTransactions = useCallback(async () => {
        if (!cosmosWalletAddress) return;

        try {
            setLoading(true);
            setError(null);

            const address = cosmosWalletAddress;

            // Query for transactions where this address is the sender OR recipient
            const senderQuery = `message.sender='${address}'`;
            const recipientQuery = `transfer.recipient='${address}'`;
            // Fetch both sent and received transactions
            const [sentResponse, receivedResponse] = await Promise.all([
                cosmosApi.getSentTransactions(senderQuery) as Promise<TransactionResponse>,
                cosmosApi.getReceivedTransactions(recipientQuery) as Promise<TransactionResponse>
            ]);

            // Combine tx_responses with their txs for message type extraction
            const sentTxs: TxWithBody[] = (sentResponse.tx_responses || []).map((tx, i) => ({
                ...tx,
                tx: sentResponse.txs?.[i]
            }));
            const receivedTxs: TxWithBody[] = (receivedResponse.tx_responses || []).map((tx, i) => ({
                ...tx,
                tx: receivedResponse.txs?.[i]
            }));

            // Combine and deduplicate transactions by hash
            const allTxs = [...sentTxs, ...receivedTxs];
            const uniqueTxs = Array.from(new Map(allTxs.map(tx => [tx.txhash, tx])).values());

            // Sort by height (descending) and take first 6
            uniqueTxs.sort((a, b) => parseInt(b.height) - parseInt(a.height));
            const recentTxs = uniqueTxs.slice(0, 6);

            // Same labelling as the explorer's address Transactions list.
            const formattedTxs: Transaction[] = recentTxs.map(tx => {
                const { label, action, amount, actionAmount, gameId, transferAmount, transferDirection, prizePlace, isPrizeClaim } = describeTransaction(tx, address);
                return { txhash: tx.txhash, height: tx.height, timestamp: tx.timestamp, code: tx.code, label, action, amount, actionAmount, gameId, transferAmount, transferDirection, prizePlace, isPrizeClaim };
            });
            const gameIds = formattedTxs.filter(tx => tx.actionAmount || tx.isPrizeClaim).map(tx => tx.gameId);
            fetchGamePrizeMeta(id => cosmosApi.getGame(id), gameIds).then(meta => {
                setGameFormats(Object.fromEntries(Object.entries(meta).map(([id, m]) => [id, m.format])));
                setTransactions(prev =>
                    prev.map(tx => {
                        if (!tx.isPrizeClaim || !tx.gameId) return tx;
                        const m = meta[tx.gameId];
                        const place = resolvePrizePlace({
                            player: address,
                            results: m?.results,
                            payouts: m?.payouts,
                            prizeAmount: tx.transferAmount
                        });
                        if (place == null) return tx;
                        return { ...tx, prizePlace: place };
                    })
                );
            });

            setTransactions(formattedTxs);
        } catch (err: unknown) {
            console.error("Error fetching transactions:", err);
            setError("Failed to load transactions");
        } finally {
            setLoading(false);
        }
    }, [cosmosWalletAddress, currentNetwork.rest]);

    // Fetch transactions on mount and when wallet changes
    useEffect(() => {
        fetchTransactions();
    }, [fetchTransactions, cosmosWalletAddress, usdcBalance]);

    // Don't render if no wallet
    if (!cosmosWalletAddress) {
        return null;
    }

    return (
        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 bg-gray-900 border-b border-gray-700 flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">Recent Transactions</h2>
                <button
                    onClick={fetchTransactions}
                    disabled={loading}
                    className={`p-2 rounded-lg text-white transition-all hover:opacity-90 disabled:opacity-50 ${styles.refreshButton}`}
                    title="Refresh transactions"
                >
                    <svg className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                        />
                    </svg>
                </button>
            </div>

            {/* Content */}
            <div className="p-4">
                {loading && isEmpty(transactions) ? (
                    <div className="flex items-center justify-center py-8">
                        <svg className="animate-spin h-6 w-6 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            ></path>
                        </svg>
                    </div>
                ) : error ? (
                    <div className="text-center py-6">
                        <p className="text-gray-400 text-sm">{error}</p>
                        <button onClick={fetchTransactions} className={`mt-2 text-sm transition-colors hover:opacity-80 ${styles.primaryText}`}>
                            Try again
                        </button>
                    </div>
                ) : isEmpty(transactions) ? (
                    <div className="text-center py-6">
                        <svg className="w-10 h-10 mx-auto text-gray-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="1.5"
                                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                            />
                        </svg>
                        <p className="text-gray-400 text-sm">No transactions yet</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {transactions.map(tx => (
                            <div
                                key={tx.txhash}
                                onClick={() => navigate(`/explorer/tx/${tx.txhash}`)}
                                className="p-3 rounded-lg bg-gray-900 border border-gray-700 cursor-pointer hover:bg-gray-700/50 transition-colors"
                            >
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-white text-sm font-medium">{tx.isPrizeClaim ? formatPrizeClaimLabel(tx.prizePlace, tx.gameId ? gameFormats[tx.gameId] : undefined) : tx.label}</span>
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${tx.code === 0 ? styles.statusSuccess : styles.statusFailed}`}>
                                        {tx.code === 0 ? "Success" : "Failed"}
                                    </span>
                                </div>
                                {/* Poker action amount (USDC for cash, chips for Sit & Go) */}
                                {formatActionAmount(tx.actionAmount, tx.gameId ? gameFormats[tx.gameId] : undefined) && (
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={`text-sm font-medium ${styles.primaryText}`}>
                                            {formatActionAmount(tx.actionAmount, tx.gameId ? gameFormats[tx.gameId] : undefined)}
                                        </span>
                                        {tx.gameId && <span className="text-xs text-gray-500">Game: {formatGameId(tx.gameId)}</span>}
                                    </div>
                                )}
                                {/* Action/Transfer Details */}
                                {(tx.amount || tx.transferAmount) && (
                                    <div className="flex items-center gap-2 mb-1">
                                        {tx.transferDirection && (
                                            <span className={`text-xs ${getTransferDirectionClass(tx.transferDirection)}`}>
                                                {formatTransferDirection(tx.transferDirection)}
                                            </span>
                                        )}
                                        <span className={`text-sm font-medium ${styles.primaryText}`}>
                                            {formatMicroUsd(tx.amount || tx.transferAmount || "0")} USDC
                                        </span>
                                        {tx.gameId && <span className="text-xs text-gray-500">Game: {formatGameId(tx.gameId)}</span>}
                                    </div>
                                )}
                                <div className="flex items-center justify-between">
                                    <span className="text-gray-400 text-xs font-mono">{formatShortHash(tx.txhash)}</span>
                                    <span className="text-gray-500 text-xs">{formatTimestampRelative(tx.timestamp)}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* View All Link */}
                {hasElements(transactions) && cosmosWalletAddress && (
                    <button
                        onClick={() => navigate(`/explorer/address/${cosmosWalletAddress}`)}
                        className={`w-full mt-4 text-center text-sm transition-all hover:opacity-80 flex items-center justify-center gap-2 ${styles.primaryText}`}
                    >
                        <span>View All Transactions</span>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                    </button>
                )}
            </div>
        </div>
    );
};

export default TransactionPanel;
