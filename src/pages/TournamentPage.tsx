import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AnimatedBackground } from "../components/common/AnimatedBackground";
import { PageHeading } from "../components/common/PageHeading";
import { ExplorerEmpty, ExplorerError, ExplorerLoading, ExplorerPanel } from "../components/explorer/ExplorerPanel";
import { ShareTournamentButton } from "../components/tournament/ShareTournamentButton";
import { TournamentRegisterModal } from "../components/tournament/TournamentRegisterModal";
import { useTournament } from "../hooks/tournament/useTournament";
import { useNow } from "../hooks/tournament/useTournamentLobby";
import { useTournamentActions } from "../hooks/tournament/useTournamentActions";
import { hasElements, isNullish } from "../utils/guards";
import { displayTableName } from "../utils/generatedTableName";
import { formatStartsAt } from "../utils/scheduledSng";
import { tableUrl } from "../utils/tableUrl";
import { buildTournamentCard, formatUsdc, type TournamentStateDTO as LobbyTournamentState } from "../utils/tournamentLobby";
import { liveTournamentTables, tournamentStandings } from "../utils/tournamentTables";
import { startCountdownText } from "../utils/tournamentStart";
import { tournamentSize } from "../utils/tournamentResult";
import { getCosmosAddressSync } from "../utils/cosmosAccountUtils";

/**
 * /tournament/:tournamentId — the registration landing for one multi-table
 * tournament: event details, a shareable link, Register (the existing confirm
 * modal), and Take my seat once the viewer is playing.
 */
