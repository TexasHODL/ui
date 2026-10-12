import { act, renderHook, waitFor } from "@testing-library/react";
import { findLobbySeat, useLobbySeats } from "./useLobbySeats";
const mockGetGameState = jest.fn();
// Deliberately expose only the public endpoint: the private one rejects anonymous requests.
const mockApi = { getPublicGameState: mockGetGameState };
jest.mock("../../context/CosmosApiContext", () => ({ useCosmosApi: () => mockApi }));
// Real REST responses wrap the roster in GameStateResponseDTO.gameState.
const roster = (address: string, seat: number) => ({ game_state: JSON.stringify({ format: "cash", variant: "texas-holdem", gameState: { handNumber: 12, players: [null, { address, seat }] } }) });
beforeEach(() => mockGetGameState.mockReset());

it("matches roster addresses case-insensitively and never treats creator as seated", () => {
    expect(findLobbySeat(roster("B52HERO", 4), "b52hero")).toBe(4);
    expect(findLobbySeat(roster("someone-else", 4), "b52hero")).toBeNull();
    expect(findLobbySeat(roster("b52hero", 0), "b52hero")).toBeNull();
    expect(findLobbySeat({ game_state: JSON.stringify({ handNumber: 12, creator: "b52hero", players: [] }) }, "b52hero")).toBeNull();
});

it("also accepts the bare snapshot used by older endpoints", () => {
    expect(findLobbySeat({ game_state: JSON.stringify({ handNumber: 1, players: [{ address: "hero", seat: 5 }] }) }, "hero")).toBe(5);
});

it("loads visible seats and clears them after leaving on focus refresh", async () => {
    mockGetGameState.mockResolvedValue(roster("hero", 3));
    const { result } = renderHook(() => useLobbySeats("table-a", "hero", 0));
    await waitFor(() => expect(result.current).toEqual({ "table-a": 3 }));
    mockGetGameState.mockResolvedValue(roster("other", 2));
    act(() => window.dispatchEvent(new Event("focus")));
    await waitFor(() => expect(result.current).toEqual({}));
});

it("does not request seats without a wallet and discards a late response after wallet switch", async () => {
    let resolveOld!: (response: { game_state: string }) => void;
    mockGetGameState.mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve; }));
    const { result, rerender } = renderHook(({ address }) => useLobbySeats("table-a", address, 0), { initialProps: { address: "old" as string | null } });
    rerender({ address: null });
    await act(async () => resolveOld(roster("old", 1)));
    expect(result.current).toEqual({});
    expect(mockGetGameState).toHaveBeenCalledTimes(1);
});

it("fails closed on bad responses and rechecks on manual list refresh", async () => {
    mockGetGameState.mockResolvedValue({ game_state: "invalid" });
    const { result, rerender } = renderHook(({ revision }) => useLobbySeats("table-a", "hero", revision), { initialProps: { revision: 0 } });
    await act(async () => {});
    expect(result.current).toEqual({});
    mockGetGameState.mockResolvedValue(roster("hero", 6));
    rerender({ revision: 1 });
    await waitFor(() => expect(result.current).toEqual({ "table-a": 6 }));
});
