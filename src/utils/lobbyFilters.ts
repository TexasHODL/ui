import type { GameWithFormat } from "./convertUtils";
import { displayTableName } from "./generatedTableName";
import { isCashFormat, isSitAndGoFormat, isTournamentFormat } from "./gameFormatUtils";
import { scheduledSngPhase } from "./scheduledSng";

export type LobbyFormat = "all" | "cash" | "tournament";
export type LobbySort = "activity" | "buyin";

/** Minimal progress mark from useLobbyTournamentStarted (Started / Finished). */
export type LobbyGameProgress = { mark: "started" | "finished"; lateRegOpen?: boolean; lateRegEndsAtMs?: number };

/** A started tournament that still takes late entrants (poker-vm#2731). */
export function isLateRegistrationOpenProgress(progress: LobbyGameProgress | undefined, nowMs: number): boolean {
    if (progress?.mark !== "started" || progress.lateRegOpen !== true) return false;
    return typeof progress.lateRegEndsAtMs !== "number" || nowMs < progress.lateRegEndsAtMs;
}

export type FilterLobbyGamesOptions = {
    format: LobbyFormat;
    search: string;
    openOnly: boolean;
    sort: LobbySort;
    /**
     * Optional Started/Finished marks per gameId. Without these, only seat
     * fullness and Cancelled scheduled phase can mark a table unavailable.
     */
    progress?: Record<string, LobbyGameProgress | undefined>;
    /** Clock for Cancelled phase; defaults to Date.now(). */
    nowMs?: number;
};

/**
 * True when the table is not joinable: full, or a sit-and-go/tournament that
 * has Started/Finished (no late entry), or a Cancelled scheduled SNG.
 * A started tournament with late registration open stays joinable.
 */
export function isLobbyGameUnavailable(
    game: GameWithFormat,
    progress: LobbyGameProgress | undefined,
    nowMs: number
): boolean {
    if (game.currentPlayers >= game.maxPlayers) return true;
    const tournamentStyle = isSitAndGoFormat(game.gameFormat) || isTournamentFormat(game.gameFormat);
    if (!tournamentStyle) return false;
    if (isLateRegistrationOpenProgress(progress, nowMs)) return false;
    if (progress?.mark === "started" || progress?.mark === "finished") return true;
    const phase = scheduledSngPhase({
        scheduledStartTime: game.scheduledStartTime,
        minPlayers: game.minPlayers,
        registered: game.currentPlayers,
        nowMs
    });
    // Cancelled only when the game never started (same rule as TableList Watch).
    return phase === "cancelled";
}

/**
 * Joinable sit-and-go/tournament still in open scheduled registration
 * (registering / ready / short). Empty unscheduled SNGs are not this.
 */
export function isOpenScheduledRegistration(
    game: GameWithFormat,
    progress: LobbyGameProgress | undefined,
    nowMs: number
): boolean {
    if (isLobbyGameUnavailable(game, progress, nowMs)) return false;
    const tournamentStyle = isSitAndGoFormat(game.gameFormat) || isTournamentFormat(game.gameFormat);
    if (!tournamentStyle) return false;
    const phase = scheduledSngPhase({
        scheduledStartTime: game.scheduledStartTime,
        minPlayers: game.minPlayers,
        registered: game.currentPlayers,
        nowMs
    });
    return phase === "registering" || phase === "ready" || phase === "short";
}

/** Filter real table data without mutating the shared game list. Full tables remain watchable. */
export function filterLobbyGames(
    games: GameWithFormat[],
    options: FilterLobbyGamesOptions
): GameWithFormat[] {
    const query = options.search.trim().toLowerCase();
    const nowMs = options.nowMs ?? Date.now();
    const progress = options.progress;
    return games
        .filter(
            game =>
                (options.format === "all" || (options.format === "cash" ? isCashFormat(game.gameFormat) : isTournamentFormat(game.gameFormat))) &&
                (!options.openOnly || game.currentPlayers < game.maxPlayers) &&
                (!query || [displayTableName(game.name, game.gameId), game.gameId].join(" ").toLowerCase().includes(query))
        )
        .sort((a, b) => {
            if (options.sort === "buyin") {
                const aBuyIn = BigInt(a.minBuyIn);
                const bBuyIn = BigInt(b.minBuyIn);
                if (aBuyIn !== bBuyIn) return aBuyIn < bBuyIn ? -1 : 1;
            }
            // Available first: joinable above full / Started / Finished / Cancelled.
            // Among joinable, open scheduled registration floats above empty
            // unscheduled SNGs; among those, soonest start first.
            // For buyin, buy-in stays primary; this only breaks buy-in ties.
            const aUnavailable = isLobbyGameUnavailable(a, progress?.[a.gameId], nowMs);
            const bUnavailable = isLobbyGameUnavailable(b, progress?.[b.gameId], nowMs);
            if (aUnavailable !== bUnavailable) {
                return Number(aUnavailable) - Number(bUnavailable);
            }
            const aOpenScheduled = isOpenScheduledRegistration(a, progress?.[a.gameId], nowMs);
            const bOpenScheduled = isOpenScheduledRegistration(b, progress?.[b.gameId], nowMs);
            if (aOpenScheduled !== bOpenScheduled) {
                return Number(bOpenScheduled) - Number(aOpenScheduled);
            }
            if (aOpenScheduled && bOpenScheduled) {
                const aStart = a.scheduledStartTime ?? Number.POSITIVE_INFINITY;
                const bStart = b.scheduledStartTime ?? Number.POSITIVE_INFINITY;
                if (aStart !== bStart) return aStart < bStart ? -1 : 1;
            }
            return b.currentPlayers - a.currentPlayers || a.gameId.localeCompare(b.gameId);
        });
}
