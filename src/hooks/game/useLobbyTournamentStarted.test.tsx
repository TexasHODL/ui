import { act, renderHook, waitFor } from "@testing-library/react";
import { TexasHoldemRound } from "@block52/poker-vm-sdk";
import { tournamentProgressFromPublicState, useLobbyTournamentStarted } from "./useLobbyTournamentStarted";

const mockGetGameState = jest.fn();
const mockApi = { getPublicGameState: mockGetGameState };
jest.mock("../../context/CosmosApiContext", () => ({ useCosmosApi: () => mockApi }));

const state = (gameState: Record<string, unknown>) => ({
    game_state: JSON.stringify({ format: "sit-and-go", variant: "texas-holdem", gameState })
});

beforeEach(() => mockGetGameState.mockReset());

it("reads started, finished, and still-waiting tables from public state", () => {
    expect(tournamentProgressFromPublicState(state({
        handNumber: 1,
        round: TexasHoldemRound.PREFLOP,
        previousActions: [],
        results: []
    }))).toBe("started");
    expect(tournamentProgressFromPublicState(state({
        handNumber: 4,
        round: TexasHoldemRound.END,
        previousActions: [],
        results: [{ place: 1, playerId: "winner", payout: "100" }],
        winners: [{ address: "winner" }]
    }))).toBe("finished");
    expect(tournamentProgressFromPublicState(state({
        handNumber: 2,
        round: TexasHoldemRound.END,
        previousActions: [],
        results: [{ place: 2, playerId: "alice", payout: "0" }],
        winners: [{ address: "bob" }]
    }))).toBe("started");
    expect(tournamentProgressFromPublicState(state({
        handNumber: 1,
        round: TexasHoldemRound.ANTE,
        previousActions: []
    }))).toBeNull();
    expect(tournamentProgressFromPublicState({ game_state: "not-json" })).toBeNull();
    expect(tournamentProgressFromPublicState(undefined)).toBeNull();
});

it("loads a finished table and clears it when the table is waiting again", async () => {
    mockGetGameState.mockResolvedValue(state({
        handNumber: 4,
        round: TexasHoldemRound.END,
        previousActions: [],
        results: [{ place: 1, playerId: "winner", payout: "100" }]
    }));
    const { result } = renderHook(() => useLobbyTournamentStarted("bad-beat", 0));
    await waitFor(() => expect(result.current).toEqual({ "bad-beat": "finished" }));
    mockGetGameState.mockResolvedValue(state({ handNumber: 1, round: TexasHoldemRound.ANTE, previousActions: [] }));
    act(() => window.dispatchEvent(new Event("focus")));
    await waitFor(() => expect(result.current).toEqual({}));
});

it("does not request state when no scheduled tables are visible", () => {
    renderHook(() => useLobbyTournamentStarted("", 0));
    expect(mockGetGameState).not.toHaveBeenCalled();
});
