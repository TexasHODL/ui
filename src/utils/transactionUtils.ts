/**
 * Transaction formatting utilities
 */

import { truncateMiddle } from "./stringUtils";

export interface TransferEvent {
    type?: string;
    attributes?: Array<{ key?: string; value?: string }>;
}

/**
 * Sum all USDC transfer amounts emitted by a transaction.
 *
 * A create-game transaction can emit separate transfer events for the base
 * creation fee and the optional table-name fee. Looking only at the first
 * event under-reports the actual debit.
 */
export function sumUsdcTransferEvents(events: TransferEvent[]): string | undefined {
    let total = 0n;
    let found = false;

    for (const event of events) {
        if (event.type !== "transfer") continue;

        for (const attribute of event.attributes ?? []) {
            if (attribute.key !== "amount" || !attribute.value) continue;

            const match = attribute.value.match(/(\d+)usdc/);
            if (!match) continue;

            total += BigInt(match[1]);
            found = true;
        }
    }

    return found ? total.toString() : undefined;
}

/**
 * MsgPerformAction amounts are format-dependent: cash uses USDC micro-units,
 * while sit-and-go and tournament games use chips. The transaction payload
 * does not carry the game format, so hiding this ambiguous amount is safer
 * than labelling chips as USDC.
 */
export function getDisplayableActionAmount(messageType: string, amount?: string): string | undefined {
    return messageType === "MsgPerformAction" ? undefined : amount;
}

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
 * Extract the Cosmos message type from a transaction's hex-encoded bytes.
 *
 * Cosmos SDK transactions embed each message's protobuf type URL as a plain
 * ASCII string (e.g. "/pokerchain.poker.v1.MsgCreateGame"), length-prefixed
 * inside the tx bytes. Rather than maintaining a hardcoded lookup of every
 * message type (which drifts every time the chain adds a new `Msg*`), we decode
 * the type URL directly out of the hex and derive a human-readable label from
 * it. Any newly added message type is therefore labelled automatically.
 *
 * @param hexTx - lowercase hex string of the raw transaction bytes
 * @returns a display label (e.g. "Create Game"), or null if no type URL found
 */
export function extractMessageTypeFromHex(hexTx: string): string | null {
    if (!hexTx) return null;

    // A type URL starts with "/" (0x2f) and is a run of printable URL-safe
    // characters: letters, digits, ".", "_" and further "/" separators.
    // Decode the hex to ASCII first, then match the URL pattern on the text.
    const ascii = hexToAscii(hexTx);
    const match = ascii.match(/\/[A-Za-z0-9._]+\.(Msg[A-Za-z0-9]+)/);
    if (!match) return null;

    // match[1] is the bare message name (e.g. "MsgCreateGame").
    const messageName = match[1];

    // A few message types have curated labels that differ from the plain
    // derived form; everything else auto-derives via formatTransactionLabel
    // (strip "Msg", space-case) so new message types need no maintenance here.
    if (messageName in MESSAGE_TYPE_LABEL_OVERRIDES) {
        return MESSAGE_TYPE_LABEL_OVERRIDES[messageName];
    }

    return formatTransactionLabel(undefined, messageName);
}

/**
 * Curated display labels for message types whose derived name isn't the
 * friendliest. Keyed by bare message name (e.g. "MsgSend"). Only add an entry
 * when the auto-derived label ("Send", "Withdraw Delegator Reward", ...) is
 * genuinely worse — do NOT mirror the whole message set here.
 */
const MESSAGE_TYPE_LABEL_OVERRIDES: { [messageName: string]: string } = {
    MsgSend: "Bank Send (Transfer)",
    MsgWithdrawDelegatorReward: "Withdraw Rewards"
};

/**
 * Decode a hex string to ASCII, keeping only printable characters.
 * Non-printable bytes become spaces so they act as delimiters between the
 * printable runs (such as embedded type URLs) we care about.
 */
