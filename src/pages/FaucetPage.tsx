import { useState, useMemo, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { colors, hexToRgba } from "../utils/colorConfig";
import { useCosmosWallet } from "../hooks";
import { formatMicroAsUsdc } from "../constants/currency";
import { AnimatedBackground } from "../components/common/AnimatedBackground";

// Faucet API endpoint - configurable via environment variable
// Local development: VITE_FAUCET_API_URL=http://localhost:3001
// Production: defaults to Digital Ocean server
const FAUCET_API_URL = import.meta.env.VITE_FAUCET_API_URL || "https://seahorse-app-m6569.ondigitalocean.app";



interface FaucetInfo {
    configured: boolean;
    faucetAddress?: string;
    faucetAmount: number;
    rateLimitHours: number;
}

interface RateLimitStatus {
    canRequest: boolean;
    waitTimeMs: number;
    waitTimeFormatted: string | null;
}

export default function FaucetPage() {
    const navigate = useNavigate();
    const cosmosWallet = useCosmosWallet();

    const [isRequesting, setIsRequesting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [txHash, setTxHash] = useState<string | null>(null);

    // Faucet info from backend
    const [faucetInfo, setFaucetInfo] = useState<FaucetInfo | null>(null);
    const [faucetLoading, setFaucetLoading] = useState(true);

    // Rate limit status
    const [rateLimitStatus, setRateLimitStatus] = useState<RateLimitStatus>({
        canRequest: true,
        waitTimeMs: 0,
        waitTimeFormatted: null
    });



    // Fetch faucet info on mount
    useEffect(() => {
        const fetchFaucetInfo = async () => {
            try {
                const response = await fetch(`${FAUCET_API_URL}/info`);
                if (response.ok) {
                    const info = await response.json();
                    setFaucetInfo(info);
                } else {
                    setFaucetInfo({ configured: false, faucetAmount: 10, rateLimitHours: 24 });
                }
            } catch (err) {
                console.error("Failed to fetch faucet info:", err);
                setFaucetInfo({ configured: false, faucetAmount: 10, rateLimitHours: 24 });
            } finally {
                setFaucetLoading(false);
            }
        };

        fetchFaucetInfo();
    }, []);

    // Check rate limit status when address changes
    useEffect(() => {
        const checkRateLimit = async () => {
            if (!cosmosWallet.address) return;

            try {
                const response = await fetch(`${FAUCET_API_URL}/check/${cosmosWallet.address}`);
                if (response.ok) {
                    const status = await response.json();
                    setRateLimitStatus(status);
                }
            } catch (err) {
                console.error("Failed to check rate limit:", err);
            }
        };

        checkRateLimit();
    }, [cosmosWallet.address]);

    // Update rate limit status periodically
    useEffect(() => {
        if (!rateLimitStatus.canRequest && rateLimitStatus.waitTimeMs > 0) {
            const interval = setInterval(async () => {
                if (cosmosWallet.address) {
                    try {
                        const response = await fetch(`${FAUCET_API_URL}/check/${cosmosWallet.address}`);
                        if (response.ok) {
                            const status = await response.json();
                            setRateLimitStatus(status);
                            if (status.canRequest) {
                                clearInterval(interval);
                            }
                        }
                    } catch (err) {
                        console.error("Failed to check rate limit:", err);
                    }
                }
            }, 60000); // Update every minute

            return () => clearInterval(interval);
        }
    }, [rateLimitStatus, cosmosWallet.address]);

    // Get current STAKE balance
    const stakeBalance = useMemo(() => {
        const balance = cosmosWallet.balance.find(b => b.denom === "stake");
        return balance ? formatMicroAsUsdc(balance.amount, 2) : "0.00";
    }, [cosmosWallet.balance]);



    // Card style matching Dashboard
    const cardStyle = useMemo(
        () => ({
            backgroundColor: hexToRgba(colors.ui.bgDark, 0.8),
            borderColor: hexToRgba(colors.brand.primary, 0.2),
            boxShadow: `0 10px 40px ${hexToRgba(colors.brand.primary, 0.1)}`
        }),
        []
    );

    // Request STAKE from faucet
    const handleRequestFaucet = useCallback(async () => {
        if (!cosmosWallet.address) {
            setError("No wallet connected. Please create or import a wallet first.");
            return;
        }

        setIsRequesting(true);
        setError(null);
        setSuccess(null);
        setTxHash(null);

        try {
            const response = await fetch(`${FAUCET_API_URL}/faucet`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ address: cosmosWallet.address })
            });

            const data = await response.json();

            if (!response.ok) {
                // Handle rate limit
                if (response.status === 429) {
                    setRateLimitStatus({
                        canRequest: false,
                        waitTimeMs: data.waitTimeMs || 0,
                        waitTimeFormatted: data.waitTimeFormatted || "some time"
                    });
                }
                throw new Error(data.error || "Failed to request tokens");
            }

            setSuccess(data.message || `Successfully sent ${data.amount} STAKE!`);
            setTxHash(data.txHash);

            // Update rate limit status
            setRateLimitStatus({
                canRequest: false,
                waitTimeMs: (faucetInfo?.rateLimitHours || 24) * 60 * 60 * 1000,
                waitTimeFormatted: `${faucetInfo?.rateLimitHours || 24}h`
            });

            // Refresh wallet balance after a short delay
            setTimeout(async () => {
                await cosmosWallet.refreshBalance();
            }, 3000);

            console.log(`Faucet: Received ${data.amount} STAKE, tx: ${data.txHash}`);
        } catch (err: any) {
            console.error("Faucet request failed:", err);
            setError(err.message || "Failed to request tokens. Please try again.");
        } finally {
            setIsRequesting(false);
        }
    }, [cosmosWallet.address, cosmosWallet.refreshBalance, faucetInfo?.rateLimitHours]);

    return (
        <div className="min-h-screen flex flex-col justify-center items-center relative overflow-hidden p-8 pb-24">
            {/* Background animations matching Wallet page */}
            <AnimatedBackground />

            {/* Back Button */}
            <div className="fixed top-6 left-6 z-20">
                <button
                    onClick={() => navigate("/")}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl transition-all hover:opacity-80 backdrop-blur-sm"
                    style={{
                        backgroundColor: hexToRgba(colors.ui.bgDark, 0.8),
                        border: `1px solid ${hexToRgba(colors.brand.primary, 0.2)}`
                    }}
                    title="Back to Dashboard"
                >
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    <span className="text-white text-sm font-medium">Dashboard</span>
                </button>
            </div>

            {/* Content */}
            <div className="relative z-10 w-full max-w-xl mx-auto mb-6">
                <h1 className="text-3xl font-bold text-white mb-2 text-center">Testnet Faucet</h1>
                <p className="text-center mb-6 text-sm" style={{ color: colors.ui.textSecondary }}>
                    Request free STAKE tokens for gas fees on the testnet
                </p>
            </div>

            <div className="relative z-10 w-full max-w-xl mx-auto space-y-4">
                {/* Wallet Info Card */}
                <div className="backdrop-blur-sm rounded-xl p-5 border shadow-lg" style={cardStyle}>
                    <h2 className="text-xl font-bold text-white mb-4">Your Wallet</h2>

                    {cosmosWallet.address ? (
                        <div className="space-y-3">
                            <div>
                                <label className="text-sm" style={{ color: colors.ui.textSecondary }}>
                                    Address
                                </label>
                                <p className="text-white font-mono text-sm break-all mt-1">{cosmosWallet.address}</p>
                            </div>
                            <div>
                                <label className="text-sm" style={{ color: colors.ui.textSecondary }}>
                                    Current STAKE Balance
                                </label>
                                <p className="text-white text-2xl font-bold mt-1">{stakeBalance} STAKE</p>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-4">
                            <p className="text-gray-400 mb-4">No wallet connected</p>
                            <button
                                onClick={() => navigate("/wallet")}
                                className="px-6 py-2 rounded-lg text-white font-semibold transition-all hover:opacity-80"
                                style={{ backgroundColor: colors.brand.primary }}
                            >
                                Create or Import Wallet
                            </button>
                        </div>
                    )}
                </div>

                {/* Faucet Request Card */}
                {cosmosWallet.address && (
                    <div className="backdrop-blur-sm rounded-xl p-5 border shadow-lg" style={cardStyle}>
                        <h2 className="text-xl font-bold text-white mb-3">Request STAKE</h2>

                        {faucetLoading ? (
                            <p className="text-gray-400 text-sm">Loading faucet info...</p>
                        ) : !faucetInfo?.configured ? (
                            <div
                                className="rounded-lg p-3 mb-4"
                                style={{
                                    backgroundColor: hexToRgba(colors.accent.danger, 0.1),
                                    border: `1px solid ${hexToRgba(colors.accent.danger, 0.3)}`
                                }}
                            >
                                <p className="text-sm" style={{ color: colors.accent.danger }}>
                                    Faucet server not available. Please try again later or contact an administrator.
                                </p>
                            </div>
                        ) : (
                            <>
                                <p className="text-sm mb-4" style={{ color: colors.ui.textSecondary }}>
                                    You can request {faucetInfo.faucetAmount} STAKE every {faucetInfo.rateLimitHours} hours for gas fees.
                                </p>

                                {/* Faucet wallet info */}
                                {faucetInfo.faucetAddress && (
                                    <div className="text-xs mb-4" style={{ color: colors.ui.textSecondary }}>
                                        Faucet: {faucetInfo.faucetAddress.substring(0, 15)}...
                                    </div>
                                )}

                                {/* Rate limit status */}
                                {!rateLimitStatus.canRequest && (
                                    <div
                                        className="rounded-lg p-3 mb-4"
                                        style={{
                                            backgroundColor: hexToRgba(colors.accent.warning, 0.1),
                                            border: `1px solid ${hexToRgba(colors.accent.warning, 0.3)}`
                                        }}
                                    >
                                        <p className="text-sm" style={{ color: colors.accent.warning }}>
                                            You can request again in {rateLimitStatus.waitTimeFormatted || "some time"}
                                        </p>
                                    </div>
                                )}

                                {/* Success message */}
                                {success && (
                                    <div
                                        className="rounded-lg p-3 mb-4"
                                        style={{
                                            backgroundColor: hexToRgba(colors.accent.success, 0.1),
                                            border: `1px solid ${hexToRgba(colors.accent.success, 0.3)}`
                                        }}
                                    >
                                        <p className="text-sm font-semibold" style={{ color: colors.accent.success }}>
                                            {success}
                                        </p>
                                        {txHash && (
                                            <p
                                                className="text-xs mt-1 font-mono"
                                                style={{ color: hexToRgba(colors.accent.success, 0.8) }}
                                            >
                                                TX: {txHash.substring(0, 20)}...
                                            </p>
                                        )}
                                    </div>
                                )}

                                {/* Error message */}
                                {error && (
                                    <div
                                        className="rounded-lg p-3 mb-4"
                                        style={{
                                            backgroundColor: hexToRgba(colors.accent.danger, 0.1),
                                            border: `1px solid ${hexToRgba(colors.accent.danger, 0.3)}`
                                        }}
                                    >
                                        <p className="text-sm" style={{ color: colors.accent.danger }}>
                                            {error}
                                        </p>
                                    </div>
                                )}

                                <button
                                    onClick={handleRequestFaucet}
                                    disabled={isRequesting || !rateLimitStatus.canRequest || !faucetInfo.configured}
                                    className="w-full text-white px-6 py-3 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:opacity-80"
                                    style={{ backgroundColor: colors.brand.primary }}
                                >
                                    {isRequesting ? "Requesting..." : `Request ${faucetInfo.faucetAmount} STAKE`}
                                </button>
                            </>
                        )}
                    </div>
                )}

                {/* Coming Soon Card */}
                <div className="backdrop-blur-sm rounded-xl p-5 border shadow-lg" style={cardStyle}>
                    <div className="flex items-center gap-2 mb-3">
                        <span className="text-xl">🚀</span>
                        <h2 className="text-xl font-bold text-white">Coming Soon</h2>
                    </div>
                    <p className="text-sm" style={{ color: colors.ui.textSecondary }}>
                        <strong className="text-white">Auto-Funded Gas Fees:</strong> Soon you won&apos;t need to worry about
                        STAKE at all! When you deposit USDC, we&apos;ll automatically fund your account with enough STAKE for
                        gas fees. Just deposit and play - we&apos;re making onboarding as frictionless as possible.
                    </p>
                </div>
            </div>

            {/* Powered by Block52 */}
            <div className="fixed bottom-4 left-4 flex items-center z-20 opacity-30">
                <div className="flex flex-col items-start bg-transparent px-3 py-2 rounded-lg backdrop-blur-sm border-0">
                    <div className="text-left mb-1">
                        <span className="text-xs text-white font-medium tracking-wide">POWERED BY</span>
                    </div>
                    <img src="/block52.png" alt="Block52 Logo" className="h-6 w-auto object-contain interaction-none" />
                </div>
            </div>
        </div>
    );
}
