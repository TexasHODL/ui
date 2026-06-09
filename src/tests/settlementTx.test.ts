import { signSettlementTx, resetSettlementSequence } from "../utils/cosmos/settlementTx";
import type { NetworkEndpoints } from "../context/NetworkContext";

// getCosmosUrls is used to derive the REST endpoint.
jest.mock("../utils/cosmos/client", () => ({
    getCosmosUrls: () => ({ rpcEndpoint: "http://rpc", restEndpoint: "http://rest" })
}));

const network = {} as NetworkEndpoints;

function mockSigningClient(base64 = "dHhyYXc=") {
    return {
        signPerformAction: jest.fn().mockResolvedValue({ base64, sequence: 0, accountNumber: 1 })
    } as any;
}

describe("signSettlementTx", () => {
    const ADDR = "b52funded";

    beforeEach(() => {
        resetSettlementSequence(ADDR);
        jest.restoreAllMocks();
    });

    it("signs and returns the base64 tx for a funded account, tracking sequence locally", async () => {
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ account: { account_number: "7", sequence: "3" } })
        }) as any;
        const client = mockSigningClient();

        const tx1 = await signSettlementTx(client, ADDR, network, "g1", "call", 100n, "");
        const tx2 = await signSettlementTx(client, ADDR, network, "g1", "check", 0n, "");

        expect(tx1).toBe("dHhyYXc=");
        expect(tx2).toBe("dHhyYXc=");
        // account queried ONCE; sequence incremented locally (3 then 4).
        expect((global.fetch as jest.Mock)).toHaveBeenCalledTimes(1);
        expect(client.signPerformAction).toHaveBeenNthCalledWith(1, "g1", "call", 100n, "", expect.objectContaining({ accountNumber: 7, sequence: 3 }));
        expect(client.signPerformAction).toHaveBeenNthCalledWith(2, "g1", "check", 0n, "", expect.objectContaining({ sequence: 4 }));
    });

    it("returns undefined (no settlement) for an unfunded account — gameplay still proceeds", async () => {
        global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 404 }) as any;
        const client = mockSigningClient();

        const tx = await signSettlementTx(client, "b52unfunded", network, "g1", "call", 100n, "");

        expect(tx).toBeUndefined();
        expect(client.signPerformAction).not.toHaveBeenCalled();
    });

    it("returns undefined and resets sequence on a sign error so the next action re-syncs", async () => {
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ account: { account_number: "1", sequence: "0" } })
        }) as any;
        const client = {
            signPerformAction: jest.fn().mockRejectedValueOnce(new Error("sign boom"))
        } as any;

        const tx = await signSettlementTx(client, ADDR, network, "g1", "raise", 200n, "");
        expect(tx).toBeUndefined();

        // After a reset, the next call re-fetches the account.
        await signSettlementTx(client, ADDR, network, "g1", "raise", 200n, "").catch(() => {});
        expect((global.fetch as jest.Mock).mock.calls.length).toBeGreaterThanOrEqual(2);
    });
});
