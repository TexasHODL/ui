import React, { useCallback, useState } from "react";
import { TournamentCard } from "./TournamentCard";
import { TournamentRegisterModal } from "./TournamentRegisterModal";
import { useNow } from "../../hooks/tournament/useTournamentLobby";
import { useTournamentActions } from "../../hooks/tournament/useTournamentActions";
import { hasElements, isEmpty, isNullish } from "../../utils/guards";
import type { TournamentLobbyCard } from "../../utils/tournamentLobby";
import styles from "./LobbyMttSection.module.css";

interface PendingAction {
    card: TournamentLobbyCard;
    mode: "register" | "unregister";
}

interface LobbyMttSectionProps {
    cards: TournamentLobbyCard[];
    isLoading: boolean;
    error: string | null;
    failedCount: number;
    onRefresh: () => Promise<void>;
}

/**
 * Multi-table tournaments on the lobby's Tournaments tab. The cards and the
 * register / unregister dialogs are the ones from /tournaments.
 */
export const LobbyMttSection: React.FC<LobbyMttSectionProps> = ({ cards, isLoading, error, failedCount, onRefresh }) => {
    const { busy, error: actionError, clearError, register, unregister } = useTournamentActions(onRefresh);
    const now = useNow(1000);
    const [pending, setPending] = useState<PendingAction | null>(null);

    const closeModals = useCallback(() => {
        setPending(null);
        clearError();
    }, [clearError]);

    const confirm = async () => {
        if (isNullish(pending)) return;
        const ok = pending.mode === "register" ? await register(pending.card.tournamentId) : await unregister(pending.card.tournamentId);
        if (ok) setPending(null);
    };

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
                    {hasElements(cards) &&
                        cards.map(card => (
                            <TournamentCard
                                key={card.tournamentId}
                                card={card}
                                nowMs={now}
                                onRegister={c => setPending({ card: c, mode: "register" })}
                                onUnregister={c => setPending({ card: c, mode: "unregister" })}
                            />
                        ))}
                </div>
            )}

            {failedCount > 0 && !error && (
                <p role="status" className={styles.failed}>
                    {failedCount} {failedCount === 1 ? "tournament" : "tournaments"} could not be read and {failedCount === 1 ? "is" : "are"} not shown.
                </p>
            )}

            <TournamentRegisterModal
                card={pending?.card ?? null}
                mode={pending?.mode ?? "register"}
                busy={busy}
                error={actionError}
                onConfirm={confirm}
                onClose={closeModals}
            />
        </section>
    );
};
