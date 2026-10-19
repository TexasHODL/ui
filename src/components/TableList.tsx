import { formatMicroUsd } from "../utils/moneyDisplay";
import React, { useEffect, useMemo, useState } from "react";
import { FaSearch, FaRedo, FaPlus, FaArrowRight, FaEye, FaShareAlt } from "react-icons/fa";
import { scheduledLobbyLabel, scheduledSngPhase, type ScheduledSngPhase } from "../utils/scheduledSng";
import { useFindGames, GameWithFormat, treasuryAddress } from "../hooks/game/useFindGames";
import { useDeleteGame } from "../hooks/game/useDeleteGame";
import { useForceCloseGame } from "../hooks/game/useForceCloseGame";
import useCosmosWallet from "../hooks/wallet/useCosmosWallet";
import { useLobbySeats } from "../hooks/game/useLobbySeats";
import { useLobbyTournamentStarted, type LobbyTournamentMark } from "../hooks/game/useLobbyTournamentStarted";

import { isCashFormat, isTournamentFormat, formatGameFormatDisplay, formatTableGameDisplay, toGameVariant } from "../utils/gameFormatUtils";
import { displayGameFormat } from "../utils/createGameType";
import { copyToClipboard } from "../utils/clipboard";
import { displayTableName } from "../utils/generatedTableName";
import { filterLobbyGames, LobbyFormat, LobbySort } from "../utils/lobbyFilters";
import DeleteTableModal from "./modals/DeleteTableModal";
import ForceCloseTableModal from "./modals/ForceCloseTableModal";
import { Pagination } from "./common";
import styles from "./TableList.module.css";

const PAGE_SIZE = 10;
const formats: { value: LobbyFormat; label: string }[] = [
    { value: "all", label: "All games" },
    { value: "cash", label: "Cash games" },
    { value: "tournament", label: "Sit & Go / tournaments" }
];

const formatBuyIn = (game: GameWithFormat) => {
    const min = "$" + formatMicroUsd(game.minBuyIn);
    return isTournamentFormat(game.gameFormat) ? min : min + " – $" + formatMicroUsd(game.maxBuyIn);
};

interface TableListProps {
    onCreateTable?: () => void;
    compact?: boolean;
    refreshKey?: number | string;
}

/** A scheduled sit-and-go's phase at render time (poker-vm#2680). */
const scheduledPhase = (game: GameWithFormat): ScheduledSngPhase =>
    scheduledSngPhase({ scheduledStartTime: game.scheduledStartTime, minPlayers: game.minPlayers, registered: game.currentPlayers, nowMs: Date.now() });

/** "Starts 20:30 · min 4", "Starting", "Started", "Finished", or "Cancelled…" for a scheduled sit-and-go. */
const scheduledLabel = (game: GameWithFormat, mark: LobbyTournamentMark | undefined): string =>
    scheduledLobbyLabel({
        phase: scheduledPhase(game),
        scheduledStartTime: game.scheduledStartTime,
        minPlayers: game.minPlayers,
        started: mark === "started" || mark === "finished",
        finished: mark === "finished"
    });