export default function TournamentPage() {
    const { tournamentId } = useParams<{ tournamentId: string }>();
    const { tournament, isLoading, error, playersRemaining, level, refresh } = useTournament(tournamentId);
    const now = useNow(1000);
    const actions = useTournamentActions(refresh);
    const [pending, setPending] = useState<"register" | "unregister" | null>(null);
    const viewer = getCosmosAddressSync() ?? undefined;

    const card = useMemo(() => {
        if (!tournament) return null;
        return buildTournamentCard({ state: tournament as LobbyTournamentState, creator: "" }, viewer, now);
    }, [tournament, viewer, now]);

    const displayName = tournamentId ? displayTableName(card?.name, tournamentId) : "Tournament";

    useEffect(() => {
        document.title = `${displayName} - Texas HODL`;
        return () => {
            document.title = "Texas HODL";
        };
    }, [displayName]);

    const showRegister = !!card && !card.isRegistered && (card.canRegister || card.registerBlockedReason === "Connect a wallet to register");

    const headingAction = tournamentId ? (
        <div className="flex flex-wrap items-center gap-2">
            <ShareTournamentButton tournamentId={tournamentId} name={card?.name} />
            {card?.myTable && (
                <Link to={tableUrl(card.myTable.gameId)} className="page-button-primary" data-testid="tournament-take-seat">
                    Take my seat
                </Link>
            )}
            {card?.canUnregister && (
                <button type="button" onClick={() => setPending("unregister")} className="page-button" data-testid="tournament-unregister">
                    Unregister
                </button>
            )}
            {showRegister && (
                <button
                    type="button"
                    onClick={() => setPending("register")}
                    disabled={!card.canRegister}
                    className="page-button-primary"
                    data-testid="tournament-register"
                >
                    Register · {formatUsdc(card.cost.gross)}
                </button>
            )}
        </div>
    ) : undefined;

    const confirm = async () => {
        if (!pending || !tournamentId) return;
        const ok = pending === "register" ? await actions.register(tournamentId) : await actions.unregister(tournamentId);
        if (ok) setPending(null);
    };

    return (
        <div className="site-page">
            <AnimatedBackground />
            <div className="site-page-content">
                <PageHeading
                    title={displayName}
                    eyebrow="TOURNAMENT"
                    description="Event details, registration, and the tables still in play."
                    backTo="/tournaments"
                    backLabel="Tournaments"
                    action={headingAction}
                />

                {isNullish(tournament) ? (
                    isLoading ? (
                        <ExplorerLoading label="Loading tournament…" />
                    ) : error ? (
                        <ExplorerError>{error.message}</ExplorerError>
                    ) : (
                        <ExplorerEmpty>This tournament was not found.</ExplorerEmpty>
                    )
                ) : (
                    <div className="space-y-4">
                        <ExplorerPanel header="Status">
                            <dl className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm" data-testid="tournament-summary">
                                <div>
                                    <dt className="text-gray-400 font-bold">Status</dt>
                                    <dd className="text-white capitalize">{tournament.status}</dd>
                                </div>
                                <div>
                                    <dt className="text-gray-400 font-bold">Buy-in</dt>
                                    <dd className="text-white" data-testid="tournament-page-buyin">
                                        {card ? formatUsdc(card.cost.gross) : "—"}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-gray-400 font-bold">Runners</dt>
                                    <dd className="text-white" data-testid="tournament-page-runners">
                                        {tournament.status === "registering"
                                            ? `${tournamentSize(tournament)} / ${tournament.options.maxEntrants}`
                                            : `${playersRemaining} left of ${tournamentSize(tournament)}`}
                                    </dd>
                                </div>
                                {tournament.status === "registering" ? (
                                    <div>
                                        <dt className="text-gray-400 font-bold">Starts in</dt>
                                        <dd className="text-white" data-testid="tournament-start-countdown">
                                            {startCountdownText(tournament.options.startTime, now)}
                                        </dd>
                                    </div>
                                ) : (
                                    <div>
                                        <dt className="text-gray-400 font-bold">Level</dt>
                                        <dd className="text-white">{isNullish(level) ? "-" : level + 1}</dd>
                                    </div>
                                )}
                                <div>
                                    <dt className="text-gray-400 font-bold">{card?.prizePoolIsProjected ? "Prize pool (so far)" : "Prize pool"}</dt>
                                    <dd className="text-white" data-testid="tournament-page-prizepool">
                                        {card ? formatUsdc(card.prizePoolMicro) : "—"}
                                    </dd>
                                </div>
                                {card && (
                                    <div className="col-span-2 sm:col-span-4 text-xs text-gray-400 font-bold">
                                        Starts {formatStartsAt(card.startsAtMs, now)} · {card.seatsPerTable}-max tables · needs {card.minEntrants} to run
                                        {card.atRiskOfCancelling && (
                                            <span className="text-yellow-400">
                                                {" "}
                                                · {card.minEntrants - card.registered} more needed or it cancels
                                            </span>
                                        )}
                                    </div>
                                )}
                            </dl>
                            <div className="px-4 pb-4 flex flex-wrap items-center gap-2">
                                {card?.myTable && (
                                    <span className="text-xs text-purple-300 font-bold" data-testid="tournament-my-table">
                                        You&apos;re at table {card.myTable.number}
                                    </span>
                                )}
                                {card?.isRegistered && !card.myTable && (
                                    <span className="text-xs text-purple-300 font-bold" data-testid="tournament-you-are-in">
                                        You are registered
                                    </span>
                                )}
                                {card && !card.canRegister && !card.isRegistered && card.registerBlockedReason && (
                                    <span className="text-xs text-gray-400 font-bold" data-testid="tournament-register-blocked">
                                        {card.registerBlockedReason}
                                    </span>
                                )}
                            </div>
                        </ExplorerPanel>

                        <ExplorerPanel header="Tables">
                            {hasElements(liveTournamentTables(tournament)) ? (
                                <ul className="divide-y divide-white/10">
                                    {liveTournamentTables(tournament).map(row => (
                                        <li key={row.gameId} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                                            <span className="text-white min-w-0">
                                                Table {row.number}{" "}
                                                <span className="text-gray-400">
                                                    ({row.players} players, hand {row.handNumber})
                                                </span>
                                            </span>
                                            <Link to={row.url} className="text-purple-300 font-bold hover:underline shrink-0" data-testid={`tournament-table-${row.number}`}>
                                                Watch
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <ExplorerEmpty>{tournament.status === "registering" ? "Tables are drawn when the tournament starts." : "No tables are playing."}</ExplorerEmpty>
                            )}
                        </ExplorerPanel>

                        {hasElements(tournament.results) && (
                            <ExplorerPanel header="Finished">
                                <ol className="divide-y divide-white/10" data-testid="tournament-standings">
                                    {tournamentStandings(tournament).map(row => (
                                        <li key={`${row.place}-${row.address}`} className="flex items-center justify-between px-4 py-2 text-sm">
                                            <span className={`min-w-0 ${row.address.toLowerCase() === viewer?.toLowerCase() ? "text-purple-300 font-semibold" : "text-white"}`}>
                                                {row.place}. <span className="font-mono break-all">{row.address}</span>
                                            </span>
                                            <span className="ml-3 shrink-0 text-gray-300">{row.payout !== "0" ? formatUsdc(BigInt(row.payout)) : ""}</span>
                                        </li>
                                    ))}
                                </ol>
                            </ExplorerPanel>
                        )}
                    </div>
                )}

                <TournamentRegisterModal
                    card={pending ? card : null}
                    mode={pending ?? "register"}
                    busy={actions.busy}
                    error={actions.error}
                    onConfirm={() => void confirm()}
                    onClose={() => {
                        if (!actions.busy) {
                            setPending(null);
                            actions.clearError();
                        }
                    }}
                />
            </div>
        </div>
    );
}
