import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { AnimatedBackground } from "../components/common/AnimatedBackground";
import { PageHeading } from "../components/common/PageHeading";
import { ExplorerEmpty, ExplorerError, ExplorerLoading, ExplorerPanel } from "../components/explorer/ExplorerPanel";
import { ShareTournamentButton } from "../components/tournament/ShareTournamentButton";
import { TournamentPodium } from "../components/tournament/TournamentPodium";
import { useTournament } from "../hooks/tournament/useTournament";
import { useNow } from "../hooks/tournament/useTournamentLobby";
import { useTournamentActions } from "../hooks/tournament/useTournamentActions";
import { useCosmosWallet } from "../hooks/wallet/useCosmosWallet";
import { parseMicroToBigInt } from "../constants/currency";
import { hasElements, isNullish } from "@block52/ui-sdk/helpers";
import { MULTI_TABLE_TOURNAMENT_LABEL } from "../utils/createGameType";
import { displayTableName } from "../utils/generatedTableName";
import { formatStartsAt } from "../utils/scheduledSng";
import { tableUrl } from "../utils/tableUrl";
import { truncateMiddle } from "../utils/stringUtils";
import { buildTournamentCard, escrowStatement, formatUsdc, lobbyRunnersLabel, phaseLabel, type TournamentStateDTO as LobbyTournamentState } from "../utils/tournamentLobby";
import { liveTournamentTables, tournamentStandings } from "../utils/tournamentTables";
import { startCountdownText } from "../utils/tournamentStart";
import { tournamentSize } from "../utils/tournamentResult";
import { ordinalPlace } from "../utils/tournamentFinish";
import { tournamentTxError } from "../utils/tournamentTxError";
import { getCosmosAddressSync } from "../utils/cosmosAccountUtils";

/**
 * /tournament/:tournamentId — the registration landing for one multi-table
 * tournament: event details, fee breakdown, a shareable link, and Register & pay
 * (the same chain call the old confirm modal made). A seated player is sent to
 * their table; Take my seat remains as a fallback on the way there.
 */
