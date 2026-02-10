import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom"; // Import useNavigate for navigation

import "./Dashboard.css"; // Import the CSS file with animations

// Base Chain imports (only for USDC deposits via bridge)
import { ethers } from "ethers";
import { BASE_RPC_URL, BASE_USDC_ADDRESS, BASE_CHAIN_ID } from "../config/constants";
import { useAccount as useWagmiAccount, useSwitchChain } from "wagmi";

import { calculateBuyIn } from "../utils/buyInUtils";
import { BLIND_LEVELS, DEFAULT_BLIND_LEVEL_INDEX } from "../constants/blindLevels";
import { usdcToMicroBigInt, formatMicroAsUsdc } from "../constants/currency";

const RPC_URL = BASE_RPC_URL; // Base Chain RPC for USDC balance queries
const USDC_ABI = ["function balanceOf(address account) view returns (uint256)"];

import { WithdrawalModal, USDCDepositModal } from "../components/modals";
import TableList from "../components/TableList";
import WalletPanel from "../components/WalletPanel";
import TransactionPanel from "../components/TransactionPanel";
import { AnimatedBackground } from "../components/common";

// Game wallet and SDK imports
// ...existing code...
import { GameFormat, generateWallet as generateWalletSDK } from "@block52/poker-vm-sdk";

// Hook imports from barrel file
import { useUserWalletConnect, useNewTable, useCosmosWallet } from "../hooks";
import type { CreateTableOptions } from "../hooks/game/useNewTable"; // Import type separately

// Cosmos wallet utils
import { isValidSeedPhrase, getCosmosMnemonic } from "../utils/cosmos";
import { isTournamentFormat } from "../utils/gameFormatUtils";

// Password protection utils
import {
    checkAuthCookie,
    handlePasswordSubmit as utilHandlePasswordSubmit,
    handlePasswordKeyPress as utilHandlePasswordKeyPress
} from "../utils/passwordProtectionUtils";

// Club branding imports
import { colors, hexToRgba } from "../utils/colorConfig";

