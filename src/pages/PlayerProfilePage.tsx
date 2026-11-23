import { formatMicroUsd } from "@block52/poker-ui-core/utils/moneyDisplay";
import { useState, useEffect, useMemo, useCallback } from "react";
import { Link, useParams, useNavigate, useSearchParams } from "react-router-dom";

import { truncateMiddle } from "@block52/poker-ui-core/utils/stringUtils";
import { AnimatedBackground } from "../components/common/AnimatedBackground";
import CosmosWalletPage from "../components/CosmosWalletPage";
import PlayerAwardsPage from "./PlayerAwardsPage";
import { ExplorerHeader } from "../components/explorer/ExplorerHeader";
import { isEmpty, hasElements, hasValue, hasContent } from "@block52/ui-sdk/helpers";
import { Pagination } from "../components/common";
import { MyHandsPanel } from "../components/players/MyHandsPanel";
import { ProfileHub } from "../components/players/ProfileHub";
import { ProfileActivityPanel } from "../components/players/ProfileActivityPanel";
import { ProfileIdentity } from "../components/players/ProfileIdentity";
import { SessionHistoryFilter } from "../components/players/SessionHistoryFilter";
import { PlayingStyleTip } from "../components/players/PlayingStyleTip";
import { useHandContributions, usePlayingStyle } from "../hooks/player/useHandContributions";
import { useAddressUsdcBalance } from "../hooks/player/useAddressUsdcBalance";
import { usePlayerProfile } from "../hooks/player/usePlayerProfile";
import { useMyHandHistory } from "../hooks/player/useMyHandHistory";
import { useRecoveredHands } from "../hooks/player/useRecoveredHands";
import { useCosmosWallet } from "../hooks/wallet/useCosmosWallet";
import { NETWORK_PRESETS, useNetwork } from "../context/NetworkContext";
import { useCosmosApi } from "../context/CosmosApiContext";
import { getCosmosAddress } from "../utils/cosmos/storage";
import { PROFILE_TAB_PARAM, viewerAddress, visibleProfileTab } from "../utils/profileHub";
import { useAllPlayerSessions } from "../hooks/player/usePlayerSessions";
import { usePlayerPrizeClaims } from "../hooks/player/usePlayerPrizeClaims";
import { usePlayerTournamentEntries } from "../hooks/player/usePlayerTournamentEntries";
import { useVisibleRefresh } from "../hooks/useVisibleRefresh";
import { useSessionEliminationBlocks } from "../hooks/player/useSessionEliminationBlocks";
import { useSessionGameMeta } from "../hooks/player/useSessionGameMeta";
import { sessionRowsWithPrizes } from "../utils/playerPrizeClaims";
import { profileMoneyWithAllVariants } from "../utils/profileStatsMoney";
import {
    mergeTournamentSessionRows,
    sessionMetasWithTournamentEntries,
    tableGameIdsOf,
    tournamentFinishPlaceLabel,
    withTournamentHandLeaveBlocks
} from "../utils/playerTournamentEntries";
import { mergeHistoryHands } from "../utils/handHistoryCards";
import { endedHandsFromTxSearch } from "../utils/handHistoryRecover";
import { handEndedTableQuery, historyNetworks } from "../utils/handReplay";
import {
    defaultSessionVariant,
    filterSessionRows,
    sessionRowExpandDetail,
    sessionGameFilterOptions,
    sessionLabelsByGameId,
    sessionPrizePlaceLabel,
    uniqueGameIds
} from "../utils/sessionGameDisplay";
import { sessionCashOutAmountClass, sessionPrizeAmountRowClass, sessionPrizeCashOutClass } from "../utils/sessionCashOut";
import { eliminationLookupsFor, sessionBustFor, sessionLeaveBlock } from "../utils/sessionBust";
import { handContributionNote, profitHandsToMeasure, type HandContributionTarget } from "../utils/handContribution";
import { formatProfileWalletBalance } from "../utils/addressUsdcBalance";
import { formatHandsPlayed, handsPlayedReadFailed } from "../utils/handsPlayed";
import { profileHistoryHandsPending, profileStyleCardsPending } from "../utils/profileStatsLoading";
import { formatPlayingStyle, PLAYING_STYLE_FIGURES, playingStyleHands, playingStyleNote } from "../utils/playingStyle";
import {
    formatHistoryAmount,
    formatHistoryBlocks,
    handBelongsToSettledSession,
    handsForHistory,
    historyMoneyUnits,
    historyNetClass,
    openSessionTotalsNote,
    profileHistoryStats,
    sessionSpansForHistory,
    sessionStateRetentionNote,
    settledSessionCashOut,
    variantMoneyFromRows,
    withHandContributions
} from "../utils/profileHistoryStats";
import styles from "./explorer/AllAccountsPage.module.css";

