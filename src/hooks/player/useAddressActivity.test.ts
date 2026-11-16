import { mergeActivityRows, mergeLoadedActivity, type ActivityRow } from "./useAddressActivity";
import type { TransactionResponse } from "../../components/TransactionPanel";

const ME = "b52activity00000000000000000000000000000";

const action = (a: string, amount: string, game: string) => ({
    body: { messages: [{ "@type": "/pokerchain.poker.v1.MsgPerformAction", action: a, amount, game_id: game }] }
});

const sent: TransactionResponse = {
    pagination: null,
    total: "2",
    tx_responses: [
        { txhash: "A2", height: "2", timestamp: "2026-10-21T09:00:00Z", code: 0 },
        { txhash: "A1", height: "4", timestamp: "2026-10-21T10:00:00Z", code: 0 }
    ],
    txs: [action("call", "20000", "0xcash"), action("bet", "1732", "0xsng")]
};

const received: TransactionResponse = {
    pagination: null,
    total: "1",
    tx_responses: [{ txhash: "A1", height: "4", timestamp: "2026-10-21T10:00:00Z", code: 0 }],
    txs: [action("bet", "1732", "0xsng")]
};

const deposit: ActivityRow = {
    txhash: "deposit-5",
    height: "5",
    timestamp: "2026-10-28T01:51:12Z",
    code: 0,
    label: "Deposit",
    transferAmount: "1000000",
    displayHash: "0xdf5b4d6e",
    linkTo: "/explorer/tx/0xdf5b4d6e"
};

describe("mergeActivityRows", () => {
    it("dedupes by hash, keeps the lobby labels, and sorts newest block first", () => {
        const rows = mergeActivityRows(sent, received, [deposit], ME);
        expect(rows.map(row => row.txhash)).toEqual(["deposit-5", "A1", "A2"]);
        expect(rows[0].label).toBe("Deposit");
        expect(rows[1].label).toBe("Bet");
        expect(rows[2].label).toBe("Call");
    });
});

describe("mergeLoadedActivity", () => {
    it("dedupes appended pages and keeps newest first", () => {
        const older: ActivityRow = { txhash: "A0", height: "1", timestamp: "", code: 0, label: "Fold" };
        const newer: ActivityRow = { txhash: "A2", height: "4", timestamp: "", code: 0, label: "Bet" };
        const overlap: ActivityRow = { txhash: "A2", height: "4", timestamp: "", code: 0, label: "Bet" };
        expect(mergeLoadedActivity([newer], [overlap, older]).map(row => row.txhash)).toEqual(["A2", "A0"]);
    });
});