const TableList: React.FC<TableListProps> = ({ onCreateTable, compact = false, refreshKey = 0 }) => {
    const { games: rawGames, isLoading, error, refetch } = useFindGames();
    const { deleteGame, isDeleting } = useDeleteGame();
    const { forceCloseGame, isClosing } = useForceCloseGame();
    const { address } = useCosmosWallet();
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [closeTarget, setCloseTarget] = useState<GameWithFormat | null>(null);
    const [format, setFormat] = useState<LobbyFormat>("all");
    const [search, setSearch] = useState("");
    const [openOnly, setOpenOnly] = useState(false);
    const [treasuryOnly, setTreasuryOnly] = useState(!!treasuryAddress);
    const [ownedOnly, setOwnedOnly] = useState(false);
    const [sort, setSort] = useState<LobbySort>("activity");
    const [page, setPage] = useState(1);
    useEffect(() => { if (refreshKey) void refetch(); }, [refreshKey, refetch]);

    const clubGames = useMemo(
        () => ownedOnly ? rawGames.filter(game => !!address && game.creator?.toLowerCase() === address.toLowerCase()) :
            (treasuryOnly && treasuryAddress ? rawGames.filter(game => game.creator === treasuryAddress) : rawGames),
        [rawGames, treasuryOnly, ownedOnly, address]
    );
    const games = useMemo(() => filterLobbyGames(clubGames, { format, search, openOnly, sort }), [clubGames, format, search, openOnly, sort]);
    const currentPage = Math.min(page, Math.max(1, Math.ceil(games.length / PAGE_SIZE)));
    const pagedGames = games.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
    const mySeats = useLobbySeats(pagedGames.filter(game => game.currentPlayers > 0).map(game => game.gameId).join(","), address, rawGames);
    const startedTables = useLobbyTournamentStarted(
        pagedGames.filter(game => scheduledPhase(game) !== "unscheduled").map(game => game.gameId).join(","),
        rawGames
    );
    const occupiedSeats = clubGames.reduce((sum, game) => sum + game.currentPlayers, 0);
    const availableSeats = clubGames.reduce((sum, game) => sum + Math.max(0, game.maxPlayers - game.currentPlayers), 0);
    const hasFilters = format !== "all" || !!search || openOnly || ownedOnly;
    const clearFilters = () => {
        setFormat("all");
        setSearch("");
        setOpenOnly(false);
        setOwnedOnly(false);
        setPage(1);
    };

    return (
        <section className={styles.panel} aria-label="Poker lobby">
            <div className={styles.overview}>
                <div>
                    {!compact && <div className={styles.eyebrow}>THE LOBBY</div>}
                    {compact ? <h2 className="text-xl font-medium text-white">Tables</h2> : <h1>
                        Find your next hand<span>.</span>
                    </h1>}
                    {!compact && <p>Pick a table. Find your seat. Play your game.</p>}
                </div>
                {onCreateTable && (
                    <button type="button" className={styles.createButton} onClick={onCreateTable}>
                        <FaPlus aria-hidden="true" /> Create table
                    </button>
                )}
            </div>

            <div className={styles.stats} aria-label="Table availability">
                <span>
                    <i aria-hidden="true" />
                    <strong>{isLoading ? "—" : clubGames.length}</strong> tables listed
                </span>
                <span>
                    <strong>{isLoading ? "—" : occupiedSeats}</strong> occupied seats
                </span>
                <span>
                    <strong>{isLoading ? "—" : availableSeats}</strong> open seats
                </span>
                <button onClick={refetch} disabled={isLoading} aria-label="Refresh tables" title="Refresh tables">
                    <FaRedo className={isLoading ? "animate-spin" : ""} />
                </button>
            </div>

            <div className={styles.gameTabs} role="group" aria-label="Game format">
                {formats.map(item => (
                    <button
                        key={item.value}
                        aria-pressed={format === item.value}
                        className={format === item.value ? styles.selectedTab : ""}
                        onClick={() => {
                            setFormat(item.value);
                            setPage(1);
                        }}
                    >
                        {item.label}
                    </button>
                ))}
            </div>
            <div className={styles.filters}>
                <label className={styles.search}>
                    <FaSearch aria-hidden="true" />
                    <input
                        aria-label="Search tables"
                        placeholder="Search tables…"
                        value={search}
                        onChange={event => {
                            setSearch(event.target.value);
                            setPage(1);
                        }}
                    />
                </label>
                <label className={styles.checkbox}>
                    <input
                        type="checkbox"
                        checked={openOnly}
                        onChange={event => {
                            setOpenOnly(event.target.checked);
                            setPage(1);
                        }}
                    />{" "}
                    Open seats only
                </label>
                <label className={styles.checkbox}>
                    <input type="checkbox" checked={ownedOnly} disabled={!address} onChange={event => { setOwnedOnly(event.target.checked); setTreasuryOnly(false); setPage(1); }} /> My tables
                </label>
                {treasuryAddress && (
                    <label className={styles.checkbox}>
                        <input
                            type="checkbox"
                            checked={treasuryOnly}
                            onChange={event => {
                                setTreasuryOnly(event.target.checked);
                                setOwnedOnly(false);
                                setPage(1);
                            }}
                        />{" "}
                        Treasury tables
                    </label>
                )}
                <label className={styles.sort}>
                    Sort
                    <select
                        aria-label="Sort tables"
                        value={sort}
                        onChange={event => {
                            if (event.target.value === "activity" || event.target.value === "buyin") {
                                setSort(event.target.value);
                                setPage(1);
                            }
                        }}
                    >
                        <option value="activity">Available first</option>
                        <option value="buyin">Lowest buy-in</option>
                    </select>
                </label>
            </div>

            {error ? (
                <div className={styles.empty} role="alert">
                    <h2>Tables couldn’t load</h2>
                    <p>{error.message}</p>
                    <button className={styles.secondaryButton} onClick={refetch}>
                        Try again
                    </button>
                </div>
            ) : isLoading ? (
                <div className={styles.empty} role="status">
                    <FaRedo className="animate-spin" />
                    <p>Finding your tables…</p>
                </div>
            ) : games.length === 0 ? (
                <div className={styles.empty}>
                    <span className={styles.emptySuit}>♠</span>
                    <h2>{hasFilters ? "No tables match" : "The next game starts with you"}</h2>
                    <p>{hasFilters ? "Try a different search or show all games." : "Create a table and invite your friends."}</p>
                    {hasFilters && (
                        <button className={styles.secondaryButton} onClick={clearFilters}>
                            Clear filters
                        </button>
                    )}
                </div>
            ) : (
                <div className={styles.tableWrap}>
                    <table className={styles.games}>
                        <caption className="sr-only">Available games, stakes, occupied seats and buy-in amounts</caption>
                        <thead>
                            <tr>
                                <th>Table</th>
                                <th className={styles.stakesColumn}>Stakes</th>
                                <th>Seats</th>
                                <th className={styles.buyInColumn}>Buy-in</th>
                                <th>
                                    <span className="sr-only">Open table</span>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {pagedGames.map(game => {
                                const full = game.currentPlayers >= game.maxPlayers;
                                const mySeat = mySeats[game.gameId];
                                const seated = !!mySeat;
                                const watch = full && !seated;
                                const formatLabel = displayGameFormat(game.gameFormat, game.scheduledStartTime, formatGameFormatDisplay);
                                const tournament = formatLabel === "Tournament" || isTournamentFormat(game.gameFormat);
                                const owner = !!address && game.creator?.toLowerCase() === address.toLowerCase();
                                const tableName = displayTableName(game.name, game.gameId);
                                const phase = scheduledPhase(game);
                                const mark = startedTables[game.gameId];
                                const played = mark === "started" || mark === "finished";
                                const showCancelled = phase === "cancelled" && !played;
                                const schedule = scheduledLabel(game, mark);
                                const stakes = tournament
                                    ? "Tournament"
                                    : "$" + formatMicroUsd(game.smallBlind) + " / $" + formatMicroUsd(game.bigBlind);
                                return (
                                    <tr key={game.gameId} className={seated ? styles.seatedRow : undefined}>
                                        <td>
                                            <div className={styles.tableIdentity}>
                                                <span className={styles.tableGlyph} aria-hidden="true">
                                                    {tournament ? "♛" : "♠"}
                                                </span>
                                                <div className={styles.identityText}>
                                                    <strong>{tableName}</strong>
                                                    {seated && <span className={styles.seatedBadge}>You’re seated · Seat {mySeat}</span>}
                                                    {owner && <span className={styles.ownerBadge}>Your table</span>}
                                                    <span>
                                                        <span data-testid="lobby-format">{formatLabel}</span>
                                                        {" · "}
                                                        {game.maxPlayers}-seat ·{" "}
                                                        <span data-testid="lobby-game">{formatTableGameDisplay(toGameVariant(game.gameVariant), game.bettingLimit)}</span>
                                                    </span>
                                                    {schedule && (
                                                        <span className={styles.scheduledBadge} data-testid="scheduled-start-label">
                                                            {schedule}
                                                        </span>
                                                    )}
                                                    <span className={styles.mobileFacts}>
                                                        {stakes} · {formatBuyIn(game)} buy-in
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className={styles.stakesColumn}>
                                            <strong>{stakes}</strong>
                                            <span className={styles.detail}>{tournament ? "Fixed entry" : "Small / big blind"}</span>
                                        </td>
                                        <td>
                                            <div className={styles.seatCount}>
                                                <strong>
                                                    {game.currentPlayers}
                                                    <span> / {game.maxPlayers}</span>
                                                </strong>
                                                <span className={styles.seatDots} aria-hidden="true">
                                                    {Array.from({ length: game.maxPlayers }, (_, i) => (
                                                        <i key={i} className={i < game.currentPlayers ? styles.occupied : ""} />
                                                    ))}
                                                </span>
                                            </div>
                                        </td>
                                        <td className={styles.buyInColumn}>
                                            <strong>{formatBuyIn(game)}</strong>
                                        </td>
                                        <td>
                                            <div className={styles.rowActions}>
                                                <a
                                                    href={"/table/" + game.gameId + (watch ? "?watch=1" : "")}
                                                    className={watch ? styles.watchButton : styles.actionButton}
                                                    aria-label={(showCancelled ? "Cancelled " : seated ? "Return to " : watch ? "Watch " : "Open ") + tableName}
                                                >
                                                    {watch ? (
                                                        <>
                                                            <FaEye aria-hidden="true" />
                                                            <span>Watch</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <span className={seated ? styles.returnLabel : undefined}>
                                                                {showCancelled ? "Cancelled" : seated ? "Return to table" : "Open table"}
                                                            </span>
                                                            <FaArrowRight aria-hidden="true" />
                                                        </>
                                                    )}
                                                </a>
                                                {owner && (game.currentPlayers === 0 || isCashFormat(game.gameFormat)) && <button
                                                    className={styles.ownerAction}
                                                    disabled={game.currentPlayers === 0 ? isDeleting : isClosing}
                                                    onClick={() => game.currentPlayers === 0 ? setDeleteId(game.gameId) : setCloseTarget(game)}
                                                >{game.currentPlayers === 0 ? "Delete table" : "Close & refund"}</button>}
                                                <button
                                                    type="button"
                                                    className={styles.shareButton}
                                                    aria-label={"Share " + tableName}
                                                    title="Copy table link"
                                                    onClick={() => copyToClipboard(`${window.location.origin}/table/${game.gameId}`, "Table link copied")}
                                                >
                                                    <FaShareAlt aria-hidden="true" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
            {!error && !isLoading && games.length > 0 && (
                <Pagination currentPage={currentPage} totalItems={games.length} pageSize={PAGE_SIZE} onPageChange={setPage} />
            )}
            <p className={styles.footnote}>Opening a table lets you look around. Choose a seat and confirm your buy-in when you’re ready.</p>
            <DeleteTableModal
                isOpen={!!deleteId}
                onClose={() => setDeleteId(null)}
                gameId={deleteId || ""}
                onConfirm={async () => {
                    if (!deleteId) return;
                    if (!(await deleteGame(deleteId))) throw new Error("The table was not deleted. Check the error notification and try again.");
                    await refetch();
                }}
            />
            <ForceCloseTableModal
                isOpen={!!closeTarget}
                onClose={() => setCloseTarget(null)}
                gameId={closeTarget?.gameId || ""}
                seatedPlayerCount={closeTarget?.currentPlayers || 0}
                onConfirm={async () => {
                    if (!closeTarget) return;
                    if (!(await forceCloseGame(closeTarget.gameId))) throw new Error("The table was not closed. Check the error notification and try again.");
                    await refetch();
                }}
            />
        </section>
    );
};
export default TableList;
