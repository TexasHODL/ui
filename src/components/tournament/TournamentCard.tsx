import React from "react";
import { Link } from "react-router-dom";
import { tableUrl, tournamentUrl } from "../../utils/tableUrl";
import { truncateMiddle } from "../../utils/stringUtils";
import { formatCountdown, formatStartsAt } from "../../utils/scheduledSng";
import { formatUsdc, phaseLabel, type TournamentLobbyCard } from "../../utils/tournamentLobby";

interface TournamentCardProps {
    card: TournamentLobbyCard;
    nowMs: number;
    onRegister: (card: TournamentLobbyCard) => void;
    onUnregister: (card: TournamentLobbyCard) => void;
}

const PILL_CLASS: Record<TournamentLobbyCard["phase"], string> = {
    open: "page-pill-open",
    full: "page-pill-full",
    starting: "page-pill-starting",
    running: "page-pill-running",
    finished: "page-pill-finished",
    cancelled: "page-pill-cancelled"
};

const Stat: React.FC<{ label: string; value: string; testId?: string }> = ({ label, value, testId }) => (
    <div>
        <div className="text-[11px] uppercase tracking-wide text-gray-400 font-bold">{label}</div>
        <div className="text-sm text-white font-medium" data-testid={testId}>
            {value}
        </div>
    </div>
);

/** One tournament in the lobby: the field, the clock, the money and the register / unregister action. */
export const TournamentCard: React.FC<TournamentCardProps> = ({ card, nowMs, onRegister, onUnregister }) => {
    const registering = card.phase === "open" || card.phase === "full";
    return (
        <div className="rounded-[14px] border border-white/10 bg-[#0c0911] p-4 flex flex-col gap-3" data-testid="tournament-card">
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                    <Link
                        to={tournamentUrl(card.tournamentId)}
                        className="block truncate text-white font-semibold hover:underline"
                        title={card.tournamentId}
                        data-testid="tournament-name-link"
                    >
                        Tournament {truncateMiddle(card.tournamentId, 8, 4, "…")}
                    </Link>
                    <div className="text-xs text-gray-400 font-bold">
                        {card.seatsPerTable}-max tables · {Number(card.startingStack).toLocaleString("en-US")} chips · {card.blindLabel}
                    </div>
                </div>
                <span className={`page-pill ${PILL_CLASS[card.phase]}`} data-testid="tournament-phase">
                    {phaseLabel(card.phase)}
                </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Stat label="Registered" value={`${card.registered} / ${card.maxEntrants}`} testId="tournament-registered" />
                <Stat label="Buy-in" value={formatUsdc(card.cost.gross)} testId="tournament-buyin" />
                <Stat
                    label={card.prizePoolIsProjected ? "Prize pool (so far)" : "Prize pool"}
                    value={formatUsdc(card.prizePoolMicro)}
                    testId="tournament-prizepool"
                />
                <Stat
                    label={registering ? "Starts in" : "Started"}
                    value={registering ? formatCountdown(card.startsAtMs, nowMs) : formatStartsAt(card.startsAtMs, nowMs)}
                    testId="tournament-countdown"
                />
            </div>

            <div className="text-xs text-gray-400 font-bold">
                Starts {formatStartsAt(card.startsAtMs, nowMs)} · needs {card.minEntrants} to run
                {card.atRiskOfCancelling && (
                    <span className="text-yellow-400" data-testid="tournament-at-risk">
                        {" "}
                        · {card.minEntrants - card.registered} more needed or it cancels
                    </span>
                )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
                {card.isRegistered && card.canUnregister ? (
                    <button type="button" onClick={() => onUnregister(card)} className="page-button" data-testid="tournament-unregister">
                        Unregister
                    </button>
                ) : card.isRegistered ? null : (
                    <button
                        type="button"
                        onClick={() => onRegister(card)}
                        disabled={!card.canRegister}
                        className="page-button-primary"
                        data-testid="tournament-register"
                    >
                        Register · {formatUsdc(card.cost.gross)}
                    </button>
                )}
                {card.myTable && (
                    <>
                        <Link to={tableUrl(card.myTable.gameId)} className="page-button-primary" data-testid="tournament-take-seat">
                            Take my seat
                        </Link>
                        <span className="text-xs text-purple-300 font-bold" data-testid="tournament-my-table">
                            You&apos;re at table {card.myTable.number}
                        </span>
                    </>
                )}
                {card.isRegistered && !card.myTable && (
                    <span className="text-xs text-purple-300 font-bold" data-testid="tournament-you-are-in">
                        You are registered
                    </span>
                )}
                {!card.canRegister && !card.isRegistered && card.registerBlockedReason && (
                    <span className="text-xs text-gray-400 font-bold">{card.registerBlockedReason}</span>
                )}
            </div>
        </div>
    );
};
