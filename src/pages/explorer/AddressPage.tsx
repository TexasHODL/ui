import { formatMicroUsd } from "../../utils/moneyDisplay";
import { useState, useEffect, useCallback } from "react";
import { isNetworkError } from "../../apis/HTTPClient";
import { useParams, useNavigate, Link } from "react-router-dom";
import { getCosmosClient } from "../../utils/cosmos/client";
import { useNetwork } from "../../context/NetworkContext";
import { microToUsdc } from "../../constants/currency";
import { Coin } from "./types";
import { formatTimestampRelative } from "../../utils/formatUtils";
import { isEmpty, hasElements } from "../../utils/guards";
import { AnimatedBackground } from "../../components/common/AnimatedBackground";
import { ExplorerHeader } from "../../components/explorer/ExplorerHeader";
import {
    ExplorerEmpty,
    ExplorerError,
    ExplorerLoading,
    ExplorerPanel,
    ExplorerReloadButton,
    ExplorerSearchInput
} from "../../components/explorer/ExplorerPanel";
import styles from "./AddressPage.module.css";
import { TransactionResponse, type CosmosTxResponse } from "../../components/TransactionPanel";
import { describeTransaction, fetchGameFormats, formatActionAmount, formatGameId, type ChainGameFormat, formatTransferDirection, getTransferDirectionClass, type TxDescription } from "../../utils/transactionUtils";

/** One row of the Transactions tab: the tx plus what it was for (shared with the lobby card). */
type AddressTx = CosmosTxResponse & TxDescription;
import { useCosmosApi } from "../../context/CosmosApiContext";
import { copyToClipboard } from "../../components/playPage/Table/utils";

