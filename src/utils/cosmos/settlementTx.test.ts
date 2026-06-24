import { NonPlayerActionType, PlayerActionType } from "@block52/poker-vm-sdk";
import type { SigningCosmosClient } from "@block52/poker-vm-sdk";
import type { NetworkEndpoints } from "../../context/NetworkContext";
import { signSettlementTx } from "./settlementTx";
import { getCosmosUrls } from "./client";

jest.mock("./client", () => ({
    getCosmosUrls: jest.fn(() => ({ restEndpoint: "http://rest" }))
}));

const fakeNetwork = {} as NetworkEndpoints;
const ADDR = "b52test";

// signSettlementTx queries the account sequence once via fetch; stub a funded
// account so signing proceeds.
function stubFundedAccount(): void {
    global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ account: { account_number: "5", sequence: "9" } })
    }) as unknown as typeof fetch;
}

function makeClient() {
    return {
        signJoinGame: jest.fn().mockResolvedValue({ base64: "JOIN_TX" }),
        signLeaveGame: jest.fn().mockResolvedValue({ base64: "LEAVE_TX" }),
        signTopUp: jest.fn().mockResolvedValue({ base64: "TOPUP_TX" }),
        signPerformAction: jest.fn().mockResolvedValue({ base64: "PERFORM_TX" })
    };
}

describe("signSettlementTx — money-mover dispatch (#2325)", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        stubFundedAccount();
        (getCosmosUrls as jest.Mock).mockReturnValue({ restEndpoint: "http://rest" });
    });

    it("signs MsgJoinGame for JOIN, with the seat parsed from data", async () => {
        const client = makeClient();
        const tx = await signSettlementTx(client as unknown as SigningCosmosClient, ADDR, fakeNetwork, "game-1", NonPlayerActionType.JOIN, 1000n, "seat=4");

        expect(tx).toBe("JOIN_TX");
        expect(client.signJoinGame).toHaveBeenCalledWith("game-1", 4, 1000n, expect.objectContaining({ accountNumber: 5, sequence: 9 }));
        expect(client.signPerformAction).not.toHaveBeenCalled();
    });

    it("signs MsgLeaveGame for LEAVE", async () => {
        const client = makeClient();
        const tx = await signSettlementTx(client as unknown as SigningCosmosClient, ADDR, fakeNetwork, "game-1", NonPlayerActionType.LEAVE, 0n, "");

        expect(tx).toBe("LEAVE_TX");
        expect(client.signLeaveGame).toHaveBeenCalledWith("game-1", expect.any(Object));
        expect(client.signPerformAction).not.toHaveBeenCalled();
    });

    it("signs MsgTopUp for TOP_UP", async () => {
        const client = makeClient();
        const tx = await signSettlementTx(client as unknown as SigningCosmosClient, ADDR, fakeNetwork, "game-1", NonPlayerActionType.TOP_UP, 500n, "");

        expect(tx).toBe("TOPUP_TX");
        expect(client.signTopUp).toHaveBeenCalledWith("game-1", 500n, expect.any(Object));
        expect(client.signPerformAction).not.toHaveBeenCalled();
    });

    it("falls back to MsgPerformAction for gameplay actions", async () => {
        const client = makeClient();
        const tx = await signSettlementTx(client as unknown as SigningCosmosClient, ADDR, fakeNetwork, "game-1", PlayerActionType.BET, 50n, "");

        expect(tx).toBe("PERFORM_TX");
        expect(client.signPerformAction).toHaveBeenCalledWith("game-1", PlayerActionType.BET, 50n, "", expect.any(Object));
        expect(client.signJoinGame).not.toHaveBeenCalled();
    });

    it("throws when a JOIN has no seat in data", async () => {
        const client = makeClient();
        // signSettlementTx swallows sign errors and returns undefined (graceful
        // degradation), so a missing seat surfaces as no settlement tx.
        const tx = await signSettlementTx(client as unknown as SigningCosmosClient, ADDR, fakeNetwork, "game-1", NonPlayerActionType.JOIN, 1000n, "");
        expect(tx).toBeUndefined();
        expect(client.signJoinGame).not.toHaveBeenCalled();
    });
});
