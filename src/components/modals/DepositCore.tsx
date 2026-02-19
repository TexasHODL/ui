import { useState, useEffect, useMemo } from "react";
import * as React from "react";
import axios from "axios";
import useUserWalletConnect from "../../hooks/wallet/useUserWalletConnect";
import useDepositUSDC from "../../hooks/wallet/useDepositUSDC";
import useAllowance from "../../hooks/wallet/useAllowance";
import useDecimal from "../../hooks/wallet/useDecimals";
import useApprove from "../../hooks/wallet/useApprove";
import spinner from "../../assets/spinning-circles.svg";
import useWalletBalance from "../../hooks/wallet/useWalletBalance";
import { toast } from "react-toastify";
import { ETH_USDC_ADDRESS, COSMOS_BRIDGE_ADDRESS, PROXY_URL } from "../../config/constants";
import { useCosmosWallet } from "../../hooks";
import { useModalStyles } from "../../hooks/useModalStyles";
import { formatUSDCToSimpleDollars, convertAmountToBigInt } from "../../utils/numberUtils";
import { colors, hexToRgba } from "../../utils/colorConfig";
import CurrencySelector from "./CryptoPayment/CurrencySelector";
import PaymentDisplay from "./CryptoPayment/PaymentDisplay";
import PaymentStatusMonitor from "./CryptoPayment/PaymentStatusMonitor";

type DepositMethod = "crypto" | "usdc";

interface PaymentData {
    payment_id: string;
    pay_address: string;
    pay_amount: number;
    pay_currency: string;
    price_amount: number;
    expires_at: string;
}

import type { DepositCoreProps } from "./types";

