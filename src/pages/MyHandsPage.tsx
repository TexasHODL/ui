import { useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { AnimatedBackground } from "../components/common/AnimatedBackground";
import { ExplorerHeader } from "../components/explorer/ExplorerHeader";
import { HandHistoryCards } from "../components/explorer/HandHistoryCards";
import { ExplorerEmpty, ExplorerError, ExplorerLoading, ExplorerPanel, ExplorerReloadButton } from "../components/explorer/ExplorerPanel";
import { useCosmosWallet } from "../hooks/wallet";
import { NETWORK_PRESETS, useNetwork } from "../context/NetworkContext";
import { useMyHandHistory } from "../hooks/player/useMyHandHistory";
import { useRecoveredHands } from "../hooks/player/useRecoveredHands";
import { useHandHistoryCards } from "../hooks/player/useHandHistoryCards";
import { useIndexerStatus } from "../hooks/player/useIndexerStatus";
import { useTableFormats } from "../hooks/player/useTableFormats";
import { describeHandOutcome, describeIndexing, handKey, HandOutcomeTone } from "../utils/handHistory";
import { displayBoard, historyCountLabel, mergeHistoryHands, type HistoryHandCards } from "../utils/handHistoryCards";
import { historyNetworks } from "../utils/handReplay";
import { formatTimestampRelative } from "../utils/formatUtils";
import { truncateMiddle } from "../utils/stringUtils";
import { getCardImageUrl } from "../utils/cardImages";
import { hasElements, isEmpty } from "../utils/guards";
import type { PlayerHand } from "../types/players";
import styles from "./explorer/AllAccountsPage.module.css";

const PAGE_SIZE = 25;

const toneClass: Record<HandOutcomeTone, string> = {
    won: "text-green-400 font-semibold",
    lost: "text-red-400",
    neutral: "text-gray-300"
};

/**
 * "My Hand History" (ui#721): every indexed hand the wallet in use played,
 * across tables and sessions, newest first, plus played hands the indexer
 * failed to attach. Each opens its read-only replay.
 */
export default function MyHandsPage() {
    const { address } = useCosmosWallet();
    const { currentNetwork } = useNetwork();
    const indexerStatus = useIndexerStatus();
    const networks = useMemo(() => historyNetworks(currentNetwork, NETWORK_PRESETS), [currentNetwork]);
    const { hands, total, loading, error, hasMore, complete, loadMore, reload } = useMyHandHistory(
        address,
        `${currentNetwork.name}|${currentNetwork.rest}`,
        PAGE_SIZE
    );
    const recovered = useRecoveredHands(address, hands, complete, networks);
    const displayed = useMemo(() => mergeHistoryHands(hands, recovered.hands), [hands, recovered.hands]);
    const cardMap = useHandHistoryCards(displayed, address, recovered.states, networks);
    const formats = useTableFormats(useMemo(() => displayed.map(h => h.game_id), [displayed]));
    const count = Math.max(total, displayed.length);

    useEffect(() => {
        document.title = "My Hands - Texas HODL";
        return () => {
            document.title = "Texas HODL";
        };
    }, []);

    const header = (
        <span className="flex items-center gap-2 min-w-0">
            <span>My hands{count > 0 ? ` · ${count.toLocaleString()}` : ""}</span>
            {address && (
                <Link to={`/players/${address}`} title={address} className={`font-mono text-xs truncate hover:underline ${styles.brandText}`}>
                    {truncateMiddle(address, 10, 6)}
                </Link>
            )}
        </span>
    );

    return (
        <div className="site-page">
            <AnimatedBackground />

            <div className="site-page-content">
                <ExplorerHeader title="My Hands" />

                <ExplorerPanel header={header} action={address ? <ExplorerReloadButton onClick={reload} busy={loading} label="Reload hands" /> : null}>
                    {!address ? (
                        <ExplorerEmpty>
                            <span className="page-empty-symbol" aria-hidden="true">
                                ♠
                            </span>
                            <h2>Your hand history starts here</h2>
                            <p>Create or import your game wallet to see the hands you’ve played.</p>
                            <Link to="/wallet" className="page-button-primary">
                                Set up your wallet
                            </Link>
                        </ExplorerEmpty>
                    ) : error && isEmpty(hands) ? (
                        <ExplorerError>{error}</ExplorerError>
                    ) : isEmpty(displayed) && (loading || recovered.recovering || (complete && !recovered.searched)) ? (
                        <ExplorerLoading label="Loading your hands…" />
                    ) : isEmpty(displayed) ? (
                        <ExplorerEmpty>
                            <span className="page-empty-symbol" aria-hidden="true">
                                ♠
                            </span>
                            <h2>Your next hand is waiting</h2>
                            <p>No indexed hands for this wallet yet. Once you play, your results and replays will appear here.</p>
                            <Link to="/" className="page-button-primary">
                                Find a table ↗
                            </Link>
                        </ExplorerEmpty>
                    ) : (
                        <ul className="divide-y divide-white/5">
                            {displayed.map(hand => (
                                <HandRow
                                    key={handKey(hand)}
                                    hand={hand}
                                    outcome={describeHandOutcome(hand, formats.get(hand.game_id))}
                                    cards={cardMap.get(handKey(hand))}
                                />
                            ))}
                        </ul>
                    )}

                    {address && hasElements(displayed) && (
                        <div className="px-3 sm:px-4 py-3 flex flex-col items-center gap-2 border-t border-white/5">
                            {error && <p className="text-sm text-red-400">{error}</p>}
                            <p className="text-xs text-gray-400">{historyCountLabel(displayed.length, total)}</p>
                            {hasMore && (
                                <button
                                    type="button"
                                    onClick={loadMore}
                                    disabled={loading}
                                    className="px-4 py-1.5 rounded-lg text-sm text-white bg-white/10 hover:bg-white/20 transition-colors disabled:opacity-50"
                                >
                                    {loading ? "Loading…" : "Load more"}
                                </button>
                            )}
                        </div>
                    )}
                </ExplorerPanel>
                {indexerStatus && <p className="page-index-status">{describeIndexing(indexerStatus)}</p>}
            </div>
        </div>
    );
}

function HandRow({
    hand,
    outcome,
    cards
}: {
    hand: PlayerHand;
    outcome: { label: string; tone: HandOutcomeTone };
    cards?: HistoryHandCards;
}) {
    const replayUrl = `/table/${hand.game_id}?hand=${hand.hand_number}`;
    const board = displayBoard(hand.community_cards, cards?.board);
    return (
        <li className="px-3 sm:px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 flex-wrap">
                    <Link to={replayUrl} className="text-white font-semibold hover:underline">
                        Hand #{hand.hand_number}
                    </Link>
                    <span className="text-xs text-gray-400">Seat {hand.seat}</span>
                    <span className={`text-sm ${toneClass[outcome.tone]}`}>{outcome.label}</span>
                </div>
                <p className="mt-0.5 text-xs text-gray-400 truncate">
                    Table{" "}
                    <span className="font-mono" title={hand.game_id}>
                        {truncateMiddle(hand.game_id, 8, 6)}
                    </span>
                    {" · "}
                    {hand.ended_at ? formatTimestampRelative(hand.ended_at) : `block ${hand.block_height.toLocaleString()}`}
                </p>
                <HandHistoryCards seats={cards?.seats ?? []} />
            </div>
            {hasElements(board) && (
                <div className="flex gap-1 shrink-0 flex-wrap" aria-label={`Board ${board.join(" ")}`}>
                    {board.map((card, i) => (
                        <img key={i} src={getCardImageUrl(card.toUpperCase())} alt={card.toUpperCase()} className="w-6 sm:w-7 rounded-sm" />
                    ))}
                </div>
            )}
            <div className="flex gap-3 shrink-0 text-sm">
                <Link to={replayUrl} className={`hover:underline ${styles.brandText}`}>
                    Replay
                </Link>
                <Link to={`/explorer/hand/${hand.game_id}/${hand.hand_number}`} className="text-gray-300 hover:underline">
                    Details
                </Link>
            </div>
        </li>
    );
}
