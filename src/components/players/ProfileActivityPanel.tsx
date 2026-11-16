import { FC, MouseEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { formatMicroUsd } from "../../utils/moneyDisplay";
import { formatTimestampRelative } from "../../utils/formatUtils";
import { hasContent, hasElements, isEmpty } from "../../utils/guards";
import { tableUrl } from "../../utils/tableUrl";
import {
    formatActionAmount,
    formatGameId,
    formatPrizeClaimLabel,
    formatShortHash,
    formatTransferDirection,
    getTransferDirectionClass
} from "../../utils/transactionUtils";
import { ACTIVITY_PAGE_SIZE, useAddressActivity, type ActivityRow } from "../../hooks/player/useAddressActivity";
import pageStyles from "../../pages/explorer/AllAccountsPage.module.css";
import styles from "./ProfileActivityPanel.module.css";

interface ProfileActivityPanelProps {
    address: string | undefined;
}

const rowLabel = (row: ActivityRow, format: Parameters<typeof formatPrizeClaimLabel>[1]) =>
    row.isPrizeClaim ? formatPrizeClaimLabel(row.prizePlace, format) : row.label;

const isNestedControl = (event: MouseEvent) => {
    const target = event.target;
    return target instanceof Element && target.closest("a, button");
};

export const ProfileActivityPanel: FC<ProfileActivityPanelProps> = ({ address }) => {
    const navigate = useNavigate();
    const { rows, gameFormats, loading, loadingMore, error, hasMore, reload, loadMore } = useAddressActivity(address);
    const [visible, setVisible] = useState(ACTIVITY_PAGE_SIZE);
    const shown = rows.slice(0, visible);
    const canReveal = visible < rows.length;
    const showLoadMore = canReveal || hasMore;

    return (
        <div className={`backdrop-blur-md rounded-xl shadow-2xl ${pageStyles.containerCard} ${styles.panel}`}>
            <div className={styles.header}>
                <h2 className={styles.title}>Recent activity</h2>
                <button type="button" className={styles.refresh} onClick={() => void reload()} disabled={loading} title="Refresh activity" aria-label="Refresh activity">
                    <svg className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                        />
                    </svg>
                </button>
            </div>

            {loading && isEmpty(rows) ? (
                <div className={styles.empty}>
                    <div className={`animate-spin rounded-full h-10 w-10 border-b-2 mx-auto mb-3 ${pageStyles.loadingSpinner}`}></div>
                    <p>Loading activity...</p>
                </div>
            ) : error ? (
                <div className={styles.empty}>
                    <p>{error}</p>
                    <button type="button" className={styles.retry} onClick={() => void reload()}>
                        Try again
                    </button>
                </div>
            ) : isEmpty(rows) ? (
                <div className={styles.empty}>
                    <p>No activity yet</p>
                </div>
            ) : (
                <>
                    <div className={styles.list}>
                        {shown.map(row => {
                            const format = row.gameId ? gameFormats[row.gameId] : undefined;
                            const actionAmount = formatActionAmount(row.actionAmount, format);
                            const transferAmount = row.amount || row.transferAmount;
                            const href = row.linkTo ?? `/explorer/tx/${row.txhash}`;
                            const openRow = (event: MouseEvent) => {
                                if (isNestedControl(event)) return;
                                navigate(href);
                            };
                            return (
                                <div
                                    key={row.txhash}
                                    className={styles.row}
                                    data-testid="activity-row"
                                    onClick={openRow}
                                >
                                    <div className={styles.rowTop}>
                                        <span className={styles.label}>{rowLabel(row, format)}</span>
                                        <span className={`${styles.status} ${row.code === 0 ? styles.statusSuccess : styles.statusFailed}`}>
                                            {row.code === 0 ? "Success" : "Failed"}
                                        </span>
                                    </div>
                                    {hasContent(actionAmount) && (
                                        <div className={styles.amountRow}>
                                            <span className={styles.amount}>{actionAmount}</span>
                                            {hasContent(row.gameId) && <GameLink gameId={row.gameId} />}
                                        </div>
                                    )}
                                    {hasContent(transferAmount) && (
                                        <div className={styles.amountRow}>
                                            {row.transferDirection && (
                                                <span className={`text-xs ${getTransferDirectionClass(row.transferDirection)}`}>
                                                    {formatTransferDirection(row.transferDirection)}
                                                </span>
                                            )}
                                            <span className={styles.amount}>{formatMicroUsd(transferAmount)} USDC</span>
                                            {hasContent(row.gameId) && !hasContent(actionAmount) && <GameLink gameId={row.gameId} />}
                                        </div>
                                    )}
                                    <div className={styles.meta}>
                                        <Link to={href} className={styles.hash} onClick={event => event.stopPropagation()}>
                                            {formatShortHash(row.displayHash ?? row.txhash)}
                                        </Link>
                                        <span className={styles.time}>{formatTimestampRelative(row.timestamp)}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    {hasElements(rows) && (
                        <div className={styles.footer}>
                            {showLoadMore && (
                                <button
                                    type="button"
                                    className={styles.more}
                                    disabled={loadingMore}
                                    onClick={() => {
                                        if (canReveal) {
                                            setVisible(count => count + ACTIVITY_PAGE_SIZE);
                                            return;
                                        }
                                        void loadMore().then(() => setVisible(count => count + ACTIVITY_PAGE_SIZE));
                                    }}
                                >
                                    {loadingMore ? "Loading..." : "Load more"}
                                </button>
                            )}
                            <p className={styles.count}>
                                {hasMore ? `Showing ${shown.length}` : `Showing ${shown.length} of ${rows.length}`}
                            </p>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

const GameLink: FC<{ gameId: string }> = ({ gameId }) => (
    <Link to={tableUrl(gameId)} className={styles.gameLink} onClick={event => event.stopPropagation()}>
        Game: {formatGameId(gameId)}
    </Link>
);
