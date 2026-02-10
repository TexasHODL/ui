/**
 * Transaction formatting utilities
 */

/**
 * Format a transaction for display purposes
 * Prioritizes action over messageType and cleans up the display text
 *
 * @param action - The poker action (e.g., "call", "raise", "fold")
 * @param messageType - The Cosmos message type (e.g., "MsgPerformAction", "MsgJoinGame")
 * @returns Formatted display label
 */
export function formatTransactionLabel(action?: string, messageType?: string): string {
    // If we have an action, use it directly (already clean)
    if (action) {
        return capitalizeFirst(action);
    }

    // Otherwise, clean up the messageType
    if (messageType) {
        // Remove "Msg" prefix
        let label = messageType.replace(/^Msg/, "");

        // Convert PascalCase to spaced words (e.g., "PerformAction" -> "Perform Action")
        label = label.replace(/([a-z])([A-Z])/g, "$1 $2");

        return label;
    }

    return "Transaction";
}

/**
 * Capitalize the first letter of a string
 */
function capitalizeFirst(str: string): string {
    if (!str) return str;
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Format transfer direction indicator
 *
 * @param direction - "sent" or "received"
 * @returns "+" for received, "-" for sent, empty string if no direction
 */
export function formatTransferDirection(direction?: "sent" | "received"): string {
    if (direction === "received") return "+";
    if (direction === "sent") return "-";
    return "";
}

/**
 * Get CSS class for transfer direction color
 *
 * @param direction - "sent" or "received"
 * @returns Tailwind CSS class for text color
 */
export function getTransferDirectionClass(direction?: "sent" | "received"): string {
    if (direction === "received") return "text-green-400";
    if (direction === "sent") return "text-orange-400";
    return "";
}

/**
 * Format a shortened hash for display
 *
 * @param hash - Full transaction or game hash
 * @param startChars - Number of characters to show at start (default 8)
 * @param endChars - Number of characters to show at end (default 8)
 * @returns Formatted hash like "abc12345...xyz78901"
 */
export function formatShortHash(hash: string, startChars = 8, endChars = 8): string {
    if (!hash) return "";
    if (hash.length <= startChars + endChars + 3) return hash;
    return `${hash.slice(0, startChars)}...${hash.slice(-endChars)}`;
}

/**
 * Format a game ID for display (shorter format)
 *
 * @param gameId - Full game ID
 * @returns Shortened game ID like "abc123..."
 */
export function formatGameId(gameId?: string): string {
    if (!gameId) return "";
    if (gameId.length <= 9) return gameId;
    return `${gameId.slice(0, 6)}...`;
}
