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
jest.mock("../context/CosmosApiContext", () => ({ useCosmosApi: () => mockApi }));

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
        expect(screen.getAllByText(/chips|USDC/)).toHaveLength(2);
    });
});
