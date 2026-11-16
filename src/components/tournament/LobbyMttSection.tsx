import React from "react";
import { TournamentCard } from "./TournamentCard";
import { useNow } from "../../hooks/tournament/useTournamentLobby";
import { hasElements, isEmpty } from "../../utils/guards";
import type { TournamentLobbyCard } from "../../utils/tournamentLobby";
import styles from "./LobbyMttSection.module.css";

interface LobbyMttSectionProps {
    cards: TournamentLobbyCard[];
    isLoading: boolean;
    error: string | null;
    failedCount: number;
    onRefresh: () => Promise<void>;
}

/**
 * Multi-table tournaments on the lobby's Tournaments tab. Register and
 * unregister happen on the tournament's own page.
 */
export const LobbyMttSection: React.FC<LobbyMttSectionProps> = ({ cards, isLoading, error, failedCount, onRefresh }) => {
    const now = useNow(1000);

    let status: string | null = null;
    if (isLoading && isEmpty(cards)) status = "Loading tournaments…";
    else if (error) status = error;
    else if (isEmpty(cards)) status = "No multi-table tournaments yet";

    return (
        <section className={styles.section} aria-label="Multi-table tournaments" data-testid="lobby-mtt-section">
            {status ? (
                <div className={styles.empty} data-testid="lobby-mtt-empty">
                    <p>{status}</p>
                    {error && (
                        <button type="button" className={styles.secondary} onClick={() => void onRefresh()}>
                            Try again
                        </button>
                    )}
                </div>
            ) : (
                <div className={styles.grid}>
                    {hasElements(cards) && cards.map(card => <TournamentCard key={card.tournamentId} card={card} nowMs={now} />)}
                </div>
            )}

            {failedCount > 0 && !error && (
                <p role="status" className={styles.failed}>
                    {failedCount} {failedCount === 1 ? "tournament" : "tournaments"} could not be read and {failedCount === 1 ? "is" : "are"} not shown.
                </p>
            )}
        </section>
    );
};
