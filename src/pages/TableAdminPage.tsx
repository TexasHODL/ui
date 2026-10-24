import { formatUsd, formatMicroUsd } from "../utils/moneyDisplay";
import "../components/common/TableCreation.css";
import { ScheduledStartCard } from "../components/common/ScheduledStartCard";
import { PageHeading } from "../components/common/PageHeading";
import { useState, useEffect, useMemo, useRef } from "react";
import { localDateTimeToUnixSeconds, scheduledStartRejection } from "../utils/scheduledSng";
import { BettingLimit, GameFormat, GameVariant, CosmosClient, getDefaultCosmosConfig, PlayerDTO, computeGameNameFee } from "@block52/poker-vm-sdk";
import { Link, useNavigate } from "react-router-dom";
import useCosmosWallet from "../hooks/wallet/useCosmosWallet";
import { isValidPlayerAddress } from "../utils/addressUtils";
import { isEmpty } from "../utils/guards";
import { useNewTable } from "../hooks/game/useNewTable";
import { useFindGames } from "../hooks/game/useFindGames";
import { toast } from "react-toastify";
import TableCreatedModal from "../components/modals/TableCreatedModal";
import { microToUsdc } from "../constants/currency";
import { validateTableName, normalizeTableName, tableNameCharCount } from "../utils/tableName";
import { AnimatedBackground } from "../components/common/AnimatedBackground";
import TableList from "../components/TableList";
import { calculateBuyIn, BUY_IN_PRESETS } from "../utils/buyInUtils";
import { sortTablesByAvailableSeats } from "../utils/tableSortingUtils";
import { BLIND_LEVELS, DEFAULT_BLIND_LEVEL_INDEX } from "../constants/blindLevels";
import { bettingLimitLabel, creatableBettingLimits, defaultBettingLimitFor, isSitAndGoFormat, isTournamentFormat, getGameFormat, toCreatableBettingLimit, toGameVariant } from "../utils/gameFormatUtils";
import { CREATE_GAME_TYPES, createGameTypeFormat, createGameTypeLabel, isScheduledCreateType, toCreateGameType, type CreateGameType } from "../utils/createGameType";
import { computeTableCreationFeeMicro, CREATION_FEE_BIG_BLINDS } from "../utils/tableCreationFee";
import { TABLE_SEAT_OPTIONS, VALID_SNG_RUNNER_COUNTS } from "../utils/sngAdvancedParams";

interface TableData {
    gameId: string;
    gameFormat: string;
    minPlayers: number;
    maxPlayers: number;
    currentPlayers: number;
    minBuyIn: string;
    maxBuyIn: string;
    smallBlind: string;
    bigBlind: string;
    timeout?: number;
    status: string;
    creator?: string;
    createdAt?: string;
}

