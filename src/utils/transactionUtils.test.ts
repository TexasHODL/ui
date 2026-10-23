import { describe, it, expect } from "@jest/globals";
import {
    formatTransactionLabel,
    describeTransaction,
    formatActionAmount,
    parseGameFormat,
    fetchGameFormats,
    clearGameFormatCache,
    extractMessageTypeFromHex,
    formatTransferDirection,
    getTransferDirectionClass,
    formatShortHash,
    formatGameId,
    getDisplayableActionAmount,
    sumUsdcTransferEvents,
    getMessageSigner,
    netUsdcTransferFor
} from "./transactionUtils";

describe("transactionUtils", () => {
    describe("extractMessageTypeFromHex", () => {
        // Fixtures: a couple of leading protobuf bytes (0a2a = field 1, len 42)
        // followed by the ASCII type URL encoded as hex — the shape real
        // Cosmos tx bytes have.
        it("decodes a known pokerchain message type", () => {
            const hex = "0a2a2f706f6b6572636861696e2e706f6b65722e76312e4d736743726561746547616d65";
            expect(extractMessageTypeFromHex(hex)).toBe("Create Game");
        });

        it("decodes message types that were previously 'unknown' (no hardcoded entry needed)", () => {
            const forceClose = "0a2a2f706f6b6572636861696e2e706f6b65722e76312e4d7367466f726365436c6f736547616d65";
            expect(extractMessageTypeFromHex(forceClose)).toBe("Force Close Game");

            const recordEth = "0a2a2f706f6b6572636861696e2e706f6b65722e76312e4d73675265636f7264457468426c6f636b486569676874";
            expect(extractMessageTypeFromHex(recordEth)).toBe("Record Eth Block Height");
        });

        it("applies curated label overrides for cosmos-sdk message types", () => {
            const send = "0a2a2f636f736d6f732e62616e6b2e763162657461312e4d736753656e64";
            expect(extractMessageTypeFromHex(send)).toBe("Bank Send (Transfer)");

            // /cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward
            const withdrawReward =
                "0a2a2f636f736d6f732e646973747269627574696f6e2e763162657461312e4d7367576974686472617744656c656761746f72526577617264";
            expect(extractMessageTypeFromHex(withdrawReward)).toBe("Withdraw Rewards");
        });

        it("returns null when no type URL is present", () => {
            expect(extractMessageTypeFromHex("deadbeef0011223344")).toBeNull();
            expect(extractMessageTypeFromHex("")).toBeNull();
        });
    });

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

    describe("transaction amount safety", () => {
        it("sums separate USDC transfer events", () => {
            expect(
                sumUsdcTransferEvents([
                    { type: "transfer", attributes: [{ key: "amount", value: "1usdc" }] },
                    { type: "transfer", attributes: [{ key: "amount", value: "300000usdc" }] }
                ])
            ).toBe("300001");
        });

        it("does not label format-dependent action amounts as USDC", () => {
            expect(getDisplayableActionAmount("MsgPerformAction", "25")).toBeUndefined();
            expect(getDisplayableActionAmount("MsgJoinGame", "1000000")).toBe("1000000");
        });

        it("returns no amount when no USDC transfer event exists", () => {
            expect(sumUsdcTransferEvents([{ type: "message", attributes: [{ key: "amount", value: "25" }] }])).toBeUndefined();
        });
    });
    describe("getMessageSigner", () => {
        it("reads creator, player and from_address by message type", () => {
            expect(getMessageSigner({ creator: "b521a" })).toBe("b521a");
            expect(getMessageSigner({ player: "b521b" })).toBe("b521b");
            expect(getMessageSigner({ from_address: "b521c" })).toBe("b521c");
        });

        it("returns undefined for a message with no signer field", () => {
            expect(getMessageSigner({})).toBeUndefined();
        });
    });

    describe("netUsdcTransferFor (ui#855)", () => {
        const me = "b521me";
        const transfer = (sender: string, recipient: string, amount: string) => ({
            type: "transfer",
            attributes: [
                { key: "recipient", value: recipient },
                { key: "sender", value: sender },
                { key: "amount", value: amount }
            ]
        });

        // Another player's 1 USDC buy-in, split into fee shares; one share pays `me`.
        const foreignJoin = [
            transfer("b521player", "b521escrow", "1000000usdc"),
            transfer("b521escrow", "b521x", "25064usdc"),
            transfer("b521escrow", me, "25062usdc"),
            transfer("b521escrow", "b521y", "25062usdc")
        ];

        it("counts only the share paid to the address, not the tx total", () => {
            expect(netUsdcTransferFor(foreignJoin, me)).toEqual({ amount: "25062", direction: "received" });
            expect(sumUsdcTransferEvents(foreignJoin)).toBe("1075188");
        });

        it("reports a debit when the address only sends", () => {
            expect(netUsdcTransferFor(foreignJoin, "b521player")).toEqual({ amount: "1000000", direction: "sent" });
        });

        it("nets credits against debits for the same address", () => {
            const events = [transfer(me, "b521escrow", "1000000usdc"), transfer("b521escrow", me, "400000usdc")];
            expect(netUsdcTransferFor(events, me)).toEqual({ amount: "600000", direction: "sent" });
        });

        it("returns undefined when the address is not party to a transfer or the net is zero", () => {
            expect(netUsdcTransferFor(foreignJoin, "b521nobody")).toBeUndefined();
            expect(netUsdcTransferFor([transfer(me, "b521a", "5usdc"), transfer("b521a", me, "5usdc")], me)).toBeUndefined();
            expect(netUsdcTransferFor([], me)).toBeUndefined();
        });

        it("ignores non-USDC and non-transfer events", () => {
            const events = [
                transfer("b521a", me, "100stake"),
                { type: "coin_received", attributes: [{ key: "receiver", value: me }, { key: "amount", value: "9usdc" }] }
            ];
            expect(netUsdcTransferFor(events, me)).toBeUndefined();
        });
    });
});

