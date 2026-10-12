import type { GameWithFormat } from "./convertUtils";
import { isCashFormat, isTournamentFormat } from "./gameFormatUtils";

export type LobbyFormat = "all" | "cash" | "tournament";
export type LobbySort = "activity" | "buyin";

/** Filter real table data without mutating the shared game list. Full tables remain watchable. */
export function filterLobbyGames(
    games: GameWithFormat[],
    options: { format: LobbyFormat; search: string; openOnly: boolean; sort: LobbySort }
): GameWithFormat[] {
    const query = options.search.trim().toLowerCase();
    return games
        .filter(
            game =>
                (options.format === "all" || (options.format === "cash" ? isCashFormat(game.gameFormat) : isTournamentFormat(game.gameFormat))) &&
                (!options.openOnly || game.currentPlayers < game.maxPlayers) &&
                (!query || [game.name, game.gameId, "Table " + game.gameId.slice(-6)].join(" ").toLowerCase().includes(query))
        )
        .sort((a, b) => {
            if (options.sort === "buyin") {
                const aBuyIn = BigInt(a.minBuyIn);
                const bBuyIn = BigInt(b.minBuyIn);
                if (aBuyIn !== bBuyIn) return aBuyIn < bBuyIn ? -1 : 1;
            }
            const aFull = a.currentPlayers >= a.maxPlayers;
            const bFull = b.currentPlayers >= b.maxPlayers;
            return Number(aFull) - Number(bFull) || b.currentPlayers - a.currentPlayers || a.gameId.localeCompare(b.gameId);
        });
}
