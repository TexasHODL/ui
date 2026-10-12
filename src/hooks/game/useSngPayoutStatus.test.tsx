import { renderHook, waitFor } from "@testing-library/react";
import { hasSngPayoutReceipt, isSngPayoutAlreadyClaimed, useSngPayoutStatus } from "./useSngPayoutStatus";
const mockApi = { getSentTransactions: jest.fn() };
jest.mock("../../context/CosmosApiContext", () => ({ useCosmosApi: () => mockApi }));
const receipt = (table = "0xabc", player = "b521user", code = 0) => ({ tx_responses: [{ code, events: [{ type: "sng_prize_claimed", attributes: [
    { key: "game_id", value: table }, { key: "player", value: player }, { key: "amount", value: "280000" }
] }] }] });
beforeEach(() => mockApi.getSentTransactions.mockReset());
test("only a successful payout event for this table and wallet counts", () => {
    expect(hasSngPayoutReceipt(receipt(), "0xabc", "B521USER")).toBe(true);
    expect(hasSngPayoutReceipt(receipt("0xdef"), "0xabc", "b521user")).toBe(false);
    expect(hasSngPayoutReceipt(receipt("0xabc", "other"), "0xabc", "b521user")).toBe(false);
    expect(hasSngPayoutReceipt(receipt("0xabc", "b521user", 1113), "0xabc", "b521user")).toBe(false);
    expect(() => hasSngPayoutReceipt({}, "0xabc", "b521user")).toThrow();
    expect(isSngPayoutAlreadyClaimed(new Error("network request already failed"))).toBe(false);
});
test("looks up historical claims before enabling collection", async () => {
    mockApi.getSentTransactions.mockResolvedValue(receipt());
    const { result } = renderHook(() => useSngPayoutStatus("0xabc", "b521user", true));
    expect(result.current.status).toBe("checking");
    await waitFor(() => expect(result.current.status).toBe("claimed"));
    expect(mockApi.getSentTransactions).toHaveBeenCalledWith("sng_prize_claimed.game_id='0xabc' AND sng_prize_claimed.player='b521user'");
});
test("failed history lookup is not treated as unclaimed", async () => {
    mockApi.getSentTransactions.mockRejectedValue(new Error("offline"));
    const { result } = renderHook(() => useSngPayoutStatus("0xabc", "b521user", true));
    await waitFor(() => expect(result.current.status).toBe("error"));
});
test("a late response from another wallet cannot mark this wallet collected", async () => {
    let resolve!: (value: ReturnType<typeof receipt>) => void;
    mockApi.getSentTransactions.mockImplementationOnce(() => new Promise(r => { resolve = r; })).mockResolvedValue({ tx_responses: [] });
    const { result, rerender } = renderHook(({ player }) => useSngPayoutStatus("0xabc", player, true), { initialProps: { player: "b521user" } });
    rerender({ player: "another" });
    await waitFor(() => expect(result.current.status).toBe("unclaimed"));
    resolve(receipt());
    await waitFor(() => expect(result.current.status).toBe("unclaimed"));
});
