import { act, renderHook, waitFor } from "@testing-library/react";
import { TexasHoldemRound } from "@block52/poker-vm-sdk";
import { tournamentStartedFromPublicState, useLobbyTournamentStarted } from "./useLobbyTournamentStarted";

const mockGetGameState = jest.fn();
const mockApi = { getPublicGameState: mockGetGameState };
jest.mock("../../context/CosmosApiContext", () => ({ useCosmosApi: () => mockApi }));

const state = (gameState: Record<string, unknown>) => ({
    game_state: JSON.stringify({ format: "sit-and-go", variant: "texas-holdem", gameState })
});

beforeEach(() => mockGetGameState.mockReset());

it("reads a started hand from public state and ignores a table still waiting", () => {
    expect(tournamentStartedFromPublicState(state({
        handNumber: 1,
        round: TexasHoldemRound.PREFLOP,
        previousActions: []
    }))).toBe(true);
    expect(tournamentStartedFromPublicState(state({
        handNumber: 1,
        round: TexasHoldemRound.ANTE,
        previousActions: []
    }))).toBe(false);
    expect(tournamentStartedFromPublicState({ game_state: "not-json" })).toBe(false);
    expect(tournamentStartedFromPublicState(undefined)).toBe(false);
});

it("loads started tables and drops one that is no longer in play", async () => {
    mockGetGameState.mockResolvedValue(state({ handNumber: 3, round: TexasHoldemRound.FLOP, previousActions: [] }));
    const { result } = renderHook(() => useLobbyTournamentStarted("bad-beat", 0));
    await waitFor(() => expect(result.current).toEqual({ "bad-beat": true }));
    mockGetGameState.mockResolvedValue(state({ handNumber: 1, round: TexasHoldemRound.ANTE, previousActions: [] }));
    act(() => window.dispatchEvent(new Event("focus")));
    await waitFor(() => expect(result.current).toEqual({}));
});

it("does not request state when no scheduled tables are visible", () => {
    renderHook(() => useLobbyTournamentStarted("", 0));
    expect(mockGetGameState).not.toHaveBeenCalled();
});
