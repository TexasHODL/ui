import { formatUsd } from "../utils/moneyDisplay";
import React, { useCallback, useState } from "react";
import { FaArrowDown, FaArrowUp, FaPlus, FaRedo } from "react-icons/fa";
import USDCDepositModal from "./modals/USDCDepositModal";
import WithdrawalModal from "./modals/WithdrawalModal";
import SendUsdcModal from "./modals/SendUsdcModal";
import type { SendTokens } from "./modals/types";
import styles from "./GameWalletActions.module.css";

export interface GameWalletActionsProps {
    /** Display string from formatMicroAsUsdc(..., 6), the same value the lobby passes through. */
    usdcBalance: string;
    numericUsdcBalance: number;
    sendTokens: SendTokens;
    onRefresh?: () => Promise<void>;
    /** Lobby panel keeps the stacked buttons. The wallet page uses a wider row that stacks on small screens. */
    variant?: "panel" | "page";
}

/**
 * Available balance plus Add funds, Withdraw, and Send.
 * Both the lobby wallet panel and the wallet page mount this, so the modals and handlers stay in one place.
 */
const GameWalletActions: React.FC<GameWalletActionsProps> = ({ usdcBalance, numericUsdcBalance, sendTokens, onRefresh, variant = "panel" }) => {
    const [showDeposit, setShowDeposit] = useState(false);
    const [showWithdraw, setShowWithdraw] = useState(false);
    const [showSend, setShowSend] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [refreshError, setRefreshError] = useState("");

    const openDeposit = useCallback(() => {
        setShowDeposit(true);
    }, []);
    const openWithdraw = useCallback(() => {
        setShowWithdraw(true);
    }, []);
    const openSend = useCallback(() => {
        setShowSend(true);
    }, []);

    const refreshBalance = useCallback(async () => {
        if (!onRefresh) return;
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
    }, [onRefresh]);

    const page = variant === "page";
    const actions = (
        <>
            <button type="button" className={styles.primaryButton} onClick={openDeposit}>
                <FaPlus /> Add funds
            </button>
            <div className={styles.secondaryActions}>
                <button type="button" onClick={openWithdraw}>
                    <FaArrowDown /> Withdraw
                </button>
                <button type="button" onClick={openSend}>
                    <FaArrowUp /> Send
                </button>
            </div>
        </>
    );

    return (
        <>
            <div>
                <div className={styles.balanceLabel}>
                    AVAILABLE TO PLAY
                    {onRefresh && (
                        <button
                            type="button"
                            aria-label="Refresh balance"
                            disabled={refreshing}
                            onClick={() => {
                                void refreshBalance();
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
                    <p role="alert" className={styles.refreshError}>
                        {refreshError}
                    </p>
                )}
                {page ? <div className={styles.pageButtons}>{actions}</div> : actions}
            </div>
            {showWithdraw && (
                <WithdrawalModal
                    isOpen={showWithdraw}
                    onClose={() => setShowWithdraw(false)}
                    onSuccess={() => {
                        void refreshBalance();
                    }}
                />
            )}
            {showDeposit && (
                <USDCDepositModal
                    isOpen={showDeposit}
                    onClose={() => setShowDeposit(false)}
                    onSuccess={() => {
                        setShowDeposit(false);
                        void refreshBalance();
                    }}
                />
            )}
            {showSend && (
                <SendUsdcModal
                    isOpen={showSend}
                    onClose={() => setShowSend(false)}
                    usdcBalance={usdcBalance}
                    numericUsdcBalance={numericUsdcBalance}
                    sendTokens={sendTokens}
                />
            )}
        </>
    );
};

export default GameWalletActions;
