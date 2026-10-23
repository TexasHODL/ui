import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import AddressPage from "./AddressPage";

const ADDRESS = "b52viewer000000000000000000000000000000";

jest.mock("../../components/common/AnimatedBackground", () => ({ AnimatedBackground: () => null }));
jest.mock("../../components/explorer/ExplorerHeader", () => ({ ExplorerHeader: () => null }));
// Stable object, like the real context (a new one each render would refetch forever).
const mockNetwork = { currentNetwork: { name: "Test", rpc: "rpc", rest: "rest" } };
jest.mock("../../context/NetworkContext", () => ({
    useNetwork: () => mockNetwork
}));
jest.mock("../../utils/cosmos/client", () => ({
    getCosmosClient: () => ({ getAllBalances: async () => [{ denom: "usdc", amount: "1000000" }] })
}));

const body = (type: string, fields: Record<string, unknown> = {}) => ({ body: { messages: [{ "@type": type, ...fields }] } });
jest.mock("../../context/CosmosApiContext", () => ({
    useCosmosApi: () => ({
        getGame: async (id: string) => ({ game: JSON.stringify({ gameId: id, format: id === "0xcash" ? "cash" : "sit-and-go" }) }),
        getSentTransactions: async () => ({
            pagination: null,
            total: "3",
            tx_responses: [
                { txhash: "AAA111", height: "30", timestamp: "2026-10-21T10:00:00Z", code: 0 },
                { txhash: "BBB222", height: "20", timestamp: "2026-10-21T09:00:00Z", code: 0 },
                { txhash: "CCC333", height: "10", timestamp: "2026-10-21T08:00:00Z", code: 1 },
                { txhash: "EEE555", height: "9", timestamp: "2026-10-21T07:00:00Z", code: 0 },
                { txhash: "FFF666", height: "8", timestamp: "2026-10-21T06:00:00Z", code: 0 }
            ],
            txs: [
                body("/pokerchain.poker.v1.MsgPerformAction", { action: "post-big-blind", amount: "100", game_id: "0xgame" }),
                body("/pokerchain.poker.v1.MsgJoinGame", { buy_in_amount: "5000000", game_id: "0xgame", seat: "5" }),
                body("/pokerchain.poker.v1.MsgSomethingNew"),
                body("/pokerchain.poker.v1.MsgPerformAction", { action: "raise", amount: "40000", game_id: "0xcash" }),
                body("/pokerchain.poker.v1.MsgPerformAction", { action: "check", amount: "0", game_id: "0xcash" })
            ]
        }),
        getReceivedTransactions: async () => ({
            pagination: null,
            total: "2",
            tx_responses: [
                // Already in the sent list: deduped by hash.
                { txhash: "AAA111", height: "30", timestamp: "2026-10-21T10:00:00Z", code: 0 },
                {
                    txhash: "DDD444",
                    height: "25",
                    timestamp: "2026-10-21T09:30:00Z",
                    code: 0,
                    events: [{ type: "transfer", attributes: [{ key: "recipient", value: ADDRESS }, { key: "amount", value: "2500000usdc" }] }]
                }
            ],
            txs: [
                body("/pokerchain.poker.v1.MsgPerformAction", { action: "post-big-blind", amount: "100", game_id: "0xgame" }),
                body("/cosmos.bank.v1beta1.MsgSend", { from_address: "b52friend", amount: [{ denom: "usdc", amount: "2500000" }] })
            ]
        })
    })
}));

describe("AddressPage transactions", () => {
    it("shows what each tx was for, with its full hash, block and time", async () => {
        render(
            <MemoryRouter initialEntries={[`/explorer/address/${ADDRESS}`]}>
                <Routes>
                    <Route path="/explorer/address/:address" element={<AddressPage />} />
                </Routes>
            </MemoryRouter>
        );
        fireEvent.click(await screen.findByRole("tab", { name: /Transactions \(6\)/ }));
        const rows = await screen.findAllByTestId("address-tx");
        expect(rows.map(row => within(row).getByTestId("tx-action").textContent)).toEqual(["Post-big-blind", "Received", "Join table", "Something New", "Raise", "Check"]);

        expect(within(rows[0]).getByText("AAA111")).toBeInTheDocument();
        expect(within(rows[0]).getByText(/Block 30/)).toBeInTheDocument();
        expect(within(rows[1]).getByText("+")).toBeInTheDocument();
        expect(within(rows[1]).getByText("2.50 USDC")).toBeInTheDocument();
        expect(within(rows[2]).getByText("5.00 USDC")).toBeInTheDocument();
        expect(within(rows[3]).getByText("Failed")).toBeInTheDocument();

        // Action amounts: chips (no $) in Sit & Go, USDC in cash games; none for check.
        expect(await within(rows[0]).findByText("100 chips")).toBeInTheDocument();
        expect(within(rows[4]).getByText("0.04 USDC")).toBeInTheDocument();
        expect(within(rows[5]).queryByTestId("tx-amount")).toBeNull();
    });
});
