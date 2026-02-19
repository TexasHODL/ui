/**
 * Table Status Display Utilities
 *
 * Pure functions that determine which status messages to show on the table.
 * Unlike PlayerActionDisplay (mutually exclusive), these messages can stack
 * (e.g., seat label + turn indicator shown simultaneously).
 *
 * "Waiting for players to join..." is intentionally NOT here — it is owned
 * by PlayerActionButtons via the "waiting-for-players" kind.
 */

export type TableStatusMessage =
    | { kind: "seat-label"; seatNumber: number; text: string }
    | { kind: "your-turn"; text: string }
    | { kind: "waiting-for-player"; seatNumber: number; text: string }
    | { kind: "hand-complete"; text: string };

export interface TableStatusDisplayInput {
    currentUserSeat: number;
    nextToActSeat: number | null;
    isGameInProgress: boolean;
    isCurrentUserTurn: boolean;
    hasLegalActions: boolean;
    totalActivePlayers: number;
    isSitAndGoWaitingForPlayers: boolean;
}

/**
 * Returns an array of status messages to display on the table.
 * Multiple messages can be active simultaneously.
 */
export function getTableStatusMessages(input: TableStatusDisplayInput): TableStatusMessage[] {
    const {
        currentUserSeat,
        nextToActSeat,
        isGameInProgress,
        isCurrentUserTurn,
        hasLegalActions,
        totalActivePlayers,
        isSitAndGoWaitingForPlayers,
    } = input;

    const messages: TableStatusMessage[] = [];

    // 1. Seat label — shown when seated (currentUserSeat >= 0)
    if (currentUserSeat >= 0) {
        messages.push({
            kind: "seat-label",
            seatNumber: currentUserSeat,
            text: `You are seated at position ${currentUserSeat}`,
        });
    }

    // 2. Turn indicator — game in progress and someone must act
    //    Uses !== null instead of truthiness to handle seat 0 correctly
    if (nextToActSeat !== null && isGameInProgress) {
        if (isCurrentUserTurn && hasLegalActions) {
            messages.push({ kind: "your-turn", text: "Your turn to act!" });
        } else {
            const label = getWaitingForPlayerLabel(nextToActSeat);
            messages.push({
                kind: "waiting-for-player",
                seatNumber: nextToActSeat,
                text: `Waiting for ${label} to act`,
            });
        }
    }

    // 3. Hand complete — between hands, 2+ players, not sit-and-go waiting
    if (!isGameInProgress && totalActivePlayers > 1 && !isSitAndGoWaitingForPlayers) {
        messages.push({
            kind: "hand-complete",
            text: "Hand complete - waiting for next hand",
        });
    }

    // NOTE: "Waiting for players to join..." intentionally NOT here.
    // That message is owned by PlayerActionButtons (waiting-for-players kind).

    return messages;
}

/**
 * Returns a human-readable label for the player at a given seat.
 */
export function getWaitingForPlayerLabel(seatNumber: number): string {
    if (seatNumber === 1) return "Small Blind";
    if (seatNumber === 2) return "Big Blind";
    return `player at seat ${seatNumber}`;
}

/**
 * Convenience check for whether any status messages should be rendered.
 */
export function hasTableStatusMessages(input: TableStatusDisplayInput): boolean {
    return getTableStatusMessages(input).length > 0;
}