export default function TableAdminPage() {
    const navigate = useNavigate();
    const cosmosWallet = useCosmosWallet();
    const { createTable, isCreating, error: createError } = useNewTable();
    const { games: fetchedGames, isLoading, error: gamesError, refetch } = useFindGames();

    // Default table settings for Cash Game, 9 players, Texas Hold'em
    const [gameType, setGameType] = useState<CreateGameType>("cash");
    const gameFormat = createGameTypeFormat(gameType);
    const [tableName, setTableName] = useState(""); // Optional paid table name (poker-vm#337)
    // Variant and betting limit are independent (ui#768); picking a variant
    // resets the limit to that variant's usual one (PLO, NLHE).
    const [gameVariant, setGameVariant] = useState<GameVariant>(GameVariant.TEXAS_HOLDEM);
    const [bettingLimit, setBettingLimit] = useState<BettingLimit>(defaultBettingLimitFor(GameVariant.TEXAS_HOLDEM));
    const [minPlayers] = useState(2);
    const [maxPlayers, setMaxPlayers] = useState(9);
    // Scheduled start (poker-vm#2680): the sit-and-go starts when full OR at
    // the start time with at least sngMinPlayers registered. Off = starts only
    // when full, as before.
    const [scheduled, setScheduled] = useState(false);
    const [scheduledStart, setScheduledStart] = useState(""); // datetime-local value
    const [sngMinPlayers, setSngMinPlayers] = useState(2);

    // Selected blind level (index in BLIND_LEVELS array) — cash games only
    const [selectedBlindLevel, setSelectedBlindLevel] = useState(DEFAULT_BLIND_LEVEL_INDEX);

    // SNG/Tournament blind values (in chips, not dollars)
    const [sngSmallBlind, setSngSmallBlind] = useState(25);
    const [sngBigBlind, setSngBigBlind] = useState(50);

    // Get effective blind values based on game format
    const smallBlind = useMemo(() => {
        if (isTournamentFormat(gameFormat)) {
            return sngSmallBlind.toString();
        }
        return BLIND_LEVELS[selectedBlindLevel].smallBlind.toString();
    }, [gameFormat, sngSmallBlind, selectedBlindLevel]);

    const bigBlind = useMemo(() => {
        if (isTournamentFormat(gameFormat)) {
            return sngBigBlind.toString();
        }
        return BLIND_LEVELS[selectedBlindLevel].bigBlind.toString();
    }, [gameFormat, sngBigBlind, selectedBlindLevel]);

    const handleGameFormatChange = (newType: CreateGameType) => {
        setGameType(newType);
        // A single table seats 2..9 (every field has a payout curve, poker-vm#2667).
        if (isTournamentFormat(createGameTypeFormat(newType))) {
            const validSngCounts: readonly number[] = VALID_SNG_RUNNER_COUNTS;
            if (!validSngCounts.includes(maxPlayers)) {
                const next = validSngCounts.reduce((a, b) => (Math.abs(b - maxPlayers) < Math.abs(a - maxPlayers) ? b : a));
                setMaxPlayers(next);
            }
        }
    };
    // Buy-in in Big Blinds (BB) for Cash games
    const [minBuyInBB, setMinBuyInBB] = useState(20);
    const [maxBuyInBB, setMaxBuyInBB] = useState(100);
    // For tournaments: single buy-in amount
    const [tournamentBuyIn, setTournamentBuyIn] = useState("10");
    // SNG/Tournament specific settings
    const [startingStack, setStartingStack] = useState(1500);
    const [blindLevelDuration, setBlindLevelDuration] = useState(10);
    // Flat entry fee in USDC dollars (2dp), skimmed to the creator on top of the
    // buy-in. "0" = no fee. (poker-vm#2118)
    const [entryFee, setEntryFee] = useState("0");
    const [showStructure, setShowStructure] = useState(false);

    // Calculate actual buy-in values from BB
    const { minBuyIn: calculatedMinBuyIn, maxBuyIn: calculatedMaxBuyIn } = useMemo(
        () => calculateBuyIn({ minBuyInBB, maxBuyInBB, bigBlind: parseFloat(bigBlind) || 0 }),
        [minBuyInBB, maxBuyInBB, bigBlind]
    );

    // Rake settings (optional)
    const [enableRake, setEnableRake] = useState(false);
    const [rakeFreeThreshold, setRakeFreeThreshold] = useState("0");
    const [rakePercentage, setRakePercentage] = useState("5");
    const [rakeCap, setRakeCap] = useState("0.10");
    const [rakeOwner, setRakeOwner] = useState("");

    // Success modal state
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [successTxHash, setSuccessTxHash] = useState<string | null>(null);
    const [createdGameAddress, setCreatedGameAddress] = useState<string | null>(null);
    const [tableCountBeforeCreation, setTableCountBeforeCreation] = useState<number>(0);

    // Player counts from game state
    const [playerCounts, setPlayerCounts] = useState<Record<string, number>>({});
    const [cosmosClient] = useState(() => new CosmosClient(getDefaultCosmosConfig()));

    // Get USDC balance from wallet
    const usdcBalance = useMemo(() => {
        const balance = cosmosWallet.balance.find(b => b.denom === "usdc");
        return balance ? parseInt(balance.amount) : 0;
    }, [cosmosWallet.balance]);

    const usdcBalanceFormatted = formatMicroUsd(usdcBalance);

    // Paid table name (poker-vm#337): normalize to the chain's canonical form so the
    // preview, fee, validation and submitted value all match the chain.
    const normalizedTableName = useMemo(() => normalizeTableName(tableName), [tableName]);
    const tableNameError = useMemo(() => validateTableName(tableName), [tableName]);
    const tableNameFeeUsd = useMemo(() => microToUsdc(computeGameNameFee(normalizedTableName)), [normalizedTableName]);

    // Table creation fee = 10 big blinds (pokerchain#378, ui#690), priced from the
    // exact values handleCreateTable submits. null = the chain could not price it.
    const creationFeeMicro = useMemo(
        () =>
            computeTableCreationFeeMicro(
                gameFormat,
                parseFloat(smallBlind),
                parseFloat(bigBlind),
                isTournamentFormat(gameFormat) ? parseFloat(tournamentBuyIn) : calculatedMinBuyIn,
                isTournamentFormat(gameFormat) ? startingStack : undefined
            ),
        [gameFormat, smallBlind, bigBlind, tournamentBuyIn, calculatedMinBuyIn, startingStack]
    );
    const creationFeeFormatted = creationFeeMicro === null ? "—" : formatMicroUsd(creationFeeMicro.toString());
    const totalCostMicro = creationFeeMicro === null ? null : creationFeeMicro + computeGameNameFee(normalizedTableName);
    const totalCostFormatted = totalCostMicro === null ? "—" : formatMicroUsd(totalCostMicro.toString());
    // Enough for the creation fee AND any name fee — the chain debits both.
    const hasEnoughUsdc = totalCostMicro !== null && BigInt(usdcBalance) >= totalCostMicro;
    const insufficientForName = totalCostMicro !== null && normalizedTableName.length > 0 && BigInt(usdcBalance) < totalCostMicro;

    // Transform fetched games to TableData format - memoized to prevent infinite loops
    const tables: TableData[] = useMemo(() => {
        const mappedTables = fetchedGames.map(game => ({
            gameId: game.gameId,
            gameFormat: getGameFormat(game.gameFormat),
            minPlayers: game.minPlayers,
            maxPlayers: game.maxPlayers,
            currentPlayers: game.currentPlayers,
            minBuyIn: game.minBuyIn,
            maxBuyIn: game.maxBuyIn,
            smallBlind: game.smallBlind,
            bigBlind: game.bigBlind,
            timeout: game.timeout,
            status: game.status,
            creator: game.creator,
            createdAt: game.createdAt
        }));

        // Sort by available seats (least empty seats first, full tables last)
        return sortTablesByAvailableSeats(mappedTables);
    }, [fetchedGames]);

    // Create a new table using the useNewTable hook
    const handleCreateTable = async () => {
        if (!cosmosWallet.address) {
            toast.error("No Block52 wallet found. Please create or import a wallet first.");
            return;
        }

        // Build rake config if enabled
        const rakeConfig = enableRake
            ? {
                  rakeFreeThreshold: parseFloat(rakeFreeThreshold),
                  rakePercentage: parseFloat(rakePercentage),
                  rakeCap: parseFloat(rakeCap),
                  owner: rakeOwner || cosmosWallet.address || ""
              }
            : undefined;

        // For tournaments, use fixed buy-in; for cash games, use BB-calculated values
        const isTournament = isTournamentFormat(gameFormat);
        const finalMinBuyIn = isTournament ? parseFloat(tournamentBuyIn) : calculatedMinBuyIn;
        const finalMaxBuyIn = isTournament ? parseFloat(tournamentBuyIn) : calculatedMaxBuyIn;

        const isScheduled = isScheduledCreateType(gameType) || (isSitAndGoFormat(gameFormat) && scheduled);
        const startTime = isScheduled ? localDateTimeToUnixSeconds(scheduledStart) : undefined;
        if (isScheduled && startTime !== undefined) {
            const rejection = scheduledStartRejection(startTime, sngMinPlayers, maxPlayers);
            if (rejection) {
                toast.error(rejection);
                return;
            }
        }

        // Build SNG config if this is a tournament/SNG
        const sngConfig = isTournament
            ? {
                  startingStack,
                  blindLevelDuration,
                  entryFee: parseFloat(entryFee) || 0,
                  ...(isScheduled && { startTime })
              }
            : undefined;

        // Store the table count before creating to verify a new table was added
        setTableCountBeforeCreation(tables.length);

        try {
            // A sit-and-go's field is fixed (min == max) unless it is scheduled,
            // when it may start with fewer (poker-vm#2680).
            const finalMinPlayers = isTournament ? (isScheduled ? Math.min(maxPlayers, Math.max(2, sngMinPlayers)) : maxPlayers) : minPlayers;

            const result = await createTable({
                format: gameFormat,
                variant: gameVariant,
                bettingLimit,
                minBuyIn: finalMinBuyIn,
                maxBuyIn: finalMaxBuyIn,
                minPlayers: finalMinPlayers,
                maxPlayers,
                smallBlind: parseFloat(smallBlind),
                bigBlind: parseFloat(bigBlind),
                name: normalizedTableName || undefined,
                ...(rakeConfig && { rake: rakeConfig }),
                ...(sngConfig && { sng: sngConfig })
            });

            if (result) {
                // Show success modal with transaction link
                setSuccessTxHash(result.txHash);
                // Set the game address immediately if we got it from the transaction
                setCreatedGameAddress(result.gameId);
                setShowSuccessModal(true);
                setTableName("");
                // The chain just debited the creation (+ name) fee — show the real balance.
                void cosmosWallet.refreshBalance();

                // Wait a moment then reload tables
                setTimeout(() => {
                    refetch();
                }, 2000);
            } else {
                toast.error("Table creation failed - no transaction hash returned");
            }
        } catch (err: unknown) {
            console.error("❌ Failed to create table:", err);
            const error = err instanceof Error ? err : new Error("Unknown error");
            console.error("Error details:", {
                message: error.message,
                stack: error.stack,
                name: error.name
            });
            toast.error(`Failed to create table: ${error.message}`);
        }
    };

    // Fetch player counts for all tables - only runs once when tables are first loaded
    // Use a ref to track table IDs to prevent duplicate requests
    const tableIdsRef = useRef<string>("");

    useEffect(() => {
        // Create a stable key from table IDs to detect actual changes
        const currentTableIds = tables.map(t => t.gameId).join(",");

        // Only fetch if tables changed (not just reference equality)
        if (isEmpty(tables) || currentTableIds === tableIdsRef.current) {
            return;
        }

        tableIdsRef.current = currentTableIds;

        const fetchPlayerCounts = async () => {
            const counts: Record<string, number> = {};

            for (const table of tables) {
                try {
                    const gameStateResponse = await cosmosClient.getGameState(table.gameId);
                    if (gameStateResponse && gameStateResponse.game_state) {
                        const gameState = JSON.parse(gameStateResponse.game_state);
                        // Count players with valid addresses (seated players)
                        // Filter out empty seats using the utility function
                        const seatedPlayers = gameState.players?.filter((p: PlayerDTO | null) => p !== null && isValidPlayerAddress(p.address)).length || 0;
                        counts[table.gameId] = seatedPlayers;
                    }
                } catch (err) {
                    console.error(`Failed to fetch game state for ${table.gameId}:`, err);
                    // If we can't fetch game state, default to 0
                    counts[table.gameId] = 0;
                }
            }

            setPlayerCounts(counts);
        };

        fetchPlayerCounts();
    }, [tables, cosmosClient]);

    // Show error toast if createError or gamesError changes
    useEffect(() => {
        if (createError) {
            toast.error(createError.message);
        }
        if (gamesError) {
            toast.error(`Failed to load games: ${gamesError.message}`);
        }
    }, [createError, gamesError]);

    // Note: createdGameAddress is now set directly from the transaction response
    // when creating a table, so we no longer need to guess from the sorted tables list

    // Stats
    const totalTables = tables.length;
    const activeTables = tables.filter(t => t.status === "playing" || t.status === "waiting").length;
    const sitAndGoTables = tables.filter(t => t.maxPlayers <= 6).length;

    return (
        <div className="site-page">
            <AnimatedBackground />
            <div className="site-page-content">
                {/* Header */}
                <PageHeading title="Tables" description="Find a game, open a table, or create a place for your next hand." eyebrow="FIND YOUR GAME" />

                {/* Create Table Form */}
                <details className="page-panel page-create-table">
                    <summary>
                        Create a new table
                    </summary>
                    <div className="table-creation creation-layout">
                        <section className="creation-fields" aria-label="Table settings">
                            <div className="creation-section-heading">
                                <span>01 / SET UP</span>
                                <h2>Make it your table.</h2>
                                <p>Choose the game, seats and stakes.</p>
                            </div>
                            {/* Optional paid table name (poker-vm#337): $0.10/char, live preview */}
                            <div className="mb-4">
                                <label className="text-gray-300 text-xs mb-1 block">
                                    Table Name <span className="text-gray-500">(optional)</span>                                </label>
                                <input
                                    type="text"
                                    aria-label="Table name"
                                    value={tableName}
                                    onChange={e => setTableName(e.target.value)}
                                    placeholder="e.g. friday-degens"
                                    className="w-full px-3 py-2 bg-[#0c0911] border border-white/20 rounded-lg text-white text-sm"
                                />
                                {tableNameError ? (
                                    <p className="text-xs text-red-400 mt-1">{tableNameError}</p>
                                ) : normalizedTableName.length > 0 ? (
                                    <p className="text-xs text-gray-400 mt-1">
                                        {tableNameCharCount(normalizedTableName)} characters × $0.10 ={" "}
                                        <span className="text-white font-semibold">${formatUsd(tableNameFeeUsd)}</span>
                                        {normalizedTableName !== tableName && <span className="text-gray-500"> — saved as “{normalizedTableName}”</span>}
                                        {insufficientForName && <span className="text-red-400"> — exceeds your ${usdcBalanceFormatted} balance</span>}
                                    </p>
                                ) : (
                                    <p className="text-xs text-gray-500 mt-1">Free if left blank. Lowercase a–z, 0–9 and hyphens; $0.10 per character.</p>
                                )}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label className="text-gray-300 text-xs mb-1 block">Game Type</label>
                                    <select
                                        aria-label="Game type"
                                        data-testid="create-game-type"
                                        value={gameType}
                                        onChange={e => {
                                            const type = toCreateGameType(e.target.value);
                                            if (type) handleGameFormatChange(type);
                                        }}
                                        className="w-full px-3 py-2 bg-[#0c0911] border border-white/20 rounded-lg text-white text-sm"
                                    >
                                        {CREATE_GAME_TYPES.map(type => (
                                            <option key={type} value={type}>
                                                {createGameTypeLabel(type)}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-gray-300 text-xs mb-1 block">Game</label>
                                    <select
                                        aria-label="Game"
                                        value={gameVariant}
                                        onChange={e => {
                                            const variant = toGameVariant(e.target.value);
                                            if (!variant) return;
                                            setGameVariant(variant);
                                            setBettingLimit(defaultBettingLimitFor(variant));
                                        }}
                                        className="w-full px-3 py-2 bg-[#0c0911] border border-white/20 rounded-lg text-white text-sm"
                                    >
                                        <option value={GameVariant.TEXAS_HOLDEM}>Texas Hold&apos;em</option>
                                        <option value={GameVariant.OMAHA}>Omaha</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-gray-300 text-xs mb-1 block">Limit</label>
                                    <select
                                        aria-label="Betting limit"
                                        value={bettingLimit}
                                        onChange={e => {
                                            const limit = toCreatableBettingLimit(e.target.value, gameVariant);
                                            if (limit) setBettingLimit(limit);
                                        }}
                                        className="w-full px-3 py-2 bg-[#0c0911] border border-white/20 rounded-lg text-white text-sm"
                                    >
                                        {creatableBettingLimits(gameVariant).map(limit => (
                                            <option key={limit} value={limit}>
                                                {bettingLimitLabel(limit)}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-gray-300 text-xs mb-1 block">Max Players</label>
                                    <select
                                        aria-label="Number of players"
                                        value={maxPlayers}
                                        onChange={e => setMaxPlayers(parseInt(e.target.value))}
                                        className="w-full px-3 py-2 bg-[#0c0911] border border-white/20 rounded-lg text-white text-sm"
                                    >
                                        {TABLE_SEAT_OPTIONS.map(option => (
                                            <option key={option.value} value={option.value}>{option.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {gameType === "sit-and-go" && (
                                <div className="mb-4">
                                    <ScheduledStartCard checked={scheduled} onChange={setScheduled}>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-gray-300 text-xs mb-1 block">Start time</label>
                                                <input
                                                    type="datetime-local"
                                                    aria-label="Scheduled start time"
                                                    value={scheduledStart}
                                                    onChange={e => setScheduledStart(e.target.value)}
                                                    className="w-full px-3 py-2 bg-[#0c0911] border border-white/20 rounded-lg text-white text-sm"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-gray-300 text-xs mb-1 block">Minimum players</label>
                                                <select
                                                    aria-label="Minimum players"
                                                    value={Math.min(sngMinPlayers, maxPlayers)}
                                                    onChange={e => setSngMinPlayers(parseInt(e.target.value))}
                                                    className="w-full px-3 py-2 bg-[#0c0911] border border-white/20 rounded-lg text-white text-sm"
                                                >
                                                    {Array.from({ length: Math.max(0, maxPlayers - 1) }, (_, i) => i + 2).map(n => (
                                                        <option key={n} value={n}>
                                                            {n}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <p className="sm:col-span-2 text-gray-500 text-xs">
                                                Starts when the table fills, or at the start time with at least the minimum. Cancelled with refunds if fewer have registered 15 minutes after the start time.
                                            </p>
                                        </div>
                                    </ScheduledStartCard>
                                </div>
                            )}

                            {isScheduledCreateType(gameType) && (
                                <div className="mb-4">
                                    <ScheduledStartCard locked checked onChange={() => undefined} testId="tournament-start">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-gray-300 text-xs mb-1 block">Start time</label>
                                                <input
                                                    type="datetime-local"
                                                    aria-label="Scheduled start time"
                                                    value={scheduledStart}
                                                    onChange={e => setScheduledStart(e.target.value)}
                                                    className="w-full px-3 py-2 bg-[#0c0911] border border-white/20 rounded-lg text-white text-sm"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-gray-300 text-xs mb-1 block">Minimum players</label>
                                                <select
                                                    aria-label="Minimum players"
                                                    value={Math.min(sngMinPlayers, maxPlayers)}
                                                    onChange={e => setSngMinPlayers(parseInt(e.target.value))}
                                                    className="w-full px-3 py-2 bg-[#0c0911] border border-white/20 rounded-lg text-white text-sm"
                                                >
                                                    {Array.from({ length: Math.max(0, maxPlayers - 1) }, (_, i) => i + 2).map(n => (
                                                        <option key={n} value={n}>
                                                            {n}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <p className="sm:col-span-2 text-gray-500 text-xs">
                                                Starts when the table fills, or at the start time with at least the minimum. Cancelled with refunds if fewer have registered 15 minutes after the start time.
                                            </p>
                                        </div>
                                    </ScheduledStartCard>
                                </div>
                            )}

                            {/* Blinds Dropdown - Cash games only */}
                            {gameFormat === GameFormat.CASH && (
                                <div className="mb-3">
                                    <label className="text-gray-300 text-xs mb-1 block">Game Size (Small Blind / Big Blind)</label>
                                    <select
                                        aria-label="Starting blinds"
                                        value={selectedBlindLevel}
                                        onChange={e => setSelectedBlindLevel(Number(e.target.value))}
                                        className="w-full px-3 py-2 bg-[#0c0911] border border-white/20 rounded-lg text-white text-sm"
                                    >
                                        {BLIND_LEVELS.map((level, index) => (
                                            <option key={index} value={index}>
                                                {level.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* Buy-In Section */}
                            <div className="mb-4">
                                {isTournamentFormat(gameFormat) ? (
                                    <div className="creation-tournament-fields">
                                        {/* Buy In */}
                                        <div>
                                            <label className="text-gray-300 text-xs mb-1 block">Buy In ($)</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                aria-label="Tournament buy-in"
                                                value={tournamentBuyIn}
                                                onChange={e => setTournamentBuyIn(e.target.value)}
                                                className="w-full px-3 py-2 bg-[#0c0911] border border-white/20 rounded-lg text-white text-sm"
                                                placeholder="e.g., 10.00"
                                            />
                                            <p className="text-gray-500 text-xs mt-1">All players pay the same buy in</p>
                                        </div>

                                        {/* Entry Fee */}
                                        <div>
                                            <label className="text-gray-300 text-xs mb-1 block">Entry Fee ($)</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                aria-label="Entry fee"
                                                value={entryFee}
                                                onChange={e => setEntryFee(e.target.value)}
                                                className="w-full px-3 py-2 bg-[#0c0911] border border-white/20 rounded-lg text-white text-sm"
                                                placeholder="e.g., 0.50"
                                            />
                                            <p className="text-gray-500 text-xs mt-1">Flat fee to the creator on top of the buy in — 0 for none</p>
                                        </div>

                                        {/* Starting Stack */}
                                        <div>
                                            <label className="text-gray-300 text-xs mb-2 block">Starting Stack (chips)</label>
                                            <div className="flex gap-2 flex-wrap">
                                                <button
                                                    type="button"
                                                    onClick={() => setStartingStack(1000)}
                                                    className={`px-3 py-1.5 text-xs rounded transition-all duration-200 ${
                                                        startingStack === 1000 ? "creation-preset-active" : "creation-preset"
                                                    }`}
                                                >
                                                    Turbo (1000)
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setStartingStack(1500)}
                                                    className={`px-3 py-1.5 text-xs rounded transition-all duration-200 ${
                                                        startingStack === 1500 ? "creation-preset-active" : "creation-preset"
                                                    }`}
                                                >
                                                    Standard (1500)
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setStartingStack(3000)}
                                                    className={`px-3 py-1.5 text-xs rounded transition-all duration-200 ${
                                                        startingStack === 3000 ? "creation-preset-active" : "creation-preset"
                                                    }`}
                                                >
                                                    Deep Stack (3000)
                                                </button>
                                            </div>
                                            <div className="creation-custom-field">
                                                <label htmlFor="admin-custom-stack">Custom stack (chips)</label>
                                                <input
                                                    id="admin-custom-stack"
                                                    type="number"
                                                    min="100"
                                                    step="100"
                                                    value={startingStack}
                                                    onChange={e => setStartingStack(Number(e.target.value))}
                                                    placeholder="e.g. 1500"
                                                    className="w-full px-3 py-2 bg-[#0c0911] border border-white/20 rounded-lg text-white text-sm"
                                                />
                                            </div>
                                        </div>

                                        {/* Starting Blinds (chips) */}
                                        <div>
                                            <label className="text-gray-300 text-xs mb-2 block">Starting Blinds (chips)</label>
                                            <div className="flex gap-2 flex-wrap mb-2">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setSngSmallBlind(10);
                                                        setSngBigBlind(20);
                                                    }}
                                                    className={`px-3 py-1.5 text-xs rounded transition-all duration-200 ${
                                                        sngSmallBlind === 10 && sngBigBlind === 20 ? "creation-preset-active" : "creation-preset"
                                                    }`}
                                                >
                                                    10 / 20
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setSngSmallBlind(25);
                                                        setSngBigBlind(50);
                                                    }}
                                                    className={`px-3 py-1.5 text-xs rounded transition-all duration-200 ${
                                                        sngSmallBlind === 25 && sngBigBlind === 50 ? "creation-preset-active" : "creation-preset"
                                                    }`}
                                                >
                                                    25 / 50
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setSngSmallBlind(50);
                                                        setSngBigBlind(100);
                                                    }}
                                                    className={`px-3 py-1.5 text-xs rounded transition-all duration-200 ${
                                                        sngSmallBlind === 50 && sngBigBlind === 100 ? "creation-preset-active" : "creation-preset"
                                                    }`}
                                                >
                                                    50 / 100
                                                </button>
                                            </div>
                                        </div>

                                        {/* Blind Level Duration */}
                                        <div>
                                            <label className="text-gray-300 text-xs mb-2 block">Blind Level Duration</label>
                                            <div className="flex gap-2 flex-wrap mb-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setBlindLevelDuration(3)}
                                                    className={`px-3 py-1.5 text-xs rounded transition-all duration-200 ${
                                                        blindLevelDuration === 3 ? "creation-preset-active" : "creation-preset"
                                                    }`}
                                                >
                                                    Hyper (3 min)
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setBlindLevelDuration(5)}
                                                    className={`px-3 py-1.5 text-xs rounded transition-all duration-200 ${
                                                        blindLevelDuration === 5 ? "creation-preset-active" : "creation-preset"
                                                    }`}
                                                >
                                                    Turbo (5 min)
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setBlindLevelDuration(10)}
                                                    className={`px-3 py-1.5 text-xs rounded transition-all duration-200 ${
                                                        blindLevelDuration === 10 ? "creation-preset-active" : "creation-preset"
                                                    }`}
                                                >
                                                    Standard (10 min)
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setBlindLevelDuration(15)}
                                                    className={`px-3 py-1.5 text-xs rounded transition-all duration-200 ${
                                                        blindLevelDuration === 15 ? "creation-preset-active" : "creation-preset"
                                                    }`}
                                                >
                                                    Deep (15 min)
                                                </button>
                                            </div>
                                        </div>

                                        {/* SNG Settings Summary */}
                                        <div className="bg-[#0c0911] rounded-lg p-3 border border-white/10">
                                            <p className="text-gray-400 text-xs mb-1">SNG Settings:</p>
                                            <p className="text-green-400 text-sm font-medium">
                                                {startingStack} chips • Blinds increase every {blindLevelDuration} min
                                            </p>
                                            <p className="text-gray-500 text-xs mt-1">
                                                Starting blinds: {sngSmallBlind} / {sngBigBlind} chips
                                            </p>
                                        </div>

                                    </div>
                                ) : (
                                    <>
                                        {/* Buy-In Presets */}
                                        <label className="text-gray-300 text-xs mb-2 block">Buy-In Presets</label>
                                        <div className="flex gap-2 flex-wrap mb-3">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setMinBuyInBB(BUY_IN_PRESETS.STANDARD.minBuyInBB);
                                                    setMaxBuyInBB(BUY_IN_PRESETS.STANDARD.maxBuyInBB);
                                                }}
                                                className={`px-3 py-1.5 text-xs rounded transition-all duration-200 ${
                                                    minBuyInBB === 20 && maxBuyInBB === 100 ? "creation-preset-active" : "creation-preset"
                                                }`}
                                            >
                                                Standard (20-100 BB)
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setMinBuyInBB(BUY_IN_PRESETS.DEEP.minBuyInBB);
                                                    setMaxBuyInBB(BUY_IN_PRESETS.DEEP.maxBuyInBB);
                                                }}
                                                className={`px-3 py-1.5 text-xs rounded transition-all duration-200 ${
                                                    minBuyInBB === 40 && maxBuyInBB === 200 ? "creation-preset-active" : "creation-preset"
                                                }`}
                                            >
                                                Deep (40-200 BB)
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setMinBuyInBB(BUY_IN_PRESETS.DEEP_STACK.minBuyInBB);
                                                    setMaxBuyInBB(BUY_IN_PRESETS.DEEP_STACK.maxBuyInBB);
                                                }}
                                                className={`px-3 py-1.5 text-xs rounded transition-all duration-200 ${
                                                    minBuyInBB === 100 && maxBuyInBB === 300 ? "creation-preset-active" : "creation-preset"
                                                }`}
                                            >
                                                Deep Stack (100-300 BB)
                                            </button>
                                        </div>

                                        {/* Buy-In BB Inputs */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                                            <div>
                                                <label className="text-gray-300 text-xs mb-1 block">Min Buy-In (BB)</label>
                                                <input
                                                    type="number"
                                                    min="20"
                                                    max="500"
                                                    aria-label="Minimum buy-in"
                                                    value={minBuyInBB}
                                                    onChange={e => setMinBuyInBB(Number(e.target.value))}
                                                    className="w-full px-3 py-2 bg-[#0c0911] border border-white/20 rounded-lg text-white text-sm"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-gray-300 text-xs mb-1 block">Max Buy-In (BB)</label>
                                                <input
                                                    type="number"
                                                    min="20"
                                                    max="500"
                                                    aria-label="Maximum buy-in"
                                                    value={maxBuyInBB}
                                                    onChange={e => setMaxBuyInBB(Number(e.target.value))}
                                                    className="w-full px-3 py-2 bg-[#0c0911] border border-white/20 rounded-lg text-white text-sm"
                                                />
                                            </div>
                                        </div>

                                        {/* Calculated Preview */}
                                        {parseFloat(bigBlind) > 0 && (
                                            <div className="bg-[#0c0911] rounded-lg p-3 border border-white/10">
                                                <p className="text-gray-400 text-xs mb-1">Calculated Buy-In Range:</p>
                                                <p className="text-green-400 text-sm font-medium">
                                                    ${formatUsd(calculatedMinBuyIn)} - ${formatUsd(calculatedMaxBuyIn)}
                                                </p>
                                                <p className="text-gray-500 text-xs mt-1">Based on ${formatUsd(bigBlind)} BB</p>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>

                            {/* Show Structure Section - Only for SNG/Tournament */}
                            {isTournamentFormat(gameFormat) && (
                                <div className="mb-4">
                                    <div className="flex items-center gap-2 mb-3">
                                        <input
                                            type="checkbox"
                                            id="showStructure"
                                            checked={showStructure}
                                            onChange={e => setShowStructure(e.target.checked)}
                                            className="w-4 h-4 text-blue-600 bg-[#21172b] border-white/20 rounded focus:ring-blue-500"
                                        />
                                        <label htmlFor="showStructure" className="text-gray-300 text-sm font-medium">
                                            Show Blind Structure
                                        </label>
                                    </div>

                                    {showStructure && (
                                        <div className="bg-[#0c0911] rounded-lg p-4 border border-white/10">
                                            <table className="w-full text-sm">
                                                <thead>
                                                    <tr className="text-gray-400 border-b border-white/10">
                                                        <th className="text-left py-2 px-2">Level</th>
                                                        <th className="text-left py-2 px-2">Small Blind</th>
                                                        <th className="text-left py-2 px-2">Big Blind</th>
                                                        <th className="text-left py-2 px-2">Duration</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="text-gray-300">
                                                    {Array.from({ length: 10 }, (_, i) => {
                                                        const sb = parseInt(smallBlind) || 25;
                                                        const bb = parseInt(bigBlind) || 50;
                                                        const levelSB = sb * Math.pow(2, i);
                                                        const levelBB = bb * Math.pow(2, i);
                                                        return (
                                                            <tr key={i} className={i === 0 ? "bg-green-900/20" : ""}>
                                                                <td className="py-2 px-2">{i + 1}</td>
                                                                <td className="py-2 px-2">{levelSB.toLocaleString()}</td>
                                                                <td className="py-2 px-2">{levelBB.toLocaleString()}</td>
                                                                <td className="py-2 px-2">{blindLevelDuration} min</td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                            <p className="text-gray-500 text-xs mt-3">* Blinds double each level. Level 1 is highlighted.</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Rake Configuration Section - Only for Cash Games */}
                            <div className="mb-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <input
                                        type="checkbox"
                                        id="enableRake"
                                        checked={enableRake && gameFormat === GameFormat.CASH}
                                        onChange={e => setEnableRake(e.target.checked)}
                                        disabled={gameFormat !== GameFormat.CASH}
                                        className="w-4 h-4 text-blue-600 bg-[#21172b] border-white/20 rounded focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                    />
                                    <label
                                        htmlFor="enableRake"
                                        className={`text-sm font-medium ${gameFormat === GameFormat.CASH ? "text-gray-300" : "text-gray-500"}`}
                                    >
                                        Enable Rake Collection {gameFormat !== GameFormat.CASH && "(Cash games only)"}
                                    </label>
                                </div>

                                {enableRake && gameFormat === GameFormat.CASH && (
                                    <div className="bg-[#0c0911] rounded-lg p-4 border border-white/10">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                                            <div>
                                                <label className="text-gray-300 text-xs mb-1 block">Rake-Free Threshold (USDC)</label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    aria-label="Rake-free threshold"
                                                    value={rakeFreeThreshold}
                                                    onChange={e => setRakeFreeThreshold(e.target.value)}
                                                    className="w-full px-3 py-2 bg-[#0c0911] border border-white/20 rounded-lg text-white text-sm"
                                                    placeholder="0 = rake all pots"
                                                />
                                                <p className="text-gray-500 text-xs mt-1">Pots below this amount are rake-free</p>
                                            </div>
                                            <div>
                                                <label className="text-gray-300 text-xs mb-1 block">Rake Percentage (%)</label>
                                                <select
                                                    value={rakePercentage}
                                                    onChange={e => setRakePercentage(e.target.value)}
                                                    className="w-full px-3 py-2 bg-[#0c0911] border border-white/20 rounded-lg text-white text-sm"
                                                >
                                                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                                                        <option key={n} value={String(n)}>
                                                            {n}%
                                                        </option>
                                                    ))}
                                                </select>
                                                <p className="text-gray-500 text-xs mt-1">Typically 2% - 5%</p>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="text-gray-300 text-xs mb-1 block">Rake Cap (USDC)</label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    aria-label="Rake cap"
                                                    value={rakeCap}
                                                    onChange={e => setRakeCap(e.target.value)}
                                                    className="w-full px-3 py-2 bg-[#0c0911] border border-white/20 rounded-lg text-white text-sm"
                                                    placeholder="e.g., 0.10"
                                                />
                                                <p className="text-gray-500 text-xs mt-1">Maximum rake per hand</p>
                                            </div>
                                            <div>
                                                <label className="text-gray-300 text-xs mb-1 block">Rake Owner Address</label>
                                                <input
                                                    type="text"
                                                    aria-label="Rake owner"
                                                    value={rakeOwner}
                                                    readOnly
                                                    placeholder={cosmosWallet.address || "b52..."}
                                                    className="w-full px-3 py-2 bg-[#0c0911] border border-white/20 rounded-lg text-white text-sm font-mono cursor-not-allowed opacity-70"
                                                />
                                                <p className="text-gray-500 text-xs mt-1">Defaults to your address</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </section>
                        <aside className="creation-review" aria-label="Creation cost">
                            <div className="creation-section-heading">
                                <span>02 / REVIEW</span>
                                <h2>Ready when you are.</h2>
                                <p>Check the cost before creating your table.</p>
                            </div>
                            <div className="creation-balance">
                                <span>Available balance</span>
                                <strong>{cosmosWallet.address ? `$${usdcBalanceFormatted} USDC` : "No game wallet"}</strong>
                            </div>
                            {/* Creation Fee Info */}
                            <div className="creation-fee">
                                <div className="flex items-center justify-between">
                                    <span className="text-gray-400 text-sm">Table Creation Fee ({CREATION_FEE_BIG_BLINDS.toString()} big blinds):</span>
                                    <span className="text-white font-mono text-sm">{creationFeeFormatted} USDC</span>
                                </div>
                            </div>

                            <div className="creation-total">
                                <span>Total to create</span>
                                <strong>{totalCostFormatted} USDC</strong>
                            </div>
                            {/* Insufficient USDC Warning */}
                            {cosmosWallet.address && !hasEnoughUsdc && (
                                <div className="creation-notice" role="status">
                                    <div className="flex items-start gap-3">
                                        <svg className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth="2"
                                                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                            />
                                        </svg>
                                        <div>
                                            <p className="text-red-300 font-semibold mb-1">Add funds to create this table</p>
                                            <p className="text-red-400/80 text-sm mb-3">
                                                You need {totalCostFormatted} USDC to create this table ({CREATION_FEE_BIG_BLINDS.toString()} big blinds
                                                {normalizedTableName.length > 0 ? " plus the name fee" : ""}). Your current balance is ${usdcBalanceFormatted}{" "}
                                                USDC.
                                            </p>
                                            <Link
                                                to="/"
                                                className="inline-flex items-center gap-2 px-4 py-2 bg-[#7135a4] hover:bg-[#8645ba] text-white text-sm font-semibold rounded-lg transition-colors"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m0-16l-4 4m4-4l4 4" />
                                                </svg>
                                                Go to wallet in lobby
                                            </Link>
                                            <p className="text-gray-500 text-xs mt-2">Use the deposit option in your lobby wallet.</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="flex gap-3">
                                <button
                                    onClick={handleCreateTable}
                                    disabled={isCreating || !cosmosWallet.address || !hasEnoughUsdc || !!tableNameError || insufficientForName}
                                    className="creation-primary flex-1"
                                >
                                    {isCreating ? "Creating..." : !hasEnoughUsdc ? "Insufficient USDC" : tableNameError ? "Invalid table name" : "Create Table"}
                                </button>
                                <button onClick={refetch} disabled={isLoading} className="creation-secondary" title="Refresh tables">
                                    <svg className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth="2"
                                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                                        />
                                    </svg>
                                </button>
                            </div>

                            {!cosmosWallet.address && <p className="mt-2 text-yellow-400 text-xs">Set up your game wallet to create tables</p>}
                            {cosmosWallet.address && hasEnoughUsdc && <p className="mt-2 text-green-400 text-xs">✓ You have enough USDC to create a table</p>}

                            <p className="creation-footnote">Creating a table uses the connected network and incurs the fee shown above.</p>
                        </aside>
                    </div>
                </details>

                {/* Tables List */}
                <TableList compact refreshKey={successTxHash || 0} />

                <p className="creation-footnote">
                    Choose a table to watch, then take a seat when you’re ready. Want your own game? Open “Create a new table” above.
                </p>
            </div>

            <TableCreatedModal
                receipt={showSuccessModal && successTxHash ? { txHash: successTxHash, gameId: createdGameAddress } : null}
                onClose={() => { setShowSuccessModal(false); setSuccessTxHash(null); setCreatedGameAddress(null); }}
            />

            {/* Powered by Block52 */}
            <div className="page-footer">
                <div className="flex flex-col items-start bg-transparent px-3 py-2 rounded-lg backdrop-blur-sm border-0">
                    <div className="text-left mb-1">
                        <span className="text-xs text-white font-medium tracking-wide  ">POWERED BY</span>
                    </div>
                    <img src="/block52.png" alt="Block52 Logo" className="h-6 w-auto object-contain pointer-events-none" />
                </div>
            </div>
        </div>
    );
}
