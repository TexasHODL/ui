import React, { useState, useMemo, useEffect } from "react";
import { ethers } from "ethers";
import { useNavigate } from "react-router-dom";
import useCosmosWallet from "../../hooks/wallet/useCosmosWallet";
import { microToUsdc, usdcToMicroBigInt } from "../../constants/currency";
import useUserWalletConnect from "../../hooks/wallet/useUserWalletConnect";
import { useNetwork } from "../../context/NetworkContext";
import { getSigningClient } from "../../utils/cosmos/client";
import styles from "./WithdrawalModal.module.css";

/**
 * WithdrawalModal Component
 *
 * PURPOSE:
 * Allows users to initiate a withdrawal from their Block52 (Cosmos) wallet.
 * This handles Step 1 of the 2-step withdrawal flow:
 *   Step 1 (this modal): Initiate withdrawal on Cosmos chain (burns USDC, creates withdrawal request)
 *   Step 2 (WithdrawalDashboard): After validators sign, complete withdrawal on Ethereum
 *
 * TECHNICAL FLOW:
 * 1. User must have MetaMask connected (Ethereum address is the withdrawal destination)
 * 2. User enters amount to withdraw
 * 3. Component validates the amount and checks sufficient balance
 * 4. Calls signingClient.initiateWithdrawal() on the Cosmos chain
 * 5. Directs user to WithdrawalDashboard to monitor signing and complete on Ethereum
 *
 * DEPENDENCIES:
 * - ethers.js for address validation
 * - Cosmos signing client for withdrawal initiation
 * - MetaMask (REQUIRED) for providing the Ethereum destination address
 */

import type { WithdrawalModalProps } from "./types";