export default function TournamentPage() {
    const { tournamentId } = useParams<{ tournamentId: string }>();
    const { tournament, isLoading, error, playersRemaining, level, refresh } = useTournament(tournamentId);
    const now = useNow(1000);
    const actions = useTournamentActions(refresh);
    const wallet = useCosmosWallet();
    const viewer = getCosmosAddressSync() ?? undefined;
    const [justRegistered, setJustRegistered] = useState(false);
    const [justUnregistered, setJustUnregistered] = useState(false);

    const card = useMemo(() => {
        if (!tournament) return null;
        return buildTournamentCard({ state: tournament as LobbyTournamentState, creator: "" }, viewer, now);
    }, [tournament, viewer, now]);

    const displayName = tournamentId ? displayTableName(card?.name, tournamentId) : "Tournament";

    const balanceMicro = useMemo(() => {
        const entry = wallet.balance.find(b => b.denom === "usdc");
        return entry ? parseMicroToBigInt(entry.amount) : 0n;
    }, [wallet.balance]);

    useEffect(() => {
        document.title = `${displayName} - Texas HODL`;
        return () => {
            document.title = "Texas HODL";
        };
    }, [displayName]);

    const showRegister = !!card && !card.isRegistered && (card.canRegister || card.registerBlockedReason === "Connect a wallet to register");
    const insufficientFunds = !!card && showRegister && card.canRegister && !wallet.isLoading && balanceMicro < card.cost.gross;
    const canPay = !!card && card.canRegister && !insufficientFunds && !actions.busy;
    const startingSoon = !!tournament && tournament.status === "registering" && now >= tournament.options.startTime;
    const statement = card ? escrowStatement(card.cost) : null;
    const actionError = actions.error ? tournamentTxError(actions.error) : null;
    const isRegistered = justUnregistered ? false : (!!card?.isRegistered || justRegistered);
    const isFinished = card?.phase === "finished";
    const headingDescription = isFinished
        ? "Event details and the finishing order."
        : card?.phase === "cancelled"
          ? "Event details."
          : "Event details, registration, and the tables still in play.";
    const remainingTables = tournament ? liveTournamentTables(tournament) : [];
    const remainderStandings = tournament ? tournamentStandings(tournament).filter(row => row.place >= 4) : [];
    const coversBuyIn = !!card && !wallet.isLoading && balanceMicro >= card.cost.gross;
    // Green when already registered, or when the wallet covers the buy-in.
    // Red only when the player is not registered and cannot cover it.
    const balanceTone: "enough" | "short" | "neutral" =
        !viewer || wallet.isLoading ? "neutral" : isRegistered || coversBuyIn ? "enough" : "short";
    const balanceClass =
        balanceTone === "enough"
            ? "tournament-balance-enough font-medium"
            : balanceTone === "short"
              ? "tournament-balance-short font-medium"
              : "text-white font-medium";

    const headingAction = tournamentId ? (
        <div className="flex flex-wrap items-center gap-2">
            <ShareTournamentButton tournamentId={tournamentId} name={card?.name} />
            {card?.myTable && (
                <Link to={tableUrl(card.myTable.gameId)} className="page-button-primary" data-testid="tournament-take-seat">
                    Take my seat
                </Link>
            )}
        </div>
    ) : undefined;

    const onRegister = async () => {
        if (!tournamentId || !canPay) return;
        setJustUnregistered(false);
        const ok = await actions.register(tournamentId);
        if (ok) {
            setJustRegistered(true);
            void wallet.refreshBalance();
        }
    };

    const onUnregister = async () => {
        if (!tournamentId || actions.busy) return;
        const ok = await actions.unregister(tournamentId);
        if (ok) {
            setJustRegistered(false);
            setJustUnregistered(true);
            void wallet.refreshBalance();
        }
    };

    if (card?.myTable) {
        return (
            <div className="site-page">
                <AnimatedBackground />
                <div className="site-page-content">
                    <Navigate to={tableUrl(card.myTable.gameId)} replace />
                    <PageHeading title={displayName} eyebrow={MULTI_TABLE_TOURNAMENT_LABEL} backTo="/tournaments" backLabel="Tournaments" />
                    <p className="text-sm text-purple-300 font-bold" data-testid="tournament-redirecting">
                        You&apos;re at table {card.myTable.number}. Taking you there…
                    </p>
                    <Link to={tableUrl(card.myTable.gameId)} className="page-button-primary inline-flex mt-3" data-testid="tournament-take-seat">
                        Take my seat
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="site-page">
            <AnimatedBackground />
            <div className="site-page-content">
                <PageHeading
                    title={displayName}
                    eyebrow={MULTI_TABLE_TOURNAMENT_LABEL}
                    description={headingDescription}
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
                        {justRegistered && (
                            <p role="status" className="text-sm text-purple-300 font-bold" data-testid="tournament-register-success">
                                You&apos;re registered. You can unregister until the tournament starts.
                            </p>
                        )}
                        {justUnregistered && !isRegistered && (
                            <p role="status" className="text-sm text-purple-300 font-bold" data-testid="tournament-unregister-success">
                                You are no longer registered. The escrowed amount is being returned to your wallet.
                            </p>
                        )}

                        <ExplorerPanel header="Status">
                            <dl className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm" data-testid="tournament-summary">
                                <div>
                                    <dt className="text-gray-400 font-bold">Status</dt>
                                    <dd className="text-white" data-testid="tournament-page-status">
                                        {card ? phaseLabel(card.phase) : startingSoon ? "Starting" : tournament.status}
                                    </dd>
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
                                        {card
                                            ? lobbyRunnersLabel(card)
                                            : tournament.status === "registering"
                                              ? `${tournamentSize(tournament)} / ${tournament.options.maxEntrants}`
                                              : `${playersRemaining} left of ${tournamentSize(tournament)}`}
                                    </dd>
                                </div>
                                {card?.winnerAddress && (
                                    <div>
                                        <dt className="text-gray-400 font-bold">Winner</dt>
                                        <dd className="text-white font-mono" data-testid="tournament-page-winner">
                                            {truncateMiddle(card.winnerAddress, 8, 4)}
                                        </dd>
                                    </div>
                                )}
                                {tournament.status === "registering" ? (
                                    <div>
                                        <dt className="text-gray-400 font-bold">Starts in</dt>
                                        <dd className="text-white" data-testid="tournament-start-countdown">
                                            {startingSoon ? "Any moment" : startCountdownText(tournament.options.startTime, now)}
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
                                    <div>
                                        <dt className="text-gray-400 font-bold">Starting stack</dt>
                                        <dd className="text-white" data-testid="tournament-page-stack">
                                            {Number(card.startingStack).toLocaleString("en-US")} chips
                                        </dd>
                                    </div>
                                )}
                                {card && (
                                    <div className="col-span-2">
                                        <dt className="text-gray-400 font-bold">Blinds</dt>
                                        <dd className="text-white" data-testid="tournament-page-blinds">
                                            {card.blindLabel}
                                        </dd>
                                    </div>
                                )}
                                {card && (
                                    <div className="col-span-2 sm:col-span-4 text-xs text-gray-400 font-bold">
                                        Starts {formatStartsAt(card.startsAtMs, now)} · {card.seatsPerTable}-max tables · needs {card.minEntrants} to run
                                        {card.atRiskOfCancelling && (
                                            <span className="text-yellow-400">
                                                {" "}
                                                · {card.minEntrants - card.registered} more needed or it cancels
                                            </span>
                                        )}
                                        {startingSoon && (
                                            <span className="text-purple-300" data-testid="tournament-starting-note">
                                                {" "}
                                                · Tables will appear when the tournament begins.
                                            </span>
                                        )}
                                    </div>
                                )}
                            </dl>
                        </ExplorerPanel>

                        {card && (showRegister || isRegistered || card.canUnregister) && (
                            <ExplorerPanel header="Registration">
                                <div className="p-4 text-sm space-y-3" data-testid="tournament-registration">
                                    <div className="flex justify-between gap-3">
                                        <span className="text-gray-400">Buy-in</span>
                                        <span className="text-white font-medium">{formatUsdc(card.cost.gross)}</span>
                                    </div>
                                    {card.cost.entryFee > 0n && (
                                        <div className="flex justify-between gap-3">
                                            <span className="text-gray-400">Entry fee (to the creator, inside the buy-in)</span>
                                            <span className="text-white" data-testid="tournament-page-entry-fee">
                                                {formatUsdc(card.cost.entryFee)}
                                            </span>
                                        </div>
                                    )}
                                    {card.cost.protocolCut > 0n && (
                                        <div className="flex justify-between gap-3">
                                            <span className="text-gray-400">Protocol fee (inside the buy-in)</span>
                                            <span className="text-white" data-testid="tournament-page-protocol-fee">
                                                {formatUsdc(card.cost.protocolCut)}
                                            </span>
                                        </div>
                                    )}
                                    <div className="flex justify-between gap-3">
                                        <span className="text-gray-400">{isRegistered ? "Held in escrow (refunded if you unregister)" : "Held in escrow for the prize pool"}</span>
                                        <span className="text-white font-medium" data-testid="tournament-page-escrow">
                                            {formatUsdc(card.cost.net)}
                                        </span>
                                    </div>
                                    {statement && (
                                        <p className="text-xs text-gray-400" data-testid="tournament-escrow-statement">
                                            {isRegistered ? statement.unregister : statement.register}
                                        </p>
                                    )}
                                    {viewer && (
                                        <div className="flex justify-between gap-3" data-testid="tournament-page-balance">
                                            <span className="text-gray-400">Your balance</span>
                                            <span
                                                className={balanceClass}
                                                data-testid="tournament-page-balance-amount"
                                                data-balance-tone={balanceTone}
                                            >
                                                {wallet.isLoading ? "Loading…" : formatUsdc(balanceMicro)}
                                            </span>
                                        </div>
                                    )}
                                    {insufficientFunds && (
                                        <p className="text-sm text-red-400 font-bold" data-testid="tournament-insufficient-funds">
                                            Not enough funds. You need {formatUsdc(card.cost.gross)} and your balance is {formatUsdc(balanceMicro)}.{" "}
                                            <Link to="/wallet" className="underline hover:text-red-300">
                                                Add funds
                                            </Link>
                                        </p>
                                    )}
                                    {card && !card.canRegister && !isRegistered && card.registerBlockedReason && (
                                        <p className="text-xs text-gray-400 font-bold" data-testid="tournament-register-blocked">
                                            {card.registerBlockedReason}
                                        </p>
                                    )}
                                    {isRegistered && (
                                        <p className="text-xs text-purple-300 font-bold" data-testid="tournament-you-are-in">
                                            You&apos;re registered
                                        </p>
                                    )}
                                    {actionError && (
                                        <div className="text-sm text-red-400 font-bold" role="alert" data-testid="tournament-action-error">
                                            <p>{actionError.message}</p>
                                            {actionError.detail && (
                                                <p className="mt-1 text-xs font-medium text-red-400/80" data-testid="tournament-action-error-detail">
                                                    {actionError.detail}
                                                </p>
                                            )}
                                        </div>
                                    )}
                                    <div className="flex flex-wrap items-center justify-end gap-2 pt-1" data-testid="tournament-registration-actions">
                                        {showRegister && (
                                            <button
                                                type="button"
                                                onClick={() => void onRegister()}
                                                disabled={!canPay}
                                                className="page-button-primary"
                                                data-testid="tournament-register"
                                            >
                                                {actions.busy ? "Waiting for the chain…" : `Register & pay · ${formatUsdc(card.cost.gross)}`}
                                            </button>
                                        )}
                                        {card.canUnregister && (
                                            <button
                                                type="button"
                                                onClick={() => void onUnregister()}
                                                disabled={actions.busy}
                                                className="page-button"
                                                data-testid="tournament-unregister"
                                            >
                                                {actions.busy ? "Waiting for the chain…" : "Unregister"}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </ExplorerPanel>
                        )}

                        <ExplorerPanel header="Tables">
                            {hasElements(remainingTables) ? (
                                <ul className="divide-y divide-white/10">
                                    {remainingTables.map(row => (
                                        <li key={row.gameId} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                                            <span className="text-white min-w-0">
                                                {isFinished ? (
                                                    <span data-testid={`tournament-final-table-${row.number}`}>
                                                        {remainingTables.length === 1 ? "Final table" : `Final table ${row.number}`}
                                                    </span>
                                                ) : (
                                                    <>
                                                        Table {row.number}{" "}
                                                        <span className="text-gray-400">
                                                            ({row.players} players, hand {row.handNumber})
                                                        </span>
                                                    </>
                                                )}
                                            </span>
                                            <Link to={row.url} className="text-purple-300 font-bold hover:underline shrink-0" data-testid={`tournament-table-${row.number}`}>
                                                Watch
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <ExplorerEmpty>
                                    {isFinished
                                        ? "No table remains to review."
                                        : tournament.status === "registering"
                                          ? "Tables are drawn when the tournament starts."
                                          : "No tables are playing."}
                                </ExplorerEmpty>
                            )}
                        </ExplorerPanel>

                        {hasElements(tournament.results) && (
                            <ExplorerPanel header="Finished">
                                <TournamentPodium standings={tournamentStandings(tournament)} viewer={viewer} />
                                {hasElements(remainderStandings) && (
                                    <table className="w-full" data-testid="tournament-standings">
                                        <thead>
                                            <tr className="text-xs font-semibold uppercase tracking-wide text-gray-400" data-testid="tournament-standings-header">
                                                <th scope="col" className="px-4 py-2 text-left font-semibold">
                                                    Place
                                                </th>
                                                <th scope="col" className="px-4 py-2 text-left font-semibold">
                                                    Player
                                                </th>
                                                <th scope="col" className="px-4 py-2 text-right font-semibold">
                                                    Prize
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {remainderStandings.map(row => {
                                                const isViewer = row.address.toLowerCase() === viewer?.toLowerCase();
                                                const paid = row.payout !== "0";
                                                return (
                                                    <tr key={`${row.place}-${row.address}`} className="border-t border-white/10 text-sm">
                                                        <td className={`px-4 py-2 whitespace-nowrap ${isViewer ? "text-purple-300 font-semibold" : "text-white"}`}>
                                                            {ordinalPlace(row.place)}
                                                        </td>
                                                        <td className={`px-4 py-2 min-w-0 ${isViewer ? "text-purple-300 font-semibold" : "text-white"}`}>
                                                            <span className="font-mono" title={row.address}>
                                                                {truncateMiddle(row.address, 10, 6)}
                                                            </span>
                                                        </td>
                                                        <td
                                                            className={`px-4 py-2 text-right shrink-0 tabular-nums ${paid ? "tournament-balance-enough font-medium" : "text-gray-300"}`}
                                                            data-testid={`tournament-standing-prize-${row.place}`}
                                                        >
                                                            {paid ? formatUsdc(BigInt(row.payout)) : ""}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                )}
                            </ExplorerPanel>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
