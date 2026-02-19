import React, { useState, useMemo, useEffect } from "react";
import { ethers } from "ethers";
import { getClient, getPublicKey } from "../../utils/b52AccountUtils";
import useCosmosWallet from "../../hooks/wallet/useCosmosWallet";
import { microToUsdc } from "../../constants/currency";
import { colors } from "../../utils/colorConfig";
import useUserWalletConnect from "../../hooks/wallet/useUserWalletConnect";
import { useModalStyles } from "../../hooks/useModalStyles";
import { WithdrawResponseDTO } from "@block52/poker-vm-sdk";
import useWithdraw from "../../hooks/wallet/useWithdraw";

/**
 * WithdrawalModal Component
 *
 * PURPOSE:
 * Allows users to withdraw funds from their Layer 2 game wallet to their connected MetaMask wallet.
 * This component handles the entire withdrawal flow including validation, SDK interaction, MetaMask transaction signing, and user feedback.
 *
 * TECHNICAL FLOW:
 * 1. User must have MetaMask connected (withdrawal address comes from connected wallet)
 * 2. User enters amount to withdraw
 * 3. Component validates the amount and checks sufficient balance
 * 4. Uses Block52 SDK to prepare withdrawal proof (nonce, signature)
 * 5. Executes Web3 transaction via MetaMask using the proof
 * 6. User pays gas fees via MetaMask for the withdrawal
 * 7. User receives funds on Ethereum mainnet
 *
 * DEPENDENCIES:
 * - @block52/poker-vm-sdk SDK for withdrawal proof generation
 * - ethers.js for address validation and amount conversion
 * - wagmi/viem for Web3 transaction execution
 * - MetaMask (REQUIRED) for transaction signing and gas payment
 * - Private key stored in localStorage for L2 account signing
 *
 * IMPORTANT: Understanding the addresses/accounts involved:
 *
 * 1. GAME ACCOUNT (Layer 2 / Block52 Chain):
 *    - This is the player's Layer 2 gaming wallet
 *    - Private key is stored in browser localStorage
 *    - Used for all in-game transactions (bets, calls, folds, etc.)
 *    - This is WHERE the funds are being withdrawn FROM
 *    - Accessed via: getPublicKey() from localStorage
 *
 * 2. CONNECTED METAMASK WALLET (REQUIRED):
 *    - External MetaMask wallet connected via WalletConnect/Web3Modal
 *    - REQUIRED for withdrawals (not optional)
 *    - Used as the receiver address for withdrawals
 *    - User pays gas fees from this wallet
 *    - This is WHERE the funds are being sent TO on mainnet
 *
 * WITHDRAWAL FLOW:
 * 1. SDK prepares withdrawal proof using L2 private key
 * 2. MetaMask executes bridge contract withdrawal using proof
 * 3. Game Account (L2) → Bridge Contract → MetaMask Wallet (Mainnet)
 *
 * LOGGING:
 * Comprehensive logging is implemented for debugging:
 * - [WithdrawalModal] prefix for all logs
 * - Logs each step of the withdrawal process
 * - Logs all parameters and responses
 * - Error details including message, code, and data
 */

import type { WithdrawalModalProps } from "./types";

