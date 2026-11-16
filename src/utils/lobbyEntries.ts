import type { GameWithFormat } from "./convertUtils";
import { displayTableName } from "./generatedTableName";
import { hasContent } from "./guards";
import { isLobbyGameUnavailable, isOpenScheduledRegistration, type LobbyGameProgress, type LobbySort } from "./lobbyFilters";
import type { TournamentLobbyCard } from "./tournamentLobby";

/** One row in the All-games lobby: a multi-table tournament or a cash / sit-and-go table. */
export type LobbyEntry = { kind: "mtt"; card: TournamentLobbyCard } | { kind: "game"; game: GameWithFormat };

/**
 * Multi-table cards shown on the All-games list: open-only hides anything that
 * is not taking registrations, and search matches the generated or stored name
 * or the tournament id.
 */
export function filterLobbyTournamentCards(
    cards: TournamentLobbyCard[],
    options: { search: string; openOnly: boolean }
): TournamentLobbyCard[] {
    const query = options.search.trim().toLowerCase();
    return cards.filter(card => {
        if (options.openOnly && card.phase !== "open") return false;
        if (!hasContent(query)) return true;
        const name = displayTableName(card.name, card.tournamentId).toLowerCase();
        return name.includes(query) || card.tournamentId.toLowerCase().includes(query);
    });
}

/** A tournament that is not taking registrations (full, starting, in play, finished, or cancelled). */
export function isMttCardUnavailable(card: TournamentLobbyCard): boolean {
    return card.phase !== "open";
}

function buyInMicro(entry: LobbyEntry): bigint {
    return entry.kind === "mtt" ? entry.card.cost.gross : BigInt(entry.game.minBuyIn);
}

function startMs(entry: LobbyEntry): number {
    if (entry.kind === "mtt") return entry.card.startsAtMs;
    return entry.game.scheduledStartTime ?? Number.POSITIVE_INFINITY;
}

function activity(entry: LobbyEntry): number {
    if (entry.kind === "mtt") return entry.card.registered;
    return entry.game.currentPlayers;
}

function idKey(entry: LobbyEntry): string {
    return entry.kind === "mtt" ? entry.card.tournamentId : entry.game.gameId;
}

/**
 * The same Available-first order as {@link filterLobbyGames}, applied to a mixed
 * list of multi-table tournaments and cash / sit-and-go tables: joinable rows
 * (open MTT registration and joinable tables) above Started / Finished /
 * Cancelled / full; among joinable, open scheduled / open MTT registration
 * floats to the top, soonest start first.
 */
export function sortLobbyEntries(
    entries: LobbyEntry[],
    options: { sort: LobbySort; progress?: Record<string, LobbyGameProgress | undefined>; nowMs?: number }
): LobbyEntry[] {
    const nowMs = options.nowMs ?? Date.now();
    const progress = options.progress;
    return [...entries].sort((a, b) => {
        if (options.sort === "buyin") {
            const aBuyIn = buyInMicro(a);
            const bBuyIn = buyInMicro(b);
            if (aBuyIn !== bBuyIn) return aBuyIn < bBuyIn ? -1 : 1;
        }
        const aUnavailable = a.kind === "mtt" ? isMttCardUnavailable(a.card) : isLobbyGameUnavailable(a.game, progress?.[a.game.gameId], nowMs);
        const bUnavailable = b.kind === "mtt" ? isMttCardUnavailable(b.card) : isLobbyGameUnavailable(b.game, progress?.[b.game.gameId], nowMs);
        if (aUnavailable !== bUnavailable) return Number(aUnavailable) - Number(bUnavailable);
        const aOpenScheduled = a.kind === "mtt" ? a.card.phase === "open" : isOpenScheduledRegistration(a.game, progress?.[a.game.gameId], nowMs);
        const bOpenScheduled = b.kind === "mtt" ? b.card.phase === "open" : isOpenScheduledRegistration(b.game, progress?.[b.game.gameId], nowMs);
        if (aOpenScheduled !== bOpenScheduled) return Number(bOpenScheduled) - Number(aOpenScheduled);
        if (aOpenScheduled && bOpenScheduled) {
            const aStart = startMs(a);
            const bStart = startMs(b);
            if (aStart !== bStart) return aStart < bStart ? -1 : 1;
        }
        const byActivity = activity(b) - activity(a);
        if (byActivity !== 0) return byActivity;
        return idKey(a).localeCompare(idKey(b));
    });
}
