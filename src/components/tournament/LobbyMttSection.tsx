import React, { useCallback, useState } from "react";
import { Link } from "react-router-dom";
import { CreateTournamentModal } from "./CreateTournamentModal";
import { TournamentCard } from "./TournamentCard";
import { TournamentRegisterModal } from "./TournamentRegisterModal";
import { useNow } from "../../hooks/tournament/useTournamentLobby";
import { useTournamentActions } from "../../hooks/tournament/useTournamentActions";
import { hasElements, hasValue, isEmpty, isNullish } from "../../utils/guards";
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
 * Multi-table tournaments on the lobby's Sit & Go tab. The cards and the
 * register, unregister and create dialogs are the ones from /tournaments;
 * this only places them above the sit-and-go table list.
 */
export const LobbyMttSection: React.FC<LobbyMttSectionProps> = ({ cards, isLoading, error, failedCount, onRefresh }) => {
    const { busy, error: actionError, clearError, register, unregister, create } = useTournamentActions(onRefresh);
    const now = useNow(1000);
    const [pending, setPending] = useState<PendingAction | null>(null);
    const [creating, setCreating] = useState(false);
    const [createdId, setCreatedId] = useState<string | null>(null);
    const showCards = !error && hasElements(cards);

    const closeModals = useCallback(() => {
        setPending(null);
        setCreating(false);
        clearError();
    }, [clearError]);

    const confirm = async () => {
        if (isNullish(pending)) return;
        const ok = pending.mode === "register" ? await register(pending.card.tournamentId) : await unregister(pending.card.tournamentId);
        if (ok) setPending(null);
    };

    const createButton = (
        <button type="button" className={styles.create} onClick={() => setCreating(true)} data-testid="open-create-tournament">
            Create tournament
        </button>
    );

    let status: string | null = null;
    if (isLoading && isEmpty(cards)) status = "Loading tournaments…";
    else if (error) status = error;
    else if (isEmpty(cards)) status = "No multi-table tournaments yet";

    return (
        <section className={styles.section} aria-label="Multi-table tournaments" data-testid="lobby-mtt-section">
            <div className={styles.header}>
                <h2>Multi-table tournaments</h2>
                <Link to="/tournaments" className={styles.viewAll}>
                    View all
                </Link>
                {showCards && createButton}
            </div>

            {hasValue(createdId) && (
                <p role="status" className={styles.created} data-testid="tournament-created-note">
                    Tournament created. Players can register now.
                </p>
            )}

            {hasValue(status) ? (
                <div className={styles.empty} data-testid="lobby-mtt-empty">
                    <p>{status}</p>
                    <div className={styles.emptyActions}>
                        {error && (
                            <button type="button" className={styles.secondary} onClick={() => void onRefresh()}>
                                Try again
                            </button>
                        )}
                        {createButton}
                    </div>
                </div>
            ) : (
                <div className={styles.grid}>
                    {cards.map(card => (
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
            <CreateTournamentModal
                isOpen={creating}
                busy={busy}
                error={actionError}
                onSubmit={async params => {
                    const id = await create(params);
                    if (hasValue(id)) {
                        setCreatedId(id);
                        setCreating(false);
                    }
                }}
                onClose={closeModals}
            />
        </section>
    );
};