const WithdrawalModal: React.FC<WithdrawalModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const { balance: cosmosBalance, refreshBalance: refetchAccount } = useCosmosWallet();
    const { address: web3Address, isConnected: isWeb3Connected } = useUserWalletConnect();
    const { currentNetwork } = useNetwork();
    const navigate = useNavigate();

    // Memoized USDC balance in human-readable format (avoids duplication)
    const balanceInUSDC = useMemo(() => {
        const usdcBalanceEntry = cosmosBalance.find(b => b.denom === "usdc");
        return usdcBalanceEntry ? microToUsdc(usdcBalanceEntry.amount) : 0;
    }, [cosmosBalance]);

    // Amount to withdraw in USDC
    const [amount, setAmount] = useState("");

    // UI state management
    const [isWithdrawing, setIsWithdrawing] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);
    const [txHash, setTxHash] = useState<string>("");

    // Reset form when modal opens/closes
    useEffect(() => {
        if (isOpen) {
            setAmount("");
            setError("");
            setSuccess(false);
            setTxHash("");
            refetchAccount();
        }
    }, [isOpen, refetchAccount, web3Address, isWeb3Connected]);

    const validateAmount = (value: string): boolean => {
        if (!value || isNaN(Number(value)) || Number(value) <= 0) {
            return false;
        }
        if (Number(value) < 0.01) {
            return false;
        }
        return Number(value) <= balanceInUSDC;
    };

    const handleWithdraw = async () => {
        // STEP 1: Check if MetaMask is connected
        if (!isWeb3Connected || !web3Address) {
            console.error("[WithdrawalModal] MetaMask not connected");
            setError("Please connect your MetaMask wallet first");
            return;
        }

        // STEP 2: Validate the connected wallet address
        if (!ethers.isAddress(web3Address)) {
            console.error("[WithdrawalModal] Invalid MetaMask address:", web3Address);
            setError("Invalid MetaMask wallet address");
            return;
        }

        // STEP 3: Validate the amount
        if (!validateAmount(amount)) {
            if (Number(amount) < 0.01) {
                console.error("[WithdrawalModal] Amount too small:", amount);
                setError("Minimum withdrawal amount is 0.01 USDC");
            } else {
                console.error("[WithdrawalModal] Invalid amount or insufficient balance:", amount);
                setError("Invalid amount or insufficient balance");
            }
            return;
        }

        setIsWithdrawing(true);
        setError("");

        try {
            const { signingClient } = await getSigningClient(currentNetwork);

            // Convert USDC to micro (6 decimals)
            const microAmount = usdcToMicroBigInt(parseFloat(amount));

            // Initiate the withdrawal on Cosmos chain
            const hash = await signingClient.initiateWithdrawal(web3Address, microAmount);

            setSuccess(true);
            setTxHash(hash);

            // Refresh balance after successful initiation
            setTimeout(() => {
                refetchAccount();
                if (onSuccess) {
                    onSuccess();
                }
            }, 2000);
        } catch (err: any) {
            console.error("[WithdrawalModal] Withdrawal error:", err);
            console.error("[WithdrawalModal] Error details:", {
                message: err.message,
                code: err.code,
                data: err.data
            });

            if (err.message?.includes("insufficient")) {
                setError("Insufficient balance for withdrawal");
            } else if (err.message?.includes("network")) {
                setError("Network error. Please try again");
            } else if (err.message?.includes("rejected")) {
                setError("Transaction rejected by user");
            } else {
                setError(err.message || "Failed to initiate withdrawal");
            }
        } finally {
            setIsWithdrawing(false);
        }
    };

    if (!isOpen) return null;

    // Format balance for display (2 decimal places)
    const balanceDisplay = balanceInUSDC.toFixed(2);

    return (
        <div className={`fixed inset-0 z-50 flex items-center justify-center ${styles.overlay}`}>
            <div className={`rounded-xl p-6 w-full max-w-md mx-4 ${styles.modalContainer}`}>
                <h2 className="text-2xl font-bold mb-4 text-white">Withdraw Funds</h2>

                {/* Current Balance */}
                <div className={`mb-4 p-3 rounded-lg ${styles.surfaceMuted}`}>
                    <p className={`text-sm ${styles.textSecondary}`}>
                        Available Balance
                    </p>
                    <p className={`text-xl font-bold ${styles.textPrimary}`}>
                        ${balanceDisplay} USDC
                    </p>
                </div>

                {/* Success Message */}
                {success && (
                    <div className={`mb-4 p-3 rounded-lg ${styles.successAlert}`}>
                        <p className={`font-semibold ${styles.textSuccess}`}>
                            Withdrawal Initiated!
                        </p>
                        {txHash && (
                            <p className={`text-sm mt-2 font-mono ${styles.textSecondary}`}>
                                Tx: {txHash.slice(0, 16)}...
                            </p>
                        )}
                        <p className={`text-sm mt-2 ${styles.textSecondary}`}>
                            Validators will sign your withdrawal within a few blocks. Complete it on the Withdrawal Dashboard.
                        </p>
                        <button
                            onClick={() => {
                                onClose();
                                navigate("/bridge/withdrawals");
                            }}
                            className={`mt-3 w-full py-2 px-4 rounded-lg font-semibold text-white transition hover:opacity-90 ${styles.primaryActionButton}`}
                        >
                            Go to Withdrawal Dashboard
                        </button>
                    </div>
                )}

                {/* Error Message */}
                {error && (
                    <div className={`mb-4 p-3 rounded-lg ${styles.dangerAlert}`}>
                        <p className={styles.textDanger}>{error}</p>
                    </div>
                )}

                {!success && (
                    <>
                        {/* MetaMask Connection Status */}
                        {!isWeb3Connected || !web3Address ? (
                            <div className={`mb-4 p-3 rounded-lg ${styles.warningAlert}`}>
                                <p className={`font-semibold mb-2 ${styles.textWarning}`}>
                                    MetaMask Not Connected
                                </p>
                                <p className={`text-sm ${styles.textSecondary}`}>
                                    Please connect your MetaMask wallet to withdraw funds. The withdrawal will be sent to your connected MetaMask address.
                                </p>
                            </div>
                        ) : (
                            /* Receiver Address Display (Read-only) */
                            <div className="mb-4">
                                <label className={`block text-sm mb-2 ${styles.textSecondary}`}>
                                    Withdrawal Address (MetaMask)
                                </label>
                                <div
                                    className={`p-3 rounded-lg ${styles.surfacePrimarySoft}`}
                                >
                                    <p className={`font-mono text-sm ${styles.textPrimary}`}>
                                        {web3Address}
                                    </p>
                                </div>
                                <p className="text-xs mt-1 text-gray-500">Funds will be sent to your connected MetaMask wallet</p>
                            </div>
                        )}

                        {/* Amount Input - Only show if MetaMask is connected */}
                        {isWeb3Connected && web3Address && (
                            <div className="mb-6">
                                <label className={`block text-sm mb-2 ${styles.textSecondary}`}>
                                    Amount (USDC)
                                </label>
                                <input
                                    type="number"
                                    value={amount}
                                    onChange={e => setAmount(e.target.value)}
                                    placeholder="0.00"
                                    step="0.01"
                                    min="0"
                                    max={balanceInUSDC}
                                    className={`w-full px-3 py-2 rounded-lg focus:outline-none focus:ring-2 ${styles.amountInput}`}
                                    disabled={isWithdrawing}
                                />
                                <p className="text-xs text-gray-500 mt-1">Minimum: 0.01 USDC</p>
                            </div>
                        )}
                    </>
                )}

                {/* Action Buttons */}
                <div className="flex flex-col space-y-3">
                    {!success && (
                        <button
                            onClick={handleWithdraw}
                            className={`w-full py-2 px-4 rounded-lg font-semibold text-white transition hover:opacity-90 disabled:opacity-50 ${styles.primaryActionButton}`}
                            disabled={isWithdrawing || !isWeb3Connected || !web3Address || !amount}
                        >
                            {isWithdrawing ? "Processing..." : !isWeb3Connected ? "Connect Wallet First" : "Withdraw"}
                        </button>
                    )}
                    <button
                        onClick={onClose}
                        className={`w-full py-2 px-4 rounded-lg font-semibold text-white transition hover:opacity-80 ${styles.cancelActionButton}`}
                        disabled={isWithdrawing}
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};

export default WithdrawalModal;
