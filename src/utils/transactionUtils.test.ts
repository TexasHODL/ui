import { describe, it, expect } from "@jest/globals";
import {
    formatTransactionLabel,
    formatTransferDirection,
    getTransferDirectionClass,
    formatShortHash,
    formatGameId
} from "./transactionUtils";

describe("transactionUtils", () => {
    describe("formatTransactionLabel", () => {
        it("should return action when provided", () => {
            expect(formatTransactionLabel("call", "MsgPerformAction")).toBe("Call");
            expect(formatTransactionLabel("raise", "MsgPerformAction")).toBe("Raise");
            expect(formatTransactionLabel("fold", "MsgPerformAction")).toBe("Fold");
            expect(formatTransactionLabel("check", "MsgPerformAction")).toBe("Check");
            expect(formatTransactionLabel("all-in", "MsgPerformAction")).toBe("All-in");
        });

        it("should capitalize action correctly", () => {
            expect(formatTransactionLabel("CALL")).toBe("Call");
            expect(formatTransactionLabel("RAISE")).toBe("Raise");
            expect(formatTransactionLabel("fold")).toBe("Fold");
        });

        it("should remove Msg prefix from messageType when no action", () => {
            expect(formatTransactionLabel(undefined, "MsgJoinGame")).toBe("Join Game");
            expect(formatTransactionLabel(undefined, "MsgLeaveGame")).toBe("Leave Game");
            expect(formatTransactionLabel(undefined, "MsgCreateGame")).toBe("Create Game");
            expect(formatTransactionLabel(undefined, "MsgSend")).toBe("Send");
        });

        it("should convert PascalCase to spaced words", () => {
            expect(formatTransactionLabel(undefined, "MsgPerformAction")).toBe("Perform Action");
            expect(formatTransactionLabel(undefined, "MsgProcessDeposit")).toBe("Process Deposit");
            expect(formatTransactionLabel(undefined, "MsgInitiateWithdrawal")).toBe("Initiate Withdrawal");
        });

        it("should return 'Transaction' when neither action nor messageType provided", () => {
            expect(formatTransactionLabel()).toBe("Transaction");
            expect(formatTransactionLabel(undefined, undefined)).toBe("Transaction");
            expect(formatTransactionLabel("", "")).toBe("Transaction");
        });

        it("should handle empty action and use messageType", () => {
            expect(formatTransactionLabel("", "MsgSend")).toBe("Send");
        });
    });

    describe("formatTransferDirection", () => {
        it("should return + for received", () => {
            expect(formatTransferDirection("received")).toBe("+");
        });

        it("should return - for sent", () => {
            expect(formatTransferDirection("sent")).toBe("-");
        });

        it("should return empty string for undefined", () => {
            expect(formatTransferDirection(undefined)).toBe("");
        });
    });

    describe("getTransferDirectionClass", () => {
        it("should return green class for received", () => {
            expect(getTransferDirectionClass("received")).toBe("text-green-400");
        });

        it("should return orange class for sent", () => {
            expect(getTransferDirectionClass("sent")).toBe("text-orange-400");
        });

        it("should return empty string for undefined", () => {
            expect(getTransferDirectionClass(undefined)).toBe("");
        });
    });

    describe("formatShortHash", () => {
        it("should shorten long hashes", () => {
            const hash = "ABCDEFGH12345678IJKLMNOP87654321";
            expect(formatShortHash(hash)).toBe("ABCDEFGH...87654321");
        });

        it("should return full hash if short enough", () => {
            const shortHash = "ABC123";
            expect(formatShortHash(shortHash)).toBe("ABC123");
        });

        it("should handle custom start and end lengths", () => {
            const hash = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
            expect(formatShortHash(hash, 4, 4)).toBe("ABCD...WXYZ");
        });

        it("should return empty string for empty input", () => {
            expect(formatShortHash("")).toBe("");
        });

        it("should handle exact boundary length", () => {
            // 8 + 8 + 3 = 19 chars boundary
            const hash = "12345678901234567890"; // 20 chars
            expect(formatShortHash(hash)).toBe("12345678...34567890");
        });
    });

    describe("formatGameId", () => {
        it("should shorten long game IDs", () => {
            const gameId = "game-12345678-abcd-efgh";
            expect(formatGameId(gameId)).toBe("game-1...");
        });

        it("should return full ID if short enough", () => {
            expect(formatGameId("abc123")).toBe("abc123");
        });

        it("should return empty string for undefined", () => {
            expect(formatGameId(undefined)).toBe("");
        });

        it("should return empty string for empty string", () => {
            expect(formatGameId("")).toBe("");
        });
    });
});
