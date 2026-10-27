import { CreationDialog } from "../components/common/CreationDialog";
import { ModalHeader } from "../components/common/ModalHeader";
import { ScheduledStartCard } from "../components/common/ScheduledStartCard";
import { TABLE_SEAT_OPTIONS } from "../utils/sngAdvancedParams";
import { formatUsd, formatMicroUsd } from "../utils/moneyDisplay";
import "../components/common/TableCreation.css";
import React, { useEffect, useState, useCallback, useMemo } from "react";
import { localDateTimeToUnixSeconds, scheduledStartRejection, LATE_REGISTRATION_LEVEL_OPTIONS, lateRegistrationOptionLabel } from "../utils/scheduledSng";
import { useNavigate } from "react-router-dom";

import "./Dashboard.css";
import styles from "./Dashboard.module.css";

// Ethereum Mainnet imports (for auto-switch to correct chain)
import { ETH_CHAIN_ID } from "../config/constants";
import { useConnection as useWagmiAccount, useSwitchChain } from "wagmi";

import { calculateBuyIn } from "../utils/buyInUtils";
import { BLIND_LEVELS, DEFAULT_BLIND_LEVEL_INDEX, SNG_BLINDS } from "../constants/blindLevels";
import { usdcToMicroBigInt, microToUsdc } from "../constants/currency";
import { readUsdcBalance } from "../utils/usdcBalance";

import { UpcomingSngModal } from "../components/modals";
import TableList from "../components/TableList";
import TableCreatedModal, { type TableCreationReceipt } from "../components/modals/TableCreatedModal";
import WalletPanel from "../components/WalletPanel";
import TransactionPanel from "../components/TransactionPanel";

// Game wallet and SDK imports
// ...existing code...
import { BettingLimit, GameFormat, GameVariant, generateWallet as generateWalletSDK, computeGameNameFee } from "@block52/poker-vm-sdk";
import { validateTableName, tableNameCharCount, normalizeTableName } from "../utils/tableName";

// Hook imports from barrel file
import { useUserWalletConnect, useNewTable, useCosmosWallet } from "../hooks";
import type { CreateTableOptions } from "../hooks/game/useNewTable";

// Cosmos wallet utils
import { isValidSeedPhrase } from "../utils/cosmos";
import { bettingLimitLabel, creatableBettingLimits, defaultBettingLimitFor, isSitAndGoFormat, isTournamentFormat, toCreatableBettingLimit, toGameVariant } from "../utils/gameFormatUtils";
import { CREATE_GAME_TYPES, createGameTypeFormat, createGameTypeLabel, isScheduledCreateType, toCreateGameType, type CreateGameType } from "../utils/createGameType";
import { computeTableCreationFeeMicro, CREATION_FEE_BIG_BLINDS } from "../utils/tableCreationFee";
import {
    BLIND_STRUCTURE_CHOICES,
    DEFAULT_CUSTOM_BLIND_STRUCTURE_TEXT,
    isBlindStructureChoice,
    openingBlindsOf,
    previewBlindLevels,
    resolveBlindStructureChoice,
    type BlindStructureChoice
} from "../utils/blindStructureChoice";
import { SNG_PREVIEW_LEVEL_COUNT } from "../utils/sngAdvancedParams";

// Password protection utils
import { checkAuthCookie, isPasswordProtectionEnabled, handlePasswordSubmit as utilHandlePasswordSubmit, handlePasswordKeyPress as utilHandlePasswordKeyPress } from "../utils/passwordProtectionUtils";

// Club branding imports
import { colors } from "../utils/colorConfig";

/** Minimum registered players for a scheduled sit-and-go. Any count from 2 up to the table. Seat layouts still exist only for 2, 4, 6 and 9. */
const SNG_MIN_PLAYER_OPTIONS = [2, 3, 4, 5, 6, 7, 8, 9];
const STACK_PRESETS = [
    { value: 1000, label: "Turbo (1000)" },
    { value: 1500, label: "Standard (1500)" },
    { value: 3000, label: "Deep Stack (3000)" }
] as const;
const DURATION_PRESETS = [
    { value: 3, label: "Hyper (3 min)" },
    { value: 5, label: "Turbo (5 min)" },
    { value: 10, label: "Standard (10 min)" },
    { value: 15, label: "Deep (15 min)" }
] as const;

