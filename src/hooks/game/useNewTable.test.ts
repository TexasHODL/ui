import { act, renderHook } from "@testing-library/react";
import { GameFormat } from "@block52/poker-vm-sdk";
import { useNewTable } from "./useNewTable";
const mockCreate = jest.fn();
const mockGetTx = jest.fn();
let mockReadClient: { getTx: typeof mockGetTx } | null;
const mockNetwork = {};
jest.mock("../../context/NetworkContext", () => ({ useNetwork: () => ({ currentNetwork: mockNetwork }) }));
jest.mock("../../utils/cosmos/client", () => ({
    getSigningClient: async () => ({ signingClient: { createGame: mockCreate }, userAddress: "test-owner" }),
    getCosmosClient: () => mockReadClient
}));
const options = { format: GameFormat.CASH, minBuyIn: 1, maxBuyIn: 2, minPlayers: 2, maxPlayers: 6, smallBlind: .01, bigBlind: .02 };
beforeEach(() => { jest.useFakeTimers(); jest.clearAllMocks(); mockCreate.mockResolvedValue("tx123"); mockReadClient = { getTx: mockGetTx }; });
afterEach(() => jest.useRealTimers());

test("confirmed event returns the exact table ID for the Join link", async () => {
    mockGetTx.mockResolvedValue({ tx_response: { code: 0, events: [{ type: "game_created", attributes: [{ key: "game_id", value: "table456" }] }] } });
    const { result } = renderHook(() => useNewTable());
    let receipt;
    await act(async () => { const pending = result.current.createTable(options); await jest.advanceTimersByTimeAsync(2000); receipt = await pending; });
    expect(receipt).toEqual({ txHash: "tx123", gameId: "table456" });
    expect(result.current.isCreating).toBe(false);
});
test("a missing read client retains the sent transaction without broadcasting again", async () => {
    mockReadClient = null;
    const { result } = renderHook(() => useNewTable());
    let receipt;
    await act(async () => { receipt = await result.current.createTable(options); });
    expect(receipt).toEqual({ txHash: "tx123", gameId: null });
    expect(mockCreate).toHaveBeenCalledTimes(1);
});
test("indexer failure retains the receipt rather than reporting creation failure", async () => {
    mockGetTx.mockRejectedValue(new Error("not indexed"));
    const { result } = renderHook(() => useNewTable());
    let receipt;
    await act(async () => { const pending = result.current.createTable(options); await jest.advanceTimersByTimeAsync(2000); receipt = await pending; });
    expect(receipt).toEqual({ txHash: "tx123", gameId: null });
});
test("a rejected on-chain message never returns a success receipt", async () => {
    mockGetTx.mockResolvedValue({ tx_response: { code: 5, raw_log: "insufficient funds" } });
    const { result } = renderHook(() => useNewTable());
    let receipt;
    await act(async () => { const pending = result.current.createTable(options); await jest.advanceTimersByTimeAsync(2000); receipt = await pending; });
    expect(receipt).toBeNull();
    expect(result.current.error?.message).toBe("insufficient funds");
});
