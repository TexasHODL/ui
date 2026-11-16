import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ProfileActivityPanel } from "./ProfileActivityPanel";
import { ACTIVITY_PAGE_SIZE } from "../../hooks/player/useAddressActivity";

const ME = "b52lobby00000000000000000000000000000000";

const mockNetwork = { currentNetwork: { name: "Test", rpc: "rpc", rest: "rest" } };
jest.mock("../../context/NetworkContext", () => ({ useNetwork: () => mockNetwork }));

const action = (a: string, amount: string, game: string) => ({
    body: { messages: [{ "@type": "/pokerchain.poker.v1.MsgPerformAction", action: a, amount, game_id: game }] }
});

const manyTxs = Array.from({ length: ACTIVITY_PAGE_SIZE + 2 }, (_, i) => {
    const n = ACTIVITY_PAGE_SIZE + 2 - i;
    return {
        response: { txhash: `H${n}`, height: String(n), timestamp: "2026-10-21T10:00:00Z", code: 0 },
        body: action(i === 0 ? "bet" : "fold", i === 0 ? "1732" : "0", "0xsng")
    };
});

const state = { empty: false, fail: false };

const mockApi = {
    getGame: async (id: string) => ({ game: JSON.stringify({ format: id === "0xcash" ? "cash" : "sit-and-go" }) }),
    getSentTransactions: async (query: string) => {
        if (state.fail) throw new Error("offline");
        if (state.empty || !query.startsWith("message.sender")) {
            return { pagination: null, total: "0", tx_responses: [], txs: [] };
        }
        return {
            pagination: null,
            total: String(manyTxs.length),
            tx_responses: manyTxs.map(tx => tx.response),
            txs: manyTxs.map(tx => tx.body)
        };
    },
    getReceivedTransactions: async () => {
        if (state.fail) throw new Error("offline");
        return { pagination: null, total: "0", tx_responses: [], txs: [] };
    }
};

const depositEvents = [
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
];

const mockRpc = {
    blockSearch: async () => ({
        result: { blocks: state.empty ? [] : [{ block: { header: { height: "30", time: "2026-10-28T01:51:12Z" } } }], total_count: state.empty ? "0" : "1" }
    }),
    blockResults: async () => ({ result: { finalize_block_events: state.empty ? [] : depositEvents } })
};
jest.mock("../../context/CosmosApiContext", () => ({ useCosmosApi: () => mockApi, useCometRpcApiFactory: () => () => mockRpc }));

const renderPanel = () =>
    render(
        <MemoryRouter>
            <ProfileActivityPanel address={ME} />
        </MemoryRouter>
    );

describe("ProfileActivityPanel", () => {
    beforeEach(() => {
        state.empty = false;
        state.fail = false;
    });

    it("lists activity with lobby labels, amounts, table links and a load-more page", async () => {
        renderPanel();
        expect(await screen.findByText("Deposit")).toBeInTheDocument();
        expect(screen.getByText("1.00 USDC")).toBeInTheDocument();
        expect(screen.getByText("Bet")).toBeInTheDocument();
        expect(screen.getByText("1,732 chips")).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "Game: 0xsng" })).toHaveAttribute("href", "/table/0xsng");
        expect(screen.getAllByTestId("activity-row")).toHaveLength(ACTIVITY_PAGE_SIZE);
        expect(screen.getByText(`Showing ${ACTIVITY_PAGE_SIZE} of ${manyTxs.length + 1}`)).toBeInTheDocument();
        fireEvent.click(screen.getByRole("button", { name: "Load more" }));
        expect(screen.getAllByTestId("activity-row")).toHaveLength(manyTxs.length + 1);
        expect(screen.queryByRole("button", { name: "Load more" })).not.toBeInTheDocument();
        expect(screen.getByText(`Showing ${manyTxs.length + 1} of ${manyTxs.length + 1}`)).toBeInTheDocument();
    });

    it("shows an empty state when the address has no activity", async () => {
        state.empty = true;
        renderPanel();
        expect(await screen.findByText("No activity yet")).toBeInTheDocument();
    });

    it("shows an error and can retry", async () => {
        state.fail = true;
        renderPanel();
        expect(await screen.findByText("Failed to load activity")).toBeInTheDocument();
        state.fail = false;
        fireEvent.click(screen.getByRole("button", { name: "Try again" }));
        expect(await screen.findByText("Deposit")).toBeInTheDocument();
    });
});