export default function AddressPage() {
    const { address: urlAddress } = useParams<{ address: string }>();
    const navigate = useNavigate();
    const { currentNetwork } = useNetwork();

    const [address, setAddress] = useState(urlAddress || "");
    const [balances, setBalances] = useState<Coin[]>([]);
    const [transactions, setTransactions] = useState<AddressTx[]>([]);
    // Each game's format decides an action amount's unit (USDC vs chips).
    const [gameFormats, setGameFormats] = useState<Record<string, ChainGameFormat | undefined>>({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<"balances" | "transactions">("balances");
    const cosmosApi = useCosmosApi();

    const handleSearch = useCallback(
        async (addressToSearch?: string) => {
            const searchAddress = addressToSearch || address;

            if (!searchAddress.trim()) {
                setError("Please enter a Block 52 address");
                return;
            }

            // Validate address format (should start with the chain prefix, e.g., "b52")
            if (!searchAddress.startsWith("b52")) {
                setError("Invalid address format. Address should start with 'b52'");
                return;
            }

            try {
                setLoading(true);
                setError(null);
                const cosmosClient = getCosmosClient({
                    rpc: currentNetwork.rpc,
                    rest: currentNetwork.rest
                });

                if (!cosmosClient) {
                    throw new Error("Block52 client not initialized.");
                }

                // Fetch balances
                const addressBalances = await cosmosClient.getAllBalances(searchAddress.trim());
                setBalances(addressBalances);

                // Fetch transactions - try multiple event types to catch all transactions
                try {
                    // Query for transactions where this address is the sender OR recipient
                    const senderQuery = `message.sender='${searchAddress.trim()}'`;
                    const recipientQuery = `transfer.recipient='${searchAddress.trim()}'`;

                    // Fetch both sent and received transactions
                    // Note: Cosmos SDK uses 'query=' parameter, not 'events='
                    const [sentResponse, receivedResponse] = await Promise.all([
                        cosmosApi.getSentTransactions(senderQuery) as Promise<TransactionResponse>,
                        cosmosApi.getReceivedTransactions(recipientQuery) as Promise<TransactionResponse>
                    ]);

                    // Join each response to its decoded body (parallel `txs` array) so
                    // the list can say what the tx was for, then dedupe by hash.
                    const withBodies = (response: TransactionResponse) =>
                        (response.tx_responses || []).map((tx, i) => ({ ...tx, tx: response.txs?.[i] }));
                    const allTxs = [...withBodies(sentResponse), ...withBodies(receivedResponse)];
                    const uniqueTxs = Array.from(new Map(allTxs.map(tx => [tx.txhash, tx])).values());

                    // Sort by height (descending)
                    uniqueTxs.sort((a, b) => parseInt(b.height) - parseInt(a.height));

                    const viewer = searchAddress.trim();
                    const described = uniqueTxs.map(tx => ({ ...tx, ...describeTransaction(tx, viewer) }));
                    setTransactions(described);
                    fetchGameFormats(
                        id => cosmosApi.getGame(id),
                        described.filter(tx => tx.actionAmount).map(tx => tx.gameId)
                    ).then(setGameFormats);
                } catch (txError) {
                    console.error("Error fetching transactions:", txError);
                    // Don't fail the whole query if transactions fail
                    setTransactions([]);
                }
            } catch (err) {
                const message = err instanceof Error ? err.message : "";
                let errorMessage = "Failed to fetch address data";

                if (message.includes("timeout")) {
                    errorMessage = "Request timeout - network may be slow";
                } else if (isNetworkError(err) || message.includes("ECONNREFUSED")) {
                    errorMessage = `Cannot connect to ${currentNetwork.name}`;
                } else if (message) {
                    errorMessage = message;
                }

                setError(errorMessage);
                setBalances([]);
                setTransactions([]);
                console.error("Error fetching address data:", err);
            } finally {
                setLoading(false);
            }
        },
        [address, currentNetwork]
    );

    // Searching opens that address's URL, so the page (and a shared link) always
    // reflects the viewed address; the URL effect below does the fetch.
    const submitSearch = () => {
        const next = address.trim();
        if (next && next === urlAddress) {
            handleSearch(next);
        } else if (next) {
            navigate(`/explorer/address/${next}`);
        } else {
            handleSearch();
        }
    };

    // Auto-search if address is in URL
    useEffect(() => {
        if (urlAddress) {
            handleSearch(urlAddress);
        }
    }, [urlAddress, currentNetwork, handleSearch]);

    // Set page title
    useEffect(() => {
        if (urlAddress) {
            const shortAddress = `${urlAddress.substring(0, 10)}...${urlAddress.substring(urlAddress.length - 6)}`;
            document.title = `Address ${shortAddress} - Texas HODL Explorer`;
        } else {
            document.title = "Address Search - Texas HODL Explorer";
        }

        return () => {
            document.title = "Texas HODL";
        };
    }, [urlAddress]);

    const formatDenom = (denom: string) => {
        if (denom.toLowerCase() === "usdc") return "USDC";
        if (denom.startsWith("u")) return denom.slice(1).toUpperCase();
        return denom.toUpperCase();
    };

    const formatAmount = (amount: string, denom: string) => {
        // Assuming micro-denominations (6 decimals)
        if (["usdc", "uusdc"].includes(denom.toLowerCase())) return `${formatMicroUsd(amount, true)} USDC`;
        const value = microToUsdc(amount);
        return `${value.toFixed(6)} ${formatDenom(denom)}`;
    };

    // Reloads the address being viewed (same icon and place as the other explorer lists).
    const reload = urlAddress ? <ExplorerReloadButton onClick={() => handleSearch(urlAddress)} busy={loading} label="Reload address" /> : null;

    const tabClass = (tab: "balances" | "transactions") =>
        `px-3 py-2 text-sm font-semibold border-b-2 transition-colors ${activeTab === tab ? styles.tabActive : styles.tabInactive}`;

    return (
        <div className="site-page">
            <AnimatedBackground />

            <div className="site-page-content">
                {/* Explorer Navigation Header */}
                <ExplorerHeader title="Block Explorer" />

                <ExplorerSearchInput value={address} onChange={setAddress} placeholder="Search by address (b52…)" onSubmit={submitSearch} busy={loading} />

                {/* Address header */}
                {urlAddress && (
                    <div className={`backdrop-blur-md px-4 py-3 sm:px-5 sm:py-4 rounded-xl mb-4 ${styles.containerCard}`}>
                        <p className="text-xs uppercase tracking-wide text-gray-400 mb-1">Address</p>
                        <div className="flex items-start gap-2">
                            <p className="flex-1 min-w-0 font-mono text-sm sm:text-base text-white break-all">{urlAddress}</p>
                            <button
                                type="button"
                                onClick={() => copyToClipboard(urlAddress, "Address copied")}
                                title="Copy address"
                                aria-label="Copy address"
                                className={`shrink-0 p-1.5 rounded-md transition-colors ${styles.iconButton}`}
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                                    />
                                </svg>
                            </button>
                        </div>
                        <Link to={`/players/${urlAddress}`} className={`inline-block mt-2 text-sm hover:underline ${styles.link}`}>
                            Player profile →
                        </Link>
                    </div>
                )}

                {/* One results panel for every state: prompt, loading, error, empty, data.
                    Like the other explorer lists, it carries a reload action once there is something to reload. */}
                {!urlAddress ? (
                    <ExplorerPanel header="Address">
                        <ExplorerEmpty>Enter a Block52 address above to see its balances and transactions.</ExplorerEmpty>
                    </ExplorerPanel>
                ) : loading ? (
                    <ExplorerPanel header="Address" action={reload}>
                        <ExplorerLoading label="Loading address…" />
                    </ExplorerPanel>
                ) : error ? (
                    <ExplorerPanel header="Address" action={reload}>
                        <ExplorerError>{error}</ExplorerError>
                    </ExplorerPanel>
                ) : isEmpty(balances) && isEmpty(transactions) ? (
                    <ExplorerPanel header="Address" action={reload}>
                        <ExplorerEmpty>No balances or transactions for this address yet.</ExplorerEmpty>
                    </ExplorerPanel>
                ) : (
                    <ExplorerPanel
                        action={reload}
                        header={
                            <div className="flex gap-2 -mb-px" role="tablist">
                                <button
                                    role="tab"
                                    aria-selected={activeTab === "balances"}
                                    onClick={() => setActiveTab("balances")}
                                    className={tabClass("balances")}
                                >
                                    Balances
                                </button>
                                <button
                                    role="tab"
                                    aria-selected={activeTab === "transactions"}
                                    onClick={() => setActiveTab("transactions")}
                                    className={tabClass("transactions")}
                                >
                                    Transactions{hasElements(transactions) ? ` (${transactions.length})` : ""}
                                </button>
                            </div>
                        }
                    >
                        <div className="p-3 sm:p-4">
                            {/* Balances Tab */}
                            {activeTab === "balances" &&
                                (isEmpty(balances) ? (
                                    <ExplorerEmpty>No balances for this address.</ExplorerEmpty>
                                ) : (
                                    <ul className="divide-y divide-white/5">
                                        {balances.map((balance, index) => (
                                            <li key={index} className="flex justify-between items-center py-2">
                                                <span className="text-sm text-gray-300">{formatDenom(balance.denom)}</span>
                                                <span className="font-mono text-sm sm:text-base text-white">{formatAmount(balance.amount, balance.denom)}</span>
                                            </li>
                                        ))}
                                    </ul>
                                ))}

                            {/* Transactions Tab */}
                            {activeTab === "transactions" &&
                                (isEmpty(transactions) ? (
                                    <ExplorerEmpty>No transactions for this address.</ExplorerEmpty>
                                ) : (
                                    <ul className="space-y-2">
                                        {transactions.map((tx, index) => {
                                            const currentAddress = urlAddress || address;
                                            const actionAmount = formatActionAmount(tx.actionAmount, tx.gameId ? gameFormats[tx.gameId] : undefined);
                                            return (
                                                <li
                                                    key={index}
                                                    onClick={() =>
                                                        navigate(`/explorer/tx/${tx.txhash}`, {
                                                            state: { fromAddress: currentAddress }
                                                        })
                                                    }
                                                    data-testid="address-tx"
                                                    className={`px-3 py-2 rounded-lg cursor-pointer transition-colors ${styles.txItemCard}`}
                                                >
                                                    <div className="flex justify-between items-center gap-3">
                                                        <p className="flex-1 min-w-0 text-sm font-semibold text-white truncate" data-testid="tx-action">
                                                            {tx.label}
                                                        </p>
                                                        <span
                                                            className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-semibold ${tx.code === 0 ? styles.txStatusSuccess : styles.txStatusFailed}`}
                                                        >
                                                            {tx.code === 0 ? "Success" : "Failed"}
                                                        </span>
                                                    </div>
                                                    {actionAmount && (
                                                        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs" data-testid="tx-amount">
                                                            <span className={`font-medium ${styles.link}`}>{actionAmount}</span>
                                                            {tx.gameId && <span className="text-gray-400">Game: {formatGameId(tx.gameId)}</span>}
                                                        </p>
                                                    )}
                                                    {(tx.amount || tx.transferAmount) && (
                                                        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs" data-testid="tx-amount">
                                                            {tx.transferDirection && (
                                                                <span className={getTransferDirectionClass(tx.transferDirection)}>
                                                                    {formatTransferDirection(tx.transferDirection)}
                                                                </span>
                                                            )}
                                                            <span className={`font-medium ${styles.link}`}>{formatMicroUsd(tx.amount || tx.transferAmount || "0")} USDC</span>
                                                            {tx.gameId && <span className="text-gray-400">Game: {formatGameId(tx.gameId)}</span>}
                                                        </p>
                                                    )}
                                                    <p className="mt-1 font-mono text-xs sm:text-sm text-gray-300 truncate">{tx.txhash}</p>
                                                    <p className="mt-0.5 text-xs text-gray-400">
                                                        Block {tx.height} · {formatTimestampRelative(tx.timestamp)}
                                                    </p>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                ))}
                        </div>
                    </ExplorerPanel>
                )}
            </div>
        </div>
    );
}
