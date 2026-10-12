import { formatUsd } from "../utils/moneyDisplay";
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowDown, FaArrowUp, FaCopy, FaRedo, FaCog, FaPlus } from "react-icons/fa";
import { copyToClipboard } from "../utils/clipboard";
import styles from "./WalletPanel.module.css";

interface WalletPanelProps {
    onDeposit: () => void;
    onWithdraw: () => void;
    onTransfer: () => void;
    onCreateWallet: () => void;
    onImportWallet: () => void;
    onRefresh?: () => Promise<void>;
    usdcBalance: string;
    cosmosWalletAddress: string | null;
}
const WalletPanel: React.FC<WalletPanelProps> = ({
    onDeposit,
    onWithdraw,
    onTransfer,
    onCreateWallet,
    onImportWallet,
    onRefresh,
    usdcBalance,
    cosmosWalletAddress
}) => {
    const navigate = useNavigate();
    const [refreshing, setRefreshing] = useState(false);
    const [refreshError, setRefreshError] = useState("");
    return (
        <section className={styles.panel} aria-label="Game wallet">
            <div className={styles.heading}>
                <h2>Your wallet</h2>
                <button onClick={() => navigate("/wallet")} aria-label="Manage wallet" title="Manage wallet">
                    <FaCog />
                </button>
            </div>
            {cosmosWalletAddress ? (
                <>
                    <div className={styles.balanceLabel}>
                        AVAILABLE TO PLAY
                        {onRefresh && (
                            <button
                                aria-label="Refresh balance"
                                disabled={refreshing}
                                onClick={async () => {
                                    setRefreshing(true);
                                    setRefreshError("");
                                    try {
                                        await onRefresh();
                                    } catch (error) {
                                        console.error("Wallet refresh failed", error);
                                        setRefreshError("Balance couldn’t refresh. Please try again.");
                                    } finally {
                                        setRefreshing(false);
                                    }
                                }}
                            >
                                <FaRedo className={refreshing ? "animate-spin" : ""} />
                            </button>
                        )}
                    </div>
                    <div className={styles.balance}>
                        {"$" + formatUsd(usdcBalance)} <span>USDC</span>
                    </div>
                    {refreshError && (
                        <p role="alert" className={styles.description}>
                            {refreshError}
                        </p>
                    )}
                    <button className={styles.primaryButton} onClick={onDeposit}>
                        <FaPlus /> Add funds
                    </button>
                    <div className={styles.secondaryActions}>
                        <button onClick={onWithdraw}>
                            <FaArrowDown /> Withdraw
                        </button>
                        <button onClick={onTransfer}>
                            <FaArrowUp /> Send
                        </button>
                    </div>
                    <details className={styles.details}>
                        <summary>Wallet address</summary>
                        <div>
                            <code>{cosmosWalletAddress.slice(0, 11) + "…" + cosmosWalletAddress.slice(-6)}</code>
                            <button aria-label="Copy wallet address" onClick={() => copyToClipboard(cosmosWalletAddress, "Wallet address copied")}>
                                <FaCopy />
                            </button>
                        </div>
                    </details>
                </>
            ) : (
                <>
                    <p className={styles.description}>Your seat starts here. Create a game wallet or bring your existing one.</p>
                    <button className={styles.primaryButton} onClick={onCreateWallet}>
                        Create wallet
                    </button>
                    <button className={styles.importButton} onClick={onImportWallet}>
                        Import existing wallet
                    </button>
                </>
            )}
        </section>
    );
};
export default WalletPanel;