const Dashboard: React.FC = () => {
    const navigate = useNavigate();
    // Removed: Game selection state variables - now handled in Create Game modal
    // Removed: Ethereum wallet state - now using Cosmos wallet only

    // Password protection states
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
    const [passwordInput, setPasswordInput] = useState<string>("");
    const [passwordError, setPasswordError] = useState<string>("");
    const [showPassword, setShowPassword] = useState<boolean>(false);

    const { isConnected, open, address } = useUserWalletConnect();

    // Wagmi hooks for Base Chain (USDC deposit bridge only)
    const { chain } = useWagmiAccount();
    const { switchChain } = useSwitchChain();

    // Removed: Ethereum account hook - now using Cosmos wallet only

    // Use the new useNewTable hook from hooks directory
    const { createTable, isCreating: isCreatingTable, error: createTableError } = useNewTable();

    // Removed: Ethereum private key import modal states

    // New game creation states
    const [showCreateGameModal, setShowCreateGameModal] = useState(false);
    const [selectedContractAddress, setSelectedContractAddress] = useState("0x4c1d6ea77a2ba47dcd0771b7cde0df30a6df1bfaa7");
    const [createGameError, setCreateGameError] = useState("");
    
    // Modal game options
    const [modalGameFormat, setModalGameFormat] = useState<GameFormat>(GameFormat.SIT_AND_GO);
    const [modalSitAndGoBuyIn, setModalSitAndGoBuyIn] = useState(1); // Single buy-in for Sit & Go
    const [modalPlayerCount, setModalPlayerCount] = useState(4);
    // For Cash Game: min/max players
    const [modalMinPlayers, setModalMinPlayers] = useState(2);
    const [modalMaxPlayers, setModalMaxPlayers] = useState(9);
    // Selected blind level (index in BLIND_LEVELS array)
    const [selectedBlindLevel, setSelectedBlindLevel] = useState(DEFAULT_BLIND_LEVEL_INDEX);
    // Buy-in fields in Big Blinds (BB) for Cash games
    const [modalMinBuyInBB, setModalMinBuyInBB] = useState(20);   // 20 BB default
    const [modalMaxBuyInBB, setModalMaxBuyInBB] = useState(100);  // 100 BB default
    
    // Get current blind values from selected level (memoized to prevent unnecessary recalculation)
    const modalSmallBlind = useMemo(() => BLIND_LEVELS[selectedBlindLevel].smallBlind, [selectedBlindLevel]);
    const modalBigBlind = useMemo(() => BLIND_LEVELS[selectedBlindLevel].bigBlind, [selectedBlindLevel]);

    // Calculate actual buy-in values from BB using utility function
    const { minBuyIn: calculatedMinBuyIn, maxBuyIn: calculatedMaxBuyIn } = useMemo(
        () => calculateBuyIn({ minBuyInBB: modalMinBuyInBB, maxBuyInBB: modalMaxBuyInBB, bigBlind: modalBigBlind }),
        [modalMinBuyInBB, modalMaxBuyInBB, modalBigBlind]
    );

    // Withdrawal Modal
    const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);

    // USDC Deposit Modal
    const [showUSDCDepositModal, setShowUSDCDepositModal] = useState(false);

    // Wallet connection warning
    const [showWalletWarning, setShowWalletWarning] = useState(false);

    // Web3 wallet balance state
    const [web3Balance, setWeb3Balance] = useState<string>("0.00");

    // Cosmos wallet state and hooks
    const cosmosWallet = useCosmosWallet();
    const [showCosmosImportModal, setShowCosmosImportModal] = useState(false);
    const [showCosmosTransferModal, setShowCosmosTransferModal] = useState(false);
    const [showWalletGeneratedNotification, setShowWalletGeneratedNotification] = useState(false);
    const [showNoStakeNotification, setShowNoStakeNotification] = useState(false);
    const [showNewWalletModal, setShowNewWalletModal] = useState(false);
    const [newWalletSeedPhrase, setNewWalletSeedPhrase] = useState("");
    const [newWalletAddress, setNewWalletAddress] = useState("");
    const [isCreatingWallet, setIsCreatingWallet] = useState(false);
    const [seedPhraseCopied, setSeedPhraseCopied] = useState(false);

    // Check if user has STAKE for gas fees
    const hasStakeBalance = useMemo(() => {
        const stakeBalance = cosmosWallet.balance.find(b => b.denom === "stake");
        return stakeBalance && parseInt(stakeBalance.amount) > 0;
    }, [cosmosWallet.balance]);

    // Show notification when wallet exists but no STAKE (and not loading)
    useEffect(() => {
        if (cosmosWallet.address && !cosmosWallet.isLoading && !hasStakeBalance && cosmosWallet.balance.length >= 0) {
            // Small delay to avoid showing during initial load
            const timer = setTimeout(() => {
                if (!hasStakeBalance) {
                    setShowNoStakeNotification(true);
                }
            }, 2000);
            return () => clearTimeout(timer);
        } else if (hasStakeBalance) {
            setShowNoStakeNotification(false);
        }
    }, [cosmosWallet.address, cosmosWallet.isLoading, cosmosWallet.balance, hasStakeBalance]);

    // Auto-create Block52 wallet if none exists
    useEffect(() => {
        const autoCreateWallet = async () => {
            const existingMnemonic = getCosmosMnemonic();
            if (!existingMnemonic) {
                try {
                    console.log("🔐 No Block52 wallet found, auto-generating...");
                    const walletInfo = await generateWalletSDK("b52", 24);
                    // Use importSeedPhrase to properly update the hook's state
                    // This saves to localStorage AND updates the address state
                    await cosmosWallet.importSeedPhrase(walletInfo.mnemonic);
                    console.log("✅ Block52 wallet auto-generated:", walletInfo.address);
                    setShowWalletGeneratedNotification(true);
                    // Auto-hide notification after 10 seconds
                    setTimeout(() => setShowWalletGeneratedNotification(false), 10000);
                } catch (err) {
                    console.error("❌ Failed to auto-generate wallet:", err);
                }
            }
        };
        autoCreateWallet();
    }, []); // Run once on mount
    const [cosmosSeedPhrase, setCosmosSeedPhrase] = useState("");
    const [cosmosImportError, setCosmosImportError] = useState("");
    const [transferRecipient, setTransferRecipient] = useState("");
    const [transferAmount, setTransferAmount] = useState("");
    const [transferError, setTransferError] = useState("");
    const [isTransferring, setIsTransferring] = useState(false);
    const [transferTokenType, setTransferTokenType] = useState<"usdc" | "stake">("usdc");

    // STAKE transfer rate limiting (10 STAKE per recipient per hour)
    const STAKE_LIMIT_PER_HOUR = 10;
    const STAKE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour in milliseconds

    const getStakeTransferHistory = useCallback((): Record<string, { amount: number; timestamp: number }[]> => {
        try {
            const history = localStorage.getItem("stake_transfer_history");
            return history ? JSON.parse(history) : {};
        } catch {
            return {};
        }
    }, []);

    const saveStakeTransfer = useCallback((recipient: string, amount: number) => {
        const history = getStakeTransferHistory();
        if (!history[recipient]) {
            history[recipient] = [];
        }
        history[recipient].push({ amount, timestamp: Date.now() });
        localStorage.setItem("stake_transfer_history", JSON.stringify(history));
    }, [getStakeTransferHistory]);

    const getStakeSentInLastHour = useCallback((recipient: string): number => {
        const history = getStakeTransferHistory();
        const recipientHistory = history[recipient] || [];
        const oneHourAgo = Date.now() - STAKE_LIMIT_WINDOW_MS;

        // Sum up all STAKE sent to this recipient in the last hour
        return recipientHistory
            .filter(entry => entry.timestamp > oneHourAgo)
            .reduce((sum, entry) => sum + entry.amount, 0);
    }, [getStakeTransferHistory, STAKE_LIMIT_WINDOW_MS]);

    const getRemainingStakeAllowance = useCallback((recipient: string): number => {
        const sentInLastHour = getStakeSentInLastHour(recipient);
        return Math.max(0, STAKE_LIMIT_PER_HOUR - sentInLastHour);
    }, [getStakeSentInLastHour, STAKE_LIMIT_PER_HOUR]);

    // Function to get USDC balance on Base Chain
    const fetchWeb3Balance = useCallback(async () => {
        if (!address) return;

        try {
            const provider = new ethers.JsonRpcProvider(RPC_URL);
            const usdcContract = new ethers.Contract(BASE_USDC_ADDRESS, USDC_ABI, provider);
            const balance = await usdcContract.balanceOf(address);
            const formattedBalance = ethers.formatUnits(balance, 6); // USDC has 6 decimals
            const roundedBalance = parseFloat(formattedBalance).toFixed(2);
            setWeb3Balance(roundedBalance);
        } catch (error) {
            console.error("Error fetching Base Chain USDC balance:", error);
            setWeb3Balance("0.00");
        }
    }, [address]);

    // Fetch balance when wallet connects
    useEffect(() => {
        if (address) {
            fetchWeb3Balance();
        }
    }, [fetchWeb3Balance, address]);

    // Password validation function
    const handlePasswordSubmit = () => {
        utilHandlePasswordSubmit(passwordInput, setIsAuthenticated, setPasswordError, setPasswordInput);
    };

    // Handle Enter key press in password input
    const handlePasswordKeyPress = (e: React.KeyboardEvent) => {
        utilHandlePasswordKeyPress(e, passwordInput, setIsAuthenticated, setPasswordError, setPasswordInput);
    };

    // Check for existing auth cookie on component mount
    useEffect(() => {
        if (checkAuthCookie()) {
            setIsAuthenticated(true);
        }
    }, []);

    const DEFAULT_GAME_CONTRACT = "0x4c1d6ea77a2ba47dcd0771b7cde0df30a6df1bfaa7"; // Example address

    // Function to handle creating a new game using Cosmos blockchain
    const handleCreateNewGame = async () => {
        // Check for Cosmos wallet
        if (!cosmosWallet.address) {
            setCreateGameError("No Block52 wallet found. Please create or import a Block52 wallet first.");
            return;
        }

        setCreateGameError("");

        try {
            // Build game options from modal selections
            // For Sit & Go/Tournament, use the same value for min and max buy-in
            const isTournament = isTournamentFormat(modalGameFormat);

            // Log the modal values before creating game options
            console.log("🎲 Modal Values:");
            console.log("  Game Format:", modalGameFormat);
            console.log("  Min Buy-In (BB):", modalMinBuyInBB);
            console.log("  Max Buy-In (BB):", modalMaxBuyInBB);
            console.log("  Calculated Min Buy-In ($):", calculatedMinBuyIn);
            console.log("  Calculated Max Buy-In ($):", calculatedMaxBuyIn);
            console.log("  Sit & Go Buy-In:", modalSitAndGoBuyIn);
            console.log("  Player Count:", modalPlayerCount);
            console.log("  Is Tournament:", isTournament);
            console.log("  Cosmos Address:", cosmosWallet.address);

            const gameOptions: CreateTableOptions = {
                format: modalGameFormat,
                minBuyIn: isTournament ? modalSitAndGoBuyIn : calculatedMinBuyIn,
                maxBuyIn: isTournament ? modalSitAndGoBuyIn : calculatedMaxBuyIn,
                minPlayers: modalGameFormat === GameFormat.CASH ? modalMinPlayers : modalPlayerCount,
                maxPlayers: modalGameFormat === GameFormat.CASH ? modalMaxPlayers : modalPlayerCount,
                smallBlind: modalSmallBlind,
                bigBlind: modalBigBlind
            };

            console.log("📦 Final CreateTableOptions being sent to Cosmos:");
            console.log("  format:", gameOptions.format);
            console.log("  minBuyIn:", gameOptions.minBuyIn);
            console.log("  maxBuyIn:", gameOptions.maxBuyIn);
            console.log("  minPlayers:", gameOptions.minPlayers);
            console.log("  maxPlayers:", gameOptions.maxPlayers);

            // Use the createTable function from the hook (Cosmos SDK)
            const txHash = await createTable(gameOptions);

            if (txHash) {
                console.log("✅ Game created! Transaction hash:", txHash);
                setShowCreateGameModal(false);
            }
        } catch (error: any) {
            console.error("Error creating game:", error);
            setCreateGameError(error.message || "An unexpected error occurred");
        }
    };

    // Cosmos wallet handlers
    const handleImportCosmosSeed = async () => {
        try {
            setCosmosImportError("");

            if (!isValidSeedPhrase(cosmosSeedPhrase)) {
                setCosmosImportError("Please enter a valid seed phrase (12, 15, 18, 21, or 24 words)");
                return;
            }

            await cosmosWallet.importSeedPhrase(cosmosSeedPhrase);

            // Reset form and close modal
            setCosmosSeedPhrase("");
            setCosmosImportError("");
            setShowCosmosImportModal(false);
        } catch (err) {
            console.error("Failed to import cosmos seed phrase:", err);
            setCosmosImportError("Failed to import seed phrase");
        }
    };

    // Removed: handleUpdateCosmosSeed - now handled on /wallet page

    // Create new wallet handler - generates wallet and shows seed phrase
    const handleCreateNewWallet = async () => {
        try {
            setIsCreatingWallet(true);
            setSeedPhraseCopied(false);

            // Generate new wallet
            const walletInfo = await generateWalletSDK("b52", 24);

            // Store the seed phrase and address for display
            setNewWalletSeedPhrase(walletInfo.mnemonic);
            setNewWalletAddress(walletInfo.address);

            // Show the modal with seed phrase
            setShowNewWalletModal(true);
        } catch (err) {
            console.error("Failed to generate new wallet:", err);
        } finally {
            setIsCreatingWallet(false);
        }
    };

    // Confirm and save the new wallet
    const handleConfirmNewWallet = async () => {
        try {
            // Import the generated seed phrase to save it
            await cosmosWallet.importSeedPhrase(newWalletSeedPhrase);

            // Close modal and reset state
            setShowNewWalletModal(false);
            setNewWalletSeedPhrase("");
            setNewWalletAddress("");
            setSeedPhraseCopied(false);

            // Show success notification
            setShowWalletGeneratedNotification(true);
            setTimeout(() => setShowWalletGeneratedNotification(false), 10000);
        } catch (err) {
            console.error("Failed to save new wallet:", err);
        }
    };

    // Copy seed phrase to clipboard
    const handleCopySeedPhrase = () => {
        navigator.clipboard.writeText(newWalletSeedPhrase);
        setSeedPhraseCopied(true);
    };

    const handleCosmosTransfer = async () => {
        try {
            setTransferError("");
            setIsTransferring(true);

            if (!transferRecipient || !transferAmount) {
                setTransferError("Please enter recipient address and amount");
                return;
            }

            if (!transferRecipient.startsWith("b52")) {
                setTransferError("Recipient address must start with 'b52'");
                return;
            }

            const amount = parseFloat(transferAmount);
            if (isNaN(amount) || amount <= 0) {
                setTransferError("Please enter a valid amount");
                return;
            }

            // STAKE rate limiting check
            if (transferTokenType === "stake") {
                const remaining = getRemainingStakeAllowance(transferRecipient);
                if (amount > remaining) {
                    if (remaining <= 0) {
                        setTransferError(`Rate limit reached. This address has already received ${STAKE_LIMIT_PER_HOUR} STAKE in the last hour. Try again later.`);
                    } else {
                        setTransferError(`Rate limit: You can only send ${remaining.toFixed(2)} more STAKE to this address in the next hour.`);
                    }
                    return;
                }
            }

            // Convert to smallest unit (6 decimals for both USDC and STAKE)
            const amountInSmallestUnit = usdcToMicroBigInt(amount).toString();

            // Use the selected token type (denom)
            const txHash = await cosmosWallet.sendTokens(transferRecipient, amountInSmallestUnit, transferTokenType);

            console.log("Transfer successful:", txHash);

            // Save STAKE transfer to history for rate limiting
            if (transferTokenType === "stake") {
                saveStakeTransfer(transferRecipient, amount);
            }

            // Reset form and close modal
            setTransferRecipient("");
            setTransferAmount("");
            setTransferError("");
            setTransferTokenType("usdc");
            setShowCosmosTransferModal(false);
        } catch (err) {
            console.error("Failed to send cosmos tokens:", err);
            setTransferError(err instanceof Error ? err.message : "Failed to send tokens");
        } finally {
            setIsTransferring(false);
        }
    };

    // Get balance for selected transfer token
    const getTransferTokenBalance = useCallback(() => {
        const balance = cosmosWallet.balance.find(b => b.denom === transferTokenType);
        if (balance) {
            return formatMicroAsUsdc(balance.amount, 6);
        }
        return "0.00";
    }, [cosmosWallet.balance, transferTokenType]);

    // Auto-switch to Base Chain when wallet connects
    useEffect(() => {
        const autoSwitchToBase = async () => {
            if (isConnected && chain?.id !== BASE_CHAIN_ID && switchChain) {
                console.log("🔄 Auto-switching wallet to Base Chain...");
                try {
                    await switchChain({ chainId: BASE_CHAIN_ID });
                    console.log("✅ Successfully switched to Base Chain");
                } catch (err) {
                    console.warn("⚠️ Could not auto-switch to Base Chain:", err);
                    // Don't show error to user - they can manually switch if needed
                }
            }
        };

        autoSwitchToBase();
    }, [isConnected, chain?.id, switchChain]);

    // Memoized Deposit callback
    const handleDepositClick = useCallback(() => {
        if (isConnected) {
            setShowUSDCDepositModal(true);
        } else {
            // Show warning popup if wallet not connected
            setShowWalletWarning(true);
            // Auto-hide after 3 seconds
            setTimeout(() => setShowWalletWarning(false), 3000);
        }
    }, [isConnected]);

    // Memoized Withdrawal callback
    const handleWithdrawClick = useCallback(() => {
        setShowWithdrawalModal(true);
    }, []);

    // Removed: handleImportModalClick - no longer needed (using Cosmos wallet)

    // Memoized game selection callbacks
    // Removed: Game selection button handlers - no longer needed

    return (
        <div className="min-h-screen flex flex-col justify-center items-center relative overflow-hidden">
            {/* Animated background with hexagon pattern */}
            <AnimatedBackground />

            {/* Wallet Generated Notification */}
            {showWalletGeneratedNotification && (
                <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 animate-fade-in">
                    <div
                        className="px-6 py-4 rounded-xl shadow-2xl border flex items-center gap-4"
                        style={{
                            backgroundColor: hexToRgba(colors.accent.success, 0.95),
                            borderColor: colors.accent.success
                        }}
                    >
                        <span className="text-2xl">🎉</span>
                        <div>
                            <p className="text-white font-bold">Block52 Wallet Created!</p>
                            <p className="text-white/80 text-sm">
                                Visit <a href="/wallet" className="underline font-semibold hover:text-white">/wallet</a> to view your seed phrase and manage your wallet.
                            </p>
                        </div>
                        <button
                            onClick={() => setShowWalletGeneratedNotification(false)}
                            className="text-white/80 hover:text-white ml-2"
                        >
                            ✕
                        </button>
                    </div>
                </div>
            )}

            {/* No STAKE Notification */}
            {showNoStakeNotification && !showWalletGeneratedNotification && (
                <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 animate-fade-in">
                    <div
                        className="px-6 py-4 rounded-xl shadow-2xl border flex items-center gap-4"
                        style={{
                            backgroundColor: hexToRgba(colors.accent.warning, 0.95),
                            borderColor: colors.accent.warning
                        }}
                    >
                        <span className="text-2xl">⛽</span>
                        <div>
                            <p className="text-white font-bold">No STAKE for Gas Fees</p>
                            <p className="text-white/80 text-sm">
                                You need STAKE tokens for transactions.{" "}
                                <a href="/faucet" className="underline font-semibold hover:text-white">
                                    Visit the faucet
                                </a>{" "}
                                to request free test tokens.
                            </p>
                        </div>
                        <button
                            onClick={() => setShowNoStakeNotification(false)}
                            className="text-white/80 hover:text-white ml-2"
                        >
                            ✕
                        </button>
                    </div>
                </div>
            )}

            {/* Password Protection Modal */}
            {!isAuthenticated && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm">
                    <div
                        className="backdrop-blur-md p-8 rounded-xl w-96 shadow-2xl relative overflow-hidden"
                        style={{
                            backgroundColor: hexToRgba(colors.ui.bgDark, 0.9),
                            border: `1px solid ${hexToRgba(colors.brand.primary, 0.2)}`
                        }}
                    >
                        {/* Web3 styled background */}
                        <div
                            className="absolute inset-0 rounded-xl"
                            style={{
                                background: `linear-gradient(135deg, ${hexToRgba(colors.brand.primary, 0.1)} 0%, ${hexToRgba(
                                    colors.brand.secondary,
                                    0.1
                                )} 100%)`
                            }}
                        ></div>
                        <div
                            className="absolute top-0 left-0 w-full h-1 animate-pulse"
                            style={{
                                background: `linear-gradient(90deg, ${colors.brand.primary}, ${colors.accent.glow}, ${colors.brand.primary})`
                            }}
                        ></div>

                        <div className="relative z-10">
                            <div className="flex items-center justify-center mb-4">
                                <img src="/block52.png" alt="Block52 Logo" className="h-16 w-auto object-contain" />
                            </div>

                            <div className="flex items-center justify-center mb-6">
                                <div
                                    className="w-16 h-16 rounded-full flex items-center justify-center"
                                    style={{
                                        background: `linear-gradient(135deg, ${hexToRgba(colors.brand.primary, 0.2)} 0%, ${hexToRgba(
                                            colors.brand.secondary,
                                            0.2
                                        )} 100%)`,
                                        border: `1px solid ${hexToRgba(colors.brand.primary, 0.3)}`
                                    }}
                                >
                                    <svg className="w-8 h-8" style={{ color: colors.brand.primary }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth="2"
                                            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                                        />
                                    </svg>
                                </div>
                            </div>

                            <h2 className="text-2xl font-bold text-white text-center mb-2 text-shadow">Secure Access</h2>
                            <p className="text-gray-300 text-center mb-6 text-sm">Enter password to access the Block52 demo</p>

                            <div className="space-y-4">
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        placeholder="Enter password"
                                        value={passwordInput}
                                        onChange={e => setPasswordInput(e.target.value)}
                                        onKeyDown={handlePasswordKeyPress}
                                        className="w-full p-3 rounded-lg backdrop-blur-sm text-white focus:outline-none transition-all duration-200 pr-12"
                                        style={{
                                            backgroundColor: hexToRgba(colors.ui.bgMedium, 0.8),
                                            border: `1px solid ${hexToRgba(colors.brand.primary, 0.3)}`,
                                            boxShadow: `0 0 0 2px ${hexToRgba(colors.brand.primary, 0.5)}`
                                        }}
                                        onFocus={e => (e.target.style.border = `1px solid ${colors.brand.primary}`)}
                                        onBlur={e => (e.target.style.border = `1px solid ${hexToRgba(colors.brand.primary, 0.3)}`)}
                                        autoFocus
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white hover:opacity-90 transition-colors"
                                    >
                                        {showPassword ? (
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth="2"
                                                    d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"
                                                />
                                            </svg>
                                        ) : (
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth="2"
                                                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                                                />
                                            </svg>
                                        )}
                                    </button>
                                </div>

                                {passwordError && (
                                    <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
                                        <p className="text-red-400 text-sm text-center">{passwordError}</p>
                                    </div>
                                )}

                                <button
                                    onClick={handlePasswordSubmit}
                                    className="w-full py-3 text-white rounded-lg transition duration-300 transform hover:scale-105 shadow-md font-semibold"
                                    style={{
                                        background: `linear-gradient(135deg, ${colors.brand.primary} 0%, ${hexToRgba(colors.brand.primary, 0.8)} 100%)`,
                                        border: `1px solid ${hexToRgba(colors.brand.primary, 0.2)}`
                                    }}
                                    onMouseEnter={e => {
                                        (e.target as HTMLButtonElement).style.background = `linear-gradient(135deg, ${hexToRgba(
                                            colors.brand.primary,
                                            0.9
                                        )} 0%, ${hexToRgba(colors.brand.primary, 0.7)} 100%)`;
                                    }}
                                    onMouseLeave={e => {
                                        (e.target as HTMLButtonElement).style.background = `linear-gradient(135deg, ${colors.brand.primary} 0%, ${hexToRgba(
                                            colors.brand.primary,
                                            0.8
                                        )} 100%)`;
                                    }}
                                >
                                    <div className="flex items-center justify-center gap-2">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth="2"
                                                d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"
                                            />
                                        </svg>
                                        Access Platform
                                    </div>
                                </button>
                            </div>

                            <div className="mt-6 text-center">
                                <p className="text-xs text-gray-400">Block52 Blockchain Infrastructure Demo</p>
                                <div className="flex items-center justify-center gap-1 mt-2">
                                    <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: colors.brand.primary }}></div>
                                    <span className="text-xs text-gray-400">Secured by Block52</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Dashboard Content - Only show when authenticated */}
            {isAuthenticated && (
                <>
                    {/* Cosmos Import Seed Phrase Modal */}
                    {showCosmosImportModal && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm">
                            <div
                                className="p-6 rounded-xl w-96 shadow-2xl border"
                                style={{ backgroundColor: colors.ui.bgDark, borderColor: hexToRgba(colors.brand.primary, 0.2) }}
                            >
                                <h3 className="text-xl font-bold text-white mb-4">Import Cosmos Seed Phrase</h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-white text-sm mb-1">Seed Phrase</label>
                                        <textarea
                                            placeholder="Enter your 12, 15, 18, 21, or 24 word seed phrase..."
                                            value={cosmosSeedPhrase}
                                            onChange={e => setCosmosSeedPhrase(e.target.value)}
                                            className="w-full p-2 rounded bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-200 h-20 resize-none"
                                        />
                                        <p className="text-xs text-gray-400 mt-1">Words should be separated by spaces</p>
                                    </div>
                                    {cosmosImportError && <p className="text-red-500 text-sm">{cosmosImportError}</p>}
                                    <div className="flex justify-end space-x-3">
                                        <button
                                            onClick={() => {
                                                setShowCosmosImportModal(false);
                                                setCosmosSeedPhrase("");
                                                setCosmosImportError("");
                                            }}
                                            className="px-4 py-2 text-sm bg-gray-600 hover:bg-gray-700 hover:opacity-90 text-white rounded-lg transition duration-300 shadow-inner"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleImportCosmosSeed}
                                            disabled={cosmosWallet.isLoading}
                                            className="px-4 py-2 text-sm text-white rounded-lg transition duration-300 shadow-md hover:opacity-90 disabled:opacity-50"
                                            style={{ backgroundColor: colors.brand.primary }}
                                        >
                                            {cosmosWallet.isLoading ? "Importing..." : "Import"}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Removed: Cosmos Update Seed Phrase Modal - now handled on /wallet page */}

                    {/* New Wallet Created Modal - shows seed phrase */}
                    {showNewWalletModal && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm">
                            <div
                                className="p-6 rounded-xl w-[480px] shadow-2xl border"
                                style={{ backgroundColor: colors.ui.bgDark, borderColor: hexToRgba(colors.brand.primary, 0.2) }}
                            >
                                <h3 className="text-xl font-bold text-white mb-2">New Wallet Created</h3>
                                <p className="text-gray-400 text-sm mb-4">
                                    Write down your seed phrase and store it in a safe place. You will need it to recover your wallet.
                                </p>

                                {/* Warning */}
                                <div
                                    className="p-3 rounded-lg mb-4 flex items-start gap-3"
                                    style={{ backgroundColor: hexToRgba(colors.accent.danger, 0.1), border: `1px solid ${hexToRgba(colors.accent.danger, 0.3)}` }}
                                >
                                    <svg className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: colors.accent.danger }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                    <p className="text-sm" style={{ color: colors.accent.danger }}>
                                        Never share your seed phrase with anyone. Anyone with this phrase can access your funds.
                                    </p>
                                </div>

                                {/* Address */}
                                <div className="mb-4">
                                    <label className="block text-gray-400 text-sm mb-1">Wallet Address</label>
                                    <div className="p-3 rounded-lg bg-gray-800 border border-gray-700 font-mono text-sm text-white break-all">
                                        {newWalletAddress}
                                    </div>
                                </div>

                                {/* Seed Phrase */}
                                <div className="mb-4">
                                    <label className="block text-gray-400 text-sm mb-1">Seed Phrase (24 words)</label>
                                    <div className="p-3 rounded-lg bg-gray-800 border border-gray-700 font-mono text-sm text-white">
                                        <div className="grid grid-cols-4 gap-2">
                                            {newWalletSeedPhrase.split(" ").map((word, index) => (
                                                <div key={index} className="flex items-center gap-1">
                                                    <span className="text-gray-500 text-xs w-5">{index + 1}.</span>
                                                    <span>{word}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Copy Button */}
                                <button
                                    onClick={handleCopySeedPhrase}
                                    className="w-full py-2 mb-4 rounded-lg text-white font-semibold transition-all hover:opacity-90 flex items-center justify-center gap-2"
                                    style={{ backgroundColor: seedPhraseCopied ? colors.accent.success : colors.ui.bgMedium, border: `1px solid ${colors.ui.borderColor}` }}
                                >
                                    {seedPhraseCopied ? (
                                        <>
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                            </svg>
                                            Copied!
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                            </svg>
                                            Copy Seed Phrase
                                        </>
                                    )}
                                </button>

                                {/* Actions */}
                                <div className="flex justify-end space-x-3">
                                    <button
                                        onClick={() => {
                                            setShowNewWalletModal(false);
                                            setNewWalletSeedPhrase("");
                                            setNewWalletAddress("");
                                            setSeedPhraseCopied(false);
                                        }}
                                        className="px-4 py-2 text-sm bg-gray-600 hover:bg-gray-700 hover:opacity-90 text-white rounded-lg transition duration-300"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleConfirmNewWallet}
                                        disabled={!seedPhraseCopied}
                                        className="px-4 py-2 text-sm text-white rounded-lg transition duration-300 shadow-md hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                                        style={{ backgroundColor: colors.accent.success }}
                                        title={!seedPhraseCopied ? "Please copy your seed phrase first" : ""}
                                    >
                                        I've Saved My Seed Phrase
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Cosmos Transfer Modal */}
                    {showCosmosTransferModal && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm">
                            <div
                                className="p-6 rounded-xl w-96 shadow-2xl border"
                                style={{ backgroundColor: colors.ui.bgDark, borderColor: hexToRgba(colors.brand.primary, 0.2) }}
                            >
                                <h3 className="text-xl font-bold text-white mb-4">Transfer Tokens</h3>
                                <div className="space-y-4">
                                    {/* Token Selection */}
                                    <div>
                                        <label className="block text-white text-sm mb-1">Select Token</label>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setTransferTokenType("usdc")}
                                                className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-all duration-200 ${
                                                    transferTokenType === "usdc"
                                                        ? "text-white"
                                                        : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                                                }`}
                                                style={transferTokenType === "usdc" ? { backgroundColor: colors.brand.primary } : {}}
                                            >
                                                USDC
                                            </button>
                                            <button
                                                onClick={() => setTransferTokenType("stake")}
                                                className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-all duration-200 ${
                                                    transferTokenType === "stake"
                                                        ? "text-white"
                                                        : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                                                }`}
                                                style={transferTokenType === "stake" ? { backgroundColor: colors.brand.primary } : {}}
                                            >
                                                STAKE
                                            </button>
                                        </div>
                                    </div>

                                    {/* Available Balance Display */}
                                    <div
                                        className="p-3 rounded-lg"
                                        style={{
                                            backgroundColor: hexToRgba(colors.ui.bgMedium, 0.6),
                                            border: `1px solid ${hexToRgba(colors.brand.primary, 0.3)}`
                                        }}
                                    >
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-400 text-sm">Available Balance:</span>
                                            <span className="text-white font-bold">
                                                {getTransferTokenBalance()} {transferTokenType.toUpperCase()}
                                            </span>
                                        </div>
                                    </div>

                                    {/* STAKE Rate Limit Warning */}
                                    {transferTokenType === "stake" && (
                                        <div
                                            className="p-3 rounded-lg"
                                            style={{
                                                backgroundColor: hexToRgba(colors.accent.warning, 0.1),
                                                border: `1px solid ${hexToRgba(colors.accent.warning, 0.3)}`
                                            }}
                                        >
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-yellow-400">⚠️</span>
                                                <span className="text-yellow-400 text-sm font-semibold">STAKE Rate Limit</span>
                                            </div>
                                            <p className="text-gray-300 text-xs">
                                                Max {STAKE_LIMIT_PER_HOUR} STAKE per recipient per hour to prevent abuse.
                                            </p>
                                            {transferRecipient && transferRecipient.startsWith("b52") && (
                                                <p className="text-white text-sm mt-1">
                                                    Remaining for this address: <span className="font-bold" style={{ color: colors.accent.success }}>{getRemainingStakeAllowance(transferRecipient).toFixed(2)} STAKE</span>
                                                </p>
                                            )}
                                        </div>
                                    )}

                                    <div>
                                        <label className="block text-white text-sm mb-1">Recipient Address</label>
                                        <input
                                            type="text"
                                            placeholder="b521abc..."
                                            value={transferRecipient}
                                            onChange={e => setTransferRecipient(e.target.value)}
                                            className="w-full p-2 rounded bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-200"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-white text-sm mb-1">Amount ({transferTokenType.toUpperCase()})</label>
                                        <input
                                            type="number"
                                            step="0.000001"
                                            placeholder="0.00"
                                            value={transferAmount}
                                            onChange={e => setTransferAmount(e.target.value)}
                                            className="w-full p-2 rounded bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-200"
                                        />
                                    </div>
                                    {transferError && <p className="text-red-500 text-sm">{transferError}</p>}
                                    <div className="flex flex-col space-y-3">
                                        <button
                                            onClick={handleCosmosTransfer}
                                            disabled={isTransferring || !transferRecipient || !transferAmount}
                                            className="w-full px-4 py-2 text-sm text-white rounded-lg transition duration-300 shadow-md hover:opacity-90 disabled:opacity-50"
                                            style={{ backgroundColor: colors.brand.primary }}
                                        >
                                            {isTransferring ? "Sending..." : `Send ${transferTokenType.toUpperCase()}`}
                                        </button>
                                        <button
                                            onClick={() => {
                                                setShowCosmosTransferModal(false);
                                                setTransferRecipient("");
                                                setTransferAmount("");
                                                setTransferError("");
                                                setTransferTokenType("usdc");
                                            }}
                                            className="w-full px-4 py-2 text-sm text-white rounded-lg transition duration-300 shadow-md hover:opacity-90"
                                            style={{ 
                                                background: `linear-gradient(135deg, ${colors.accent.danger} 0%, ${hexToRgba(colors.accent.danger, 0.8)} 100%)`
                                            }}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Create New Game Modal */}
                    {showCreateGameModal && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm">
                            <div
                                className="p-6 rounded-xl w-96 shadow-2xl border"
                                style={{ backgroundColor: colors.ui.bgDark, borderColor: hexToRgba(colors.brand.primary, 0.2) }}
                            >
                                <h3 className="text-xl font-bold text-white mb-4">Create New Table</h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-white text-sm mb-1">Game Type</label>
                                        <select
                                            value={modalGameFormat}
                                            onChange={e => setModalGameFormat(e.target.value as GameFormat)}
                                            className="w-full p-2 rounded bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-200"
                                        >
                                            <option value={GameFormat.SIT_AND_GO}>Sit & Go</option>
                                            <option value={GameFormat.CASH}>Cash Game</option>
                                            <option value={GameFormat.TOURNAMENT}>Tournament</option>
                                        </select>
                                    </div>

                                    {modalGameFormat === GameFormat.CASH ? (
                                        <div className="flex gap-4">
                                            <div className="flex-1">
                                                <label className="block text-white text-sm mb-1">Min Players</label>
                                                <input
                                                    type="number"
                                                    min={2}
                                                    max={9}
                                                    value={modalMinPlayers ?? 2}
                                                    onChange={e => setModalMinPlayers(Number(e.target.value))}
                                                    className="w-full p-2 rounded bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-200"
                                                />
                                            </div>
                                            <div className="flex-1">
                                                <label className="block text-white text-sm mb-1">Max Players</label>
                                                <input
                                                    type="number"
                                                    min={2}
                                                    max={9}
                                                    value={modalMaxPlayers ?? 9}
                                                    onChange={e => setModalMaxPlayers(Number(e.target.value))}
                                                    className="w-full p-2 rounded bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-200"
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        <div>
                                            <label className="block text-white text-sm mb-1">Number of Players</label>
                                            <select
                                                value={modalPlayerCount}
                                                onChange={e => setModalPlayerCount(Number(e.target.value))}
                                                className="w-full p-2 rounded bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-200"
                                            >
                                                <option value={4}>4 Players (Sit & Go)</option>
                                                <option value={9}>9 Players (Full Ring)</option>
                                            </select>
                                        </div>
                                    )}

                                    {/* Show different fields based on game format */}
                                    {isTournamentFormat(modalGameFormat) ? (
                                        // For Sit & Go and Tournament: Single buy-in field
                                        <div>
                                            <label className="block text-white text-sm mb-1">Tournament Buy-In ($)</label>
                                            <input
                                                type="number"
                                                value={modalSitAndGoBuyIn}
                                                onChange={e => setModalSitAndGoBuyIn(Number(e.target.value))}
                                                min="10"
                                                max="10"
                                                className="w-full p-2 rounded bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-200"
                                            />
                                            <p className="text-xs text-gray-400 mt-1">All players pay the same buy in</p>
                                        </div>
                                    ) : (
                                        // For Cash games: Blind level and buy-in in Big Blinds (BB)
                                        <>
                                            {/* Blind Level Dropdown - Cash games only */}
                                            <div>
                                                <label className="block text-white text-sm mb-1">Game Size (Small Blind / Big Blind)</label>
                                                <select
                                                    value={selectedBlindLevel}
                                                    onChange={e => setSelectedBlindLevel(Number(e.target.value))}
                                                    className="w-full p-2 rounded bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-200"
                                                >
                                                    {BLIND_LEVELS.map((level, index) => (
                                                        <option key={index} value={index}>
                                                            {level.label}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            {/* Preset buttons */}
                                            <div>
                                                <label className="block text-white text-sm mb-2">Buy-In Presets</label>
                                                <div className="flex gap-2 flex-wrap">
                                                    <button
                                                        type="button"
                                                        onClick={() => { setModalMinBuyInBB(20); setModalMaxBuyInBB(100); }}
                                                        className={`px-3 py-1 text-xs rounded transition-all duration-200 ${
                                                            modalMinBuyInBB === 20 && modalMaxBuyInBB === 100
                                                                ? "bg-blue-600 text-white"
                                                                : "bg-gray-600 text-gray-300 hover:bg-gray-500"
                                                        }`}
                                                    >
                                                        Standard (20-100 BB)
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => { setModalMinBuyInBB(40); setModalMaxBuyInBB(200); }}
                                                        className={`px-3 py-1 text-xs rounded transition-all duration-200 ${
                                                            modalMinBuyInBB === 40 && modalMaxBuyInBB === 200
                                                                ? "bg-blue-600 text-white"
                                                                : "bg-gray-600 text-gray-300 hover:bg-gray-500"
                                                        }`}
                                                    >
                                                        Deep (40-200 BB)
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => { setModalMinBuyInBB(100); setModalMaxBuyInBB(300); }}
                                                        className={`px-3 py-1 text-xs rounded transition-all duration-200 ${
                                                            modalMinBuyInBB === 100 && modalMaxBuyInBB === 300
                                                                ? "bg-blue-600 text-white"
                                                                : "bg-gray-600 text-gray-300 hover:bg-gray-500"
                                                        }`}
                                                    >
                                                        Deep Stack (100-300 BB)
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Buy-in inputs in BB */}
                                            <div className="flex gap-4">
                                                <div className="flex-1">
                                                    <label className="block text-white text-sm mb-1">Minimum Buy-In (BB)</label>
                                                    <input
                                                        type="number"
                                                        value={modalMinBuyInBB}
                                                        onChange={e => setModalMinBuyInBB(Number(e.target.value))}
                                                        min="20"
                                                        max="500"
                                                        className="w-full p-2 rounded bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-200"
                                                    />
                                                </div>
                                                <div className="flex-1">
                                                    <label className="block text-white text-sm mb-1">Maximum Buy-In (BB)</label>
                                                    <input
                                                        type="number"
                                                        value={modalMaxBuyInBB}
                                                        onChange={e => setModalMaxBuyInBB(Number(e.target.value))}
                                                        min="20"
                                                        max="500"
                                                        className="w-full p-2 rounded bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-200"
                                                    />
                                                </div>
                                            </div>

                                            {/* Calculated buy-in preview */}
                                            {modalBigBlind > 0 && (
                                                <div className="bg-gray-700/50 rounded p-3 border border-gray-600">
                                                    <p className="text-xs text-gray-400 mb-1">Calculated Buy-In Range:</p>
                                                    <p className="text-sm text-green-400">
                                                        ${calculatedMinBuyIn.toFixed(2)} - ${calculatedMaxBuyIn.toFixed(2)}
                                                    </p>
                                                    <p className="text-xs text-gray-500 mt-1">
                                                        Based on ${modalBigBlind.toFixed(2)} BB
                                                    </p>
                                                </div>
                                            )}
                                        </>
                                    )}

                                    <div>
                                        <label className="block text-white text-sm mb-1">Variant</label>
                                        <select
                                            value={selectedContractAddress}
                                            onChange={e => setSelectedContractAddress(e.target.value)}
                                            className="w-full p-2 rounded bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-200"
                                        >
                                            <React.Fragment>
                                                <option value={DEFAULT_GAME_CONTRACT}>Texas Hold'em</option>
                                                <option value="" disabled>
                                                    Omaha (Coming Soon)
                                                </option>
                                                <option value="" disabled>
                                                    Seven Card Stud (Coming Soon)
                                                </option>
                                                <option value="" disabled>
                                                    Blackjack (Coming Soon)
                                                </option>
                                            </React.Fragment>
                                        </select>
                                    </div>

                                    {createGameError && <p className="text-red-500 text-sm">{createGameError}</p>}
                                    {createTableError && <p className="text-red-500 text-sm">{createTableError.message}</p>}

                                    <div className="flex justify-end space-x-3">
                                        <button
                                            onClick={() => {
                                                setShowCreateGameModal(false);
                                                setCreateGameError("");
                                            }}
                                            className="px-4 py-2 text-sm bg-gray-600 hover:bg-gray-700 hover:opacity-90 text-white rounded-lg transition duration-300 shadow-inner"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleCreateNewGame}
                                            disabled={isCreatingTable}
                                            className={`px-4 py-2 text-sm text-white rounded-lg transition duration-300 shadow-md flex items-center ${
                                                isCreatingTable ? "bg-gray-500" : "hover:opacity-90"
                                            }`}
                                            style={isCreatingTable ? {} : { backgroundColor: colors.brand.primary }}
                                        >
                                            {isCreatingTable ? (
                                                <>
                                                    <svg
                                                        className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                                                        xmlns="http://www.w3.org/2000/svg"
                                                        fill="none"
                                                        viewBox="0 0 24 24"
                                                    >
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                        <path
                                                            className="opacity-75"
                                                            fill="currentColor"
                                                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                                        ></path>
                                                    </svg>
                                                    Creating Table...
                                                </>
                                            ) : (
                                                "Create Game"
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Two-column layout: Wallet (fixed width) on left, Tables (flex) on right */}
                    <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 z-10 mt-8 sm:mt-12 lg:mt-16">
                        <div className="flex flex-col lg:flex-row gap-4 sm:gap-6">
                            {/* Left column: Wallet and Transactions (fixed width) */}
                            <div className="w-full lg:w-[400px] flex-shrink-0 space-y-4">
                                <WalletPanel
                                    onDeposit={handleDepositClick}
                                    onWithdraw={handleWithdrawClick}
                                    onTransfer={() => setShowCosmosTransferModal(true)}
                                    onCreateWallet={handleCreateNewWallet}
                                    onImportWallet={() => setShowCosmosImportModal(true)}
                                />
                                <TransactionPanel />
                            </div>

                            {/* Right column: Table List (takes remaining space) */}
                            <div className="flex-1 min-w-0">
                                <TableList />
                            </div>
                        </div>
                    </div>

                    {/* Reset blockchain button was here, now commented out by user */}

                    {/* Powered by Block52 */}
                    <div className="fixed bottom-4 left-4 flex items-center z-10 opacity-30">
                        <div className="flex flex-col items-start bg-transparent px-3 py-2 rounded-lg backdrop-blur-sm border-0">
                            <div className="text-left mb-1">
                                <span className="text-xs text-white font-medium tracking-wide  ">POWERED BY</span>
                            </div>
                            <img src="/block52.png" alt="Block52 Logo" className="h-6 w-auto object-contain interaction-none" />
                        </div>
                    </div>

                    {showWithdrawalModal && (
                        <WithdrawalModal
                            isOpen={showWithdrawalModal}
                            onClose={() => setShowWithdrawalModal(false)}
                            onSuccess={() => {
                                // Balance will auto-refresh on next page interaction
                            }}
                        />
                    )}
                    {showUSDCDepositModal && (
                        <USDCDepositModal
                            isOpen={showUSDCDepositModal}
                            onClose={() => setShowUSDCDepositModal(false)}
                            onSuccess={() => {
                                // Balance will auto-refresh on next page interaction
                                setShowUSDCDepositModal(false);
                            }}
                        />
                    )}

                    {/* Wallet Connection Warning Popup */}
                    {showWalletWarning && (
                        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 animate-slide-down">
                            <div
                                className="px-6 py-4 rounded-lg shadow-lg flex items-center gap-3"
                                style={{
                                    backgroundColor: hexToRgba(colors.ui.bgDark, 0.95),
                                    border: `2px solid ${colors.accent.danger}`,
                                    backdropFilter: "blur(10px)"
                                }}
                            >
                                <div className="text-2xl">⚠️</div>
                                <div>
                                    <p className="text-white font-semibold">Please connect your Web3 wallet first</p>
                                    <p className="text-gray-400 text-sm mt-1">Click the wallet button to connect MetaMask or WalletConnect</p>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default Dashboard;
