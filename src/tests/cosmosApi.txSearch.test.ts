import { CosmosApi, buildTxSearchPath, TX_SEARCH_PAGE_SIZE } from "../apis/Api";

describe("CosmosApi tx search helpers", () => {
    it("buildTxSearchPath defaults to limit=10 page=1 (lobby Recent Transactions)", () => {
        const q = "message.sender='b521x'";
        expect(buildTxSearchPath(q)).toBe(`/cosmos/tx/v1beta1/txs?query=${encodeURIComponent(q)}&order_by=2&limit=10&page=1`);
    });

    it("buildTxSearchPath accepts limit and page (GetTxsEvent uses limit+page, not pagination.*)", () => {
        const q = "transfer.recipient='b521x'";
        expect(buildTxSearchPath(q, { limit: 100, page: 3 })).toBe(
            `/cosmos/tx/v1beta1/txs?query=${encodeURIComponent(q)}&order_by=2&limit=100&page=3`
        );
    });

    it("getAllTransactionsMatching pages until total is covered", async () => {
        const api = new CosmosApi({ baseUrl: "http://node.test", secure: false });
        const client = (api as unknown as { client: { get: jest.Mock } }).client;
        const page = (n: number, hashes: string[], total: string) => ({
            data: {
                pagination: null,
                total,
                tx_responses: hashes.map((txhash, i) => ({
                    txhash,
                    height: String(100 - n * 10 - i),
                    timestamp: "2026-10-21T00:00:00Z",
                    code: 0
                })),
                txs: hashes.map(() => ({ body: { messages: [] } }))
            }
        });

        client.get = jest
            .fn()
            .mockResolvedValueOnce(page(1, Array.from({ length: TX_SEARCH_PAGE_SIZE }, (_, i) => `H1_${i}`), "250"))
            .mockResolvedValueOnce(page(2, Array.from({ length: TX_SEARCH_PAGE_SIZE }, (_, i) => `H2_${i}`), "250"))
            .mockResolvedValueOnce(page(3, Array.from({ length: 50 }, (_, i) => `H3_${i}`), "250"));

        const result = await api.getAllTransactionsMatching("message.sender='b521x'");
        expect(client.get).toHaveBeenCalledTimes(3);
        expect(client.get.mock.calls[0][0]).toContain("limit=100&page=1");
        expect(client.get.mock.calls[1][0]).toContain("limit=100&page=2");
        expect(client.get.mock.calls[2][0]).toContain("limit=100&page=3");
        expect(result.tx_responses).toHaveLength(250);
        expect(result.txs).toHaveLength(250);
        expect(result.total).toBe("250");
    });

    it("getSentTransactions still requests a small page by default", async () => {
        const api = new CosmosApi({ baseUrl: "http://node.test", secure: false });
        const client = (api as unknown as { client: { get: jest.Mock } }).client;
        client.get = jest.fn().mockResolvedValue({ data: { tx_responses: [], txs: [], total: "0", pagination: null } });
        await api.getSentTransactions("message.sender='b521x'");
        expect(client.get.mock.calls[0][0]).toContain("limit=10&page=1");
    });
});