const DepositCore: React.FC<DepositCoreProps> = ({
    onSuccess,
    showMethodSelector = true
}) => {
    const USDC_ADDRESS = ETH_USDC_ADDRESS;
    const BRIDGE_ADDRESS = COSMOS_BRIDGE_ADDRESS;

    const { open, isConnected, address } = useUserWalletConnect();
    const { deposit, isDepositPending, isDepositConfirmed, isPending, depositError } = useDepositUSDC();
    const { isApprovePending, isApproveConfirmed, isLoading, approve, approveError } = useApprove();
    const [amount, setAmount] = useState<string>("0");
    const { decimals } = useDecimal(USDC_ADDRESS);
    const [walletAllowance, setWalletAllowance] = useState<bigint>(BigInt(0));
    const [tmpWalletAllowance, setTmpWalletAllowance] = useState<bigint>(BigInt(0));
    const [tmpDepositAmount, setTmpDepositAmount] = useState<bigint>(BigInt(0));
    const { allowance } = useAllowance();
    const { balance } = useWalletBalance();
    const cosmosWallet = useCosmosWallet();

    // Crypto payment state
    const [depositMethod, setDepositMethod] = useState<DepositMethod>("crypto");
    const [selectedCurrency, setSelectedCurrency] = useState<string>("btc");
    const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
    const [creatingPayment, setCreatingPayment] = useState(false);
    const modalStyles = useModalStyles();

    useEffect(() => {
        if (allowance) {
            setWalletAllowance(allowance);
        }
    }, [allowance]);

    useEffect(() => {
        if (isDepositConfirmed) {
            toast.success("Deposit successful! USDC sent to your game wallet.", { autoClose: 5000 });
            setAmount("0");
            setWalletAllowance(w => w - tmpDepositAmount);
            cosmosWallet.refreshBalance();
            if (onSuccess) onSuccess();
        }
    }, [isDepositConfirmed, tmpDepositAmount, cosmosWallet, onSuccess]);

    const [approvalToastShown, setApprovalToastShown] = React.useState(false);

    useEffect(() => {
        if (isApproveConfirmed && !approvalToastShown && tmpWalletAllowance > 0n) {
            toast.success("Account activated! You can now deposit USDC anytime.", { autoClose: 5000 });
            setWalletAllowance(tmpWalletAllowance);
            setApprovalToastShown(true);
        }
    }, [isApproveConfirmed, tmpWalletAllowance, approvalToastShown]);

    useEffect(() => {
        if (isLoading || isApprovePending) {
            setApprovalToastShown(false);
        }
    }, [isLoading, isApprovePending]);

    useEffect(() => {
        if (depositError) {
            toast.error("Failed to deposit", { autoClose: 5000 });
        }
    }, [depositError]);

    useEffect(() => {
        if (approveError) {
            toast.error("Failed to approve", { autoClose: 5000 });
        }
    }, [approveError]);

    const allowed = React.useMemo(() => {
        if (!walletAllowance || !decimals || !+amount) return false;
        const amountInBigInt = convertAmountToBigInt(amount, decimals);
        return walletAllowance >= amountInBigInt;
    }, [amount, walletAllowance, decimals]);

    const handleApprove = async () => {
        if (!address || !decimals) {
            console.error("Missing required information");
            return;
        }

        try {
            const maxApproval = BigInt("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");
            await approve(USDC_ADDRESS, BRIDGE_ADDRESS, maxApproval);
            setTmpWalletAllowance(maxApproval);
        } catch (err) {
            console.error("Approval failed:", err);
        }
    };

    const handleDeposit = async () => {
        if (!cosmosWallet.address) {
            console.error("No Cosmos wallet address. Please create or import a wallet first.");
            toast.error("Please create or import a game wallet first.", { autoClose: 5000 });
            return;
        }

        if (allowed) {
            try {
                const amountInBigInt = convertAmountToBigInt(amount, decimals);
                await deposit(amountInBigInt, cosmosWallet.address);
                setTmpDepositAmount(amountInBigInt);
            } catch (err) {
                console.error("Deposit failed:", err);
            }
        } else {
            console.error("Insufficient allowance. Please approve deposit first.");
        }
    };

    const handleCreateCryptoPayment = async () => {
        if (!cosmosWallet.address) {
            toast.error("Please create or import a game wallet first.", { autoClose: 5000 });
            return;
        }

        if (!amount || +amount <= 0) {
            toast.error("Please enter a valid amount", { autoClose: 3000 });
            return;
        }

        try {
            setCreatingPayment(true);
            const response = await axios.post(`${PROXY_URL}/api/nowpayments/create`, {
                amount: +amount,
                currency: selectedCurrency,
                cosmosAddress: cosmosWallet.address
            });

            if (response.data.success) {
                setPaymentData({
                    payment_id: response.data.payment_id,
                    pay_address: response.data.pay_address,
                    pay_amount: response.data.pay_amount,
                    pay_currency: response.data.pay_currency,
                    price_amount: response.data.price_amount,
                    expires_at: response.data.expires_at
                });
                toast.success("Payment created! Send crypto to the address below.", { autoClose: 5000 });
            } else {
                toast.error(response.data.error || "Failed to create payment", { autoClose: 5000 });
            }
        } catch (err: any) {
            console.error("Error creating payment:", err);
            toast.error(err.response?.data?.error || "Failed to create payment", { autoClose: 5000 });
        } finally {
            setCreatingPayment(false);
        }
    };

    const handlePaymentComplete = () => {
        toast.success("Payment complete! USDC deposited to your game wallet.", { autoClose: 5000 });
        cosmosWallet.refreshBalance();
        setTimeout(() => {
            setPaymentData(null);
            setAmount("0");
            if (onSuccess) onSuccess();
        }, 3000);
    };

    const handleNewPayment = () => {
        setPaymentData(null);
        setAmount("0");
    };

    return (
        <div className="space-y-4">
            {!paymentData ? (
                <>
                    {/* Deposit Method Selector */}
                    {showMethodSelector && (
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-400 mb-3">
                                Select a deposit method
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => setDepositMethod("crypto")}
                                    className={`p-3 rounded-lg border transition-all ${
                                        depositMethod === "crypto"
                                            ? "border-blue-500 bg-blue-900/30"
                                            : "border-gray-600 bg-gray-900 hover:border-gray-500"
                                    }`}
                                    style={
                                        depositMethod === "crypto"
                                            ? {
                                                  borderColor: colors.brand.primary,
                                                  backgroundColor: hexToRgba(colors.brand.primary, 0.2)
                                              }
                                            : {}
                                    }
                                >
                                    <div className="text-center">
                                        <div className="text-2xl mb-1">₿</div>
                                        <div className="text-sm font-semibold text-white">
                                            Pay with Crypto
                                        </div>
                                        <div className="text-xs text-gray-400 mt-1">
                                            BTC or USDT
                                        </div>
                                    </div>
                                </button>
                                <button
                                    onClick={() => setDepositMethod("usdc")}
                                    className={`p-3 rounded-lg border transition-all ${
                                        depositMethod === "usdc"
                                            ? "border-blue-500 bg-blue-900/30"
                                            : "border-gray-600 bg-gray-900 hover:border-gray-500"
                                    }`}
                                    style={
                                        depositMethod === "usdc"
                                            ? {
                                                  borderColor: colors.brand.primary,
                                                  backgroundColor: hexToRgba(colors.brand.primary, 0.2)
                                              }
                                            : {}
                                    }
                                >
                                    <div className="text-center">
                                        <div className="text-2xl mb-1">$</div>
                                        <div className="text-sm font-semibold text-white">
                                            Deposit via Web3
                                        </div>
                                        <div className="text-xs text-gray-400 mt-1">
                                            USDC (ERC20)
                                        </div>
                                    </div>
                                </button>
                            </div>
                        </div>
                    )}

                    {depositMethod === "crypto" ? (
                        <>
                            {/* Crypto Payment Flow */}
                            <CurrencySelector
                                selectedCurrency={selectedCurrency}
                                onCurrencySelect={setSelectedCurrency}
                            />

                            {/* Amount Input */}
                            <div className="my-4">
                                <label htmlFor="amount" className="block text-sm font-medium text-gray-400 mb-2">
                                    Amount (USD)
                                </label>
                                <input
                                    id="amount"
                                    type="number"
                                    value={amount}
                                    onChange={e => setAmount(e.target.value)}
                                    className="w-full p-3 border border-gray-600 bg-gray-900 text-white rounded-lg focus:border-blue-500 focus:outline-none"
                                    placeholder="0.00"
                                    min="10"
                                />
                                <p className="text-xs text-gray-400 mt-2">
                                    Minimum: $10 USD
                                </p>
                                {+amount >= 10 && (
                                    <div className="mt-3 p-2 rounded bg-gray-800/50 text-xs">
                                        <div className="flex justify-between text-gray-300 font-medium">
                                            <span>You receive</span>
                                            <span className="text-green-400">${(+amount).toFixed(2)} USDC</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Info Box */}
                            <div className="mb-4 p-3 rounded-lg bg-blue-900/20 border border-blue-500/50 text-blue-400 text-xs">
                                <p className="font-semibold mb-1">How it works:</p>
                                <ol className="list-decimal list-inside space-y-1 text-blue-400/80">
                                    <li>Select your cryptocurrency</li>
                                    <li>Enter USD amount to deposit</li>
                                    <li>Send crypto to the payment address</li>
                                    <li>Funds auto-convert to USDC and appear in your wallet</li>
                                </ol>
                            </div>

                            {/* Deposit Button */}
                            <button
                                onClick={handleCreateCryptoPayment}
                                className={`w-full py-3 rounded-lg text-white font-semibold transition-all hover:opacity-90 flex items-center justify-center gap-3 ${
                                    +amount < 10 || creatingPayment ? "opacity-50 cursor-not-allowed" : ""
                                }`}
                                style={{ background: modalStyles.gradient(colors.accent.success) }}
                                disabled={+amount < 10 || creatingPayment}
                            >
                                {creatingPayment ? "Processing..." : "Deposit Now"}
                                {creatingPayment && <img src={spinner} className="w-5 h-5" alt="loading" />}
                            </button>
                        </>
                    ) : (
                        <>
                            {/* USDC Direct Deposit Flow */}
                            {!isConnected && (
                                <button
                                    className="w-full py-3 rounded-lg text-white font-semibold mb-4 transition-all hover:opacity-90"
                                    style={{ background: modalStyles.gradient(colors.brand.primary) }}
                                    onClick={open}
                                >
                                    Connect Your Web3 Wallet
                                </button>
                            )}

                            {address && (
                                <div className="mb-4 p-3 rounded-lg bg-gray-900 border border-gray-700">
                                    <p className="text-gray-400 text-sm mb-1">Connected Address</p>
                                    <p className="text-white font-mono text-sm break-all">{address}</p>
                                </div>
                            )}

                            {balance !== undefined && balance !== null && (
                                <div className="mb-4 p-3 rounded-lg bg-gray-900 border border-gray-700 flex items-center justify-between">
                                    <span className="text-gray-400 text-sm">Web3 Wallet Balance</span>
                                    <span className="text-white font-semibold">${formatUSDCToSimpleDollars(balance)} USDC</span>
                                </div>
                            )}

                            <div className="mb-4">
                                <label htmlFor="usdc-amount" className="block text-sm font-medium text-gray-400 mb-2">
                                    Amount to Deposit (USDC)
                                </label>
                                <div className="relative">
                                    <input
                                        id="usdc-amount"
                                        type="number"
                                        value={amount}
                                        onChange={e => setAmount(e.target.value)}
                                        className="w-full p-3 pr-16 border border-gray-600 bg-gray-900 text-white rounded-lg focus:border-blue-500 focus:outline-none"
                                        placeholder="0.00"
                                    />
                                    <button
                                        onClick={() => {
                                            if (balance !== undefined && balance !== null && decimals) {
                                                setAmount(formatUSDCToSimpleDollars(balance));
                                            }
                                        }}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold transition-colors hover:opacity-80"
                                        style={{ color: colors.brand.primary }}
                                    >
                                        MAX
                                    </button>
                                </div>
                            </div>

                            {/* Cosmos Address Display */}
                            <div className="mb-4 p-3 rounded-lg bg-gray-900 border border-gray-700">
                                <div className="text-sm text-gray-400">
                                    {cosmosWallet.address
                                        ? "b52USDC will be minted to your Cosmos address:"
                                        : "⚠️ No Cosmos wallet found"}
                                </div>
                                <div className="text-xs font-mono text-gray-300 truncate">
                                    {cosmosWallet.address || "Visit /wallet to generate a Cosmos wallet first"}
                                </div>
                            </div>

                            {allowed ? (
                                <button
                                    onClick={handleDeposit}
                                    className={`w-full py-3 rounded-lg text-white font-semibold transition-all hover:opacity-90 flex items-center justify-center gap-3 ${
                                        +amount === 0 ? "opacity-50 cursor-not-allowed" : ""
                                    }`}
                                    style={{ background: modalStyles.gradient(colors.accent.success) }}
                                    disabled={+amount === 0 || isDepositPending || isPending}
                                >
                                    {isDepositPending || isPending ? "Depositing..." : "Deposit"}
                                    {(isDepositPending || isPending) && <img src={spinner} className="w-5 h-5" alt="loading" />}
                                </button>
                            ) : (
                                <button
                                    onClick={handleApprove}
                                    className={`w-full py-3 rounded-lg text-white font-semibold transition-all hover:opacity-90 flex items-center justify-center gap-3 ${
                                        +amount === 0 ? "opacity-50 cursor-not-allowed" : ""
                                    }`}
                                    style={{ background: modalStyles.gradient(colors.brand.primary) }}
                                    disabled={+amount === 0 || isApprovePending || isLoading}
                                >
                                    {isLoading || isApprovePending ? "Approving..." : "Approve Deposit"}
                                    {(isLoading || isApprovePending) && <img src={spinner} className="w-5 h-5" alt="loading" />}
                                </button>
                            )}
                        </>
                    )}
                </>
            ) : (
                <>
                    {/* Payment Created - Show QR Code and Status */}
                    <PaymentDisplay
                        paymentAddress={paymentData.pay_address}
                        payAmount={paymentData.pay_amount}
                        payCurrency={paymentData.pay_currency}
                        expiresAt={paymentData.expires_at}
                        priceAmount={paymentData.price_amount}
                    />

                    <div className="my-4">
                        <PaymentStatusMonitor
                            paymentId={paymentData.payment_id}
                            onPaymentComplete={handlePaymentComplete}
                        />
                    </div>

                    {/* New Payment Button */}
                    <button
                        onClick={handleNewPayment}
                        className="w-full py-3 rounded-lg text-white font-semibold transition-all hover:opacity-90"
                        style={{ background: modalStyles.gradient(colors.brand.primary) }}
                    >
                        Create New Payment
                    </button>
                </>
            )}
        </div>
    );
};

export default DepositCore;