const WithdrawalModal: React.FC<WithdrawalModalProps> = ({ isOpen, onClose, onSuccess }) => {
    // Get the Layer 2 game account public key from localStorage
    // This is the account that holds the funds to be withdrawn
    const publicKey = getPublicKey();
    const { balance: cosmosBalance, refreshBalance: refetchAccount } = useCosmosWallet();
    const { address: web3Address, isConnected: isWeb3Connected } = useUserWalletConnect();
    const modalStyles = useModalStyles();

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
    const [txData, setTxData] = useState<any>(null);

    // Add the withdraw hook at the top level (IMPORTANT: NOT inside handleWithdraw)
    const {
        withdraw: contractWithdraw,
        hash: _contractHash,
        isLoading: _isContractLoading,
        isWithdrawPending: _isContractPending,
        isWithdrawConfirmed: _isContractConfirmed,
        withdrawError: _contractError
    } = useWithdraw();

    // Reset form when modal opens/closes
    useEffect(() => {
        if (isOpen) {
            setAmount("");
            setError("");
            setSuccess(false);
            setTxData(null);
            refetchAccount();

        }
    }, [isOpen, refetchAccount, web3Address, isWeb3Connected, publicKey]);

    /**
     * Validates if the provided string is a valid Ethereum address
     * @param address - The address string to validate
     * @returns true if valid Ethereum address, false otherwise
     *
     * Note: ethers.isAddress checks for:
     * - Correct length (42 characters including 0x)
     * - Valid hex characters
     * - Valid checksum (if checksummed address)
     */
    const validateEthereumAddress = (address: string): boolean => {
        try {
            // ethers.isAddress returns true for valid addresses
            // Handles both checksummed and non-checksummed addresses
            return ethers.isAddress(address);
        } catch {
            // Return false if any error occurs during validation
            return false;
        }
    };

    /**
     * Validates if the withdrawal amount is valid
     * @param value - The amount string to validate
     * @returns true if amount is valid and sufficient balance exists
     *
     * Validation checks:
     * 1. Amount is a valid number
     * 2. Amount is greater than 0
     * 3. Amount is less than or equal to available balance
     * 4. Amount meets minimum withdrawal threshold (0.01 USDC)
     */
    const validateAmount = (value: string): boolean => {
        // Check if value exists and is a valid positive number
        if (!value || isNaN(Number(value)) || Number(value) <= 0) {
            return false;
        }

        // Check minimum withdrawal amount (0.01 USDC)
        if (Number(value) < 0.01) {
            return false;
        }

        // Check if user has sufficient balance (using memoized balance)
        return Number(value) <= balanceInUSDC;
    };

    /**
     * Handles the withdrawal process
     *
     * Flow:
     * 1. Validate receiver address format
     * 2. Validate withdrawal amount and balance
     * 3. Get SDK client with L2 private key
     * 4. Convert amount to wei
     * 5. Call SDK withdraw method
     * 6. Handle success/error states
     * 7. Refresh balance and close modal
     */
    // Update the handleWithdraw function
    const handleWithdraw = async () => {

        // STEP 1: Check if MetaMask is connected
        if (!isWeb3Connected || !web3Address) {
            console.error("[WithdrawalModal] MetaMask not connected");
            setError("Please connect your MetaMask wallet first");
            return;
        }

        // STEP 2: Validate the connected wallet address
        if (!validateEthereumAddress(web3Address)) {
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
            // Get the SDK client instance
            const client = getClient();
            const amountInWei = ethers.parseEther(amount).toString();


            // STEP 1: Call the SDK to prepare the withdrawal
            // Old Ethereum client for bridge only, will be updated when bridge is migrated
            const result: WithdrawResponseDTO = await client.withdraw(
                amountInWei,
                publicKey || undefined,
                web3Address // Use the connected MetaMask address
            );



            // STEP 2: Now call the smart contract with the SDK response
            await contractWithdraw(
                result.nonce,
                web3Address, // Use the connected MetaMask address
                BigInt(amountInWei),
                result.signature
            );

            setSuccess(true);
            setTxData(result);

            // Refresh balance after successful withdrawal
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
            } else if (err.message?.includes("signature")) {
                setError("Failed to sign transaction. Please try again");
            } else if (err.message?.includes("rejected")) {
                setError("Transaction rejected by user");
            } else {
                setError(err.message || "Failed to process withdrawal");
            }
        } finally {
            setIsWithdrawing(false);
        }
    };

    // // Add useEffect to handle contract confirmation
    // useEffect(() => {
    //     if (isContractConfirmed) {

    //         // Refresh account balance
    //         setTimeout(() => {
    //             refetchAccount();
    //             if (onSuccess) {
    //                 onSuccess();
    //             }
    //         }, 2000);

    //         // Auto-close modal
    //         setTimeout(() => {
    //             onClose();
    //         }, 3000);
    //     }
    // }, [isContractConfirmed, contractHash, refetchAccount, onSuccess, onClose]);

    if (!isOpen) return null;

    // Format balance for display (2 decimal places)
    const balanceDisplay = balanceInUSDC.toFixed(2);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={modalStyles.overlay}>
            <div className="rounded-xl p-6 w-full max-w-md mx-4" style={modalStyles.modalPrimaryBorder}>
                <h2 className="text-2xl font-bold mb-4 text-white">Withdraw Funds</h2>

                {/* Current Balance */}
                <div className="mb-4 p-3 rounded-lg" style={modalStyles.surfaceMuted}>
                    <p className="text-sm" style={{ color: colors.ui.textSecondary }}>
                        Available Balance
                    </p>
                    <p className="text-xl font-bold" style={{ color: colors.brand.primary }}>
                        ${balanceDisplay} USDC
                    </p>
                </div>

                {/* Success Message */}
                {success && (
                    <div className="mb-4 p-3 rounded-lg" style={modalStyles.successAlert}>
                        <p className="font-semibold" style={{ color: colors.accent.success }}>
                            Withdrawal Successful!
                        </p>
                        {txData && (
                            <p className="text-sm mt-2" style={{ color: colors.ui.textSecondary }}>
                                Transaction processing on blockchain...
                            </p>
                        )}
                    </div>
                )}

                {/* Error Message */}
                {error && (
                    <div className="mb-4 p-3 rounded-lg" style={modalStyles.dangerAlert}>
                        <p style={{ color: colors.accent.danger }}>{error}</p>
                    </div>
                )}

                {!success && (
                    <>
                        {/* MetaMask Connection Status */}
                        {!isWeb3Connected || !web3Address ? (
                            <div className="mb-4 p-3 rounded-lg" style={modalStyles.warningAlert}>
                                <p className="font-semibold mb-2" style={{ color: colors.accent.warning }}>
                                    MetaMask Not Connected
                                </p>
                                <p className="text-sm" style={{ color: colors.ui.textSecondary }}>
                                    Please connect your MetaMask wallet to withdraw funds. The withdrawal will be sent to your connected MetaMask address.
                                </p>
                            </div>
                        ) : (
                            /* Receiver Address Display (Read-only) */
                            <div className="mb-4">
                                <label className="block text-sm mb-2" style={{ color: colors.ui.textSecondary }}>
                                    Withdrawal Address (MetaMask)
                                </label>
                                <div
                                    className="p-3 rounded-lg"
                                    style={modalStyles.surfacePrimarySoft}
                                >
                                    <p className="font-mono text-sm" style={{ color: colors.brand.primary }}>
                                        {web3Address}
                                    </p>
                                </div>
                                <p className="text-xs mt-1 text-gray-500">Funds will be sent to your connected MetaMask wallet</p>
                            </div>
                        )}

                        {/* Amount Input - Only show if MetaMask is connected */}
                        {isWeb3Connected && web3Address && (
                            <div className="mb-6">
                                <label className="block text-sm mb-2" style={{ color: colors.ui.textSecondary }}>
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
                                    className="w-full px-3 py-2 rounded-lg focus:outline-none focus:ring-2"
                                    style={modalStyles.inputPrimarySoft}
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
                            className="w-full py-2 px-4 rounded-lg font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
                            style={{ background: modalStyles.gradient(colors.brand.primary) }}
                            disabled={isWithdrawing || !isWeb3Connected || !web3Address || !amount}
                        >
                            {isWithdrawing ? "Processing..." : !isWeb3Connected ? "Connect Wallet First" : "Withdraw"}
                        </button>
                    )}
                    <button
                        onClick={onClose}
                        className="w-full py-2 px-4 rounded-lg font-semibold text-white transition hover:opacity-80"
                        style={{ background: modalStyles.gradient(colors.accent.danger) }}
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
