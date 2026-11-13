import { formatMicroUsd } from "../utils/moneyDisplay";
import { useState, useEffect, useMemo } from "react";
import { Link, useParams, useNavigate, useSearchParams } from "react-router-dom";

import { truncateMiddle } from "../utils/stringUtils";
import { AnimatedBackground } from "../components/common/AnimatedBackground";
import CosmosWalletPage from "../components/CosmosWalletPage";
import PlayerAwardsPage from "./PlayerAwardsPage";
import { ExplorerHeader } from "../components/explorer/ExplorerHeader";
import { isEmpty, hasElements, hasValue, hasContent } from "../utils/guards";
import { Pagination } from "../components/common";
import { MyHandsPanel } from "../components/players/MyHandsPanel";
import { ProfileHeaderAvatar } from "../components/players/ProfileHeaderAvatar";
import { ProfileHub } from "../components/players/ProfileHub";
import { SessionHistoryFilter } from "../components/players/SessionHistoryFilter";
import { VipBadge } from "../components/players/VipBadge";
import { formatScaledPercent } from "../utils/vip";
import { usePlayerProfile } from "../hooks/player/usePlayerProfile";
import { useMyHandHistory } from "../hooks/player/useMyHandHistory";
import { useCosmosWallet } from "../hooks/wallet/useCosmosWallet";
import { useNetwork } from "../context/NetworkContext";
import { getCosmosAddress } from "../utils/cosmos/storage";
import { PROFILE_TAB_PARAM, viewerAddress, visibleProfileTab } from "../utils/profileHub";
import { useAllPlayerSessions } from "../hooks/player/usePlayerSessions";
import { usePlayerPrizeClaims } from "../hooks/player/usePlayerPrizeClaims";
import { useSessionEliminationBlocks } from "../hooks/player/useSessionEliminationBlocks";
import { useSessionGameMeta } from "../hooks/player/useSessionGameMeta";
import { profileMoneyWithPrizes, sessionRowsWithPrizes } from "../utils/playerPrizeClaims";
import {
    ALL_SESSION_GAMES,
    filterSessionRows,
    sessionRowExpandDetail,
    sessionGameFilterOptions,
    sessionLabelsByGameId,
    sessionPrizePlaceLabel,
    uniqueGameIds
} from "../utils/sessionGameDisplay";
import { sessionCashOutAmountClass } from "../utils/sessionCashOut";
import { eliminationLookupsFor, sessionBustFor, sessionLeaveBlock } from "../utils/sessionBust";
import {
    formatHistoryAmount,
    formatHistoryBlocks,
    handsForHistory,
    historyMoneyUnits,
    profileHistoryStats,
    sessionSpansForHistory
} from "../utils/profileHistoryStats";
import styles from "./explorer/AllAccountsPage.module.css";

const SESSIONS_PAGE_SIZE = 20;

const formatUsd = (micro: number): string => {
    const label = formatMicroUsd(micro, true);
    return label.startsWith("-") ? `-${label.slice(1)}` : `${label}`;
};

const StatCard: React.FC<{ label: string; value: string; valueClass?: string }> = ({ label, value, valueClass = "text-white" }) => (
    <div className={`backdrop-blur-md p-5 rounded-xl shadow-2xl ${styles.containerCard}`}>
        <p className="text-gray-400 text-sm mb-1">{label}</p>
        <p className={`text-2xl font-bold ${valueClass}`}>{value}</p>
    </div>
);