const SESSIONS_PAGE_SIZE = 20;
const NO_PROFIT_HANDS: HandContributionTarget[] = [];
// Eight volume cards: two full rows of four from the md breakpoint, two per row below it.
const VOLUME_STAT_CARD = "w-[calc(50%-0.5rem)] shrink-0 md:w-[calc(25%-0.75rem)]";

const formatUsd = (micro: number): string => {
    const label = formatMicroUsd(micro, true);
    return label.startsWith("-") ? `-${label.slice(1)}` : `${label}`;
};

const StatCard: React.FC<{ label: string; value: string; valueClass?: string; className?: string }> = ({
    label,
    value,
    valueClass = "text-white",
    className = ""
}) => (
    <div className={`backdrop-blur-md p-5 rounded-xl shadow-2xl ${styles.containerCard} ${className}`}>
        <p className="text-gray-400 text-sm mb-1">{label}</p>
        <p className={`text-2xl font-bold ${valueClass}`}>{value}</p>
    </div>
);

export default function PlayerProfilePage() {
    const { address } = useParams<{ address: string }>();
    const navigate = useNavigate();
    const [sessionsPage, setSessionsPage] = useState(1);

    const [gameFilter, setGameFilter] = useState("");
    const [openSessionKey, setOpenSessionKey] = useState<string | null>(null);

    const { profile, loading, error, refetch: refetchProfile } = usePlayerProfile(address);
    const { sessions, loading: sessionsLoading, refetch: refetchSessions } = useAllPlayerSessions(address);
    // Chain prize claims. Empty on failure, so the cards and rows stay on the indexer.
    const { claims, loading: prizesLoading, refetch: refetchClaims } = usePlayerPrizeClaims(address);
    // MTT entry never joins a table, so the indexer has no session for it.
    const {
        entries: tournamentEntries,
        registrations: tournamentRegistrations,
        unregistrations: tournamentUnregistrations,
        loading: tournamentsLoading,
        refetch: refetchTournaments
    } = usePlayerTournamentEntries(address);
    const { address: walletAddress } = useCosmosWallet();
    const { currentNetwork } = useNetwork();
    const cosmosApi = useCosmosApi();
    const [searchParams] = useSearchParams();
    const tab = visibleProfileTab(viewerAddress(walletAddress, getCosmosAddress()), address, searchParams.get(PROFILE_TAB_PARAM));
    // Same Cosmos client as the table-header USDC balance, for the address being viewed. Stats only.
    const walletBalance = useAddressUsdcBalance(tab === "stats" ? address : undefined);
    const identityAddress = hasValue(profile) && hasContent(profile.player_address) ? profile.player_address : address;
    // Same hand list as My Hands. Loaded on Stats only, so the hands tab does not fetch it twice.
    const handHistory = useMyHandHistory(tab === "stats" && hasContent(address) ? address : null, `${currentNetwork.name}|${currentNetwork.rest}`, 1000);
    const extraGameIds = useMemo(() => [...new Set(tournamentEntries.flatMap(tableGameIdsOf))], [tournamentEntries]);
    const historyNodes = useMemo(() => historyNetworks(currentNetwork, NETWORK_PRESETS), [currentNetwork]);
    const endedHands = useCallback(
        async (gameId: string) => {
            try {
                return endedHandsFromTxSearch(await cosmosApi.getAllTransactionsMatching(handEndedTableQuery(gameId)), gameId);
            } catch (err) {
                console.error("Failed to list tournament hand_ended events:", err);
                return [];
            }
        },
        [cosmosApi]
    );
    const recovered = useRecoveredHands(
        tab === "stats" && hasContent(address) ? address : null,
        handHistory.hands,
        handHistory.complete && !hasContent(handHistory.error),
        historyNodes,
        { extraGameIds, endedHands }
    );
    const listedHands = useMemo(
        () => mergeHistoryHands(hasContent(handHistory.error) ? [] : handHistory.hands, recovered.hands),
        [handHistory.error, handHistory.hands, recovered.hands]
    );
    const gameIds = useMemo(
        () =>
            uniqueGameIds([
                ...sessions.map(session => session.game_id),
                ...listedHands.map(hand => hand.game_id),
                ...tournamentEntries.map(entry => entry.gameId),
                ...extraGameIds
            ]),
        [sessions, listedHands, tournamentEntries, extraGameIds]
    );
    const { byId: fetchedGames, loading: gamesLoading } = useSessionGameMeta(gameIds);
    const gamesById = useMemo(
        () => sessionMetasWithTournamentEntries(fetchedGames, tournamentEntries, listedHands),
        [fetchedGames, tournamentEntries, listedHands]
    );
    const rows = useMemo(
        () => mergeTournamentSessionRows(sessionRowsWithPrizes(sessions, claims), tournamentEntries, listedHands, address),
        [sessions, claims, tournamentEntries, listedHands, address]
    );
    const gameLabels = useMemo(() => sessionLabelsByGameId(gamesById), [gamesById]);
    const gameFilterOptions = useMemo(() => sessionGameFilterOptions(Object.values(gameLabels)), [gameLabels]);
    const defaultVariant = useMemo(() => defaultSessionVariant(rows, gameLabels), [rows, gameLabels]);
    const filteredRows = useMemo(() => filterSessionRows(rows, gameLabels, gameFilter), [rows, gameLabels, gameFilter]);
    const pageRows = useMemo(() => {
        const start = (sessionsPage - 1) * SESSIONS_PAGE_SIZE;
        return filteredRows.slice(start, start + SESSIONS_PAGE_SIZE);
    }, [filteredRows, sessionsPage]);
    // Every filtered bust, not only the visible page, so the longest session does not depend on which page is open.
    const eliminationLookups = useMemo(() => eliminationLookupsFor(filteredRows, rows, gamesById, address), [filteredRows, rows, gamesById, address]);
    const chainLeaveBlocks = useSessionEliminationBlocks(address, eliminationLookups);
    const eliminationBlocks = useMemo(
        () => withTournamentHandLeaveBlocks(chainLeaveBlocks, tournamentEntries, listedHands),
        [chainLeaveBlocks, tournamentEntries, listedHands]
    );
    const settledWindows = useMemo(
        () =>
            filteredRows.map(row => ({
                gameId: row.gameId,
                joinBlock: row.joinBlock,
                cashOut: settledSessionCashOut(row, hasContent(address) && hasValue(sessionBustFor(row, rows, gamesById[row.gameId], address)))
            })),
        [filteredRows, address, rows, gamesById]
    );
    const settledHands = useMemo(
        () => listedHands.filter(hand => handBelongsToSettledSession({ gameId: hand.game_id, blockHeight: hand.block_height }, settledWindows)),
        [listedHands, settledWindows]
    );
    // Chain action logs for settled hands in this variant, once those tables share a money unit.
    const profitHands = useMemo(
        () =>
            gamesLoading || hasContent(handHistory.error) || !hasContent(gameFilter)
                ? undefined
                : profitHandsToMeasure(settledHands, gameLabels, historyMoneyUnits(gamesById), gameFilter),
        [gamesLoading, handHistory.error, gameFilter, settledHands, gameLabels, gamesById]
    );
    const contributions = useHandContributions(address, profitHands ?? NO_PROFIT_HANDS, hasValue(profitHands));
    // Every finished hand, every variant, including an open session. Same snapshot cache as the profit card.
    const styleSelection = useMemo(() => playingStyleHands(listedHands), [listedHands]);
    // Start style logs as soon as the indexer list is available. Recovery of
    // omitted MTT hands can take minutes and must not hold these cards on "…".
    const styleRead = usePlayingStyle(address, styleSelection.hands, tab === "stats" && hasContent(address) && !hasContent(handHistory.error));
    const stylePending = profileStyleCardsPending({
        onStatsTab: tab === "stats",
        hasAddress: hasContent(address),
        handListFailed: hasContent(handHistory.error),
        handListComplete: handHistory.complete,
        styleLogsPending: styleRead.pending,
        recoveredSearched: recovered.searched,
        styleDealt: styleRead.dealt
    });
    const styleDisplay = formatPlayingStyle(styleRead.counts, stylePending);
    // Chain count from the Playing Style logs. Ellipsis until those finish, so the indexer's total_hands never flashes first.
    const handsPlayedLabel = formatHandsPlayed({
        pending: stylePending,
        failed: handsPlayedReadFailed(hasContent(handHistory.error), styleSelection.hands.length, styleRead.dealt, styleRead.unavailable),
        dealt: styleRead.dealt,
        indexerHands: hasValue(profile) ? profile.total_hands : undefined
    });
    const styleNote = stylePending ? undefined : playingStyleNote(styleRead.counts.hands, styleRead.unavailable + styleSelection.dropped);
    const historyHands = useMemo(
        () => withHandContributions(hasContent(handHistory.error) ? [] : handsForHistory(settledHands), contributions.byKey),
        [handHistory.error, settledHands, contributions.byKey]
    );
    const historyStats = useMemo(
        () =>
            profileHistoryStats(
                sessionSpansForHistory(rows, gamesById, address, eliminationBlocks),
                historyHands,
                gameLabels,
                historyMoneyUnits(gamesById),
                gameFilter
            ),
        [rows, gamesById, address, eliminationBlocks, historyHands, gameLabels, gameFilter]
    );
    const handsPending = profileHistoryHandsPending({
        onStatsTab: tab === "stats",
        hasAddress: hasContent(address),
        handListFailed: hasContent(handHistory.error),
        handListComplete: handHistory.complete
    });
    const moneyLoading = handsPending || handHistory.loading || gamesLoading;
    const profitLoading = moneyLoading || contributions.pending;
    const profitNote = profitLoading ? undefined : handContributionNote(contributions.unavailable, hasValue(profitHands) ? profitHands.length : 0);
    const variantTotals = useMemo(() => variantMoneyFromRows(filteredRows, rows, gamesById, address), [filteredRows, rows, gamesById, address]);
    const openSessionsNote = openSessionTotalsNote(variantTotals.excludedOpen);
    const netClass = hasValue(variantTotals.netProfit) ? historyNetClass(variantTotals.netProfit) : "";
    const statsMoney = useMemo(
        () =>
            hasValue(profile) && !prizesLoading && !tournamentsLoading
                ? profileMoneyWithAllVariants(
                      { totalBuyIns: profile.total_buy_ins, totalCashOuts: profile.total_cash_outs, netProfit: profile.net_profit },
                      sessions,
                      claims,
                      tournamentEntries,
                      tournamentRegistrations,
                      tournamentUnregistrations,
                      address
                  )
                : null,
        [profile, prizesLoading, tournamentsLoading, sessions, claims, tournamentEntries, tournamentRegistrations, tournamentUnregistrations, address]
    );
    const historyLoading = sessionsLoading || prizesLoading || tournamentsLoading;

    useVisibleRefresh(() => {
        refetchProfile({ silent: true });
        refetchSessions({ silent: true });
        refetchClaims({ silent: true });
        refetchTournaments({ silent: true });
        // Hands Played walks the chain logs; a focus must not start that over.
        if (tab === "stats") walletBalance.refetch({ silent: true });
    });

    useEffect(() => {
        document.title = address ? `Player ${truncateMiddle(address, 8, 6)} - Texas HODL` : "Player - Texas HODL";
        return () => {
            document.title = "Texas HODL";
        };
    }, [address]);

    useEffect(() => {
        setGameFilter("");
        setSessionsPage(1);
        setOpenSessionKey(null);
    }, [address]);

    useEffect(() => {
        if (historyLoading || gamesLoading || !hasContent(defaultVariant)) return;
        setGameFilter(current => (gameFilterOptions.some(option => option.key === current) ? current : defaultVariant));
    }, [historyLoading, gamesLoading, defaultVariant, gameFilterOptions]);

    return (
        <div className="site-page">
            <AnimatedBackground />

            <div className="site-page-content">
                <ExplorerHeader title="Player Profile" action={hasContent(identityAddress) ? <ProfileIdentity address={identityAddress} /> : undefined} />

                <button onClick={() => navigate("/players")} className="mb-4 text-sm text-gray-400 hover:text-white transition-colors">
                    ← Back to players
                </button>

                <ProfileHub profileAddress={address} />

                {tab === "hands" ? (
                    <MyHandsPanel address={address} />
                ) : tab === "wallet" ? (
                    <CosmosWalletPage embedded />
                ) : tab === "awards" ? (
                    <PlayerAwardsPage embedded />
                ) : tab === "activity" ? (
                    <ProfileActivityPanel address={address} />
                ) : loading ? (
                    <div className={`backdrop-blur-md rounded-xl shadow-2xl p-8 text-center ${styles.containerCard}`}>
                        <div className={`animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4 ${styles.loadingSpinner}`}></div>
                        <p className="text-gray-400">Loading player...</p>
                    </div>
                ) : error ? (
                    <div className={`backdrop-blur-md p-6 rounded-xl shadow-2xl ${styles.containerCard} ${styles.errorContainer}`}>
                        <p className="text-red-400 text-center">{error}</p>
                    </div>
                ) : !profile ? (
                    <div className={`backdrop-blur-md p-8 rounded-xl shadow-2xl text-center ${styles.containerCard}`}>
                        <p className="text-gray-400">No data for this player.</p>
                    </div>
                ) : (
                    <>
                        {/* Volume & money. Wallet Balance leads; Hands Played opens the second row. */}
                        <div className="mb-6 flex flex-wrap justify-center gap-4">
                            <StatCard
                                className={VOLUME_STAT_CARD}
                                label="Wallet Balance"
                                value={formatProfileWalletBalance(walletBalance.micro, walletBalance.loading, hasContent(walletBalance.error))}
                            />
                            <StatCard
                                className={VOLUME_STAT_CARD}
                                label="Net Profit"
                                value={hasValue(statsMoney) ? formatUsd(statsMoney.netProfit) : "…"}
                                valueClass={hasValue(statsMoney) && statsMoney.netProfit < 0 ? "text-red-400" : "text-green-400"}
                            />
                            <StatCard
                                className={VOLUME_STAT_CARD}
                                label="Total Buy-In"
                                value={hasValue(statsMoney) ? formatUsd(statsMoney.totalBuyIns) : "…"}
                            />
                            <StatCard
                                className={VOLUME_STAT_CARD}
                                label="Total Cash-Out"
                                value={hasValue(statsMoney) ? formatUsd(statsMoney.totalCashOuts) : "…"}
                            />
                            <StatCard className={VOLUME_STAT_CARD} label="Hands Played" value={handsPlayedLabel} />
                            <StatCard className={VOLUME_STAT_CARD} label="Sessions" value={profile.session_count.toLocaleString()} />
                            <StatCard className={VOLUME_STAT_CARD} label="Total Actions" value={profile.total_actions.toLocaleString()} />
                            <StatCard className={VOLUME_STAT_CARD} label="Network Fees Paid" value={formatUsd(profile.total_rake_contributed)} />
                        </div>

                        {/* Playing style: every variant, from the chain action logs. */}
                        <div className={`backdrop-blur-md p-6 rounded-xl shadow-2xl mb-6 ${styles.containerCard}`}>
                            <h2 className="text-white font-bold mb-4">Playing Style</h2>
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                {PLAYING_STYLE_FIGURES.map(figure => (
                                    <div key={figure.key}>
                                        <div className="flex items-center gap-1">
                                            <p className="text-sm text-gray-400">{figure.title}</p>
                                            <PlayingStyleTip figure={figure} />
                                        </div>
                                        <p className="mt-1 text-xl font-bold text-white">{styleDisplay[figure.key]}</p>
                                    </div>
                                ))}
                            </div>
                            {hasContent(styleNote) && <p className="mt-3 text-xs text-gray-500">{styleNote}</p>}
                        </div>

                        {/* History: one variant filter drives the records and the session table. */}
                        <div className={`backdrop-blur-md rounded-xl shadow-2xl overflow-hidden ${styles.containerCard}`}>
                            <div className="relative z-20 px-6 py-4 border-b border-white/10 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <h2 className="text-white font-bold">History</h2>
                                {!gamesLoading && hasContent(gameFilter) && hasElements(gameFilterOptions) && (
                                    <SessionHistoryFilter
                                        value={gameFilter}
                                        options={gameFilterOptions}
                                        onChange={key => {
                                            setGameFilter(key);
                                            setSessionsPage(1);
                                            setOpenSessionKey(null);
                                        }}
                                    />
                                )}
                            </div>
                            {historyLoading || (hasElements(rows) && (gamesLoading || !hasContent(gameFilter))) ? (
                                <div className="p-8 text-center">
                                    <div className={`animate-spin rounded-full h-10 w-10 border-b-2 mx-auto mb-3 ${styles.loadingSpinner}`}></div>
                                    <p className="text-gray-400">Loading sessions...</p>
                                </div>
                            ) : isEmpty(rows) || !hasContent(gameFilter) ? (
                                <div className="p-8 text-center">
                                    <p className="text-gray-400">No sessions recorded</p>
                                </div>
                            ) : (
                                <>
                                    <div className="border-b border-white/10 p-4 sm:p-6">
                                        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                                            <StatCard
                                                label="Total Buy-In"
                                                value={hasValue(variantTotals.totalBuyIn) ? formatUsd(variantTotals.totalBuyIn) : "—"}
                                            />
                                            <StatCard
                                                label="Total Cash-Out"
                                                value={hasValue(variantTotals.totalCashOut) ? formatUsd(variantTotals.totalCashOut) : "—"}
                                            />
                                            <StatCard
                                                label="Net Profit"
                                                value={hasValue(variantTotals.netProfit) ? formatUsd(variantTotals.netProfit) : "—"}
                                                valueClass={hasContent(netClass) ? netClass : "text-white"}
                                            />
                                            <StatCard
                                                label="Biggest Pot Won"
                                                value={formatHistoryAmount(historyStats.biggestPotWon, historyStats.potUnit, moneyLoading)}
                                            />
                                            <StatCard
                                                label="Biggest Hand Profit"
                                                value={formatHistoryAmount(historyStats.biggestHandProfit, historyStats.profitUnit, profitLoading)}
                                            />
                                            <StatCard
                                                label="Longest Session (blocks)"
                                                value={formatHistoryBlocks(historyStats.longestSessionBlocks, historyLoading)}
                                            />
                                        </div>
                                        {hasContent(openSessionsNote) && <p className="mt-3 text-xs text-gray-400">{openSessionsNote}</p>}
                                        <p className="mt-3 text-xs text-gray-500">{sessionStateRetentionNote()}</p>
                                        {hasContent(profitNote) && <p className="mt-1 text-xs text-gray-500">{profitNote}</p>}
                                    </div>
                                    {isEmpty(filteredRows) ? (
                                        <div className="p-8 text-center">
                                            <p className="text-gray-400">No sessions for this game</p>
                                        </div>
                                    ) : (
                                        <div className="sm:overflow-x-auto">
                                            <table className="w-full table-fixed sm:table-auto">
                                                <thead>
                                                    <tr className={styles.tableHeaderRow}>
                                                        <th className="px-6 py-4 text-left text-gray-400 font-semibold">Game</th>
                                                        <th className="hidden px-6 py-4 text-right text-gray-400 font-semibold sm:table-cell">Join Block</th>
                                                        <th className="hidden px-6 py-4 text-right text-gray-400 font-semibold sm:table-cell">Leave Block</th>
                                                        <th className="w-[5.25rem] px-3 py-4 text-right text-gray-400 font-semibold whitespace-nowrap sm:w-auto sm:px-6">
                                                            Buy-In
                                                        </th>
                                                        <th className="w-[6.25rem] px-3 py-4 text-right text-gray-400 font-semibold whitespace-nowrap sm:w-auto sm:px-6">
                                                            Cash-Out
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {pageRows.map((row, i) => {
                                                        const label = gameLabels[row.gameId];
                                                        const place = sessionPrizePlaceLabel(row, gamesById[row.gameId], profile.player_address);
                                                        const bust = sessionBustFor(row, rows, gamesById[row.gameId], profile.player_address);
                                                        const finishPlace = tournamentFinishPlaceLabel(
                                                            row.gameId,
                                                            gamesById[row.gameId],
                                                            profile.player_address
                                                        );
                                                        const leaveBlock = sessionLeaveBlock(row, bust, eliminationBlocks[row.gameId]);
                                                        const cashOutAmount = settledSessionCashOut(row, hasValue(bust));
                                                        const sessionKey = `${row.gameId}-${row.joinBlock}-${i}`;
                                                        const expanded = openSessionKey === sessionKey;
                                                        const detailId = `session-blocks-${i}`;
                                                        const detail = sessionRowExpandDetail(row.joinBlock, leaveBlock);
                                                        const gameName = hasValue(label) ? label.title : "this session";
                                                        return (
                                                            <tr
                                                                key={sessionKey}
                                                                className={`border-t ${styles.tableRowBorder}`}
                                                                onClick={event => {
                                                                    if (window.matchMedia("(min-width: 640px)").matches) return;
                                                                    const target = event.target;
                                                                    if (target instanceof Element && target.closest("a, button")) return;
                                                                    setOpenSessionKey(expanded ? null : sessionKey);
                                                                }}
                                                            >
                                                                <td className="relative align-top px-3 py-4 sm:px-6 sm:align-middle">
                                                                    <button
                                                                        type="button"
                                                                        className="absolute inset-0 z-0 sm:hidden"
                                                                        aria-expanded={expanded}
                                                                        aria-controls={detailId}
                                                                        aria-label={`${expanded ? "Hide" : "Show"} blocks for ${gameName}`}
                                                                        onClick={() => setOpenSessionKey(expanded ? null : sessionKey)}
                                                                    />
                                                                    <div className="pointer-events-none relative z-10 flex items-start gap-2 sm:pointer-events-auto sm:block">
                                                                        <span
                                                                            className="mt-1 shrink-0 text-xs leading-none text-gray-400 sm:hidden"
                                                                            aria-hidden="true"
                                                                        >
                                                                            {expanded ? "▴" : "▾"}
                                                                        </span>
                                                                        <div className="pointer-events-none flex min-w-0 flex-1 flex-col gap-0.5 sm:pointer-events-auto sm:max-w-xs">
                                                                            {hasValue(label) && <span className="text-sm text-white">{label.title}</span>}
                                                                            {hasValue(label) && hasContent(label.detail) && (
                                                                                <span className="text-xs text-gray-400">{label.detail}</span>
                                                                            )}
                                                                            <Link
                                                                                to={`/table/${row.gameId}`}
                                                                                title={row.gameId}
                                                                                className={`pointer-events-auto font-mono hover:underline ${styles.brandText} ${hasValue(label) ? "text-xs" : "text-sm"}`}
                                                                            >
                                                                                {truncateMiddle(row.gameId, 8, 6)}
                                                                            </Link>
                                                                            <dl
                                                                                id={detailId}
                                                                                className={expanded ? "mt-2 space-y-0.5 text-xs sm:hidden" : "hidden"}
                                                                            >
                                                                                <div className="flex justify-between gap-3">
                                                                                    <dt className="whitespace-nowrap text-gray-400">Join block</dt>
                                                                                    <dd className="whitespace-nowrap text-gray-200">{detail.joinBlock}</dd>
                                                                                </div>
                                                                                <div className="flex justify-between gap-3">
                                                                                    <dt className="whitespace-nowrap text-gray-400">Leave block</dt>
                                                                                    <dd className="whitespace-nowrap text-gray-200">{detail.leaveBlock}</dd>
                                                                                </div>
                                                                                <div className="flex justify-between gap-3">
                                                                                    <dt className="whitespace-nowrap text-gray-400">Length</dt>
                                                                                    <dd className="whitespace-nowrap text-gray-200">{detail.length}</dd>
                                                                                </div>
                                                                            </dl>
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td className="hidden px-6 py-4 text-right text-gray-300 sm:table-cell">
                                                                    {row.joinBlock.toLocaleString()}
                                                                </td>
                                                                <td className="hidden px-6 py-4 text-right text-gray-300 sm:table-cell">
                                                                    {hasValue(leaveBlock) ? leaveBlock.toLocaleString() : "—"}
                                                                </td>
                                                                <td className="align-top px-3 py-4 text-right text-gray-300 sm:px-6 sm:align-middle">
                                                                    {formatUsd(row.buyIn)}
                                                                </td>
                                                                <td className="align-top px-3 py-4 text-right text-gray-300 whitespace-normal sm:whitespace-nowrap sm:px-6 sm:align-middle">
                                                                    {row.isPrize && hasContent(row.prizeTxHash) ? (
                                                                        <Link to={`/explorer/tx/${row.prizeTxHash}`} className={sessionPrizeCashOutClass()}>
                                                                            <span className="rounded bg-amber-400/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-300">
                                                                                Prize
                                                                            </span>
                                                                            <span className={sessionPrizeAmountRowClass()}>
                                                                                {hasContent(place) && (
                                                                                    <span className="text-xs font-semibold text-amber-200">{place}</span>
                                                                                )}
                                                                                {hasValue(cashOutAmount) ? (
                                                                                    <span className={sessionCashOutAmountClass(row.buyIn, cashOutAmount)}>
                                                                                        {formatUsd(cashOutAmount)}
                                                                                    </span>
                                                                                ) : (
                                                                                    "—"
                                                                                )}
                                                                            </span>
                                                                        </Link>
                                                                    ) : hasValue(bust) ? (
                                                                        <span className="inline-flex items-center justify-end gap-2">
                                                                            {hasContent(bust.placeLabel) && (
                                                                                <span className="text-xs font-semibold text-amber-200">{bust.placeLabel}</span>
                                                                            )}
                                                                            {hasValue(cashOutAmount) ? (
                                                                                <span className={sessionCashOutAmountClass(row.buyIn, cashOutAmount)}>
                                                                                    {formatUsd(cashOutAmount)}
                                                                                </span>
                                                                            ) : (
                                                                                "—"
                                                                            )}
                                                                        </span>
                                                                    ) : hasValue(cashOutAmount) ? (
                                                                        hasContent(finishPlace) ? (
                                                                            <span className="inline-flex items-center justify-end gap-2">
                                                                                <span className="text-xs font-semibold text-amber-200">{finishPlace}</span>
                                                                                <span className={sessionCashOutAmountClass(row.buyIn, cashOutAmount)}>
                                                                                    {formatUsd(cashOutAmount)}
                                                                                </span>
                                                                            </span>
                                                                        ) : (
                                                                            <span className={sessionCashOutAmountClass(row.buyIn, cashOutAmount)}>
                                                                                {formatUsd(cashOutAmount)}
                                                                            </span>
                                                                        )
                                                                    ) : (
                                                                        "—"
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                    {!historyLoading && hasElements(filteredRows) && filteredRows.length > SESSIONS_PAGE_SIZE && (
                                        <Pagination
                                            currentPage={sessionsPage}
                                            totalItems={filteredRows.length}
                                            pageSize={SESSIONS_PAGE_SIZE}
                                            onPageChange={setSessionsPage}
                                        />
                                    )}
                                </>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
