import { formatMicroAsUsdc } from "../constants/currency";
import { hasValue } from "./guards";
import { truncateMiddle } from "./stringUtils";
import { tableUrl, tournamentUrl } from "./tableUrl";
import { lobbyRunnersLabel, phaseLabel, type TournamentLobbyCard } from "./tournamentLobby";

/** What one multi-table tournament shows as a row of the lobby's table list. */
export interface TournamentListRow {
    tournamentId: string;
    /** Field size while registering ("3/27"), or a sensible count after the start ("7 entrants"). */
    runners: string;
    /** The buy-in: "$1.00". */
    buyIn: string;
    /** Status badge matching sit-and-go lobby wording (Registering, Started, Finished, …). */
    status: string;
    action: { label: string; url: string };
}

/** The All-games status badge: the shared phase label, plus a winner when the tournament is over. */
export function lobbyTournamentStatus(card: TournamentLobbyCard): string {
    if (card.phase === "cancelled") return "Cancelled: not enough players";
    const label = phaseLabel(card.phase);
    if (card.phase === "finished" && hasValue(card.winnerAddress)) {
        return `${label} · Won by ${truncateMiddle(card.winnerAddress, 8, 4)}`;
    }
    return label;
}

/**
 * The lobby row for a tournament. A tournament is one row, never one row per
 * table: its tables are directed by the tournament, so they cannot be joined,
 * and their seat counts are not the field size.
 */
export const tournamentListRow = (card: TournamentLobbyCard): TournamentListRow => {
    const registering = card.phase === "open";
    return {
        tournamentId: card.tournamentId,
        runners: lobbyRunnersLabel(card),
        buyIn: `$${formatMicroAsUsdc(card.cost.gross, 2)}`,
        status: lobbyTournamentStatus(card),
        action: registering
            ? { label: "Register", url: tournamentUrl(card.tournamentId) }
            : { label: card.phase === "cancelled" ? "Cancelled" : card.phase === "full" ? "Full" : "View", url: tournamentUrl(card.tournamentId) }
    };
};

export interface LobbyTournamentAction {
    label: string;
    url: string;
    /** Set when the viewer is playing: the table number they sit at. */
    seatedAt?: number;
}

/** The main-lobby action for a tournament. A seat you already have wins over Register/View. */
export const lobbyTournamentAction = (card: TournamentLobbyCard): LobbyTournamentAction => {
    if (hasValue(card.myTable)) {
        return { label: "Take my seat", url: tableUrl(card.myTable.gameId), seatedAt: card.myTable.number };
    }
    const { action } = tournamentListRow(card);
    return { label: action.label, url: action.url };
};