const Dashboard: React.FC = () => {
    const navigate = useNavigate();
    // Removed: Game selection state variables - now handled in Create Game modal
    // Removed: Ethereum wallet state - now using Cosmos wallet only

    // Password protection states - skip if no password configured in env
    const passwordEnabled = isPasswordProtectionEnabled();
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(!passwordEnabled);
    const [passwordInput, setPasswordInput] = useState<string>("");
    const [passwordError, setPasswordError] = useState<string>("");
    const [showPassword, setShowPassword] = useState<boolean>(false);

    const { isConnected, open, address } = useUserWalletConnect();

    // Wagmi hooks for Ethereum Mainnet (USDC deposit bridge)
    const { chain } = useWagmiAccount();
    const switchChain = useSwitchChain();

    // Removed: Ethereum account hook - now using Cosmos wallet only

    // Use the new useNewTable hook from hooks directory
    const { createTable, isCreating: isCreatingTable, error: createTableError } = useNewTable();

    // Removed: Ethereum private key import modal states

    // New game creation states
    const [showCreateGameModal, setShowCreateGameModal] = useState(false);
    const [creationReceipt, setCreationReceipt] = useState<TableCreationReceipt | null>(null);
    const [tablesRevision, setTablesRevision] = useState(0);
    const closeCreationReceipt = useCallback(() => setCreationReceipt(null), []);
    const [createGameError, setCreateGameError] = useState("");

    // Modal game options
    // What the player is creating (ui#823). The chain format follows from it:
    // a Tournament is a sit-and-go with a scheduled start (poker-vm#2680).
    const [modalGameType, setModalGameType] = useState<CreateGameType>("sit-and-go");
    const modalGameFormat = createGameTypeFormat(modalGameType);
    const [modalTableName, setModalTableName] = useState(""); // Optional paid table name (poker-vm#337)
    // Variant and betting limit are independent (ui#768); picking a variant
    // resets the limit to that variant's usual one (PLO, NLHE).
    const [modalGameVariant, setModalGameVariant] = useState<GameVariant>(GameVariant.TEXAS_HOLDEM);
    const [modalBettingLimit, setModalBettingLimit] = useState<BettingLimit>(defaultBettingLimitFor(GameVariant.TEXAS_HOLDEM));
    const [modalSitAndGoBuyIn, setModalSitAndGoBuyIn] = useState(1); // Single buy-in for Sit & Go
    const [modalPlayerCount, setModalPlayerCount] = useState(4);
    // For Cash Game: min/max players
    const [modalMaxPlayers, setModalMaxPlayers] = useState(9);
    // Selected blind level (index in BLIND_LEVELS array)
    const [selectedBlindLevel, setSelectedBlindLevel] = useState(DEFAULT_BLIND_LEVEL_INDEX);
    // Buy-in fields in Big Blinds (BB) for Cash games
    const [modalMinBuyInBB, setModalMinBuyInBB] = useState(20); // 20 BB default
    const [modalMaxBuyInBB, setModalMaxBuyInBB] = useState(100); // 100 BB default

    // Sit & Go settings — the chain requires them (ui#690: without them the SDK throws
    // "sit-and-go games require an sngConfig"). Same presets as /admin/tables.
    const [modalStartingStack, setModalStartingStack] = useState(1500);
    const [modalBlindLevelDuration, setModalBlindLevelDuration] = useState(10);
    // Tournament start (poker-vm#2680): starts at the start time with at least
    // modalSngMinPlayers registered, or earlier when full.
    const [modalScheduled, setModalScheduled] = useState(false);
    const [modalScheduledStart, setModalScheduledStart] = useState(""); // datetime-local value
    const [modalSngMinPlayers, setModalSngMinPlayers] = useState(2);
    const [modalLateRegLevels, setModalLateRegLevels] = useState(0); // poker-vm#2731; 0 = off
    const [modalSngBlindsIndex, setModalSngBlindsIndex] = useState(0); // 10 / 20
    // Blind structure (ui#860, poker-vm#1734): the ladder (default, ui#905) or
    // doubling (both from the two selects above and below), an engine preset, or
    // a custom structure in the SDK's text form.
    const [modalBlindStructureChoice, setModalBlindStructureChoice] = useState<BlindStructureChoice>("ladder");
    const [modalCustomBlindText, setModalCustomBlindText] = useState(DEFAULT_CUSTOM_BLIND_STRUCTURE_TEXT);
    const [entryFee, setEntryFee] = useState(0);
    const [enableRake, setEnableRake] = useState(false);
    const [rakeThreshold, setRakeThreshold] = useState(0);
    const [rakePercentage, setRakePercentage] = useState(5);
    const [rakeCap, setRakeCap] = useState(0.1);

    // Cash blinds are dollars (BLIND_LEVELS); Sit & Go blinds are chips (SNG_BLINDS).
    const isModalTournament = isTournamentFormat(modalGameFormat);
    // What the choice submits (structure) and previews; a structured table's
    // opening blinds and level time come from its level 0, not the selects.
    const blindPlan = useMemo(
        () =>
            resolveBlindStructureChoice(modalBlindStructureChoice, modalCustomBlindText, {
                smallBlind: SNG_BLINDS[modalSngBlindsIndex].smallBlind,
                bigBlind: SNG_BLINDS[modalSngBlindsIndex].bigBlind,
                durationMinutes: modalBlindLevelDuration
            }),
        [modalBlindStructureChoice, modalCustomBlindText, modalSngBlindsIndex, modalBlindLevelDuration]
    );
    const sngOpeningBlinds = useMemo(
        () => (blindPlan.preview ? openingBlindsOf(blindPlan.preview) : undefined),
        [blindPlan.preview]
    );
    const blindPreviewRows = useMemo(
        () => (blindPlan.preview ? previewBlindLevels(blindPlan.preview, SNG_PREVIEW_LEVEL_COUNT) : []),
        [blindPlan.preview]
    );
    const modalSmallBlind = useMemo(
        () => (isModalTournament ? (sngOpeningBlinds?.smallBlind ?? SNG_BLINDS[modalSngBlindsIndex].smallBlind) : BLIND_LEVELS[selectedBlindLevel].smallBlind),
        [isModalTournament, sngOpeningBlinds, modalSngBlindsIndex, selectedBlindLevel]
    );
    const modalBigBlind = useMemo(
        () => (isModalTournament ? (sngOpeningBlinds?.bigBlind ?? SNG_BLINDS[modalSngBlindsIndex].bigBlind) : BLIND_LEVELS[selectedBlindLevel].bigBlind),
        [isModalTournament, sngOpeningBlinds, modalSngBlindsIndex, selectedBlindLevel]
    );

    // Calculate actual buy-in values from BB using utility function
    const { minBuyIn: calculatedMinBuyIn, maxBuyIn: calculatedMaxBuyIn } = useMemo(
        () => calculateBuyIn({ minBuyInBB: modalMinBuyInBB, maxBuyInBB: modalMaxBuyInBB, bigBlind: modalBigBlind }),
        [modalMinBuyInBB, modalMaxBuyInBB, modalBigBlind]
    );

    // Cosmos wallet state and hooks
    const cosmosWallet = useCosmosWallet();
    const [showCosmosImportModal, setShowCosmosImportModal] = useState(false);
    const [showWalletGeneratedNotification, setShowWalletGeneratedNotification] = useState(false);
    const [showNewWalletModal, setShowNewWalletModal] = useState(false);
    const [newWalletSeedPhrase, setNewWalletSeedPhrase] = useState("");
    const [newWalletAddress, setNewWalletAddress] = useState("");
    const [isCreatingWallet, setIsCreatingWallet] = useState(false);
    const [seedPhraseCopied, setSeedPhraseCopied] = useState(false);

    const [cosmosSeedPhrase, setCosmosSeedPhrase] = useState("");
    const [cosmosImportError, setCosmosImportError] = useState("");

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
        if (passwordEnabled && checkAuthCookie()) {
            setIsAuthenticated(true);
        }
    }, [passwordEnabled]);

    // Function to handle creating a new game using Cosmos blockchain
    // Paid table name (poker-vm#337): live cost preview + validation. We normalize
    // to the chain's canonical form (trim + lowercase, ENS-style) so the preview,
    // fee, and submitted value all match what the chain validates/charges/stores.
    const normalizedTableName = useMemo(() => normalizeTableName(modalTableName), [modalTableName]);
    const tableNameError = useMemo(() => validateTableName(modalTableName), [modalTableName]);
    const tableNameFeeUsd = useMemo(() => microToUsdc(computeGameNameFee(normalizedTableName)), [normalizedTableName]);

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

            // Sit & Go: only when the player turns the card on. Tournament: always.
            const scheduled = isScheduledCreateType(modalGameType) || (isSitAndGoFormat(modalGameFormat) && modalScheduled);
            const startTime = scheduled ? localDateTimeToUnixSeconds(modalScheduledStart) : undefined;
            if (scheduled && startTime !== undefined) {
                const rejection = scheduledStartRejection(startTime, modalSngMinPlayers, modalPlayerCount);
                if (rejection) {
                    setCreateGameError(rejection);
                    return;
                }
            }

            // A custom blind structure must parse before anything is sent (ui#860).
            if (isTournament && blindPlan.error) {
                setCreateGameError(`Blind structure: ${blindPlan.error}`);
                return;
            }

            const gameOptions: CreateTableOptions = {
                format: modalGameFormat,
                variant: modalGameVariant,
                bettingLimit: modalBettingLimit,
                minBuyIn: isTournament ? modalSitAndGoBuyIn : calculatedMinBuyIn,
                maxBuyIn: isTournament ? modalSitAndGoBuyIn : calculatedMaxBuyIn,
                // Cash tables can start heads-up. A scheduled sit-and-go may start
                // short; an unscheduled one still requires every seat.
                minPlayers: modalGameFormat === GameFormat.CASH ? 2 : scheduled ? Math.min(modalPlayerCount, Math.max(2, modalSngMinPlayers)) : modalPlayerCount,
                maxPlayers: modalGameFormat === GameFormat.CASH ? modalMaxPlayers : modalPlayerCount,
                smallBlind: modalSmallBlind,
                bigBlind: modalBigBlind,
                name: normalizedTableName || undefined,
                ...(isTournament && {
                    sng: {
                        startingStack: modalStartingStack,
                        // A structure carries its own level times; the opening level's is sent for the lobby.
                        blindLevelDuration: sngOpeningBlinds?.durationMinutes ?? modalBlindLevelDuration,
                        entryFee,
                        ...(blindPlan.structure && { blindStructure: blindPlan.structure }),
                        ...(scheduled && { startTime }),
                        ...(scheduled && modalLateRegLevels > 0 && { lateRegistrationLevels: modalLateRegLevels })
                    }
                }),
                ...(modalGameFormat === GameFormat.CASH && enableRake && { rake: {
                    rakeFreeThreshold: rakeThreshold, rakePercentage, rakeCap, owner: cosmosWallet.address
                } })
            };

            // Use the createTable function from the hook (Cosmos SDK)
            const result = await createTable(gameOptions);

            if (result) {
                setShowCreateGameModal(false);
                setCreationReceipt(result);
                setTablesRevision(revision => revision + 1);
                setModalTableName("");
                // The chain just debited the creation (+ name) fee — show the real balance.
                void cosmosWallet.refreshBalance();
            }
        } catch (error) {
            console.error("Error creating game:", error);
            setCreateGameError(error instanceof Error ? error.message : "An unexpected error occurred");
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

    const gameWalletUsdc = useMemo(() => readUsdcBalance(cosmosWallet.balance), [cosmosWallet.balance]);
    const numericUsdcBalance = gameWalletUsdc.numeric;

    // Block table creation if the name is invalid, or the creator can't cover the
    // naming fee (the definite creation-time debit, poker-vm#337).
    const insufficientForName = tableNameFeeUsd > numericUsdcBalance;

    // Table creation fee = 10 big blinds (pokerchain#378, ui#690), priced from the
    // exact values handleCreateNewGame submits. null = the chain could not price it.
    const creationFeeMicro = useMemo(
        () =>
            computeTableCreationFeeMicro(
                modalGameFormat,
                modalSmallBlind,
                modalBigBlind,
                isModalTournament ? modalSitAndGoBuyIn : calculatedMinBuyIn,
                isModalTournament ? modalStartingStack : undefined
            ),
        [modalGameFormat, modalSmallBlind, modalBigBlind, isModalTournament, modalSitAndGoBuyIn, calculatedMinBuyIn, modalStartingStack]
    );
    const creationTotalMicro = creationFeeMicro === null ? null : creationFeeMicro + computeGameNameFee(normalizedTableName);
    const insufficientForCreation = creationTotalMicro === null || creationTotalMicro > usdcToMicroBigInt(numericUsdcBalance);
    const extraOptionsInvalid = isModalTournament
        ? !Number.isInteger(modalStartingStack) || modalStartingStack <= 0 || !Number.isFinite(entryFee) || entryFee < 0
        : enableRake && (![rakeThreshold, rakeCap, rakePercentage].every(Number.isFinite) || rakeThreshold < 0 || rakeCap < 0 || rakePercentage < 1 || rakePercentage > 10);
    const createDisabled =
        isCreatingTable || !!tableNameError || insufficientForName || insufficientForCreation || extraOptionsInvalid || (isModalTournament && !!blindPlan.error);

    // Auto-switch to Ethereum Mainnet when wallet connects
    useEffect(() => {
        const autoSwitchToEthereum = async () => {
            if (isConnected && chain?.id !== ETH_CHAIN_ID && switchChain) {
                try {
                    await switchChain.mutateAsync({ chainId: ETH_CHAIN_ID });
                } catch (err) {
                    // Don't show error to user - they can manually switch if needed
                }
            }
        };

        autoSwitchToEthereum();
    }, [isConnected, chain?.id, switchChain]);

    // Removed: handleImportModalClick - no longer needed (using Cosmos wallet)

    // Memoized game selection callbacks
    // Removed: Game selection button handlers - no longer needed

    return (
        <div className="dashboard-lobby min-h-screen flex flex-col justify-center items-center relative overflow-hidden">
            <div className="lobby-ambient" aria-hidden="true" />

            {/* Wallet Generated Notification */}
            {showWalletGeneratedNotification && (
                <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 animate-fade-in">
                    <div className={`px-6 py-4 rounded-xl shadow-2xl border flex items-center gap-4 ${styles.walletGeneratedNotice}`}>
                        <span className="text-2xl">🎉</span>
                        <div>
                            <p className="text-white font-bold">Block52 Wallet Created!</p>
                            <p className="text-white/80 text-sm">
                                Visit{" "}
                                <a href="/wallet" className="underline font-semibold hover:text-white">
                                    /wallet
                                </a>{" "}
                                to view your seed phrase and manage your wallet.
                            </p>
                        </div>
                        <button onClick={() => setShowWalletGeneratedNotification(false)} className="text-white/80 hover:text-white ml-2">
                            ✕
                        </button>
                    </div>
                </div>
            )}

            {/* Password Protection Modal */}
            {!isAuthenticated && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm">
                    <div className={`hodl-modal backdrop-blur-md p-8 rounded-xl w-96 shadow-2xl relative overflow-hidden ${styles.passwordModal}`}>
                        <div className="relative z-10">
                            <ModalHeader kicker="Welcome" title="Secure Access" subtitle="Enter password to access the Block52 demo" />

                            <div className="space-y-4">
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        placeholder="Enter password"
                                        value={passwordInput}
                                        onChange={e => setPasswordInput(e.target.value)}
                                        onKeyDown={handlePasswordKeyPress}
                                        className={`w-full p-3 rounded-lg backdrop-blur-sm text-white focus:outline-none transition-all duration-200 pr-12 ${styles.passwordInput}`}
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
                                    className={`w-full py-3 text-white rounded-lg transition duration-300 transform hover:scale-105 shadow-md font-semibold hodl-primary ${styles.passwordSubmitButton}`}
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
                                    <div className={`w-2 h-2 rounded-full animate-pulse ${styles.brandPrimaryDot}`}></div>
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
                    {/* Import B52 Wallet Seed Phrase Modal */}
                    {showCosmosImportModal && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm">
                            <div className={`hodl-modal p-6 rounded-xl w-[440px] shadow-2xl border ${styles.modalPanel}`}>
                                <ModalHeader title="Import B52 Wallet Seed Phrase" />
                                <div className={styles.modalTitleDivider} />
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
                                    <div className="flex flex-col space-y-3">
                                        <button
                                            onClick={handleImportCosmosSeed}
                                            disabled={cosmosWallet.isLoading}
                                            className={`w-full px-4 py-3 text-sm font-medium text-white rounded-lg transition duration-300 shadow-md hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed hodl-primary ${styles.brandPrimaryBg}`}
                                        >
                                            {cosmosWallet.isLoading ? "Importing..." : "Import"}
                                        </button>
                                        <button
                                            onClick={() => {
                                                setShowCosmosImportModal(false);
                                                setCosmosSeedPhrase("");
                                                setCosmosImportError("");
                                            }}
                                            className={`w-full px-4 py-3 text-sm font-medium text-white rounded-lg transition duration-300 hover:opacity-80 hodl-secondary ${styles.cancelBg}`}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Removed: Cosmos Update Seed Phrase Modal - now handled on /wallet page */}

                    {/* New B52 Wallet Created Modal - shows seed phrase */}
                    {showNewWalletModal && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm">
                            <div className={`hodl-modal p-6 rounded-xl w-[480px] shadow-2xl border ${styles.modalPanel}`}>
                                <ModalHeader title="New B52 Wallet Created" />
                                <div className={styles.modalTitleDivider} />
                                <p className="text-gray-400 text-sm mb-4">
                                    Write down your seed phrase and store it in a safe place. You will need it to recover your wallet.
                                </p>

                                {/* Warning */}
                                <div className={`p-3 rounded-lg mb-4 flex items-start gap-3 ${styles.dangerWarningBox}`}>
                                    <svg className={`w-5 h-5 flex-shrink-0 mt-0.5 ${styles.dangerText}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth="2"
                                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                        />
                                    </svg>
                                    <p className={`text-sm ${styles.dangerText}`}>
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

                                {/* Seed Phrase with inline copy icon */}
                                <div className="mb-6">
                                    <div className="flex items-center justify-between mb-1">
                                        <label className="block text-gray-400 text-sm">Seed Phrase (24 words)</label>
                                        <button
                                            onClick={handleCopySeedPhrase}
                                            className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-all hover:opacity-80 ${styles.copyIconBtn} ${seedPhraseCopied ? styles.copyIconBtnCopied : ""}`}
                                            title="Copy seed phrase"
                                        >
                                            {seedPhraseCopied ? (
                                                <>
                                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                                    </svg>
                                                    Copied!
                                                </>
                                            ) : (
                                                <>
                                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            strokeWidth="2"
                                                            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                                                        />
                                                    </svg>
                                                    Copy
                                                </>
                                            )}
                                        </button>
                                    </div>
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

                                {/* Actions */}
                                <div className="flex flex-col space-y-3">
                                    <label className="flex items-center gap-2 cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            checked={seedPhraseCopied}
                                            onChange={e => setSeedPhraseCopied(e.target.checked)}
                                            className="w-4 h-4 accent-blue-500"
                                        />
                                        <span className="text-gray-300 text-sm">I have written down my seed phrase and stored it safely</span>
                                    </label>
                                    <button
                                        onClick={handleConfirmNewWallet}
                                        disabled={!seedPhraseCopied}
                                        className={`w-full px-4 py-3 text-sm font-medium text-white rounded-lg transition duration-300 shadow-md hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed hodl-primary ${styles.brandPrimaryBg}`}
                                    >
                                        I've Saved My Seed Phrase
                                    </button>
                                    <button
                                        onClick={() => {
                                            setShowNewWalletModal(false);
                                            setNewWalletSeedPhrase("");
                                            setNewWalletAddress("");
                                            setSeedPhraseCopied(false);
                                        }}
                                        className={`w-full px-4 py-3 text-sm font-medium text-white rounded-lg transition duration-300 hover:opacity-80 hodl-secondary ${styles.cancelBg}`}
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Create New Game Modal */}
                    {showCreateGameModal && (
                        <CreationDialog
                            titleId="create-table-title"
                            onClose={() => {
                                setShowCreateGameModal(false);
                                setCreateGameError("");
                                setModalTableName("");
                            }}
                        >
                                <ModalHeader kicker="Your game, your table" titleId="create-table-title" title="Create a table." subtitle="Choose your setup. Invite your players." />
                                <div className="creation-form-grid">
                                    {/* Optional paid table name (poker-vm#337): $0.10/char, live preview */}
                                    <div className="creation-span">
                                        <label className="block text-white text-sm mb-1">
                                            Table Name <span className="text-gray-400">(optional)</span>
                                        </label>
                                        <input
                                            type="text"
                                            aria-label="Table name"
                                            value={modalTableName}
                                            onChange={e => setModalTableName(e.target.value)}
                                            placeholder="e.g. friday-degens"
                                            className="w-full p-2 rounded bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-200"
                                        />
                                        {tableNameError ? (
                                            <p className="text-xs text-red-400 mt-1">{tableNameError}</p>
                                        ) : normalizedTableName.length > 0 ? (
                                            <p className="text-xs text-gray-400 mt-1">
                                                {tableNameCharCount(normalizedTableName)} characters × $0.10 ={" "}
                                                <span className="text-white font-semibold">${formatUsd(tableNameFeeUsd)}</span>
                                                {/* Show the canonical form the chain stores when it differs from the raw input. */}
                                                {normalizedTableName !== modalTableName && (
                                                    <span className="text-gray-500"> — saved as “{normalizedTableName}”</span>
                                                )}
                                                {insufficientForName && (
                                                    <span className="text-red-400"> — exceeds your ${formatUsd(numericUsdcBalance)} balance</span>
                                                )}
                                            </p>
                                        ) : (
                                            <p className="text-xs text-gray-400 mt-1">
                                                Free if left blank. Lowercase a–z, 0–9 and hyphens; $0.10 per character.
                                            </p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-white text-sm mb-1">Game Type</label>
                                        <select
                                            aria-label="Game type"
                                            value={modalGameType}
                                            onChange={e => {
                                                const type = toCreateGameType(e.target.value);
                                                if (type) setModalGameType(type);
                                            }}
                                            className="w-full p-2 rounded bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-200"
                                            data-testid="create-game-type"
                                        >
                                            {CREATE_GAME_TYPES.map(type => (
                                                <option key={type} value={type}>
                                                    {createGameTypeLabel(type)}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Variant and betting limit (ui#768) */}
                                    <div>
                                            <label className="block text-white text-sm mb-1">Game</label>
                                            <select
                                                aria-label="Game"
                                                value={modalGameVariant}
                                                onChange={e => {
                                                    const variant = toGameVariant(e.target.value);
                                                    if (!variant) return;
                                                    setModalGameVariant(variant);
                                                    setModalBettingLimit(defaultBettingLimitFor(variant));
                                                }}
                                                className="w-full p-2 rounded bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-200"
                                            >
                                                <option value={GameVariant.TEXAS_HOLDEM}>Texas Hold&apos;em</option>
                                                <option value={GameVariant.OMAHA}>Omaha</option>
                                            </select>
                                        </div>
                                    <div>
                                            <label className="block text-white text-sm mb-1">Limit</label>
                                            <select
                                                value={modalBettingLimit}
                                                onChange={e => {
                                                    const limit = toCreatableBettingLimit(e.target.value, modalGameVariant);
                                                    if (limit) setModalBettingLimit(limit);
                                                }}
                                                data-testid="create-betting-limit"
                                                className="w-full p-2 rounded bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-200"
                                            >
                                                {creatableBettingLimits(modalGameVariant).map(limit => (
                                                    <option key={limit} value={limit}>
                                                        {bettingLimitLabel(limit)}
                                                    </option>
                                                ))}
                                            </select>
                                    </div>

                                        <div>
                                            <label htmlFor="lobby-max-players" className="block text-white text-sm mb-1">Max Players</label>
                                            <select
                                                id="lobby-max-players"
                                                value={modalGameFormat === GameFormat.CASH ? modalMaxPlayers : modalPlayerCount}
                                                onChange={e => {
                                                    const count = Number(e.target.value);
                                                    if (modalGameFormat === GameFormat.CASH) setModalMaxPlayers(count);
                                                    else setModalPlayerCount(count);
                                                }}
                                                className="w-full p-2 rounded bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-200"
                                            >
                                                {TABLE_SEAT_OPTIONS.map(option => (
                                                    <option key={option.value} value={option.value}>{option.label}</option>
                                                ))}
                                            </select>
                                        </div>

                                    {modalGameType === "sit-and-go" && (
                                        <div className="creation-span">
                                        <ScheduledStartCard checked={modalScheduled} onChange={setModalScheduled}>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-gray-300 text-xs mb-1">Starts at</label>
                                                    <input
                                                        type="datetime-local"
                                                        aria-label="Scheduled start time"
                                                        value={modalScheduledStart}
                                                        onChange={e => setModalScheduledStart(e.target.value)}
                                                        className="w-full p-2 rounded bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none text-sm"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-gray-300 text-xs mb-1">Minimum players</label>
                                                    <select
                                                        aria-label="Minimum players"
                                                        value={Math.min(modalSngMinPlayers, modalPlayerCount)}
                                                        onChange={e => setModalSngMinPlayers(Number(e.target.value))}
                                                        className="w-full p-2 rounded bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none text-sm"
                                                    >
                                                        {SNG_MIN_PLAYER_OPTIONS.filter(n => n <= modalPlayerCount).map(n => (
                                                            <option key={n} value={n}>
                                                                {n}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <p className="sm:col-span-2 text-gray-400 text-xs">
                                                    Starts when the table fills, or at the start time with at least the minimum. Cancelled with refunds if fewer have registered 15 minutes after the start time.
                                                </p>
                                            </div>
                                        </ScheduledStartCard>
                                        </div>
                                    )}

                                    {isScheduledCreateType(modalGameType) && (
                                        <div className="creation-span">
                                            <ScheduledStartCard locked checked onChange={() => undefined} testId="tournament-start">
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                    <div>
                                                        <label className="block text-gray-300 text-xs mb-1">Starts at</label>
                                                        <input
                                                            type="datetime-local"
                                                            aria-label="Scheduled start time"
                                                            value={modalScheduledStart}
                                                            onChange={e => setModalScheduledStart(e.target.value)}
                                                            className="w-full p-2 rounded bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none text-sm"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-gray-300 text-xs mb-1">Minimum players</label>
                                                        <select
                                                            aria-label="Minimum players"
                                                            value={Math.min(modalSngMinPlayers, modalPlayerCount)}
                                                            onChange={e => setModalSngMinPlayers(Number(e.target.value))}
                                                            className="w-full p-2 rounded bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none text-sm"
                                                        >
                                                            {SNG_MIN_PLAYER_OPTIONS.filter(n => n <= modalPlayerCount).map(n => (
                                                                <option key={n} value={n}>
                                                                    {n}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    <div className="sm:col-span-2">
                                                        <label className="block text-gray-300 text-xs mb-1">Late registration</label>
                                                        <select
                                                            data-testid="late-registration"
                                                            aria-label="Late registration"
                                                            value={modalLateRegLevels}
                                                            onChange={e => setModalLateRegLevels(Number(e.target.value))}
                                                            className="w-full p-2 rounded bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none text-sm"
                                                        >
                                                            {LATE_REGISTRATION_LEVEL_OPTIONS.map(n => (
                                                                <option key={n} value={n}>
                                                                    {lateRegistrationOptionLabel(n)}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    <p className="sm:col-span-2 text-gray-400 text-xs">
                                                        Starts when the table fills, or at the start time with at least the minimum. Cancelled with refunds if fewer have registered 15 minutes after the start time.
                                                        {modalLateRegLevels > 0 && " Late entrants take an empty seat with a full starting stack until the window closes or someone finishes in the money."}
                                                    </p>
                                                </div>
                                            </ScheduledStartCard>
                                        </div>
                                    )}

                                    {/* Show different fields based on game format */}
                                    {isTournamentFormat(modalGameFormat) ? (
                                        // For Sit & Go and Tournament: Single buy-in field
                                        <div className="creation-span">
                                            <div className="creation-field-pairs">
                                            <div>
                                            <label className="block text-white text-sm mb-1">Tournament Buy-In ($)</label>
                                            <input
                                                type="number"
                                                aria-label="Tournament buy-in"
                                                value={modalSitAndGoBuyIn}
                                                onChange={e => setModalSitAndGoBuyIn(Number(e.target.value))}
                                                min="10"
                                                max="10"
                                                className="w-full p-2 rounded bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-200"
                                            />
                                            <p className="text-xs text-gray-400 mt-1">All players pay the same buy in</p>
                                            </div>
                                            <div>
                                            <label className="block text-white text-sm mb-1" htmlFor="lobby-entry-fee">Entry Fee ($)</label>
                                            <input
                                                id="lobby-entry-fee"
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={entryFee}
                                                onChange={e => setEntryFee(Number(e.target.value))}
                                                placeholder="0"
                                            />
                                            <p className="text-xs text-gray-400 mt-1">Flat fee to the creator on top of the buy-in — 0 for none.</p>
                                            </div>
                                            <div className="creation-span">
                                            <label className="block text-white text-sm mb-1">Starting Stack (chips)</label>
                                            <div className="creation-preset-row" role="group" aria-label="Starting stack">
                                                {STACK_PRESETS.map(preset => (
                                                    <button
                                                        key={preset.value}
                                                        type="button"
                                                        onClick={() => setModalStartingStack(preset.value)}
                                                        className={modalStartingStack === preset.value ? "creation-preset-active" : "creation-preset"}
                                                    >
                                                        {preset.label}
                                                    </button>
                                                ))}
                                            </div>
                                            <div className="creation-custom-field">
                                                <label htmlFor="lobby-custom-stack">Custom stack (chips)</label>
                                                <input
                                                    id="lobby-custom-stack"
                                                    type="number"
                                                    min="1"
                                                    step="1"
                                                    value={modalStartingStack}
                                                    onChange={e => setModalStartingStack(Number(e.target.value))}
                                                    placeholder="e.g. 1500"
                                                />
                                            </div>
                                            </div>
                                            <div className="creation-span">
                                            <label className="block text-white text-sm mb-1">Blind Structure</label>
                                            <select
                                                data-testid="blind-structure"
                                                value={modalBlindStructureChoice}
                                                onChange={e => {
                                                    if (isBlindStructureChoice(e.target.value)) setModalBlindStructureChoice(e.target.value);
                                                }}
                                                className="w-full p-2 rounded bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-200"
                                            >
                                                {BLIND_STRUCTURE_CHOICES.map(c => (
                                                    <option key={c.value} value={c.value}>
                                                        {c.label}
                                                    </option>
                                                ))}
                                            </select>
                                            </div>
                                            {(modalBlindStructureChoice === "ladder" || modalBlindStructureChoice === "doubling") && (
                                                <>
                                            <div className="creation-span" data-testid="sng-blinds">
                                            <label className="block text-white text-sm mb-1">Starting Blinds (chips)</label>
                                            <div className="creation-preset-row" role="group" aria-label="Starting blinds">
                                                {SNG_BLINDS.map((b, i) => (
                                                    <button
                                                        key={b.bigBlind}
                                                        type="button"
                                                        onClick={() => setModalSngBlindsIndex(i)}
                                                        className={modalSngBlindsIndex === i ? "creation-preset-active" : "creation-preset"}
                                                    >
                                                        {b.smallBlind} / {b.bigBlind}
                                                    </button>
                                                ))}
                                            </div>
                                            </div>
                                            <div className="creation-span" data-testid="sng-level-duration">
                                            <label className="block text-white text-sm mb-1">Blind Level Duration</label>
                                            <div className="creation-preset-row" role="group" aria-label="Blind level duration">
                                                {DURATION_PRESETS.map(preset => (
                                                    <button
                                                        key={preset.value}
                                                        type="button"
                                                        onClick={() => setModalBlindLevelDuration(preset.value)}
                                                        className={modalBlindLevelDuration === preset.value ? "creation-preset-active" : "creation-preset"}
                                                    >
                                                        {preset.label}
                                                    </button>
                                                ))}
                                            </div>
                                            </div>
                                                </>
                                            )}
                                            {modalBlindStructureChoice === "custom" && (
                                                <div className="creation-span">
                                                    <label className="block text-white text-sm mb-1">Custom structure</label>
                                                    <textarea
                                                        data-testid="blind-custom"
                                                        value={modalCustomBlindText}
                                                        onChange={e => setModalCustomBlindText(e.target.value)}
                                                        rows={8}
                                                        spellCheck={false}
                                                        className="w-full p-2 rounded bg-gray-700 text-white font-mono text-xs border border-gray-600 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-200"
                                                    />
                                                    <p className="text-xs text-gray-400 mt-1">
                                                        start: sb/bb · duration: 5m · progression: double | linear 25 | percentage 1.5 (+ round: 25) · ante: bb | bb * 0.1 |
                                                        level &gt;= 4 ? bb * 0.1 : 0 · cap: 15 — or levels {"{"} 0: 100/200 … {"}"} (levels count from 0)
                                                    </p>
                                                    {blindPlan.error && (
                                                        <p className="text-xs text-red-400 mt-1" data-testid="blind-structure-error">
                                                            {blindPlan.error}
                                                        </p>
                                                    )}
                                                </div>
                                            )}
                                            {blindPreviewRows.length > 0 && (
                                                <div className="creation-span mt-3 max-h-40 overflow-y-auto rounded border border-gray-700" data-testid="blind-preview">
                                                    <table className="w-full text-xs text-gray-300">
                                                        <thead className="text-gray-400 sticky top-0 bg-gray-800">
                                                            <tr>
                                                                <th className="text-left px-2 py-1">Level</th>
                                                                <th className="text-left px-2 py-1">Blinds</th>
                                                                <th className="text-left px-2 py-1">Ante</th>
                                                                <th className="text-left px-2 py-1">Minutes</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {blindPreviewRows.map(r => (
                                                                <tr key={r.number} className="border-t border-gray-700">
                                                                    <td className="px-2 py-1">{r.number}</td>
                                                                    <td className="px-2 py-1">
                                                                        {r.isBreak ? "Break" : `${Number(r.smallBlind).toLocaleString()} / ${Number(r.bigBlind).toLocaleString()}`}
                                                                    </td>
                                                                    <td className="px-2 py-1">{r.isBreak || r.ante === "0" ? "—" : Number(r.ante).toLocaleString()}</td>
                                                                    <td className="px-2 py-1">{r.durationMinutes}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                            </div>
                                        </div>
                                    ) : (
                                        // For Cash games: Blind level and buy-in in Big Blinds (BB)
                                        <>
                                            {/* Blind Level Dropdown - Cash games only */}
                                            <div>
                                                <label className="block text-white text-sm mb-1">Game Size (Small Blind / Big Blind)</label>
                                                <select
                                                    aria-label="Starting blinds"
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
                                            <div className="creation-span">
                                                <label className="block text-white text-sm mb-2">Buy-In Presets</label>
                                                <div className="flex gap-2 flex-wrap">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setModalMinBuyInBB(20);
                                                            setModalMaxBuyInBB(100);
                                                        }}
                                                        className={`px-3 py-1 text-xs rounded transition-all duration-200 ${
                                                            modalMinBuyInBB === 20 && modalMaxBuyInBB === 100 ? "creation-preset-active" : "creation-preset"
                                                        }`}
                                                    >
                                                        Standard (20-100 BB)
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setModalMinBuyInBB(40);
                                                            setModalMaxBuyInBB(200);
                                                        }}
                                                        className={`px-3 py-1 text-xs rounded transition-all duration-200 ${
                                                            modalMinBuyInBB === 40 && modalMaxBuyInBB === 200 ? "creation-preset-active" : "creation-preset"
                                                        }`}
                                                    >
                                                        Deep (40-200 BB)
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setModalMinBuyInBB(100);
                                                            setModalMaxBuyInBB(300);
                                                        }}
                                                        className={`px-3 py-1 text-xs rounded transition-all duration-200 ${
                                                            modalMinBuyInBB === 100 && modalMaxBuyInBB === 300 ? "creation-preset-active" : "creation-preset"
                                                        }`}
                                                    >
                                                        Deep Stack (100-300 BB)
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Buy-in inputs in BB */}
                                            <div className="creation-span flex gap-4">
                                                <div className="flex-1">
                                                    <label className="block text-white text-sm mb-1">Minimum Buy-In (BB)</label>
                                                    <input
                                                        type="number"
                                                        aria-label="Minimum buy-in"
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
                                                        aria-label="Maximum buy-in"
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
                                                <div className="creation-preview creation-span">
                                                    <p className="text-xs text-gray-400 mb-1">Calculated Buy-In Range:</p>
                                                    <p className="text-sm text-green-400">
                                                        ${formatUsd(calculatedMinBuyIn)} - ${formatUsd(calculatedMaxBuyIn)}
                                                    </p>
                                                    <p className="text-xs text-gray-500 mt-1">Based on ${formatUsd(modalBigBlind)} BB</p>
                                                </div>
                                            )}
                                        </>
                                    )}

                                    {modalGameFormat === GameFormat.CASH && <div className="creation-span">
                                        <label><input type="checkbox" checked={enableRake} onChange={e => setEnableRake(e.target.checked)} /> Enable Rake Collection</label>
                                        {enableRake && <div className="space-y-3 mt-3">
                                            <label className="block">Rake-Free Threshold (USDC)<input aria-label="Rake-free threshold" type="number" min="0" step="0.01" value={rakeThreshold} onChange={e => setRakeThreshold(Number(e.target.value))} /></label>
                                            <label className="block">Rake Percentage (%)<select aria-label="Rake percentage" value={rakePercentage} onChange={e => setRakePercentage(Number(e.target.value))}>{[1,2,3,4,5,6,7,8,9,10].map(n => <option key={n} value={n}>{n}%</option>)}</select></label>
                                            <label className="block">Rake Cap (USDC)<input aria-label="Rake cap" type="number" min="0" step="0.01" value={rakeCap} onChange={e => setRakeCap(Number(e.target.value))} /></label>
                                            <label className="block">Rake Owner Address<input aria-label="Rake owner" readOnly value={cosmosWallet.address ?? ""} /></label>
                                        </div>}
                                    </div>}
                                    <div className="creation-fee creation-span">
                                        <span className="text-gray-400">Table Creation Fee ({CREATION_FEE_BIG_BLINDS.toString()} big blinds)</span>
                                        <span className="text-white font-mono">
                                            {creationFeeMicro === null ? "—" : `$${formatMicroUsd(creationFeeMicro.toString())}`}
                                        </span>
                                    </div>
                                    {insufficientForCreation && creationTotalMicro !== null && (
                                        <p className="creation-notice creation-span">
                                            You need ${formatMicroUsd(creationTotalMicro.toString())} to create this table (fee
                                            {normalizedTableName.length > 0 ? " + name" : ""}); your balance is ${formatUsd(numericUsdcBalance)}.
                                        </p>
                                    )}

                                    {extraOptionsInvalid && <p className="creation-span" role="alert">Enter a positive whole-number starting stack and valid non-negative fee/rake amounts.</p>}
                                    {createGameError && <p className="creation-span text-red-500 text-sm">{createGameError}</p>}
                                    {createTableError && <p className="creation-span text-red-500 text-sm">{createTableError.message}</p>}

                                    <div className="creation-span flex justify-end space-x-3">
                                        <button
                                            onClick={() => {
                                                setShowCreateGameModal(false);
                                                setCreateGameError("");
                                                setModalTableName("");
                                            }}
                                            className="creation-secondary"
                                        >
                                            Cancel
                                        </button>
                                        <button onClick={handleCreateNewGame} disabled={createDisabled} className="creation-primary">
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
                                                "Create table"
                                            )}
                                        </button>
                                    </div>
                                </div>
                        </CreationDialog>
                    )}

                    {/* Two-column layout: Wallet (fixed width) on left, Tables (flex) on right */}
                    <div className="dashboard-content w-full mx-auto z-10">
                        <div className="lobby-layout">
                            {/* Left column: Wallet and Transactions (fixed width) */}
                            <aside className="lobby-wallet">
                                <WalletPanel
                                    onCreateWallet={handleCreateNewWallet}
                                    onImportWallet={() => setShowCosmosImportModal(true)}
                                    onRefresh={cosmosWallet.refreshBalance}
                                    usdcBalance={gameWalletUsdc.formatted}
                                    numericUsdcBalance={gameWalletUsdc.numeric}
                                    sendTokens={cosmosWallet.sendTokens}
                                    cosmosWalletAddress={cosmosWallet.address}
                                />
                                <details className="lobby-transactions">
                                    <summary>
                                        Recent activity <span>↗</span>
                                    </summary>
                                    <TransactionPanel cosmosWalletAddress={cosmosWallet.address} usdcBalance={gameWalletUsdc.formatted} />
                                </details>
                                <div className="lobby-tip">
                                    <span>MAKE YOURSELF AT HOME</span>
                                    <p>New to the table?</p>
                                    <small>Open any game to watch. When you’re ready, choose an open seat and your buy-in.</small>
                                    <a href="https://texashodl.net/" target="_blank" rel="noopener noreferrer">
                                        Explore Texas HODL ↗
                                    </a>
                                </div>
                            </aside>

                            {/* Right column: Table List (takes remaining space) */}
                            <main className="lobby-games">
                                <TableCreatedModal receipt={creationReceipt} onClose={closeCreationReceipt} />
                                <TableList
                                    refreshKey={tablesRevision}
                                    onCreateTable={() => {
                                        setCreateGameError("");
                                        setShowCreateGameModal(true);
                                    }}
                                />
                                {/* Powered by Block52 — shown below table on small/mid screens */}
                                <div className="flex lg:hidden items-center justify-center opacity-30 py-4">
                                    <div className="flex flex-col items-center gap-1">
                                        <span className="text-xs text-white font-medium tracking-wide">POWERED BY</span>
                                        <img src="/block52.png" alt="Block52 Logo" className="h-5 w-auto object-contain" />
                                    </div>
                                </div>
                            </main>
                        </div>
                    </div>

                    {/* Reset blockchain button was here, now commented out by user */}

                    {/* Powered by Block52 — fixed on large screens only */}
                    <div className="hidden lg:flex fixed bottom-4 left-4 items-center z-10 opacity-30">
                        <div className="flex flex-col items-start bg-transparent px-3 py-2 rounded-lg backdrop-blur-sm border-0">
                            <div className="text-left mb-1">
                                <span className="text-xs text-white font-medium tracking-wide">POWERED BY</span>
                            </div>
                            <img src="/block52.png" alt="Block52 Logo" className="h-6 w-auto object-contain interaction-none" />
                        </div>
                    </div>

                    {/* Welcome modal: lists the next scheduled Sit & Go tournaments once per browser */}
                    <UpcomingSngModal />
                </>
            )}
        </div>
    );
};

export default Dashboard;
