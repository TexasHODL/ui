import React from "react";
import { useNavigate } from "react-router-dom";
import { FaCopy, FaCog } from "react-icons/fa";
import { copyToClipboard } from "../utils/clipboard";
import GameWalletActions from "./GameWalletActions";
import type { SendTokens } from "./modals/types";
import styles from "./WalletPanel.module.css";

interface WalletPanelProps {
    onCreateWallet: () => void;
    onImportWallet: () => void;
    onRefresh?: () => Promise<void>;
    usdcBalance: string;
    numericUsdcBalance: number;
    sendTokens: SendTokens;
    cosmosWalletAddress: string | null;
}
const WalletPanel: React.FC<WalletPanelProps> = ({
    onCreateWallet,
    onImportWallet,
    onRefresh,
    usdcBalance,
    numericUsdcBalance,
    sendTokens,
    cosmosWalletAddress
}) => {
    const navigate = useNavigate();
    return (
        <section className={styles.panel} aria-label="Game wallet">
            <div className={styles.heading}>
                <h2>Your wallet</h2>
                <button type="button" onClick={() => navigate("/wallet")} aria-label="Manage wallet" title="Manage wallet">
                    <FaCog />
                </button>
            </div>
            {cosmosWalletAddress ? (
                <>
                    <GameWalletActions
                        variant="panel"
                        usdcBalance={usdcBalance}
                        numericUsdcBalance={numericUsdcBalance}
                        sendTokens={sendTokens}
                        onRefresh={onRefresh}
                    />
                    <details className={styles.details}>
                        <summary>Wallet address</summary>
                        <div>
                            <code>{cosmosWalletAddress.slice(0, 11) + "…" + cosmosWalletAddress.slice(-6)}</code>
                            <button type="button" aria-label="Copy wallet address" onClick={() => copyToClipboard(cosmosWalletAddress, "Wallet address copied")}>
                                <FaCopy />
                            </button>
                        </div>
                    </details>
                </>
            ) : (
                <>
                    <p className={styles.description}>Your seat starts here. Create a game wallet or bring your existing one.</p>
                    <button type="button" className={styles.primaryButton} onClick={onCreateWallet}>
                        Create wallet
                    </button>
                    <button type="button" className={styles.importButton} onClick={onImportWallet}>
                        Import existing wallet
                    </button>
                </>
            )}
        </section>
    );
};
export default WalletPanel;
