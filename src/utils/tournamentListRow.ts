import { formatMicroAsUsdc } from "../constants/currency";
import { hasValue } from "./guards";
import { formatCountdown } from "./scheduledSng";
import { tableUrl, tournamentUrl } from "./tableUrl";
import { lobbyRunnersLabel, phaseLabel, type TournamentLobbyCard } from "./tournamentLobby";

/** What one multi-table tournament shows as a row of the lobby's table list. */
export interface TournamentListRow {
    tournamentId: string;
    /** Field size while registering ("3/27"), or a sensible count after the start ("7 entrants"). */
    runners: string;
    /** The buy-in: "$1.00". */
    buyIn: string;
    /** Status badge matching sit-and-go lobby wording, plus the start clock while registration is open. */
    status: string;
    action: { label: string; url: string };
}

/**
 * The lobby status line: the same words sit-and-go rows use, plus the countdown
 * and "needs N more" note while registration is still open. Finished does not
 * name the winner (that stays on the event page).
 */
export function lobbyTournamentStatus(card: TournamentLobbyCard, nowMs: number = Date.now()): string {
    if (card.phase === "cancelled") return "Cancelled: not enough players";
    const parts = [phaseLabel(card.phase)];
    if (card.phase === "starting") {
        parts.push("any moment");
    } else if ((card.phase === "open" || card.phase === "full") && Number.isFinite(card.startsAtMs)) {
        parts.push(`starts in ${formatCountdown(card.startsAtMs, nowMs)}`);
    }
    if (card.atRiskOfCancelling && (card.phase === "open" || card.phase === "full" || card.phase === "starting")) {
        const missing = card.minEntrants - card.registered;
        parts.push(`${missing} more needed or it cancels`);
    }
    return parts.join(" \u00b7 ");
}

/**
 * The lobby row for a tournament. A tournament is one row, never one row per
 * table: its tables are directed by the tournament, so they cannot be joined,
 * and their seat counts are not the field size.
 */
export const tournamentListRow = (card: TournamentLobbyCard, nowMs: number = Date.now()): TournamentListRow => {
    const registering = card.phase === "open" && !card.isRegistered;
    return {
        tournamentId: card.tournamentId,
        runners: lobbyRunnersLabel(card),
        buyIn: `$${formatMicroAsUsdc(card.cost.gross, 2)}`,
        status: lobbyTournamentStatus(card, nowMs),
        action: registering
            ? { label: "Register", url: tournamentUrl(card.tournamentId) }
            : { label: card.phase === "cancelled" ? "Cancelled" : card.phase === "full" && !card.isRegistered ? "Full" : "View", url: tournamentUrl(card.tournamentId) }
    };
};

export interface LobbyTournamentAction {
    label: string;
    url: string;
    /** Set when the viewer is playing: the table number they sit at. */
    seatedAt?: number;
}

/** The main-lobby action for a tournament. A seat you already have wins over Register/View. */
export const lobbyTournamentAction = (card: TournamentLobbyCard, nowMs: number = Date.now()): LobbyTournamentAction => {
    if (hasValue(card.myTable)) {
        return { label: "Take my seat", url: tableUrl(card.myTable.gameId), seatedAt: card.myTable.number };
    }
    const { action } = tournamentListRow(card, nowMs);
    return { label: action.label, url: action.url };
};
