import { hasContent } from "./guards";
import { displayTableName } from "./generatedTableName";
import { parseTournamentGameId } from "./tableUrl";

/** Hex characters of the tournament id shown in a table title. */
export const TOURNAMENT_SHORT_ID_LENGTH = 4;

/**
 * The title shown for a table: its own name when it has one, otherwise
 * `Table <short tournament id>/<table number>` for a multi-table tournament
 * table (`0xface4d…-t1` -> "Table face/1"), otherwise `Table` and the last five
 * characters of the id, as before.
 */
export const tableTitle = (tableId: string | undefined, tableName?: string): string => {
    if (hasContent(tableName)) return tableName;
    if (!hasContent(tableId)) return "Table ";
    const tournament = parseTournamentGameId(tableId);
    if (tournament) return `Table ${tournament.tournamentId.slice(2, 2 + TOURNAMENT_SHORT_ID_LENGTH).toLowerCase()}/${tournament.tableNumber}`;
    return `Table ${tableId.slice(-5)}`;
};

/**
 * The name shown in a Texas HODL table header. A multi-table tournament table
 * uses the short tournament id (`Table face/1`). Every other unnamed table
 * keeps its generated name.
 */
export const tableHeading = (tableId: string | undefined, tableName?: string): string => {
    if (hasContent(tableId) && parseTournamentGameId(tableId)) return tableTitle(tableId, tableName);
    return displayTableName(tableName, tableId ?? "");
};
