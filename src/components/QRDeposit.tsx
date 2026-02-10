import React, { useEffect, useState, useCallback } from "react";
import "./QRDeposit.css"; // Import the CSS file with animations
import { QRCodeSVG } from "qrcode.react";
import { Eip1193Provider, ethers, parseUnits } from "ethers";
import axios from "axios";
import { DEPOSIT_ADDRESS, PROXY_URL, TOKEN_ADDRESS } from "../config/constants";
import useUserWallet from "../hooks/wallet/useUserWallet";
import useUserWalletConnect from "../hooks/wallet/useUserWalletConnect";
import { formatBalance } from "../utils/numberUtils"; // Import formatBalance utility function
import { formatMicroAsUsdc } from "../constants/currency";
import { DepositSession, EtherscanTransaction, TransactionStatus } from "../types";
import spinner from "../assets/spinning-circles.svg";
import { v4 as uuidv4 } from "uuid";
import { colors, hexToRgba } from "../utils/colorConfig";
import { AnimatedBackground } from "./common";

const ETHERSCAN_API_KEY = import.meta.env.VITE_ETHERSCAN_API_KEY;
const RPC_URL = import.meta.env.VITE_MAINNET_RPC_URL || "https://eth.llamarpc.com";
const BITCOIN_PAYMENTS = import.meta.env.VITE_BTCPAY_SERVER_URL;
const basic_auth = import.meta.env.VITE_BTCPAY_BASIC_AUTH;
const CLUB_NAME = import.meta.env.VITE_CLUB_NAME || "Block 52";

// Add USDC contract ABI (just the transfer method)
const USDC_ABI = [
    "function transfer(address to, uint256 amount) returns (bool)",
    "function approve(address spender, uint256 amount) returns (bool)",
    "function balanceOf(address account) view returns (uint256)"
];

