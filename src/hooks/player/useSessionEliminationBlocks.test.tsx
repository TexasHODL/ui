import { renderHook, waitFor } from "@testing-library/react";
import { useSessionEliminationBlocks } from "./useSessionEliminationBlocks";

const mockApi = { getSentTransactions: jest.fn() };
const mockPublicStateAt = jest.fn();
jest.mock("../../context/CosmosApiContext", () => ({
    useCosmosApi: () => mockApi,
    useCometRpcApiFactory: () => () => ({ abciQuery: jest.fn() })
}));
jest.mock("../../context/NetworkContext", () => ({
    useNetwork: () => ({ currentNetwork: { rpc: "https://node1.block52.xyz/rpc/" } })
}));
jest.mock("../../utils/chainHistory", () => ({
    publicStateAt: (...args: unknown[]) => mockPublicStateAt(...args)
}));

const PLAYER = "b521kjpfyeyg3watq2f978vhu48ju3xjwdp0wjgp5t";
const GAME = "0x7db1aa4491963b889ad43dd7213d11e383b1052aacb9ceafe3099b42ae0797e7";

beforeEach(() => {
    mockApi.getSentTransactions.mockReset();
    mockPublicStateAt.mockReset();
});

test("stores the hand_ended block where the public state first shows the bust", async () => {
    mockApi.getSentTransactions.mockImplementation(async (query: string) => {
        const hand = /hand_number='(\d+)'/.exec(query)?.[1];
        const height = hand === "1" ? "100" : "110";
        return {
            tx_responses: [{ code: 0, height, events: [{ type: "hand_ended", attributes: [{ key: "block_height", value: height }] }] }]
        };
    });
    mockPublicStateAt.mockImplementation(async (_rpc: unknown, _gameId: string, height: number) => ({
        results: height >= 110 ? [{ place: 5, playerId: PLAYER, payout: "0" }] : [],
        players: [{ address: PLAYER, status: height >= 110 ? "busted" : "active", stack: height >= 110 ? "0" : "1500" }]
    }));
    const { result } = renderHook(() => useSessionEliminationBlocks(PLAYER, [{ gameId: GAME, handCount: 2 }]));
    await waitFor(() => expect(result.current[GAME]).toBe(110));
    expect(mockApi.getSentTransactions).toHaveBeenCalledWith(`hand_ended.game_id='${GAME}' AND hand_ended.hand_number='1'`, { limit: 5, page: 1 });
});

test("a failed lookup is recorded as not found", async () => {
    mockApi.getSentTransactions.mockRejectedValue(new Error("offline"));
    const { result } = renderHook(() => useSessionEliminationBlocks(PLAYER, [{ gameId: GAME, handCount: 1 }]));
    await waitFor(() => expect(result.current[GAME]).toBeNull());
});

test("does not keep another player's blocks", async () => {
    mockApi.getSentTransactions.mockResolvedValue({
        tx_responses: [{ code: 0, height: "10", events: [{ type: "hand_ended", attributes: [{ key: "block_height", value: "10" }] }] }]
    });
    mockPublicStateAt.mockResolvedValue({
        results: [{ place: 2, playerId: PLAYER, payout: "0" }],
        players: []
    });
    const { result, rerender } = renderHook(({ player }) => useSessionEliminationBlocks(player, [{ gameId: GAME, handCount: 1 }]), {
        initialProps: { player: PLAYER }
    });
    await waitFor(() => expect(result.current[GAME]).toBe(10));
    rerender({ player: "b521other" });
    expect(result.current[GAME]).toBeUndefined();
});
