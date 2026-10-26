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
    }))).toEqual({ mark: "started" });
    // Omit winners — Jest's SDK stub lacks withWinnerDescriptions (pre-existing);
    // finished detection only needs results place 1. endedAtMs comes from previousActions.
    expect(tournamentProgressFromPublicState(state({
        handNumber: 4,
        round: TexasHoldemRound.END,
        previousActions: [{ timestamp: 1_700_000_000_111 }],
        results: [{ place: 1, playerId: "winner", payout: "100" }]
    }))).toEqual({ mark: "finished", endedAtMs: 1_700_000_000_111 });
    expect(tournamentProgressFromPublicState(state({
        handNumber: 2,
        round: TexasHoldemRound.END,
        previousActions: [],
        results: [{ place: 2, playerId: "alice", payout: "0" }]
    }))).toEqual({ mark: "started" });
    expect(tournamentProgressFromPublicState(state({
        handNumber: 1,
        round: TexasHoldemRound.ANTE,
        previousActions: []
    }))).toBeNull();
    // Late registration (poker-vm#2731): a started table inside the window is still joinable.
    const lateNow = Date.now();
    expect(tournamentProgressFromPublicState(state({
        handNumber: 3,
        round: TexasHoldemRound.PREFLOP,
        previousActions: [],
        results: [],
        gameOptions: { minBuyIn: "1", maxBuyIn: "1", minPlayers: 2, maxPlayers: 6, smallBlind: "1", bigBlind: "2", timeout: 30, blindLevelDuration: 10, scheduledStartTime: lateNow - 120_000, sngStartTime: lateNow - 60_000, lateRegistrationLevels: 2 }
    }))).toEqual({ mark: "started", lateRegOpen: true, lateRegEndsAtMs: lateNow - 60_000 + 20 * 60_000 });
    expect(tournamentProgressFromPublicState({ game_state: "not-json" })).toBeNull();
    expect(tournamentProgressFromPublicState(undefined)).toBeNull();
});

it("loads a finished table and clears it when the table is waiting again", async () => {
    mockGetGameState.mockResolvedValue(state({
        handNumber: 4,
        round: TexasHoldemRound.END,
        previousActions: [{ timestamp: 99 }],
        results: [{ place: 1, playerId: "winner", payout: "100" }]
    }));
    const { result } = renderHook(() => useLobbyTournamentStarted("bad-beat", 0));
    await waitFor(() => expect(result.current).toEqual({
        "bad-beat": { mark: "finished", endedAtMs: 99 }
    }));
    mockGetGameState.mockResolvedValue(state({ handNumber: 1, round: TexasHoldemRound.ANTE, previousActions: [] }));
    act(() => window.dispatchEvent(new Event("focus")));
    await waitFor(() => expect(result.current).toEqual({}));
});

it("does not request state when no scheduled tables are visible", () => {
    renderHook(() => useLobbyTournamentStarted("", 0));
    expect(mockGetGameState).not.toHaveBeenCalled();
});