function hexToAscii(hex: string): string {
    const bytes = hex.match(/.{1,2}/g);
    if (!bytes) return "";

    let out = "";
    for (const byte of bytes) {
        const code = parseInt(byte, 16);
        out += code >= 0x20 && code <= 0x7e ? String.fromCharCode(code) : " ";
    }
    return out;
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
    return truncateMiddle(hash, startChars, endChars);
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

/** A coin amount as the REST gateway serialises it. */
export interface TxCoin {
    denom: string;
    amount: string;
}

/** One message in a decoded tx body (REST gateway JSON). Only `@type` is always present. */
export interface TxMessage {
    "@type": string;
    action?: string;
    amount?: string | TxCoin[];
    game_id?: string;
    buy_in?: string;
    from_address?: string;
    to_address?: string;
}

/** The fields of a tx_responses entry (plus its decoded body) that the labels need. */
export interface DescribableTx {
    events?: TransferEvent[];
    tx?: { body?: { messages?: TxMessage[] } };
}

/** What a transaction was for, as shown in the lobby card and the explorer list. */
export interface TxDescription {
    /** Display label: "Bet", "Post-big-blind", "Join table", "Transfer", "Deposit"… */
    label: string;
    /** Last segment of the first message's type URL, e.g. "MsgPerformAction". */
    messageType: string;
    action?: string;
    /** Displayable USDC amount (micro-units) for the action, e.g. a buy-in. */
    amount?: string;
    gameId?: string;
    transferAmount?: string;
    transferDirection?: "sent" | "received";
}

/** Labels for chain messages that are not a poker action. Anything else is derived from the type name. */
const MESSAGE_LABELS: Record<string, string> = {
    MsgJoinGame: "Join table",
    MsgLeaveGame: "Leave table",
    MsgCreateGame: "Create table",
    MsgTopUp: "Top up",
    MsgSend: "Transfer",
    MsgMultiSend: "Transfer",
    MsgProcessDeposit: "Deposit",
    MsgInitiateWithdrawal: "Withdrawal",
    MsgRegisterNftAvatar: "Register NFT avatar"
};

/**
 * Describe a transaction for display, from its first message and its events.
 * Shared by the lobby's Recent Transactions card and the explorer's address
 * Transactions list so both always label a tx the same way. Poker actions use
 * the action name ("Bet", "Post-big-blind"); other messages use MESSAGE_LABELS
 * or a label derived from the type name; with no decoded body the label is
 * "Transfer" when the events show a USDC transfer, else "Transaction".
 *
 * @param viewer - the address the list is for; decides "sent" vs "received"
 */
export function describeTransaction(tx: DescribableTx, viewer: string): TxDescription {
    const msg = tx.tx?.body?.messages?.[0];
    const typeUrl = msg?.["@type"] ?? "";
    const messageType = typeUrl.split(".").pop() || "";
    const out: TxDescription = { label: "Transaction", messageType: messageType || "Transaction" };

    if (msg) {
        if (messageType === "MsgPerformAction") {
            out.action = msg.action;
            out.amount = getDisplayableActionAmount("MsgPerformAction", typeof msg.amount === "string" ? msg.amount : undefined);
            out.gameId = msg.game_id;
        } else if (messageType === "MsgJoinGame") {
            out.amount = msg.buy_in;
            out.gameId = msg.game_id;
        } else if (messageType === "MsgLeaveGame" || messageType === "MsgCreateGame" || messageType === "MsgTopUp") {
            out.gameId = msg.game_id;
            if (messageType === "MsgTopUp" && typeof msg.amount === "string") out.amount = msg.amount;
        } else if (messageType === "MsgSend") {
            // Bank transfer: MsgSend carries a coin array, not a scalar.
            const coin = Array.isArray(msg.amount) ? msg.amount[0] : undefined;
            if (coin) {
                out.transferAmount = coin.amount;
                out.transferDirection = msg.from_address === viewer ? "sent" : "received";
            }
        }
    }

    // Fall back to the transfer events for the amount and direction.
    if (!out.transferAmount && tx.events) {
        out.transferAmount = sumUsdcTransferEvents(tx.events);
        if (out.transferAmount) {
            const transferEvent = tx.events.find(e => e.type === "transfer");
            const recipient = transferEvent?.attributes?.find(a => a.key === "recipient");
            out.transferDirection = recipient?.value === viewer ? "received" : "sent";
        }
    }

    if (out.action) out.label = formatTransactionLabel(out.action, messageType);
    else if (MESSAGE_LABELS[messageType]) out.label = MESSAGE_LABELS[messageType];
    else if (messageType) out.label = formatTransactionLabel(undefined, messageType);
    else if (out.transferAmount) out.label = "Transfer";
    return out;
}
