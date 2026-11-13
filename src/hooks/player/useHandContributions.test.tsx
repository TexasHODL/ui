import { renderHook, waitFor } from "@testing-library/react";
import { PlayerActionType } from "@block52/poker-vm-sdk";
import { clearHandContributionCache, useHandContributions } from "./useHandContributions";

const mockPublicStateAt = jest.fn();
jest.mock("../../utils/chainHistory", () => ({
    publicStateAt: (...args: unknown[]) => mockPublicStateAt(...args)
}));
jest.mock("../../context/CosmosApiContext", () => ({
    useCometRpcApiFactory: () => () => ({})
}));
jest.mock("../../context/NetworkContext", () => ({
    useNetwork: () => ({
        currentNetwork: { name: "Block52", rpc: "https://node1.block52.xyz/rpc/", rest: "", grpc: "", ws: "" }
    }),
    NETWORK_PRESETS: [{ name: "Block52", rpc: "https://node1.block52.xyz/rpc/", rest: "", grpc: "", ws: "" }]
}));

const PLAYER = "b521kjpfyeyg3watq2f978vhu48ju3xjwdp0wjgp5t";
const GAME = "0x3c3253dd13fdda80cf632efcc8e3662baa87da56";
const HAND = { gameId: GAME, handNumber: 147, blockHeight: 1028644 };

beforeEach(() => {
    clearHandContributionCache();
    mockPublicStateAt.mockReset();
});

test("reads the contribution from the hand's end block and does not ask again", async () => {
    mockPublicStateAt.mockResolvedValue({
        handNumber: 147,
        previousActions: [
            { playerId: "b521other", action: PlayerActionType.SMALL_BLIND, amount: "750" },
            { playerId: PLAYER, action: PlayerActionType.BIG_BLIND, amount: "1500" },
            { playerId: "b521other", action: PlayerActionType.FOLD, amount: "" }
        ]
    });
    const { result, unmount } = renderHook(() => useHandContributions(PLAYER, [HAND], true));
    expect(result.current.pending).toBe(true);
    await waitFor(() => expect(result.current.pending).toBe(false));
    expect(result.current.byKey[`${GAME}#147`]).toBe(1500);
    expect(result.current.unavailable).toBe(0);
    expect(mockPublicStateAt).toHaveBeenCalledWith(expect.anything(), GAME, 1028644);
    const calls = mockPublicStateAt.mock.calls.length;
    unmount();
    const again = renderHook(() => useHandContributions(PLAYER, [HAND], true));
    expect(again.result.current.pending).toBe(false);
    expect(again.result.current.byKey[`${GAME}#147`]).toBe(1500);
    expect(mockPublicStateAt.mock.calls.length).toBe(calls);
});

test("records a hand the node no longer has instead of a zero contribution", async () => {
    const error = jest.spyOn(console, "error").mockImplementation(() => undefined);
    mockPublicStateAt.mockRejectedValue(new Error("version does not exist"));
    const { result } = renderHook(() => useHandContributions(PLAYER, [HAND], true));
    await waitFor(() => expect(result.current.pending).toBe(false));
    expect(result.current.unavailable).toBe(1);
    expect(result.current.byKey).toEqual({});
    error.mockRestore();
});

test("does not read while the selection has no single money unit", async () => {
    const { result } = renderHook(() => useHandContributions(PLAYER, [HAND], false));
    await waitFor(() => expect(result.current.pending).toBe(false));
    expect(mockPublicStateAt).not.toHaveBeenCalled();
    expect(result.current.byKey).toEqual({});
});
