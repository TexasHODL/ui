import { formatMicroUsd } from "../utils/moneyDisplay";
import { useState, useEffect, useMemo } from "react";
import { Link, useParams, useNavigate, useSearchParams } from "react-router-dom";

import { truncateMiddle } from "../utils/stringUtils";
import { AnimatedBackground } from "../components/common/AnimatedBackground";
import CosmosWalletPage from "../components/CosmosWalletPage";
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
import { useCosmosWallet } from "../hooks/wallet/useCosmosWallet";
import { getCosmosAddress } from "../utils/cosmos/storage";
import { PROFILE_TAB_PARAM, viewerAddress, visibleProfileTab } from "../utils/profileHub";
import { useAllPlayerSessions } from "../hooks/player/usePlayerSessions";
import { usePlayerPrizeClaims } from "../hooks/player/usePlayerPrizeClaims";
import { useSessionGameMeta } from "../hooks/player/useSessionGameMeta";
import { profileMoneyWithPrizes, sessionRowsWithPrizes } from "../utils/playerPrizeClaims";
import {
    ALL_SESSION_GAMES,
    filterSessionRows,
    sessionGameFilterOptions,
    sessionLabelsByGameId,
    sessionPrizePlaceLabel,
    uniqueGameIds
} from "../utils/sessionGameDisplay";
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

    const { profile, loading, error } = usePlayerProfile(address);
    const { sessions, loading: sessionsLoading } = useAllPlayerSessions(address);
    // Chain prize claims. Empty on failure, so the cards and rows stay on the indexer.
    const { claims, loading: prizesLoading } = usePlayerPrizeClaims(address);
    const gameIds = useMemo(() => uniqueGameIds(sessions.map(session => session.game_id)), [sessions]);
    const { byId: gamesById, loading: gamesLoading } = useSessionGameMeta(gameIds);
    const rows = useMemo(() => sessionRowsWithPrizes(sessions, claims), [sessions, claims]);
    const gameLabels = useMemo(() => sessionLabelsByGameId(gamesById), [gamesById]);
    const gameFilterOptions = useMemo(() => sessionGameFilterOptions(Object.values(gameLabels)), [gameLabels]);
    const filteredRows = useMemo(() => filterSessionRows(rows, gameLabels, gameFilter), [rows, gameLabels, gameFilter]);
    const pageRows = useMemo(() => {
        const start = (sessionsPage - 1) * SESSIONS_PAGE_SIZE;
        return filteredRows.slice(start, start + SESSIONS_PAGE_SIZE);
    }, [filteredRows, sessionsPage]);
    const prizeMoney = useMemo(
        () =>
            hasValue(profile) && !prizesLoading
                ? profileMoneyWithPrizes({ totalCashOuts: profile.total_cash_outs, netProfit: profile.net_profit }, sessions, claims)
                : null,
        [profile, sessions, claims, prizesLoading]
    );
    const historyLoading = sessionsLoading || prizesLoading;
    const { address: walletAddress } = useCosmosWallet();
    const [searchParams] = useSearchParams();
    const tab = visibleProfileTab(viewerAddress(walletAddress, getCosmosAddress()), address, searchParams.get(PROFILE_TAB_PARAM));

    useEffect(() => {
        document.title = address ? `Player ${truncateMiddle(address, 8, 6)} - Texas HODL` : "Player - Texas HODL";
        return () => {
            document.title = "Texas HODL";
        };
    }, [address]);

    useEffect(() => {
        setGameFilter(ALL_SESSION_GAMES);
        setSessionsPage(1);
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

                        {/* Records */}
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                            <StatCard label="Biggest Pot Won" value={formatUsd(profile.biggest_pot_won)} />
                            <StatCard label="Biggest Hand Profit" value={formatUsd(profile.biggest_hand_profit)} />
                            <StatCard label="Longest Session (blocks)" value={profile.longest_session_blocks.toLocaleString()} />
                        </div>

                        {/* Session history */}
                        <div className={`backdrop-blur-md rounded-xl shadow-2xl overflow-hidden ${styles.containerCard}`}>
                            <div className="relative z-20 px-6 py-4 border-b border-white/10 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <h2 className="text-white font-bold">Session History</h2>
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
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className={styles.tableHeaderRow}>
                                                <th className="px-6 py-4 text-left text-gray-400 font-semibold">Game</th>
                                                <th className="px-6 py-4 text-right text-gray-400 font-semibold">Join Block</th>
                                                <th className="px-6 py-4 text-right text-gray-400 font-semibold">Leave Block</th>
                                                <th className="px-6 py-4 text-right text-gray-400 font-semibold">Buy-In</th>
                                                <th className="px-6 py-4 text-right text-gray-400 font-semibold">Cash-Out</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {pageRows.map((row, i) => {
                                                const label = gameLabels[row.gameId];
                                                const place = sessionPrizePlaceLabel(row, gamesById[row.gameId], profile.player_address);
                                                return (
                                                    <tr key={`${row.gameId}-${row.joinBlock}-${i}`} className={`border-t ${styles.tableRowBorder}`}>
                                                        <td className="px-6 py-4">
                                                            <div className="flex max-w-[11.5rem] flex-col gap-0.5 sm:max-w-xs">
                                                                {hasValue(label) && <span className="text-sm text-white">{label.title}</span>}
                                                                {hasValue(label) && hasContent(label.detail) && (
                                                                    <span className="text-xs text-gray-400">{label.detail}</span>
                                                                )}
                                                                <Link
                                                                    to={`/table/${row.gameId}`}
                                                                    title={row.gameId}
                                                                    className={`font-mono hover:underline ${styles.brandText} ${hasValue(label) ? "text-xs" : "text-sm"}`}
                                                                >
                                                                    {truncateMiddle(row.gameId, 8, 6)}
                                                                </Link>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-right text-gray-300">{row.joinBlock.toLocaleString()}</td>
                                                        <td className="px-6 py-4 text-right text-gray-300">
                                                            {hasValue(row.leaveBlock) ? row.leaveBlock.toLocaleString() : "—"}
                                                        </td>
                                                        <td className="px-6 py-4 text-right text-gray-300">{formatUsd(row.buyIn)}</td>
                                                        <td className="px-6 py-4 text-right text-gray-300 whitespace-nowrap">
                                                            {row.isPrize && hasContent(row.prizeTxHash) ? (
                                                                <Link
                                                                    to={`/explorer/tx/${row.prizeTxHash}`}
                                                                    className="inline-flex items-center justify-end gap-2 hover:text-white"
                                                                >
                                                                    <span className="rounded bg-amber-400/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-300">
                                                                        Prize
                                                                    </span>
                                                                    {hasContent(place) && <span className="text-xs font-semibold text-amber-200">{place}</span>}
                                                                    <span>{hasValue(row.cashOut) ? formatUsd(row.cashOut) : "—"}</span>
                                                                </Link>
                                                            ) : hasValue(row.cashOut) ? (
                                                                formatUsd(row.cashOut)
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
