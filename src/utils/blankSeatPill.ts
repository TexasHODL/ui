/**
 * Which empty seat a table draws.
 *
 * A directed table of a multi-table tournament (root `tournamentId`, or a
 * `<tournamentId>-t<n>` game id) draws the blank pill: the player-pill size,
 * an opaque frost, and only the seat number. Cash and sit & go keep the
 * vacant seat place card.
 */
import { hasValue, isString } from "./guards";
import { parseTournamentGameId } from "./tableUrl";
import { tournamentIdOf } from "./tournamentBlinds";

export const showsBlankSeatPill = (gameState: unknown, tableId: string | undefined): boolean => {
    if (hasValue(tournamentIdOf(gameState))) return true;
    return isString(tableId) && hasValue(parseTournamentGameId(tableId));
};
