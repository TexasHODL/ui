import React from "react";
import { FaArrowRight } from "react-icons/fa";
import styles from "../TableList.module.css";
import { hasValue } from "../../utils/guards";
import { truncateMiddle } from "../../utils/stringUtils";
import { lobbyTournamentAction, tournamentListRow } from "../../utils/tournamentListRow";
import type { TournamentLobbyCard } from "../../utils/tournamentLobby";

/**
 * One row per multi-table tournament in the Texas HODL lobby table.
 * Directed tables themselves are not listed; this row is the tournament.
 */
export const LobbyTournamentRows: React.FC<{ cards: TournamentLobbyCard[] }> = ({ cards }) => (
    <>
        {cards.map(card => {
            const row = tournamentListRow(card);
            const action = lobbyTournamentAction(card);
            return (
                <tr key={card.tournamentId} data-testid="lobby-tournament-row" className={hasValue(action.seatedAt) ? styles.seatedRow : undefined}>
                    <td>
                        <div className={styles.tableIdentity}>
                            <span className={styles.tableGlyph} aria-hidden="true">♛</span>
                            <div className={styles.identityText}>
                                <strong>Tournament {truncateMiddle(card.tournamentId, 4, 4)}</strong>
                                {hasValue(action.seatedAt) && (
                                    <span className={styles.seatedBadge} data-testid="lobby-tournament-seat">
                                        You&apos;re at table {action.seatedAt}
                                    </span>
                                )}
                                <span>
                                    <span data-testid="lobby-format">Tournament</span>
                                    {" · "}
                                    {card.seatsPerTable}-max tables
                                </span>
                                <span className={styles.mobileFacts}>
                                    {row.buyIn} buy-in · {row.runners} runners
                                </span>
                            </div>
                        </div>
                    </td>
                    <td className={styles.stakesColumn}>
                        <strong>Tournament</strong>
                        <span className={styles.detail}>Fixed entry</span>
                    </td>
                    <td>
                        <div className={styles.seatCount}>
                            <strong data-testid="lobby-tournament-runners">{row.runners}</strong>
                            <span className={styles.detail}>runners</span>
                        </div>
                    </td>
                    <td className={styles.buyInColumn}>
                        <strong>{row.buyIn}</strong>
                    </td>
                    <td>
                        <div className={styles.rowActions}>
                            <a
                                href={action.url}
                                className={styles.actionButton}
                                aria-label={`${action.label} tournament ${card.tournamentId}`}
                            >
                                <span>{action.label}</span>
                                <FaArrowRight aria-hidden="true" />
                            </a>
                            <span className={styles.ownerSlot} aria-hidden="true" />
                        </div>
                    </td>
                </tr>
            );
        })}
    </>
);