export default function PlayerProfilePage() {
    const { address } = useParams<{ address: string }>();
    const navigate = useNavigate();
    const [sessionsPage, setSessionsPage] = useState(1);
    const [copied, setCopied] = useState(false);

    const [gameFilter, setGameFilter] = useState(ALL_SESSION_GAMES);
    const [openSessionKey, setOpenSessionKey] = useState<string | null>(null);

    const { profile, loading, error } = usePlayerProfile(address);
    const { sessions, loading: sessionsLoading } = useAllPlayerSessions(address);
    // Chain prize claims. Empty on failure, so the cards and rows stay on the indexer.
    const { claims, loading: prizesLoading } = usePlayerPrizeClaims(address);
    const { address: walletAddress } = useCosmosWallet();
    const { currentNetwork } = useNetwork();
    const [searchParams] = useSearchParams();
    const tab = visibleProfileTab(viewerAddress(walletAddress, getCosmosAddress()), address, searchParams.get(PROFILE_TAB_PARAM));
    // Same hand list as My Hands. Loaded on Stats only, so the hands tab does not fetch it twice.
    const handHistory = useMyHandHistory(tab === "stats" && hasContent(address) ? address : null, `${currentNetwork.name}|${currentNetwork.rest}`, 1000);
    const gameIds = useMemo(
        () => uniqueGameIds([...sessions.map(session => session.game_id), ...handHistory.hands.map(hand => hand.game_id)]),
        [sessions, handHistory.hands]
    );
    const { byId: gamesById, loading: gamesLoading } = useSessionGameMeta(gameIds);
    const rows = useMemo(() => sessionRowsWithPrizes(sessions, claims), [sessions, claims]);
    const gameLabels = useMemo(() => sessionLabelsByGameId(gamesById), [gamesById]);
    const gameFilterOptions = useMemo(() => sessionGameFilterOptions(Object.values(gameLabels)), [gameLabels]);
    const filteredRows = useMemo(() => filterSessionRows(rows, gameLabels, gameFilter), [rows, gameLabels, gameFilter]);
    const pageRows = useMemo(() => {
        const start = (sessionsPage - 1) * SESSIONS_PAGE_SIZE;
        return filteredRows.slice(start, start + SESSIONS_PAGE_SIZE);
    }, [filteredRows, sessionsPage]);
    // Every filtered bust, not only the visible page, so the longest session does not depend on which page is open.
    const eliminationLookups = useMemo(() => eliminationLookupsFor(filteredRows, rows, gamesById, address), [filteredRows, rows, gamesById, address]);
    const eliminationBlocks = useSessionEliminationBlocks(address, eliminationLookups);
    const historyHands = useMemo(() => (hasContent(handHistory.error) ? [] : handsForHistory(handHistory.hands)), [handHistory.error, handHistory.hands]);
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
    const handsPending = tab === "stats" && hasContent(address) && !handHistory.complete && !hasContent(handHistory.error);
    const moneyLoading = handsPending || handHistory.loading || gamesLoading;
    const prizeMoney = useMemo(
        () =>
            hasValue(profile) && !prizesLoading
                ? profileMoneyWithPrizes({ totalCashOuts: profile.total_cash_outs, netProfit: profile.net_profit }, sessions, claims)
                : null,
        [profile, sessions, claims, prizesLoading]
    );
    const historyLoading = sessionsLoading || prizesLoading;

    useEffect(() => {
        document.title = address ? `Player ${truncateMiddle(address, 8, 6)} - Texas HODL` : "Player - Texas HODL";
        return () => {
            document.title = "Texas HODL";
        };
    }, [address]);

    useEffect(() => {
        setGameFilter(ALL_SESSION_GAMES);
        setSessionsPage(1);
        setOpenSessionKey(null);
    }, [address]);

    const copyAddress = () => {
        if (!address) return;
        navigator.clipboard.writeText(address).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        });
    };

    return (
        <div className="site-page">
            <AnimatedBackground />

            <div className="site-page-content">
                <ExplorerHeader title="Player Profile" />

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
                        {/* Header */}
                        <div className={`backdrop-blur-md p-6 rounded-xl shadow-2xl mb-6 ${styles.containerCard}`}>
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                                <div className="flex items-center gap-3 min-w-0">
                                    <ProfileHeaderAvatar address={profile.player_address} />
                                    <div className="flex items-center gap-3 flex-wrap min-w-0">
                                        <span className={`font-mono text-sm break-all ${styles.brandText}`}>{profile.player_address}</span>
                                        <button onClick={copyAddress} className="text-xs text-gray-400 hover:text-white transition-colors">
                                            {copied ? "Copied!" : "Copy"}
                                        </button>
                                    </div>
                                </div>
                                <VipBadge tier={profile.vip_tier} rakebackPct={profile.rakeback_pct} showRakeback />
                            </div>
                        </div>

                        {/* Volume & money */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                            <StatCard label="Hands Played" value={profile.total_hands.toLocaleString()} />
                            <StatCard
                                label="Net Profit"
                                value={hasValue(prizeMoney) ? formatUsd(prizeMoney.netProfit) : "…"}
                                valueClass={hasValue(prizeMoney) && prizeMoney.netProfit < 0 ? "text-red-400" : "text-green-400"}
                            />
                            <StatCard label="Total Buy-In" value={formatUsd(profile.total_buy_ins)} />
                            <StatCard label="Total Cash-Out" value={hasValue(prizeMoney) ? formatUsd(prizeMoney.totalCashOuts) : "…"} />
                            <StatCard label="Sessions" value={profile.session_count.toLocaleString()} />
                            <StatCard label="Total Actions" value={profile.total_actions.toLocaleString()} />
                            <StatCard label="Rake Contributed" value={formatUsd(profile.total_rake_contributed)} />
                            <StatCard label="VIP Points" value={profile.vip_points.toLocaleString()} />
                        </div>

                        {/* Playing style */}
                        <div className={`backdrop-blur-md p-6 rounded-xl shadow-2xl mb-6 ${styles.containerCard}`}>
                            <h2 className="text-white font-bold mb-4">Playing Style</h2>
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                <div>
                                    <p className="text-gray-400 text-sm mb-1">VPIP</p>
                                    <p className="text-xl font-bold text-white">{formatScaledPercent(profile.vpip)}</p>
                                </div>
                                <div>
                                    <p className="text-gray-400 text-sm mb-1">PFR</p>
                                    <p className="text-xl font-bold text-white">{formatScaledPercent(profile.pfr)}</p>
                                </div>
                                <div>
                                    <p className="text-gray-400 text-sm mb-1">Aggression</p>
                                    <p className="text-xl font-bold text-white">{(profile.aggression_factor / 100).toFixed(2)}</p>
                                </div>
                                <div>
                                    <p className="text-gray-400 text-sm mb-1">WTSD</p>
                                    <p className="text-xl font-bold text-white">{formatScaledPercent(profile.wtsd)}</p>
                                </div>
                                <div>
                                    <p className="text-gray-400 text-sm mb-1">W$SD</p>
                                    <p className="text-xl font-bold text-white">{formatScaledPercent(profile.won_at_showdown)}</p>
                                </div>
                            </div>
                        </div>

                        {/* History: one variant filter drives the records and the session table. */}
                        <div className={`backdrop-blur-md rounded-xl shadow-2xl overflow-hidden ${styles.containerCard}`}>
                            <div className="relative z-20 px-6 py-4 border-b border-white/10 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <h2 className="text-white font-bold">History</h2>
                                {!gamesLoading && hasElements(gameFilterOptions) && (
                                    <SessionHistoryFilter
                                        value={gameFilter}
                                        options={gameFilterOptions}
                                        onChange={key => {
                                            setGameFilter(key);
                                            setSessionsPage(1);
                                        }}
                                    />
                                )}
                            </div>
                            <div className="grid grid-cols-2 gap-4 border-b border-white/10 p-4 sm:p-6 md:grid-cols-3">
                                <StatCard label="Biggest Pot Won" value={formatHistoryAmount(historyStats.biggestPotWon, historyStats.potUnit, moneyLoading)} />
                                <StatCard
                                    label="Biggest Hand Profit"
                                    value={formatHistoryAmount(historyStats.biggestHandProfit, historyStats.profitUnit, moneyLoading)}
                                />
                                <StatCard label="Longest Session (blocks)" value={formatHistoryBlocks(historyStats.longestSessionBlocks, historyLoading)} />
                            </div>
                            {historyLoading ? (
                                <div className="p-8 text-center">
                                    <div className={`animate-spin rounded-full h-10 w-10 border-b-2 mx-auto mb-3 ${styles.loadingSpinner}`}></div>
                                    <p className="text-gray-400">Loading sessions...</p>
                                </div>
                            ) : isEmpty(filteredRows) ? (
                                <div className="p-8 text-center">
                                    <p className="text-gray-400">{gameFilter === ALL_SESSION_GAMES ? "No sessions recorded" : "No sessions for this game"}</p>
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
                                                const leaveBlock = sessionLeaveBlock(row, bust, eliminationBlocks[row.gameId]);
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
                                                                <span className="mt-1 shrink-0 text-xs leading-none text-gray-400 sm:hidden" aria-hidden="true">
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
                                                                    <dl id={detailId} className={expanded ? "mt-2 space-y-0.5 text-xs sm:hidden" : "hidden"}>
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
                                                                <Link
                                                                    to={`/explorer/tx/${row.prizeTxHash}`}
                                                                    className="inline-flex items-center justify-end gap-2 hover:text-white"
                                                                >
                                                                    <span className="rounded bg-amber-400/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-300">
                                                                        Prize
                                                                    </span>
                                                                    {hasContent(place) && <span className="text-xs font-semibold text-amber-200">{place}</span>}
                                                                    {hasValue(row.cashOut) ? (
                                                                        <span className={sessionCashOutAmountClass(row.buyIn, row.cashOut)}>
                                                                            {formatUsd(row.cashOut)}
                                                                        </span>
                                                                    ) : (
                                                                        "—"
                                                                    )}
                                                                </Link>
                                                            ) : hasValue(bust) ? (
                                                                <span className="inline-flex items-center justify-end gap-2">
                                                                    {hasContent(bust.placeLabel) && (
                                                                        <span className="text-xs font-semibold text-amber-200">{bust.placeLabel}</span>
                                                                    )}
                                                                    <span className={sessionCashOutAmountClass(row.buyIn, 0)}>{formatUsd(0)}</span>
                                                                </span>
                                                            ) : hasValue(row.cashOut) ? (
                                                                <span className={sessionCashOutAmountClass(row.buyIn, row.cashOut)}>
                                                                    {formatUsd(row.cashOut)}
                                                                </span>
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
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