describe("describeTransaction", () => {
    const ME = "b52me";
    const msg = (type: string, fields: Record<string, unknown> = {}) => ({ tx: { body: { messages: [{ "@type": `/pokerchain.poker.v1.${type}`, ...fields }] } } });

    it("labels poker actions by action name, hiding the format-dependent amount", () => {
        const d = describeTransaction(msg("MsgPerformAction", { action: "post-big-blind", amount: "20", game_id: "0xabc" }), ME);
        expect(d).toMatchObject({ label: "Post-big-blind", action: "post-big-blind", gameId: "0xabc", messageType: "MsgPerformAction" });
        expect(d.amount).toBeUndefined();
        expect(describeTransaction(msg("MsgPerformAction", { action: "bet" }), ME).label).toBe("Bet");
        expect(describeTransaction(msg("MsgPerformAction", { action: "check" }), ME).label).toBe("Check");
    });

    it("labels joins (with buy-in), leaves, creates and top-ups", () => {
        expect(describeTransaction(msg("MsgJoinGame", { buy_in: "5000000", game_id: "0x1" }), ME)).toMatchObject({ label: "Join table", amount: "5000000", gameId: "0x1" });
        expect(describeTransaction(msg("MsgLeaveGame", { game_id: "0x1" }), ME)).toMatchObject({ label: "Leave table", gameId: "0x1" });
        expect(describeTransaction(msg("MsgCreateGame"), ME).label).toBe("Create table");
        expect(describeTransaction(msg("MsgTopUp", { amount: "100", game_id: "0x1" }), ME)).toMatchObject({ label: "Top up", amount: "100" });
    });

    it("labels transfers with their direction for the viewer", () => {
        const send = (from: string) => ({ tx: { body: { messages: [{ "@type": "/cosmos.bank.v1beta1.MsgSend", from_address: from, amount: [{ denom: "usdc", amount: "250" }] }] } } });
        expect(describeTransaction(send(ME), ME)).toMatchObject({ label: "Transfer", transferAmount: "250", transferDirection: "sent" });
        // Foreign MsgSend: show Received (not the sender's "Transfer" framing) with the coin amount.
        expect(describeTransaction(send("b52other"), ME)).toMatchObject({ label: "Received", transferAmount: "250", transferDirection: "received" });
    });

    it("shows Received + viewer net for a foreign buy-in fee share (ui#855)", () => {
        const me = ME;
        const events = [
            { type: "transfer", attributes: [{ key: "recipient", value: "b521escrow" }, { key: "sender", value: "b521player" }, { key: "amount", value: "1000000usdc" }] },
            { type: "transfer", attributes: [{ key: "recipient", value: "b521x" }, { key: "sender", value: "b521escrow" }, { key: "amount", value: "25064usdc" }] },
            { type: "transfer", attributes: [{ key: "recipient", value: me }, { key: "sender", value: "b521escrow" }, { key: "amount", value: "25062usdc" }] },
            { type: "transfer", attributes: [{ key: "recipient", value: "b521y" }, { key: "sender", value: "b521escrow" }, { key: "amount", value: "25062usdc" }] }
        ];
        const foreignJoin = {
            events,
            tx: { body: { messages: [{ "@type": "/pokerchain.poker.v1.MsgJoinGame", player: "b521player", buy_in_amount: "1000000", game_id: "0xg" }] } }
        };
        expect(describeTransaction(foreignJoin, me)).toMatchObject({
            label: "Received",
            messageType: "MsgJoinGame",
            gameId: "0xg",
            transferAmount: "25062",
            transferDirection: "received"
        });
        // Own join still shows Join table + buy-in (HODL labels/amounts preserved).
        expect(
            describeTransaction(
                { tx: { body: { messages: [{ "@type": "/pokerchain.poker.v1.MsgJoinGame", player: me, buy_in_amount: "1000000", game_id: "0xg" }] } } },
                me
            )
        ).toMatchObject({ label: "Join table", amount: "1000000", gameId: "0xg" });
    });

    it("labels deposits and withdrawals, taking the amount from transfer events", () => {
        const events = [{ type: "transfer", attributes: [{ key: "recipient", value: ME }, { key: "amount", value: "7000000usdc" }] }];
        expect(describeTransaction({ ...msg("MsgProcessDeposit"), events }, ME)).toMatchObject({ label: "Deposit", transferAmount: "7000000", transferDirection: "received" });
        expect(describeTransaction(msg("MsgInitiateWithdrawal"), ME).label).toBe("Withdrawal");
    });

    it("falls back gracefully for unknown or missing messages", () => {
        expect(describeTransaction(msg("MsgDoSomethingNew"), ME).label).toBe("Do Something New");
        expect(describeTransaction({}, ME)).toMatchObject({ label: "Transaction", messageType: "Transaction" });
        const events = [{ type: "transfer", attributes: [{ key: "recipient", value: "b52x" }, { key: "amount", value: "5usdc" }] }];
        expect(describeTransaction({ events }, ME)).toMatchObject({ label: "Transfer", transferDirection: "sent" });
    });
});

