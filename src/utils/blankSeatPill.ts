/**
 * Which empty seat a table draws.
 *
 * A tournament table draws the blank pill: the player-pill size, a see-through
 * tint, and only the seat number. That is a single-table tournament
 * (`format` tournament) and a directed multi-table table (root `tournamentId`,
 * or a `<tournamentId>-t<n>` game id). Cash and sit & go keep the vacant
 * seat place card.
 */
import { isSitAndGoFormat, isTournamentFormat } from "@block52/poker-vm-sdk";
import { hasValue, isNullish, isString } from "@block52/ui-sdk/helpers";
import { parseTournamentGameId } from "./tableUrl";
import { tournamentIdOf } from "./tournamentBlinds";

export const showsBlankSeatPill = (
    gameFormat: Parameters<typeof isTournamentFormat>[0] | null,
    gameState: unknown,
    tableId: string | undefined
): boolean => {
    if (hasValue(tournamentIdOf(gameState))) return true;
    if (isString(tableId) && hasValue(parseTournamentGameId(tableId))) return true;
    if (isNullish(gameFormat)) return false;
    return isTournamentFormat(gameFormat) && !isSitAndGoFormat(gameFormat);
};
