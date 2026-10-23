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

/** Extra sent txs with low heights so the labelled fixtures stay newest-first. */
function mockManySent(count: number) {
    const tx_responses = [];
    const txs = [];
    for (let i = 0; i < count; i++) {
        const n = String(1000 + i);
        tx_responses.push({
            txhash: `SENT${n}`,
            height: String(5 - (i % 5)),
            timestamp: `2026-10-21T${String(10 + (i % 10)).padStart(2, "0")}:00:00Z`,
            code: 0
        });
        txs.push(body("/pokerchain.poker.v1.MsgPerformAction", { action: "check", amount: "0", game_id: "0xcash" }));
    }
    return { tx_responses, txs };
}

jest.mock("../../context/CosmosApiContext", () => ({
    useCosmosApi: () => ({
        getGame: async (id: string) => ({ game: JSON.stringify({ gameId: id, format: id === "0xcash" ? "cash" : "sit-and-go" }) }),
        // AddressPage loads full history via getAllTransactionsMatching (not the limit=10 helpers).
        getAllTransactionsMatching: async (query: string) => {
            if (query.includes("message.sender")) {
                const bulk = mockManySent(15);
                return {
                    pagination: null,
                    total: "20",
                    tx_responses: [
                        { txhash: "AAA111", height: "30", timestamp: "2026-10-21T10:00:00Z", code: 0 },
                        { txhash: "BBB222", height: "20", timestamp: "2026-10-21T09:00:00Z", code: 0 },
                        { txhash: "CCC333", height: "10", timestamp: "2026-10-21T08:00:00Z", code: 1 },
                        { txhash: "EEE555", height: "9", timestamp: "2026-10-21T07:00:00Z", code: 0 },
                        { txhash: "FFF666", height: "8", timestamp: "2026-10-21T06:00:00Z", code: 0 },
                        ...bulk.tx_responses
                    ],
                    txs: [
                        body("/pokerchain.poker.v1.MsgPerformAction", { action: "post-big-blind", amount: "100", game_id: "0xgame" }),
                        body("/pokerchain.poker.v1.MsgJoinGame", { buy_in_amount: "5000000", game_id: "0xgame", seat: "5" }),
                        body("/pokerchain.poker.v1.MsgSomethingNew"),
                        body("/pokerchain.poker.v1.MsgPerformAction", { action: "raise", amount: "40000", game_id: "0xcash" }),
                        body("/pokerchain.poker.v1.MsgPerformAction", { action: "check", amount: "0", game_id: "0xcash" }),
                        ...bulk.txs
                    ]
                };
            }
            return {
                pagination: null,
                total: "8",
                tx_responses: [
                    // Already in the sent list: deduped by hash.
                    { txhash: "AAA111", height: "30", timestamp: "2026-10-21T10:00:00Z", code: 0 },
                    {
                        txhash: "DDD444",
                        height: "25",
                        timestamp: "2026-10-21T09:30:00Z",
                        code: 0,
                        events: [{ type: "transfer", attributes: [{ key: "recipient", value: ADDRESS }, { key: "amount", value: "2500000usdc" }] }]
                    },
                    // Extra received-only txs beyond the old per-query limit of 10 (heights below fixtures).
                    ...Array.from({ length: 6 }, (_, i) => ({
                        txhash: `RECV${2000 + i}`,
                        height: String(4 - (i % 4)),
                        timestamp: `2026-10-21T09:${String(20 - i).padStart(2, "0")}:00Z`,
                        code: 0,
                        events: [{ type: "transfer", attributes: [{ key: "recipient", value: ADDRESS }, { key: "amount", value: "1000000usdc" }] }]
                    }))
                ],
                txs: [
                    body("/pokerchain.poker.v1.MsgPerformAction", { action: "post-big-blind", amount: "100", game_id: "0xgame" }),
                    body("/cosmos.bank.v1beta1.MsgSend", { from_address: "b52friend", amount: [{ denom: "usdc", amount: "2500000" }] }),
                    ...Array.from({ length: 6 }, () =>
                        body("/cosmos.bank.v1beta1.MsgSend", { from_address: "b52friend", amount: [{ denom: "usdc", amount: "1000000" }] })
                    )
                ]
            };
        },
        getSentTransactions: async () => ({ pagination: null, total: "0", tx_responses: [], txs: [] }),
        getReceivedTransactions: async () => ({ pagination: null, total: "0", tx_responses: [], txs: [] })
    })
}));

function renderAddress() {
    return render(
        <MemoryRouter initialEntries={[`/explorer/address/${ADDRESS}`]}>
            <Routes>
                <Route path="/explorer/address/:address" element={<AddressPage />} />
            </Routes>
        </MemoryRouter>
    );
}

describe("AddressPage transactions", () => {
    it("shows what each tx was for, with its full hash, block and time", async () => {
        renderAddress();
        // 5 labelled sent + 15 bulk sent + 1 unique received + 6 extra received = 27 (AAA111 deduped)
        fireEvent.click(await screen.findByRole("tab", { name: /Transactions \(27\)/ }));
        const rows = await screen.findAllByTestId("address-tx");
        expect(rows).toHaveLength(27);

        // Newest-first among the labelled fixtures (bulk/extra use lower heights).
        expect(within(rows[0]).getByTestId("tx-action").textContent).toBe("Post-big-blind");
        expect(within(rows[1]).getByTestId("tx-action").textContent).toBe("Received");
        expect(within(rows[2]).getByTestId("tx-action").textContent).toBe("Join table");

        expect(within(rows[0]).getByText("AAA111")).toBeInTheDocument();
        expect(within(rows[0]).getByText(/Block 30/)).toBeInTheDocument();
        expect(within(rows[1]).getByText("+")).toBeInTheDocument();
        expect(within(rows[1]).getByText("2.50 USDC")).toBeInTheDocument();
        expect(within(rows[2]).getByText("5.00 USDC")).toBeInTheDocument();

        const failed = rows.find(row => within(row).queryByText("Failed"));
        expect(failed).toBeTruthy();

        // Action amounts: chips (no $) in Sit & Go, USDC in cash games.
        expect(await within(rows[0]).findByText("100 chips")).toBeInTheDocument();
        const raiseRow = rows.find(row => within(row).queryByText("Raise"));
        expect(raiseRow && within(raiseRow).getByText("0.04 USDC")).toBeTruthy();
    });

    it("can show more than the old 10 sent + 10 received cap", async () => {
        renderAddress();
        fireEvent.click(await screen.findByRole("tab", { name: /Transactions \(27\)/ }));
        expect(await screen.findAllByTestId("address-tx")).toHaveLength(27);
        expect(27).toBeGreaterThan(20);
    });
});
