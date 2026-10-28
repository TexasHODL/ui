import { depositsFromBlockResults, fetchBridgeDeposits, bridgeDepositRow } from "./bridgeDeposits";

const ME = "b521kjpfyeyg3watq2f978vhu48ju3xjwdp0wjgp5t";
// Shape of node.texashodl.net/rpc/block_results?height=784200 (Oct 28, 2026).
const results = {
    finalize_block_events: [
        { type: "transfer", attributes: [{ key: "recipient", value: ME }, { key: "amount", value: "1000000usdc" }] },
        {
            type: "bridge_deposit_processed",
            attributes: [
                { key: "eth_tx_hash", value: "0xdf5b" },
                { key: "recipient", value: ME },
                { key: "amount", value: "1000000usdc" },
                { key: "nonce", value: "100" },
                { key: "mode", value: "EndBlock" }
            ]
        },
        { type: "bridge_deposit_processed", attributes: [{ key: "recipient", value: "b52other" }, { key: "amount", value: "5usdc" }] }
    ]
};

describe("bridgeDeposits", () => {
    it("parses only this address's bridge_deposit_processed events", () => {
        expect(depositsFromBlockResults(results, ME, "784200", "t")).toEqual([
            { height: "784200", timestamp: "t", amount: "1000000", ethTxHash: "0xdf5b", nonce: "100" }
        ]);
    });

    it("searches block events (not txs) and reads each block's results", async () => {
        const blockSearch = jest.fn(async () => ({ result: { blocks: [{ block: { header: { height: "784200", time: "2026-10-28T01:51:12Z" } } }] } }));
        const blockResults = jest.fn(async () => ({ result: results }));
        const deposits = await fetchBridgeDeposits({ blockSearch, blockResults }, ME, 6);
        expect(blockSearch).toHaveBeenCalledWith(`bridge_deposit_processed.recipient='${ME}'`, 6, "desc");
        expect(blockResults).toHaveBeenCalledWith("784200");
        expect(deposits).toHaveLength(1);
        expect(bridgeDepositRow(deposits[0])).toMatchObject({ label: "Deposit", transferAmount: "1000000", transferDirection: "received", linkTo: "/explorer/block/784200" });
    });

    it("returns nothing when no block matched", async () => {
        const deposits = await fetchBridgeDeposits({ blockSearch: async () => ({ result: { blocks: [] } }), blockResults: jest.fn() }, ME);
        expect(deposits).toEqual([]);
    });
});