describe("poker action amounts", () => {
    const ME = "b52me";
    const act = (action: string, amount: string) => ({
        tx: { body: { messages: [{ "@type": "/pokerchain.poker.v1.MsgPerformAction", action, amount, game_id: "0xg" }] } }
    });

    it("keeps the raw non-zero amount of bets, raises, calls, blinds and all-ins", () => {
        for (const action of ["bet", "raise", "call", "post-small-blind", "post-big-blind", "all-in"]) {
            expect(describeTransaction(act(action, "1732"), ME).actionAmount).toBe("1732");
        }
        // Check, fold, deal… carry amount "0" on chain: no amount.
        for (const action of ["check", "fold", "deal", "new-hand"]) {
            expect(describeTransaction(act(action, "0"), ME).actionAmount).toBeUndefined();
        }
    });

    it("reads the join buy-in from the chain's buy_in_amount field", () => {
        const join = { tx: { body: { messages: [{ "@type": "/pokerchain.poker.v1.MsgJoinGame", game_id: "0xg", seat: "5", buy_in_amount: "1000000" }] } } };
        expect(describeTransaction(join, ME)).toMatchObject({ label: "Join table", amount: "1000000" });
    });

    it("formats USDC for cash games and whole chips (no $) for Sit & Go and tournaments", () => {
        expect(formatActionAmount("20000", "cash")).toBe("0.02 USDC");
        expect(formatActionAmount("1732", "sit-and-go")).toBe("1,732 chips");
        expect(formatActionAmount("25000", "tournament")).toBe("25,000 chips");
        expect(formatActionAmount("1732", undefined)).toBeUndefined();
        expect(formatActionAmount(undefined, "cash")).toBeUndefined();
    });

    it("parses the format from the chain's game response (game is a JSON string)", () => {
        expect(parseGameFormat({ game: JSON.stringify({ format: "sit-and-go" }) })).toBe("sit-and-go");
        expect(parseGameFormat({ game: { format: "cash" } })).toBe("cash");
        expect(parseGameFormat({ game: "not json" })).toBeUndefined();
        expect(parseGameFormat(null)).toBeUndefined();
    });

    it("looks each game up once and retries a failed lookup next time", async () => {
        clearGameFormatCache();
        const getGame = jest.fn(async (id: string) => {
            if (id === "0xbad") throw new Error("down");
            return { game: JSON.stringify({ format: id === "0xcash" ? "cash" : "sit-and-go" }) };
        });
        expect(await fetchGameFormats(getGame, ["0xcash", "0xsng", "0xcash", undefined, "0xbad"])).toEqual({
            "0xcash": "cash",
            "0xsng": "sit-and-go",
            "0xbad": undefined
        });
        await fetchGameFormats(getGame, ["0xcash", "0xsng", "0xbad"]);
        expect(getGame.mock.calls.map(c => c[0]).sort()).toEqual(["0xbad", "0xbad", "0xcash", "0xsng"]);
    });
});