const QRDeposit: React.FC = () => {
    const { accountData, refreshBalance } = useUserWallet();
    const b52Balance = accountData?.balance;
    const b52Nonce = accountData?.nonce;
    const b52Address = accountData?.address;
    const { isConnected, open, disconnect, address: web3Address } = useUserWalletConnect();
    const [showQR, setShowQR] = useState<boolean>(false);
    const [latestTransaction, setLatestTransaction] = useState<EtherscanTransaction | null>(null);
    const [timeLeft, setTimeLeft] = useState<number>(300); // 5 minutes in seconds
    const [isQuerying, setIsQuerying] = useState<boolean>(false);
    const [loggedInAccount, setLoggedInAccount] = useState<string>("");
    const [error, setError] = useState<string | null>(null);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [currentSession, setCurrentSession] = useState<DepositSession | null>(null);
    const [depositAmount, setDepositAmount] = useState<string>("");
    const [web3Balance, setWeb3Balance] = useState<string>("0");
    const [isTransferring, setIsTransferring] = useState(false);
    const [displayBalance, setDisplayBalance] = useState<string>("0");
    const [transactionStatus, setTransactionStatus] = useState<TransactionStatus>(null);
    const [progressPercentage, setProgressPercentage] = useState<number>(0);
    const [completionCountdown, setCompletionCountdown] = useState<number>(0);
    const [isDepositCompleted, setIsDepositCompleted] = useState<boolean>(false);
    const [showDebug, setShowDebug] = useState<boolean>(false);

    const [isBitcoinLoading, setIsBitcoinLoading] = useState<boolean>(false);

    // Get progress percentage based on transaction status
    const getProgressFromStatus = (status: TransactionStatus): number => {
        switch (status) {
            case "DETECTED":
                return 20;
            case "PROCESSING":
                return 40;
            case "CONFIRMING":
                return 60;
            case "CONFIRMED":
                return 80;
            case "COMPLETED":
                return 100;
            default:
                return 0;
        }
    };

    // Update progress based on transaction status
    useEffect(() => {
        if (transactionStatus) {
            setProgressPercentage(getProgressFromStatus(transactionStatus));

            // Start 30 second countdown after confirmation
            if (transactionStatus === "CONFIRMED") {
                setCompletionCountdown(20);
            }
        }
    }, [transactionStatus]);

    // Handle completion countdown
    useEffect(() => {
        if (completionCountdown <= 0) {
            if (transactionStatus === "CONFIRMED") {
                setTransactionStatus("COMPLETED");
            }
            return;
        }

        const timer = setInterval(() => {
            setCompletionCountdown(prev => prev - 1);

            // Gradually increase progress from 80 to 100 during countdown
            const newProgress = 80 + ((30 - completionCountdown) / 30) * 20;
            setProgressPercentage(Math.min(newProgress, 100));
        }, 1000);

        return () => clearInterval(timer);
    }, [completionCountdown, transactionStatus]);

    // Update displayBalance when b52Balance changes
    useEffect(() => {
        if (b52Balance) {
            setDisplayBalance(b52Balance.toString());
        }
    }, [b52Balance]);

    // Add refresh interval for balance
    useEffect(() => {
        // Set up a timer to refresh balance every 5 seconds
        const balanceRefreshInterval = setInterval(() => {
            // Use the refreshBalance function from the hook
            refreshBalance();
        }, 5000);

        // Clean up interval on unmount
        return () => clearInterval(balanceRefreshInterval);
    }, [refreshBalance]);

    // Add countdown timer effect
    useEffect(() => {
        if (!showQR || !currentSession || currentSession.status !== "PENDING" || timeLeft <= 0) {
            return;
        }

        const timer = setInterval(() => {
            setTimeLeft(prevTime => {
                const newTime = prevTime - 1;
                if (newTime <= 0) {
                    // Session expired
                    setShowQR(false);
                    setCurrentSession(prev => (prev ? { ...prev, status: "EXPIRED" } : null));
                    return 0;
                }
                return newTime;
            });
        }, 1000);

        // Cleanup timer on unmount or when conditions change
        return () => {
            clearInterval(timer);
        };
    }, [showQR, currentSession, timeLeft]);

    // Format time function
    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    };

    // Get the stored Cosmos address on component mount
    useEffect(() => {
        const storedKey = localStorage.getItem("user_cosmos_address");
        if (storedKey) {
            setLoggedInAccount(storedKey);
        }
    }, []);

    // Function to get USDC balance of connected wallet
    const fetchWeb3Balance = useCallback(async () => {
        if (!web3Address) return;

        try {
            const provider = new ethers.JsonRpcProvider(RPC_URL);
            const usdcContract = new ethers.Contract(TOKEN_ADDRESS, USDC_ABI, provider);
            const balance = await usdcContract.balanceOf(web3Address);
            const formattedBalance = ethers.formatUnits(balance, 6); // USDC has 6 decimals
            const roundedBalance = parseFloat(formattedBalance).toFixed(2);
            setWeb3Balance(roundedBalance);
        } catch (error) {
            console.error("Error fetching USDC balance:", error);
            setWeb3Balance("0.00");
        }
    }, [web3Address]);

    // Fetch balance when wallet connects
    useEffect(() => {
        if (web3Address) {
            fetchWeb3Balance();
        }
    }, [fetchWeb3Balance, web3Address]);

    // Handle form submission for Bitcoin payments.
    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (BITCOIN_PAYMENTS) {
            const formData = new FormData(e.currentTarget);

            const config = {
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Basic ${basic_auth}`
                }
            };

            const payload = {
                orderId: uuidv4(),
                itemDesc: "Bitcoin Buy In",
                metadata: {
                    itemCode: `${CLUB_NAME} Buy In`,
                    orderUrl: `${BITCOIN_PAYMENTS}/invoices`,
                    itemDesc: loggedInAccount
                },
                checkout: {
                    speedPolicy: "HighSpeed",
                    defaultPaymentMethod: "BTC-CHAIN",
                    lazyPaymentMethods: true,
                    expirationMinutes: 90,
                    monitoringMinutes: 90,
                    paymentTolerance: 0,
                    redirectAutomatically: true
                },
                amount: formData.get("usdcAmount"),
                currency: "USD"
            };

            try {
                setIsBitcoinLoading(true);
                const response = await axios.post(`${BITCOIN_PAYMENTS}/invoices`, payload, config);
                setIsBitcoinLoading(false);
                console.log("🔷 QRDeposit: Bitcoin payment response:", response.data);

                // Navigate to the payment URL in a new tab
                if (response.data && response.data.checkoutLink) {
                    window.open(response.data.checkoutLink, "_blank");
                }
            } catch (error) {
                console.error("🔷 QRDeposit: Bitcoin payment error:", error);
            }
        }
    };

    const handleGenerateQR = async () => {
        if (!loggedInAccount) {
            setError("Please connect your wallet first");
            return;
        }

        if (BITCOIN_PAYMENTS) {
            const basic_auth = import.meta.env.VITE_BTCPAY_BASIC_AUTH;

            const config = {
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Basic ${basic_auth}`
                }
            };

            const payload = {
                orderId: "test",
                itemDesc: "Bitcoin Buy In",
                metadata: {
                    itemCode: `${import.meta.env.VITE_CLUB_NAME} BuyIn`,
                    orderUrl: "https://payments.texashodl.net",
                    itemDesc: loggedInAccount
                },
                checkout: {
                    speedPolicy: "HighSpeed",
                    defaultPaymentMethod: "BTC-CHAIN",
                    lazyPaymentMethods: true,
                    expirationMinutes: 90,
                    monitoringMinutes: 90,
                    paymentTolerance: 0,
                    redirectAutomatically: true
                },
                amount: "0", // Use the USDC amount entered by the user
                currency: "USD"
            };

            try {
                setIsBitcoinLoading(true);
                const response = await axios.post(`${BITCOIN_PAYMENTS}/invoices`, payload, config);
                setIsBitcoinLoading(false);
                console.log("🔷 QRDeposit: Bitcoin payment response:", response.data);

                // Navigate to the payment URL in a new tab
                if (response.data && response.data.checkoutLink) {
                    window.open(response.data.checkoutLink, "_blank");
                }
            } catch (error) {
                console.error("🔷 QRDeposit: Bitcoin payment error:", error);
            }
        }

        if (!BITCOIN_PAYMENTS) {
            try {
                const payload = {
                    userAddress: loggedInAccount,
                    depositAddress: DEPOSIT_ADDRESS
                };

                console.log("🔵 Creating deposit session:", {
                    url: `${PROXY_URL}/deposit-sessions`,
                    payload
                });
                const response = await axios.post(`${PROXY_URL}/deposit-sessions`, payload);
                console.log("🟢 Deposit session created:", response.data);

                setCurrentSession(response.data);
                setSessionId(response.data._id);
                setShowQR(true);
                setTimeLeft(300); // 5 minutes
                startPolling();
                setError(null);
                setTransactionStatus(null);
                setProgressPercentage(0);
            } catch (error: unknown) {
                console.error("Failed to create deposit session:", error);
                if (error && typeof error === "object" && "response" in error) {
                    const axiosError = error as { response?: { data?: { error?: string } } };
                    setError(axiosError.response?.data?.error || "Failed to create deposit session");
                } else {
                    setError("Failed to create deposit session");
                }
            }
        }
    };

    // Function to check session status periodically
    const checkSessionStatus = useCallback(async () => {
        if (!sessionId || !currentSession || isDepositCompleted) return;

        try {
            console.log("🔷 QRDeposit: Checking session status");
            const response = await axios.get(`${PROXY_URL}/deposit-sessions/user/${loggedInAccount}`);
            const session = response.data;

            if (session) {
                console.log("🔷 QRDeposit: Session status update:", session);
                setCurrentSession(session);

                // Update transaction status if it changed
                if (session.txStatus && session.txStatus !== transactionStatus) {
                    console.log("🔷 QRDeposit: Transaction status changed to:", session.txStatus);
                    setTransactionStatus(session.txStatus);

                    // Set completed flag when we reach COMPLETED state
                    if (session.txStatus === "COMPLETED") {
                        console.log("🔷 QRDeposit: Deposit completed, stopping further checks");
                        setIsDepositCompleted(true);
                    }
                }

                // If session is completed, request a balance refresh
                if (session.status === "COMPLETED" && currentSession.status !== "COMPLETED") {
                    console.log("🔷 QRDeposit: Session completed, refreshing balance");
                    refreshBalance();
                    setIsDepositCompleted(true);
                }
            }
        } catch (error) {
            if (axios.isAxiosError(error) && error.response?.status === 404) {
                // Session not found, stop polling
                console.log("🔷 QRDeposit: Session no longer exists, stopping checks");
                setIsDepositCompleted(true);
                // Clear the current session if it was removed from the server
                if (currentSession.status !== "COMPLETED") {
                    setCurrentSession(null);
                    setShowQR(false);
                }
            } else {
                console.error("Failed to check session status:", error);
            }
        }
    }, [currentSession, isDepositCompleted, loggedInAccount, refreshBalance, sessionId, transactionStatus]);

    // Poll for session status updates - stop when completed
    useEffect(() => {
        if (!currentSession || !sessionId || isDepositCompleted) return;

        console.log("🔷 QRDeposit: Starting session polling");
        const interval = setInterval(checkSessionStatus, 5000);
        return () => {
            console.log("🔷 QRDeposit: Stopping session polling");
            clearInterval(interval);
        };
    }, [currentSession, sessionId, loggedInAccount, isDepositCompleted, checkSessionStatus]);

    // Reset completion state when starting a new QR code session
    useEffect(() => {
        if (showQR && currentSession?.status === "PENDING") {
            setIsDepositCompleted(false);
        }
    }, [showQR, currentSession]);

    const completeSession = useCallback(
        async (amount: number) => {
            if (!sessionId) return;

            try {
                setTransactionStatus("DETECTED");

                const response = await axios.put(`${PROXY_URL}/deposit-sessions/${sessionId}/complete`, {
                    amount
                });
                console.log("Session completed request:", response.data);
                setCurrentSession(response.data);

                // Update transaction status if available
                if (response.data.txStatus) {
                    setTransactionStatus(response.data.txStatus);
                } else {
                    setTransactionStatus("PROCESSING");
                }
            } catch (error) {
                console.error("Failed to complete session:", error);
            }
        },
        [sessionId]
    );

    const startPolling = useCallback(() => {
        console.log("Starting transaction polling");

        const interval = setInterval(async () => {
            setIsQuerying(true);
            try {
                const response = await axios.get(
                    `https://api.etherscan.io/api?module=account&action=txlist&address=${DEPOSIT_ADDRESS}&startblock=0&endblock=99999999&sort=desc&apikey=${ETHERSCAN_API_KEY}`
                );

                if (response.data.status === "1" && response.data.result.length > 0) {
                    const latestTx = response.data.result[0];
                    setLatestTransaction(latestTx);

                    // If we find a new transaction, complete the session
                    if (currentSession?.status === "PENDING") {
                        await completeSession(parseFloat(ethers.formatEther(latestTx.value)));
                    }
                }
            } catch (error) {
                console.error("Error fetching transactions:", error);
            } finally {
                setIsQuerying(false);
            }
        }, 5000);

        return () => clearInterval(interval);
    }, [completeSession, currentSession?.status]);

    // Function to copy text to clipboard
    const copyToClipboard = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
        } catch (err) {
            console.error("Failed to copy:", err);
        }
    };

    // Add polling effect
    useEffect(() => {
        if (!showQR || !currentSession || currentSession.status !== "PENDING") return;

        // Add function to check for token transfers
        const checkForTransfer = async () => {
            if (!currentSession || currentSession.status !== "PENDING") return;

            try {
                setIsQuerying(true);
                const provider = new ethers.JsonRpcProvider(RPC_URL);

                // Get token contract
                const tokenContract = new ethers.Contract(TOKEN_ADDRESS, ["event Transfer(address indexed from, address indexed to, uint256 value)"], provider);

                // Get latest block number
                const latestBlock = await provider.getBlockNumber();

                // Look for Transfer events in last few blocks
                const events = await tokenContract.queryFilter(tokenContract.filters.Transfer(null, DEPOSIT_ADDRESS), latestBlock - 10, latestBlock);

                if (events.length > 0) {
                    const lastTransfer = events[events.length - 1] as ethers.EventLog;
                    if (!lastTransfer.args) return;
                    const [from, to, value] = lastTransfer.args;

                    console.log("=== Transfer Detected ===");
                    console.log("From:", from);
                    console.log("To:", to);
                    console.log("Value:", value.toString());
                    console.log("Session ID:", currentSession._id);

                    setTransactionStatus("DETECTED");

                    const response = await axios.put(`${PROXY_URL}/deposit-sessions/${currentSession._id}/complete`, { amount: value.toString() });

                    if (response.data) {
                        setCurrentSession(response.data);

                        if (response.data.txStatus) {
                            setTransactionStatus(response.data.txStatus);
                        } else {
                            setTransactionStatus("PROCESSING");
                        }
                    }
                }
            } catch (error) {
                console.error("Error checking for transfers:", error);
            } finally {
                setIsQuerying(false);
            }
        };

        const interval = setInterval(checkForTransfer, 5000); // Check every 5 seconds

        return () => clearInterval(interval);
    }, [showQR, currentSession]);

    // Function to handle direct USDC transfer
    const handleDirectTransfer = async () => {
        if (!web3Address) return;

        setIsTransferring(true);
        try {
            // Create a session if we don't have one
            let sessionToUse = currentSession;
            if (!sessionToUse) {
                try {
                    const payload = {
                        userAddress: loggedInAccount || web3Address,
                        depositAddress: DEPOSIT_ADDRESS
                    };
                    console.log("🔵 Creating deposit session for Web3 transfer:", {
                        url: `${PROXY_URL}/deposit-sessions`,
                        payload
                    });
                    const response = await axios.post(`${PROXY_URL}/deposit-sessions`, payload);
                    console.log("🟢 Deposit session created:", response.data);
                    sessionToUse = response.data;
                    setCurrentSession(response.data);
                    setSessionId(response.data._id);
                } catch (error: any) {
                    console.error("Failed to create deposit session:", error);
                    // If proxy fails, we can still continue with the transfer
                    console.warn("⚠️ Proceeding without proxy session - direct transfer only");
                    // Create a minimal session object for the transfer
                    sessionToUse = {
                        _id: `web3-${Date.now()}`,
                        userAddress: loggedInAccount || web3Address,
                        depositAddress: DEPOSIT_ADDRESS,
                        status: "PENDING",
                        expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes from now
                        amount: null
                    };
                    setCurrentSession(sessionToUse as any);
                }
            }

            // Get signer from connected wallet
            const provider = new ethers.BrowserProvider(window.ethereum as unknown as Eip1193Provider);
            const signer = await provider.getSigner();

            // Create USDC contract instance
            const usdcContract = new ethers.Contract(TOKEN_ADDRESS, USDC_ABI, signer);

            // Convert amount to USDC units (6 decimals)
            const amount = parseUnits(depositAmount, 6);

            // Send transfer transaction
            setTransactionStatus("DETECTED");
            const tx = await usdcContract.transfer(DEPOSIT_ADDRESS, amount);
            setTransactionStatus("PROCESSING");
            await tx.wait();

            // Update session with amount (if proxy is available)
            if (sessionToUse && !sessionToUse._id.startsWith("web3-")) {
                await completeSession(Number(amount.toString())); // Convert BigInt to number for USDC base units (6 decimals)
            } else {
                console.log("✅ Direct transfer completed without proxy session");
            }
            // Refresh balances
            fetchWeb3Balance();
            refreshBalance();

            // Show success message
            alert("Deposit successful!");
        } catch (error) {
            console.error("Transfer failed:", error);
            alert("Transfer failed. Please try again.");
            setTransactionStatus(null);
        } finally {
            setIsTransferring(false);
        }
    };

    // Get status message based on transaction status
    const getStatusMessage = (): string => {
        switch (transactionStatus) {
            case "DETECTED":
                return "Deposit detected! Processing...";
            case "PROCESSING":
                return "Processing your deposit...";
            case "CONFIRMING":
                return "Confirming transaction on Layer 1...";
            case "CONFIRMED":
                return `Deposit confirmed on Layer 1! Finalizing (${completionCountdown}s)...`;
            case "COMPLETED":
                return "Deposit confirmed on Layer 2!";
            default:
                return "Waiting for deposit...";
        }
    };

    // Check for existing session on component mount
    useEffect(() => {
        const checkExistingSession = async () => {
            if (!loggedInAccount) return;

            try {
                const response = await axios.get(`${PROXY_URL}/deposit-sessions/user/${loggedInAccount}`);
                if (response.data) {
                    const session = response.data;

                    // Only set current session if it's not completed or expired
                    if (session.status === "PENDING" || session.status === "PROCESSING") {
                        console.log("🔷 QRDeposit: Found active session:", session);
                        setCurrentSession(session);
                        setSessionId(session._id);
                        setShowQR(true);

                        // Set transaction status if available
                        if (session.txStatus) {
                            setTransactionStatus(session.txStatus);
                        }

                        // Calculate remaining time
                        const expiresAt = new Date(session.expiresAt).getTime();
                        const now = new Date().getTime();
                        const remainingTime = Math.max(0, Math.floor((expiresAt - now) / 1000));
                        setTimeLeft(Math.min(remainingTime, 300));

                        if (remainingTime > 0) {
                            startPolling();
                        }
                    } else {
                        console.log("🔷 QRDeposit: Found completed or expired session, not loading it:", session);
                    }
                }
            } catch (error) {
                console.log("No active session found or error occurred:", error);
            }
        };

        checkExistingSession();
    }, [loggedInAccount, startPolling]);

    return (
        <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden">
            {/* Animated background with hexagon pattern */}
            <AnimatedBackground />

            <div
                className="max-w-xl w-full backdrop-blur-md rounded-xl shadow-2xl p-10 relative z-10 transition-all duration-300"
                style={{
                    backgroundColor: colors.ui.bgDark,
                    border: `1px solid ${hexToRgba(colors.brand.primary, 0.2)}`,
                    boxShadow: `0 0 20px ${hexToRgba(colors.brand.primary, 0.1)}`
                }}
                onMouseEnter={e => {
                    e.currentTarget.style.boxShadow = `0 0 25px ${hexToRgba(colors.brand.primary, 0.15)}`;
                }}
                onMouseLeave={e => {
                    e.currentTarget.style.boxShadow = `0 0 20px ${hexToRgba(colors.brand.primary, 0.1)}`;
                }}
            >
                <h1 className="text-2xl font-extrabold text-center mb-2 mt-5" style={{ color: "white" }}>
                    Deposit Funds to {CLUB_NAME}
                </h1>
                <p className="text-center text-sm mb-4" style={{ color: colors.ui.textSecondary }}>
                    Choose your preferred deposit method below
                </p>

                {/* Debug Toggle Button */}
                <button
                    onClick={() => setShowDebug(!showDebug)}
                    className="absolute top-4 right-4 text-xs px-2 py-1 rounded transition-all"
                    style={{
                        backgroundColor: showDebug ? colors.brand.primary : hexToRgba(colors.ui.bgMedium, 0.5),
                        color: "white",
                        border: `1px solid ${hexToRgba(colors.brand.primary, 0.3)}`
                    }}
                >
                    {showDebug ? "Hide" : "Show"} Debug
                </button>

                {/* Debug Panel */}
                {showDebug && (
                    <div
                        className="mb-4 p-3 rounded-lg text-xs"
                        style={{
                            backgroundColor: hexToRgba(colors.ui.bgDark, 0.8),
                            border: `1px solid ${hexToRgba(colors.brand.primary, 0.2)}`,
                            fontFamily: "monospace"
                        }}
                    >
                        <h3 className="font-bold mb-2" style={{ color: colors.brand.primary }}>
                            🔧 Debug Information
                        </h3>
                        <div className="space-y-1" style={{ color: colors.ui.textSecondary }}>
                            <div>
                                <strong>Proxy URL:</strong> {PROXY_URL || "Not configured"}
                            </div>
                            <div>
                                <strong>Deposit Address:</strong> {DEPOSIT_ADDRESS || "Not configured"}
                            </div>
                            <div>
                                <strong>Token Address (USDC):</strong> {TOKEN_ADDRESS || "Not configured"}
                            </div>
                            <div>
                                <strong>RPC URL:</strong> {RPC_URL || "Default: https://eth.llamarpc.com"}
                            </div>
                            <div>
                                <strong>Bitcoin Payments:</strong> {BITCOIN_PAYMENTS ? "Enabled" : "Disabled"}
                            </div>
                            {loggedInAccount && (
                                <div>
                                    <strong>Block52 Account:</strong> {loggedInAccount}
                                </div>
                            )}
                            {web3Address && (
                                <div>
                                    <strong>Web3 Wallet:</strong> {web3Address}
                                </div>
                            )}
                            {sessionId && (
                                <div>
                                    <strong>Session ID:</strong> {sessionId}
                                </div>
                            )}
                            {currentSession && (
                                <>
                                    <div>
                                        <strong>Session Status:</strong> {currentSession.status}
                                    </div>
                                    <div>
                                        <strong>Session Deposit Address:</strong> {currentSession.depositAddress}
                                    </div>
                                    {currentSession.txHash && (
                                        <div>
                                            <strong>TX Hash:</strong> {currentSession.txHash}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                )}

                <div
                    className="backdrop-blur-sm rounded-lg p-4 mb-6 shadow-lg transition-all duration-300"
                    style={{
                        backgroundColor: colors.ui.bgMedium,
                        border: `1px solid ${hexToRgba(colors.brand.primary, 0.2)}`
                    }}
                    onMouseEnter={e => {
                        e.currentTarget.style.borderColor = hexToRgba(colors.brand.primary, 0.2);
                    }}
                    onMouseLeave={e => {
                        e.currentTarget.style.borderColor = hexToRgba(colors.brand.primary, 0.1);
                    }}
                >
                    <p className="text-lg mb-2" style={{ color: "white" }}>
                        {CLUB_NAME} Balance:
                    </p>
                    <p className="text-xl font-bold" style={{ color: colors.brand.primary }}>
                        ${formatBalance(displayBalance)} USDC
                    </p>
                    {b52Nonce !== null && (
                        <p
                            className="text-sm mt-2 border-t pt-2"
                            style={{
                                color: colors.ui.textSecondary + "dd",
                                borderColor: colors.ui.textSecondary
                            }}
                        >
                            <span style={{ color: colors.brand.primary + "cc" }}>Nonce:</span> {b52Nonce}
                        </p>
                    )}
                </div>

                {/* Transaction Progress Bar */}
                {transactionStatus && (
                    <div className="mb-6">
                        <div className="flex justify-between items-center mb-2">
                            <h2 className="text-lg font-semibold" style={{ color: "white" }}>
                                Deposit Status
                            </h2>
                            <span className="text-sm" style={{ color: colors.accent.success }}>
                                {getStatusMessage()}
                            </span>
                        </div>
                        <div className="w-full rounded-full h-4" style={{ backgroundColor: colors.ui.bgMedium }}>
                            <div
                                className="h-4 rounded-full transition-all duration-500 ease-out"
                                style={{
                                    width: `${progressPercentage}%`,
                                    backgroundColor: colors.accent.success
                                }}
                            ></div>
                        </div>
                        {currentSession?.txHash && (
                            <div className="mt-2 text-xs text-gray-400">
                                TX:{" "}
                                <a
                                    href={`https://etherscan.io/tx/${currentSession.txHash}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="hover:underline"
                                    style={{ color: colors.brand.primary }}
                                >
                                    {currentSession.txHash.substring(0, 10)}...{currentSession.txHash.substring(currentSession.txHash.length - 8)}
                                </a>
                            </div>
                        )}
                    </div>
                )}

                {/* Session Status */}
                {currentSession && !transactionStatus && (
                    <div
                        className="backdrop-blur-sm rounded-lg p-4 mb-6 shadow-lg transition-all duration-300"
                        style={{
                            backgroundColor: colors.ui.bgMedium,
                            border: `1px solid ${hexToRgba(colors.brand.primary, 0.2)}`
                        }}
                        onMouseEnter={e => {
                            e.currentTarget.style.borderColor = hexToRgba(colors.brand.primary, 0.2);
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.borderColor = hexToRgba(colors.brand.primary, 0.1);
                        }}
                    >
                        <h2 className="text-lg font-semibold mb-2" style={{ color: "white" }}>
                            Session Status
                        </h2>
                        <p className="text-sm" style={{ color: colors.ui.textSecondary + "dd" }}>
                            Status: {currentSession.status}
                        </p>
                        <p className="text-sm" style={{ color: colors.ui.textSecondary + "dd" }}>
                            Session ID: {currentSession._id}
                        </p>
                        {currentSession.amount && (
                            <p className="text-sm" style={{ color: colors.ui.textSecondary + "dd" }}>
                                Amount: ${formatMicroAsUsdc(currentSession.amount, 2)} USDC
                            </p>
                        )}
                    </div>
                )}

                {/* Timer Display */}
                {showQR && currentSession?.status === "PENDING" && !transactionStatus && (
                    <div className="text-center mb-4">
                        <div className="text-xl font-bold" style={{ color: "white" }}>
                            Time Remaining: {formatTime(timeLeft)}
                        </div>
                        <div className="text-sm" style={{ color: colors.ui.textSecondary }}>
                            Session will expire in {Math.floor(timeLeft / 60)} minutes and {timeLeft % 60} seconds
                        </div>
                        <div
                            className="mt-2 p-2 backdrop-blur-sm rounded-lg"
                            style={{
                                backgroundColor: colors.ui.bgMedium,
                                border: `1px solid ${colors.accent.danger}50`
                            }}
                        >
                            <div className="flex items-center" style={{ color: "#eab308" }}>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                    <path
                                        fillRule="evenodd"
                                        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                                        clipRule="evenodd"
                                    />
                                </svg>
                                <span className="font-semibold">Do not close this page while waiting for deposit</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Block52 Account Display */}
                <form onSubmit={handleSubmit}>
                    {!showQR && (
                        <div
                            className="backdrop-blur-sm rounded-xl p-5 mb-6 shadow-lg transition-all duration-300"
                            style={{
                                backgroundColor: hexToRgba(colors.ui.bgMedium, 0.9),
                                border: `1px solid ${hexToRgba(colors.brand.primary, 0.1)}`
                            }}
                            onMouseEnter={e => {
                                e.currentTarget.style.borderColor = hexToRgba(colors.brand.primary, 0.2);
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.borderColor = hexToRgba(colors.brand.primary, 0.1);
                            }}
                        >
                            <div className="flex items-center gap-2 mb-3">
                                <h2 className="text-xl font-bold" style={{ color: "white" }}>
                                    Block52 Game Wallet
                                </h2>
                                <div className="relative group">
                                    <svg
                                        className="w-5 h-5 text-gray-400 hover:text-white cursor-help transition-colors"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth="2"
                                            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                        />
                                    </svg>
                                    <div
                                        className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-72 p-3 text-white text-sm rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-20"
                                        style={{
                                            backgroundColor: colors.ui.bgDark,
                                            border: `1px solid ${hexToRgba(colors.brand.primary, 0.2)}`
                                        }}
                                    >
                                        <h3 className="font-bold mb-2" style={{ color: colors.brand.primary }}>
                                            Your Deposit Address
                                        </h3>
                                        <p>Send your deposits to this address. Funds will be automatically credited to your Block52 gaming account.</p>
                                        <div
                                            className="absolute left-1/2 -bottom-2 -translate-x-1/2 border-8 border-transparent"
                                            style={{ borderTopColor: colors.ui.bgDark }}
                                        ></div>
                                    </div>
                                </div>
                            </div>
                            {b52Address ? (
                                <div
                                    className="flex items-center justify-between p-2 rounded-lg"
                                    style={{
                                        backgroundColor: hexToRgba(colors.ui.bgDark, 0.6),
                                        border: `1px solid ${hexToRgba(colors.brand.primary, 0.1)}`
                                    }}
                                >
                                    <p className="font-mono text-xs hidden md:inline break-all" style={{ color: colors.brand.primary }}>
                                        {b52Address}
                                    </p>
                                    <p className="font-mono text-xs md:hidden" style={{ color: colors.brand.primary }}>
                                        {b52Address.slice(0, 6)}...{b52Address.slice(-4)}
                                    </p>
                                    <button
                                        onClick={e => {
                                            e.preventDefault();
                                            navigator.clipboard.writeText(b52Address || "");
                                        }}
                                        className="ml-2 p-1 bg-gray-700 rounded-md hover:bg-gray-600 transition-colors"
                                        type="button"
                                    >
                                        <svg className="w-4 h-4" style={{ color: colors.brand.primary }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth="2"
                                                d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
                                            />
                                        </svg>
                                    </button>
                                </div>
                            ) : (
                                <p className="text-sm text-gray-400">Not logged in</p>
                            )}
                        </div>
                    )}

                    {BITCOIN_PAYMENTS && (
                        <div
                            className="backdrop-blur-sm rounded-xl p-5 mb-6 shadow-lg transition-all duration-300"
                            style={{
                                backgroundColor: hexToRgba(colors.ui.bgMedium, 0.9),
                                border: `1px solid ${hexToRgba(colors.brand.primary, 0.1)}`
                            }}
                            onMouseEnter={e => {
                                e.currentTarget.style.borderColor = hexToRgba(colors.brand.primary, 0.2);
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.borderColor = hexToRgba(colors.brand.primary, 0.1);
                            }}
                        >
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <div
                                        className="w-8 h-8 rounded-full flex items-center justify-center"
                                        style={{ backgroundColor: hexToRgba("#f7931a", 0.2) }}
                                    >
                                        <span className="font-bold text-lg" style={{ color: "#f7931a" }}>
                                            ₿
                                        </span>
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold" style={{ color: "white" }}>
                                            Method 1: Bitcoin Payment
                                        </h2>
                                        <p className="text-xs" style={{ color: colors.ui.textSecondary }}>
                                            Pay with BTC • Auto-converts to USDC on Layer 2
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div
                                className="p-3 rounded-lg mb-4"
                                style={{
                                    backgroundColor: hexToRgba(colors.ui.bgDark, 0.4),
                                    border: `1px solid ${hexToRgba("#f7931a", 0.2)}`
                                }}
                            >
                                <p className="text-xs" style={{ color: colors.ui.textSecondary }}>
                                    <strong>How it works:</strong> Pay with Bitcoin → Automatically converts to USDC → Credits your gaming account
                                </p>
                            </div>
                            <p className="text-sm mb-2" style={{ color: colors.ui.textSecondary + "dd" }}>
                                Enter amount in USD:
                            </p>
                            <input
                                name="usdcAmount"
                                type="number"
                                placeholder="100.00"
                                className="w-full p-3 rounded-lg focus:outline-none focus:ring-2 transition-all"
                                style={{
                                    backgroundColor: hexToRgba(colors.ui.bgDark, 0.6),
                                    border: `1px solid ${hexToRgba(colors.brand.primary, 0.2)}`,
                                    color: "white"
                                }}
                                min="0"
                                step="0.01"
                            />
                        </div>
                    )}

                    {/* Generate QR / Main Content Area */}
                    {!showQR ? (
                        <button
                            onClick={handleGenerateQR}
                            disabled={!loggedInAccount}
                            className="w-full py-3 px-4 rounded-lg transition duration-300 shadow-md"
                            style={{
                                backgroundColor: !loggedInAccount ? colors.ui.textSecondary : colors.brand.primary,
                                color: "white",
                                cursor: !loggedInAccount ? "not-allowed" : "pointer"
                            }}
                            onMouseEnter={e => {
                                if (loggedInAccount) {
                                    e.currentTarget.style.backgroundColor = colors.brand.secondary;
                                }
                            }}
                            onMouseLeave={e => {
                                if (loggedInAccount) {
                                    e.currentTarget.style.backgroundColor = colors.brand.primary;
                                }
                            }}
                        >
                            {BITCOIN_PAYMENTS ? "Pay with Bitcoin" : "Generate Deposit QR Code"}
                            {isBitcoinLoading && <img src={spinner} />}
                        </button>
                    ) : (
                        // <button
                        //     type="submit"
                        //     className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition duration-300 shadow-md mt-4"
                        // >
                        //     {BITCOIN_PAYMENTS ? "Pay with Bitcoin" : "Generate Deposit QR Code"}
                        //     {isBitcoinLoading && <img src={spinner} />}
                        // </button>
                        <>
                            {/* Only show QR if no transaction is in progress */}
                            {!transactionStatus && (
                                <>
                                    <div
                                        className="backdrop-blur-sm rounded-lg p-4 mb-6 shadow-lg transition-all duration-300"
                                        style={{
                                            backgroundColor: colors.ui.bgMedium,
                                            border: `1px solid ${hexToRgba(colors.brand.primary, 0.2)}`
                                        }}
                                        onMouseEnter={e => {
                                            e.currentTarget.style.borderColor = hexToRgba(colors.brand.primary, 0.2);
                                        }}
                                        onMouseLeave={e => {
                                            e.currentTarget.style.borderColor = hexToRgba(colors.brand.primary, 0.1);
                                        }}
                                    >
                                        <h2 className="text-lg font-semibold mb-2" style={{ color: "white" }}>
                                            Pay with USDC ERC20
                                        </h2>
                                        <p className="text-sm mb-4" style={{ color: colors.ui.textSecondary + "dd" }}>
                                            Only send USDC using the Ethereum network
                                        </p>
                                    </div>

                                    {/* QR Code */}
                                    <div className="flex justify-center mb-6">
                                        <div className="bg-white p-4 rounded-lg shadow-lg">
                                            <QRCodeSVG value={`ethereum:${DEPOSIT_ADDRESS}`} size={200} level="H" />
                                        </div>
                                    </div>

                                    {/* Payment Details */}
                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-sm text-gray-400">Payment address</label>
                                            <div
                                                className="flex items-center justify-between p-2 rounded cursor-pointer"
                                                style={{
                                                    backgroundColor: colors.ui.bgMedium,
                                                    border: `1px solid ${hexToRgba(colors.brand.primary, 0.2)}`
                                                }}
                                                onClick={() => copyToClipboard(DEPOSIT_ADDRESS)}
                                            >
                                                <span className="text-sm" style={{ color: "white" }}>{`${DEPOSIT_ADDRESS}`}</span>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* Latest Transaction */}
                            {latestTransaction && !transactionStatus && (
                                <div className="mt-6">
                                    <div className="flex justify-between items-center mb-2">
                                        <h3 className="text-lg font-semibold text-white">Latest Transaction</h3>
                                        <span
                                            className="text-xs"
                                            style={{
                                                color: isQuerying ? colors.accent.success : colors.ui.textSecondary
                                            }}
                                        >
                                            {isQuerying ? "🔄 Checking for new transactions..." : "Last checked just now"}
                                        </span>
                                    </div>
                                    <div
                                        className="p-3 rounded text-sm"
                                        style={{
                                            backgroundColor: colors.ui.bgMedium,
                                            color: "white",
                                            border: `1px solid ${hexToRgba(colors.brand.primary, 0.2)}`
                                        }}
                                    >
                                        <p>
                                            Hash: {latestTransaction.hash.slice(0, 10)}...{latestTransaction.hash.slice(-8)}
                                        </p>
                                        <p>Amount: {ethers.formatEther(latestTransaction.value)} ETH</p>
                                        <p>
                                            From: {latestTransaction.from.slice(0, 6)}...{latestTransaction.from.slice(-4)}
                                        </p>
                                        <p>Age: {new Date(Number(latestTransaction.timeStamp) * 1000).toLocaleString()}</p>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </form>

                {/* Web3 Wallet Connection Section - Now placed below as alternative */}
                <div className="mt-8 pt-6 border-t" style={{ borderColor: hexToRgba(colors.brand.primary, 0.1) }}>
                    <div className="text-center mb-4">
                        <div className="flex items-center justify-center gap-3">
                            <div className="h-px flex-1" style={{ backgroundColor: hexToRgba(colors.brand.primary, 0.1) }}></div>
                            <span className="text-gray-400 text-sm px-2">OR</span>
                            <div className="h-px flex-1" style={{ backgroundColor: hexToRgba(colors.brand.primary, 0.1) }}></div>
                        </div>
                    </div>

                    <div
                        className="backdrop-blur-sm rounded-xl p-5 shadow-lg transition-all duration-300"
                        style={{
                            backgroundColor: hexToRgba(colors.ui.bgMedium, 0.9),
                            border: `1px solid ${hexToRgba(colors.brand.primary, 0.1)}`
                        }}
                        onMouseEnter={e => {
                            e.currentTarget.style.borderColor = hexToRgba(colors.brand.primary, 0.2);
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.borderColor = hexToRgba(colors.brand.primary, 0.1);
                        }}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <svg className="w-8 h-8" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
                                    <g fill="none" fillRule="evenodd">
                                        <circle cx="16" cy="16" r="16" fill="#2775CA" />
                                        <path
                                            fill="#FFF"
                                            d="M15.75 27.5C9.26 27.5 4 22.24 4 15.75S9.26 4 15.75 4a11.75 11.75 0 110 23.5zm-.7-16.11a2.58 2.58 0 00-2.45 2.47c0 1.21.74 2 2.31 2.33 1.1.26 1.3.5 1.3.93s-.27.69-.9.69a4.46 4.46 0 01-2.44-.75l-.44 1.84a5.26 5.26 0 002.44.57v1.78h1.5V19c1.84-.17 2.87-1.33 2.87-2.69 0-1.17-.7-1.94-2.27-2.3-1.1-.23-1.34-.48-1.34-.91s.28-.66.83-.66a4.06 4.06 0 012 .54L19 11.3a5.66 5.66 0 00-2-.43v-1.8h-1.5v1.78a2.52 2.52 0 00-.45.04zm4.93 8.68a2.58 2.58 0 002.45-2.47c0-1.21-.74-2-2.31-2.33-1.1-.26-1.3-.5-1.3-.93s.27-.69.9-.69a4.46 4.46 0 012.44.75l.44-1.84a5.26 5.26 0 00-2.44-.57V9.26h-1.5V11a2.58 2.58 0 00-2.45 2.47c0 1.17.7 1.94 2.27 2.3 1.1.23 1.34.48 1.34.91s-.28.66-.83.66a4.06 4.06 0 01-2-.54L13 18.48a5.66 5.66 0 002 .43v1.8h1.5v-1.78c.15.03.3.04.45.04z"
                                        />
                                    </g>
                                </svg>
                                <div>
                                    <h2 className="text-lg font-bold" style={{ color: "white" }}>
                                        Method 2: Web3 Wallet Direct Deposit
                                    </h2>
                                    <p className="text-xs" style={{ color: colors.ui.textSecondary }}>
                                        Pay with USDC • Direct from your wallet
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div
                            className="p-3 rounded-lg mb-4"
                            style={{
                                backgroundColor: hexToRgba(colors.ui.bgDark, 0.4),
                                border: `1px solid ${hexToRgba(colors.brand.primary, 0.2)}`
                            }}
                        >
                            <p className="text-xs" style={{ color: colors.ui.textSecondary }}>
                                <strong>How it works:</strong> Connect wallet → Send USDC directly → No conversion fees → Credits your gaming account
                            </p>
                        </div>

                        {!isConnected ? (
                            <button
                                onClick={open}
                                className="w-full py-3 px-4 rounded-lg transition duration-300 shadow-md hover:opacity-90"
                                style={{
                                    background: `linear-gradient(135deg, ${hexToRgba(colors.brand.primary, 0.7)} 0%, ${hexToRgba(
                                        colors.brand.primary,
                                        0.8
                                    )} 100%)`
                                }}
                            >
                                <div className="flex items-center justify-center gap-2">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                    <span className="text-white">Connect Wallet</span>
                                </div>
                            </button>
                        ) : (
                            <div className="space-y-4">
                                <div className="flex justify-between items-center" style={{ color: "white" }}>
                                    <span>
                                        Connected: {web3Address?.slice(0, 6)}...{web3Address?.slice(-4)}
                                    </span>
                                    <button
                                        onClick={disconnect}
                                        className="text-xs px-3 py-1 bg-gradient-to-br from-red-500 to-red-600 hover:from-red-400 hover:to-red-500 text-white rounded-lg transition duration-300 shadow-md"
                                    >
                                        Disconnect
                                    </button>
                                </div>

                                <div
                                    className="p-3 rounded-lg"
                                    style={{
                                        backgroundColor: hexToRgba(colors.ui.bgDark, 0.6),
                                        border: `1px solid ${hexToRgba(colors.brand.primary, 0.1)}`
                                    }}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div
                                                className="w-10 h-10 rounded-full flex items-center justify-center"
                                                style={{ backgroundColor: hexToRgba(colors.brand.primary, 0.2) }}
                                            >
                                                <span className="font-bold text-lg" style={{ color: colors.brand.primary }}>
                                                    $
                                                </span>
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold" style={{ color: "white" }}>
                                                    Web3 Wallet USDC Balance
                                                </p>
                                                <p className="text-xs" style={{ color: colors.ui.textSecondary }}>
                                                    Available on Ethereum Mainnet
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="text-right">
                                                <p className="text-lg font-bold" style={{ color: colors.brand.primary }}>
                                                    ${web3Balance || "0.00"}
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => fetchWeb3Balance()}
                                                className="p-1.5 bg-gray-700 rounded-md hover:bg-gray-600 transition-colors"
                                                title="Refresh balance"
                                            >
                                                <svg
                                                    className="w-4 h-4"
                                                    style={{ color: colors.brand.primary }}
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth="2"
                                                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                                                    />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <p className="text-sm mb-2" style={{ color: colors.ui.textSecondary + "dd" }}>
                                        Enter amount in USD:
                                    </p>
                                    <input
                                        type="number"
                                        value={depositAmount}
                                        onChange={e => setDepositAmount(e.target.value)}
                                        placeholder="100.00"
                                        className="w-full p-3 rounded-lg focus:outline-none focus:ring-2 transition-all"
                                        style={{
                                            backgroundColor: hexToRgba(colors.ui.bgDark, 0.6),
                                            border: `1px solid ${hexToRgba(colors.brand.primary, 0.2)}`,
                                            color: "white"
                                        }}
                                        min="0"
                                        step="0.01"
                                    />

                                    <button
                                        onClick={handleDirectTransfer}
                                        disabled={!depositAmount || isTransferring || parseFloat(depositAmount) <= 0}
                                        className="w-full py-3 px-4 rounded-lg transition duration-300 shadow-md"
                                        style={{
                                            backgroundColor:
                                                !depositAmount || isTransferring || parseFloat(depositAmount) <= 0
                                                    ? colors.ui.textSecondary
                                                    : colors.brand.primary,
                                            color: "white",
                                            cursor: !depositAmount || isTransferring || parseFloat(depositAmount) <= 0 ? "not-allowed" : "pointer"
                                        }}
                                        onMouseEnter={e => {
                                            if (depositAmount && !isTransferring && parseFloat(depositAmount) > 0) {
                                                e.currentTarget.style.backgroundColor = colors.brand.secondary;
                                            }
                                        }}
                                        onMouseLeave={e => {
                                            if (depositAmount && !isTransferring && parseFloat(depositAmount) > 0) {
                                                e.currentTarget.style.backgroundColor = colors.brand.primary;
                                            }
                                        }}
                                    >
                                        {isTransferring ? "Processing..." : "Deposit USDC"}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Error message display */}
            {error && (
                <div
                    className="mt-4 p-3 backdrop-blur-md rounded-lg shadow-lg z-10"
                    style={{
                        backgroundColor: colors.accent.danger + "/90",
                        color: "white",
                        border: `1px solid ${colors.accent.danger}`
                    }}
                >
                    Error: {error}
                </div>
            )}

            {/* Powered by Block52 */}
            <div className="fixed bottom-4 left-4 flex items-center z-10 opacity-30">
                <div className="flex flex-col items-start bg-transparent px-3 py-2 rounded-lg backdrop-blur-sm border-0">
                    <div className="text-left mb-1">
                        <span className="text-xs text-white font-medium tracking-wide">POWERED BY</span>
                    </div>
                    <img src="/block52.png" alt="Block52 Logo" className="h-6 w-auto object-contain interaction-none" />
                </div>
            </div>
        </div>
    );
};

export default QRDeposit;
