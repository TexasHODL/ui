import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import TransactionPanel from "./TransactionPanel";

const ME = "b52lobby00000000000000000000000000000000";
const mockNetwork = { currentNetwork: { name: "Test", rpc: "rpc", rest: "rest" } };
jest.mock("../context/NetworkContext", () => ({ useNetwork: () => mockNetwork }));

const action = (a: string, amount: string, game: string) => ({
    body: { messages: [{ "@type": "/pokerchain.poker.v1.MsgPerformAction", action: a, amount, game_id: game }] }
});
const mockApi = {
    getGame: async (id: string) => ({ game: JSON.stringify({ format: id === "0xcash" ? "cash" : "sit-and-go" }) }),
    getSentTransactions: async () => ({
        pagination: null,
        total: "3",
        tx_responses: [
            { txhash: "A1", height: "3", timestamp: "2026-10-21T10:00:00Z", code: 0 },
            { txhash: "A2", height: "2", timestamp: "2026-10-21T09:00:00Z", code: 0 },
            { txhash: "A3", height: "1", timestamp: "2026-10-21T08:00:00Z", code: 0 }
        ],
        txs: [action("bet", "1732", "0xsng"), action("call", "20000", "0xcash"), action("fold", "0", "0xsng")]
    }),
    getReceivedTransactions: async () => ({ pagination: null, total: "0", tx_responses: [], txs: [] })
};

/** CometBFT RPC: one bridge deposit credited in EndBlock (no tx) at block 5. */
const mockRpc = {
    blockSearch: async () => ({ result: { blocks: [{ block: { header: { height: "5", time: "2026-10-28T01:51:12Z" } } }], total_count: "1" } }),
    blockResults: async () => ({
        result: {
            finalize_block_events: [
                { type: "transfer", attributes: [{ key: "recipient", value: ME }, { key: "amount", value: "1000000usdc" }] },
                {
                    type: "bridge_deposit_processed",
                    attributes: [
                        { key: "eth_tx_hash", value: "0xdf5b4d6ebe9839b8de37c4cc9b95fff28e41066eea9bb007d91acedb61421310" },
                        { key: "recipient", value: ME },
                        { key: "amount", value: "1000000usdc" },
                        { key: "nonce", value: "100" }
                    ]
                }
            ]
        }
    })
};
jest.mock("../context/CosmosApiContext", () => ({ useCosmosApi: () => mockApi, useCometRpcApiFactory: () => () => mockRpc }));

describe("TransactionPanel (lobby Recent Transactions)", () => {
    it("shows action amounts in chips for Sit & Go and USDC for cash, none for fold", async () => {
        render(
            <MemoryRouter>
                <TransactionPanel cosmosWalletAddress={ME} usdcBalance="0" />
            </MemoryRouter>
        );
        expect(await screen.findByText("1,732 chips")).toBeInTheDocument();
        expect(screen.getByText("0.02 USDC")).toBeInTheDocument();
        expect(screen.getByText("Bet")).toBeInTheDocument();
        expect(screen.getByText("Fold")).toBeInTheDocument();
        expect(screen.getAllByText(/chips|USDC/)).toHaveLength(3);
    });

    it("shows a bridge deposit (credited in EndBlock, not a tx) as the newest row", async () => {
        render(
            <MemoryRouter>
                <TransactionPanel cosmosWalletAddress={ME} usdcBalance="0" />
            </MemoryRouter>
        );
        expect(await screen.findByText("Deposit")).toBeInTheDocument();
        expect(screen.getByText("1.00 USDC")).toBeInTheDocument();
    });
});
